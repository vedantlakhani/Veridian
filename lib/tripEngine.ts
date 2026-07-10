/**
 * lib/tripEngine.ts — Trip Detection Engine
 *
 * ARCHITECTURE NOTE: PURE functions only — no React, no Supabase, no
 * AsyncStorage. This file is the single source of truth for turning a raw
 * GPS point buffer into classified trips, so it is fully unit-testable in
 * isolation (see __tests__/lib/tripEngine.test.ts) and swappable wholesale
 * when Sprint B replaces the speed-band heuristic with OS activity fusion.
 *
 * hooks/useTrips.ts is the only stateful consumer — it owns the GPS buffer,
 * Supabase writes, and AsyncStorage guards; this file never touches any of that.
 */

import type { TripMode, TripStatus } from '@/types/emission';

// ─── Shared point shape ───────────────────────────────────────────────────────
// Structurally identical to tasks/locationTask.ts's StoredLocation, but
// declared independently so importing this file never pulls in
// expo-task-manager/expo-location (StoredLocation's module runs
// TaskManager.defineTask at import time).
export interface TripPoint {
  latitude: number;
  longitude: number;
  speed: number | null; // m/s, unused — avg speed is derived from distance/time
  timestamp: number; // unix ms
}

export const TRIP_GAP_MS = 5 * 60 * 1000; // 5-min silence = new trip
export const MIN_DISCARD_SPEED_KMH = 2; // below this avg speed, discard as noise/stationary
export const MIN_DISCARD_DISTANCE_KM = 1.0; // below this distance, discard as a sub-1km hop
export const WALK_MAX_KMH = 7; // [2, 7) -> walk
export const CYCLING_MAX_KMH = 28; // [7, 28) -> cycling, [28, ∞) -> car

// DEFRA 2025 petrol car medium — used both to price car trips (fallback
// estimate) and to compute the CO₂ savings shown on zero-emission trips.
export const CAR_KG_PER_KM = 0.168;

// decideTripAction thresholds
const CAR_AUTO_CONFIRM_MIN_CONFIDENCE = 0.75;
const CAR_AUTO_CONFIRM_MIN_KM = 2.0;
const ZERO_EMISSION_AUTO_CONFIRM_MIN_KM = 0.5;

// ─── Haversine ────────────────────────────────────────────────────────────────

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Segmentation ─────────────────────────────────────────────────────────────

/**
 * Splits a point buffer into trip segments on 5-min silence gaps.
 * Only points from the last 24h are considered (the buffer itself holds 48h).
 * `now` is injectable for deterministic tests.
 * Segments of fewer than 2 points are dropped (can't derive distance/speed).
 * NOTE: only CLOSED segments are returned. A segment is closed once a 5-min
 * silence follows it — including the trailing segment, which only qualifies
 * when its last point is older than TRIP_GAP_MS relative to `now`. A trip
 * that is still in progress must never become a detected_trips row: its
 * clientTripKey (start timestamp) is permanent, so syncing it mid-drive would
 * lock in partial distance/mode forever. The live in-progress segment is
 * handled exclusively by detectActiveTrip() below.
 */
export function segmentTrips(points: TripPoint[], now: number = Date.now()): TripPoint[][] {
  if (points.length < 2) return [];

  const cutoff = now - 24 * 60 * 60 * 1000;
  const recent = [...points]
    .filter((p) => p.timestamp > cutoff)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (recent.length < 2) return [];

  const segments: TripPoint[][] = [];
  let seg: TripPoint[] = [recent[0]];

  for (let i = 1; i < recent.length; i++) {
    if (recent[i].timestamp - recent[i - 1].timestamp > TRIP_GAP_MS) {
      if (seg.length > 1) segments.push(seg);
      seg = [recent[i]];
    } else {
      seg.push(recent[i]);
    }
  }
  // Trailing segment: closed only once 5 min of silence has passed since its
  // last point — otherwise the trip may still be in progress.
  if (seg.length > 1 && now - seg[seg.length - 1].timestamp > TRIP_GAP_MS) {
    segments.push(seg);
  }

  return segments;
}

export interface SegmentStats {
  distanceKm: number;
  avgSpeedKmh: number;
  durationH: number;
  pointCount: number;
  startTime: Date;
  endTime: Date;
}

/** Sums haversine distance across consecutive points and derives avg speed. */
export function computeSegmentStats(segment: TripPoint[]): SegmentStats {
  let distanceKm = 0;
  for (let i = 1; i < segment.length; i++) {
    distanceKm += haversineKm(
      segment[i - 1].latitude, segment[i - 1].longitude,
      segment[i].latitude, segment[i].longitude,
    );
  }

  const startTime = new Date(segment[0].timestamp);
  const endTime = new Date(segment[segment.length - 1].timestamp);
  const durationH = (segment[segment.length - 1].timestamp - segment[0].timestamp) / 3_600_000;
  const avgSpeedKmh = durationH > 0 ? distanceKm / durationH : 0;

  return { distanceKm, avgSpeedKmh, durationH, pointCount: segment.length, startTime, endTime };
}

// ─── Classification ───────────────────────────────────────────────────────────

export interface TripClassification {
  mode: TripMode;
  confidence: number;
}

// Reference scales for the confidence heuristic below — chosen so a typical
// commute-length trip with a healthy GPS fix rate saturates both factors.
const CONFIDENCE_POINT_REFERENCE = 10; // segment point count that reaches full "points" score
const CONFIDENCE_DURATION_REFERENCE_H = 0.5; // 30 min that reaches full "duration" score
const CONFIDENCE_FLOOR = 0.3;
const CONFIDENCE_CEILING = 0.95;
const CAR_DEPTH_REFERENCE_KMH = 15; // km/h above the car floor that reaches full "depth" score

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * How deep avgSpeedKmh sits inside its mode's band, in [0, 1] — 1 at the
 * band's center (or, for car's open-ended band, comfortably past its floor),
 * 0 right at a boundary that could confuse it with the neighboring mode.
 */
function depthInBand(avgSpeedKmh: number, mode: TripMode): number {
  if (mode === 'walk') {
    const center = (MIN_DISCARD_SPEED_KMH + WALK_MAX_KMH) / 2;
    const halfWidth = (WALK_MAX_KMH - MIN_DISCARD_SPEED_KMH) / 2;
    return clamp(1 - Math.abs(avgSpeedKmh - center) / halfWidth, 0, 1);
  }
  if (mode === 'cycling') {
    const center = (WALK_MAX_KMH + CYCLING_MAX_KMH) / 2;
    const halfWidth = (CYCLING_MAX_KMH - WALK_MAX_KMH) / 2;
    return clamp(1 - Math.abs(avgSpeedKmh - center) / halfWidth, 0, 1);
  }
  // car — no upper neighbor to be confused with, so depth only grows with
  // distance above the floor, saturating at CAR_DEPTH_REFERENCE_KMH past it.
  return clamp((avgSpeedKmh - CYCLING_MAX_KMH) / CAR_DEPTH_REFERENCE_KMH, 0, 1);
}

/**
 * CONFIDENCE FORMULA (Sprint A heuristic — Sprint B replaces this with OS
 * activity-recognition fusion; this is the single function that changes):
 *
 *   confidence = clamp(0.3 + 0.65 * (0.5·depth + 0.3·points + 0.2·duration), 0.3, 0.95)
 *
 *   depth    ∈ [0,1] — see depthInBand() above: how far avgSpeedKmh sits from
 *              a band boundary that could confuse this trip with a neighboring
 *              mode. Weighted highest — it's the strongest signal we have.
 *   points   ∈ [0,1] — segment point count over a 10-point reference, clamped.
 *              More GPS fixes make the averaged speed more reliable.
 *   duration ∈ [0,1] — segment duration over a 30-minute reference, clamped.
 *              Longer trips average out GPS noise better than short ones.
 *
 * 0.3 and 0.95 are the floor/ceiling: nothing here is ever fully certain or
 * fully dismissed, so even confident car trips stay reviewable on the Log
 * screen if the user ever needs to correct one.
 */
function computeConfidence(stats: SegmentStats, mode: TripMode): number {
  const depth = depthInBand(stats.avgSpeedKmh, mode);
  const points = clamp(stats.pointCount / CONFIDENCE_POINT_REFERENCE, 0, 1);
  const duration = clamp(stats.durationH / CONFIDENCE_DURATION_REFERENCE_H, 0, 1);
  const raw =
    CONFIDENCE_FLOOR +
    (CONFIDENCE_CEILING - CONFIDENCE_FLOOR) * (0.5 * depth + 0.3 * points + 0.2 * duration);
  return Math.round(clamp(raw, CONFIDENCE_FLOOR, CONFIDENCE_CEILING) * 100) / 100;
}

/**
 * Classifies one segment's stats into a mode + confidence, or null to
 * discard the segment entirely (never becomes a trip). Bands:
 *   discard: avgSpeedKmh < 2 or distanceKm < 1 (noise / sub-1km hop)
 *   walk:    2 <= avgSpeedKmh < 7
 *   cycling: 7 <= avgSpeedKmh < 28
 *   car:     avgSpeedKmh >= 28
 */
export function classifyTrip(stats: SegmentStats): TripClassification | null {
  if (stats.avgSpeedKmh < MIN_DISCARD_SPEED_KMH || stats.distanceKm < MIN_DISCARD_DISTANCE_KM) {
    return null;
  }
  const mode: TripMode =
    stats.avgSpeedKmh < WALK_MAX_KMH ? 'walk' : stats.avgSpeedKmh < CYCLING_MAX_KMH ? 'cycling' : 'car';
  return { mode, confidence: computeConfidence(stats, mode) };
}

// ─── Trip action decision ─────────────────────────────────────────────────────

/**
 * Decides the initial detected_trips status for a classified trip:
 *   car, confidence >= 0.75, distance >= 2km      -> auto_confirmed
 *   walk/cycling, distance >= 0.5km               -> auto_confirmed (zero-emission
 *                                                    celebration — no emission entry)
 *   everything else (incl. low-confidence car)    -> needs_confirmation
 */
export function decideTripAction(trip: { mode: TripMode; confidence: number; distanceKm: number }): TripStatus {
  if (trip.mode === 'car') {
    return trip.confidence >= CAR_AUTO_CONFIRM_MIN_CONFIDENCE && trip.distanceKm >= CAR_AUTO_CONFIRM_MIN_KM
      ? 'auto_confirmed'
      : 'needs_confirmation';
  }
  if (trip.mode === 'walk' || trip.mode === 'cycling') {
    return trip.distanceKm >= ZERO_EMISSION_AUTO_CONFIRM_MIN_KM ? 'auto_confirmed' : 'needs_confirmation';
  }
  return 'needs_confirmation';
}

// ─── Full pipeline ─────────────────────────────────────────────────────────────

export interface ClassifiedTrip {
  clientTripKey: string; // stringified segment start timestamp — stable identity
  mode: TripMode;
  distanceKm: number;
  avgSpeedKmh: number;
  startTime: Date;
  endTime: Date;
  confidence: number;
  status: TripStatus;
  // Classification features preserved for a future smarter classifier to
  // re-read and re-verdict (see NORTH_STAR.md §7.2) — stored in detected_trips.features.
  features: { pointCount: number; durationH: number };
}

/** Segments -> classifies -> decides status. The one function useTrips calls per refresh. */
export function analyzeTrips(points: TripPoint[], now: number = Date.now()): ClassifiedTrip[] {
  const segments = segmentTrips(points, now);
  const trips: ClassifiedTrip[] = [];

  for (const segment of segments) {
    const stats = computeSegmentStats(segment);
    const classification = classifyTrip(stats);
    if (!classification) continue;

    const distanceKm = Math.round(stats.distanceKm * 10) / 10;
    const avgSpeedKmh = Math.round(stats.avgSpeedKmh);

    trips.push({
      clientTripKey: String(segment[0].timestamp),
      mode: classification.mode,
      distanceKm,
      avgSpeedKmh,
      startTime: stats.startTime,
      endTime: stats.endTime,
      confidence: classification.confidence,
      status: decideTripAction({ mode: classification.mode, confidence: classification.confidence, distanceKm }),
      features: { pointCount: stats.pointCount, durationH: stats.durationH },
    });
  }

  return trips;
}

// ─── Active trip detection ────────────────────────────────────────────────────

export interface ActiveTripState {
  isInMotion: boolean;
  currentTripKm: number;
}

export const IDLE_ACTIVE_TRIP: ActiveTripState = { isInMotion: false, currentTripKm: 0 };
const ACTIVE_RECENCY_MS = 15 * 60 * 1000; // most recent point must be within 15 min
const ACTIVE_SPEED_KMH = 28; // avg of last 2 segments must exceed this

/** Live "is the user currently driving" indicator for the home screen card. */
export function detectActiveTrip(points: TripPoint[], now: number = Date.now()): ActiveTripState {
  if (points.length < 3) return IDLE_ACTIVE_TRIP;

  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const last3 = sorted.slice(-3);

  // Most recent point must be fresh
  if (now - last3[2].timestamp > ACTIVE_RECENCY_MS) return IDLE_ACTIVE_TRIP;

  // Average speed of the last 2 segments
  let dist = 0;
  let durMs = 0;
  for (let i = 1; i < last3.length; i++) {
    dist += haversineKm(
      last3[i - 1].latitude, last3[i - 1].longitude,
      last3[i].latitude, last3[i].longitude,
    );
    durMs += last3[i].timestamp - last3[i - 1].timestamp;
  }
  const durH = durMs / 3_600_000;
  const avgSpeedKmh = durH > 0 ? dist / durH : 0;
  if (avgSpeedKmh <= ACTIVE_SPEED_KMH) return IDLE_ACTIVE_TRIP;

  // Cumulative distance since the last 5-min gap
  let startIdx = 0;
  for (let i = sorted.length - 1; i >= 1; i--) {
    if (sorted[i].timestamp - sorted[i - 1].timestamp > TRIP_GAP_MS) {
      startIdx = i;
      break;
    }
  }
  let tripKm = 0;
  for (let i = startIdx + 1; i < sorted.length; i++) {
    tripKm += haversineKm(
      sorted[i - 1].latitude, sorted[i - 1].longitude,
      sorted[i].latitude, sorted[i].longitude,
    );
  }

  return { isInMotion: true, currentTripKm: Math.round(tripKm * 10) / 10 };
}
