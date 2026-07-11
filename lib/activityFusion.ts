/**
 * lib/activityFusion.ts — Activity-Signal Fusion Engine (Stage 2)
 *
 * ARCHITECTURE NOTE: PURE functions only — no React, no Supabase, no
 * AsyncStorage, and (critically) NO import of the veridian-motion native
 * module. It mirrors lib/tripEngine.ts's testability contract so the whole
 * fusion policy is unit-testable in isolation (see
 * __tests__/lib/activityFusion.test.ts) and swappable without touching the
 * stateful pipeline.
 *
 * WHY IT EXISTS: tripEngine turns a GPS breadcrumb buffer into ClassifiedTrips
 * using an avg-speed heuristic — "a bus IS a car to us right now"
 * (NORTH_STAR.md §4). iOS's CoreMotion coprocessor already logged up to 7 days
 * of walk/run/cycle/automotive segments with confidence, for free, with zero
 * app code running. This engine FUSES those two views: overlapping signals
 * reconcile (accelerometer beats average speed), OS-only segments become trips
 * the GPS buffer never saw (the app was closed), and GPS-only trips pass
 * through unchanged. hooks/useTrips.ts is the only stateful consumer — it owns
 * the native calls, distance resolution, and Supabase writes; this file never
 * touches any of that.
 *
 * The ActivitySegment / Visit shapes below are re-declared STRUCTURALLY rather
 * than imported from modules/veridian-motion — importing that module would pull
 * `requireOptionalNativeModule` from 'expo' into this pure graph. They must stay
 * structurally identical to modules/veridian-motion/src/VeridianMotion.types.ts.
 */

import { TRIP_GAP_MS, decideTripAction, type ClassifiedTrip } from '@/lib/tripEngine';
import type { TripMode, TripStatus } from '@/types/emission';

// ─── Re-declared native shapes (keep in sync with veridian-motion types) ──────

export type ActivityType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'automotive'
  | 'stationary'
  | 'unknown';

export type ActivityConfidence = 'low' | 'medium' | 'high';

/** A contiguous OS activity segment. `startMs`/`endMs` are epoch milliseconds. */
export interface ActivitySegment {
  type: ActivityType;
  confidence: ActivityConfidence;
  startMs: number;
  endMs: number;
}

/**
 * A persisted CLVisit endpoint. `arrivalMs` is -1 when the arrival predates
 * monitoring; `departureMs` is -1 when the visit is still ongoing.
 */
export interface Visit {
  lat: number;
  lng: number;
  arrivalMs: number;
  departureMs: number;
}

// ─── Fusion output ────────────────────────────────────────────────────────────

export type DistanceSource = 'gps' | 'pedometer' | 'route' | 'estimate';

/**
 * How the stateful pipeline should resolve an activity-only trip's distance,
 * or null when the draft already carries a real distance (GPS-sourced).
 */
export type NeedsDistance = 'pedometer' | 'route' | 'estimate' | null;

/**
 * The classification features preserved in detected_trips.features so a future
 * smarter classifier can re-read and re-verdict (NORTH_STAR.md §7.2).
 * `distanceSource` on an activity-only draft is a HINT (matching needsDistance);
 * the pipeline overwrites it with the source that actually resolved.
 */
export interface FusedTripFeatures {
  signal: 'gps' | 'activity' | 'fused';
  osType: ActivityType | null;
  osConfidence: ActivityConfidence | null;
  distanceSource: DistanceSource;
  // Present for gps/fused drafts (carried from the GPS ClassifiedTrip); absent
  // pointCount for activity-only. avgSpeedKmh is read back out for the
  // detected_trips.avg_speed_kmh column so GPS trips keep their exact value.
  pointCount?: number;
  durationH?: number;
  avgSpeedKmh?: number;
}

export interface FusedTripDraft {
  clientTripKey: string;
  /**
   * The OS segment's own stable identity ('act_' + minute-floored startMs),
   * present whenever a segment was involved — merged or activity-only.
   * Undefined for GPS-only pass-through drafts (no segment involved).
   * On a merge, the draft syncs under the GPS clientTripKey, but the segment's
   * act_ identity is preserved here so the sync layer can mark it synced too:
   * once the GPS points age out of the rolling buffer, re-querying OS activity
   * history resolves this same real-world trip to its act_ key, and without
   * this alias it would look unsynced and duplicate the row. Equal to
   * clientTripKey for activity-only drafts (there is no separate GPS key).
   */
  actAliasKey?: string;
  mode: TripMode;
  /** Real distance for GPS/fused drafts; null for activity-only until resolved. */
  distanceKm: number | null;
  startTime: Date;
  endTime: Date;
  confidence: number;
  needsDistance: NeedsDistance;
  features: FusedTripFeatures;
}

// ─── Thresholds ─────────────────────────────────────────────────────────────

// Minimum segment durations to count as a meaningful trip. Short motorised /
// cycling hops (5 min) and short walks (10 min) filter out incidental movement
// the OS logs between real trips.
export const MOTOR_CYCLE_MIN_MS = 5 * 60 * 1000;
export const WALK_RUN_MIN_MS = 10 * 60 * 1000;

// A segment ending within TRIP_GAP_MS of `now` may still be in progress — its
// clientTripKey (start-derived) is permanent, so syncing it early would lock in
// partial distance/mode forever. Same closed-trip rule as tripEngine's trailing
// segment guard.
export const IN_PROGRESS_MS = TRIP_GAP_MS;

// Overlap ratio (vs. the shorter of the two intervals) at/above which a GPS trip
// and an OS segment are considered the same trip and merged.
export const MERGE_OVERLAP_RATIO = 0.5;

// A visit endpoint matches a trip boundary when its departure/arrival is within
// this window of the trip's start/end.
export const VISIT_MATCH_MS = 10 * 60 * 1000;

// Agreement bonus and caps for the merge reconciliation.
const AGREE_BOOST = 0.15;
const CONFIDENCE_CEILING = 0.95;
const OS_OVERRIDE_CONFIDENCE_CAP = 0.6; // OS-won conflicts land needs_confirmation
// Defense-in-depth ceiling for estimated-distance trips — NOT what actually
// keeps them out of the auto-log path (a blended/boosted confidence could in
// principle climb back over an auto-confirm threshold). finalizeDraftStatus()
// below is the real guard: it forces needs_confirmation whenever
// distanceSource === 'estimate', unconditionally, for every mode.
export const ESTIMATE_CONFIDENCE_CAP = 0.5;

// Conservative fallback speeds (km/h) for estimateDistanceKm.
export const ESTIMATE_CAR_KMH = 30; // urban average
export const ESTIMATE_CYCLING_KMH = 14;
export const ESTIMATE_WALK_KMH = 4.5;

// Numeric prior per OS confidence level, blended 50/50 with tripEngine's
// heuristic when merging and used as the standalone confidence for activity-only
// trips.
export const ACTIVITY_CONFIDENCE_PRIOR: Record<ActivityConfidence, number> = {
  low: 0.4,
  medium: 0.65,
  high: 0.85,
};

// ─── Small helpers ──────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** OS activity type → our TripMode. Running collapses into walk (zero-emission). */
export function osTypeToMode(type: ActivityType): TripMode | null {
  switch (type) {
    case 'automotive':
      return 'car';
    case 'cycling':
      return 'cycling';
    case 'walking':
    case 'running':
      return 'walk';
    default:
      return null; // stationary / unknown — never a trip
  }
}

export function activityConfidencePrior(confidence: ActivityConfidence): number {
  return ACTIVITY_CONFIDENCE_PRIOR[confidence];
}

/** Milliseconds of overlap between [aStart, aEnd] and [bStart, bEnd] (0 if disjoint). */
function intervalOverlapMs(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/**
 * An OS activity segment's stable identity: CMMotionActivity history re-reports
 * identical startDates, but round down to the minute defensively so a
 * sub-minute jitter can't fork one real-world trip into two rows. Shared by
 * activity-only drafts (as clientTripKey) and merged drafts (as actAliasKey).
 */
function activityKey(startMs: number): string {
  return `act_${Math.floor(startMs / 60_000) * 60_000}`;
}

// ─── filterMeaningfulSegments ─────────────────────────────────────────────────

/**
 * Drops segments that shouldn't become trips:
 *   - stationary / unknown (not movement)
 *   - automotive & cycling shorter than 5 min
 *   - walking & running shorter than 10 min
 *   - segments still likely in progress (end within 5 min of `now`)
 * `nowMs` is injectable for deterministic tests, mirroring tripEngine.
 */
export function filterMeaningfulSegments(
  segments: ActivitySegment[],
  nowMs: number = Date.now(),
): ActivitySegment[] {
  return segments.filter((s) => {
    if (s.type === 'stationary' || s.type === 'unknown') return false;
    // Still-in-progress guard: keep only once 5 min of silence has passed.
    if (nowMs - s.endMs <= IN_PROGRESS_MS) return false;

    const durationMs = s.endMs - s.startMs;
    if (s.type === 'automotive' || s.type === 'cycling') {
      return durationMs >= MOTOR_CYCLE_MIN_MS;
    }
    // walking / running
    return durationMs >= WALK_RUN_MIN_MS;
  });
}

// ─── estimateDistanceKm ───────────────────────────────────────────────────────

/**
 * Conservative straight-line distance fallback used when pedometer/route are
 * unavailable. Callers should still cap the resulting trip's confidence at
 * ESTIMATE_CONFIDENCE_CAP (defense in depth), but the actual guarantee that an
 * estimated trip never auto-logs comes from finalizeDraftStatus() forcing
 * needs_confirmation whenever distanceSource is 'estimate' — see that function.
 */
export function estimateDistanceKm(mode: TripMode, durationH: number): number {
  const kmh =
    mode === 'car' ? ESTIMATE_CAR_KMH : mode === 'cycling' ? ESTIMATE_CYCLING_KMH : ESTIMATE_WALK_KMH;
  return Math.round(kmh * durationH * 10) / 10;
}

// ─── findVisitEndpoints ───────────────────────────────────────────────────────

export interface VisitEndpoints {
  /** The visit we departed at ~trip start. */
  origin: Visit;
  /** The visit we arrived at ~trip end. */
  destination: Visit;
}

/**
 * Pairs a trip with the visit whose DEPARTURE is within ±10 min of the trip
 * start (origin) and the visit whose ARRIVAL is within ±10 min of the trip end
 * (destination). Returns null unless both endpoints are found. Sentinel
 * timestamps (-1 for pre-monitoring arrivals / ongoing visits) are ignored.
 */
export function findVisitEndpoints(
  trip: { startTime: Date; endTime: Date },
  visits: Visit[],
): VisitEndpoints | null {
  const startMs = trip.startTime.getTime();
  const endMs = trip.endTime.getTime();

  const origin = visits.find(
    (v) => v.departureMs >= 0 && Math.abs(v.departureMs - startMs) <= VISIT_MATCH_MS,
  );
  const destination = visits.find(
    (v) => v.arrivalMs >= 0 && Math.abs(v.arrivalMs - endMs) <= VISIT_MATCH_MS,
  );

  if (!origin || !destination) return null;
  return { origin, destination };
}

// ─── fuseSignals ──────────────────────────────────────────────────────────────

function gpsPassThrough(gps: ClassifiedTrip): FusedTripDraft {
  return {
    clientTripKey: gps.clientTripKey,
    mode: gps.mode,
    distanceKm: gps.distanceKm,
    startTime: gps.startTime,
    endTime: gps.endTime,
    confidence: gps.confidence,
    needsDistance: null,
    features: {
      signal: 'gps',
      osType: null,
      osConfidence: null,
      distanceSource: 'gps',
      pointCount: gps.features.pointCount,
      durationH: gps.features.durationH,
      avgSpeedKmh: gps.avgSpeedKmh,
    },
  };
}

function mergeTrip(gps: ClassifiedTrip, seg: ActivitySegment): FusedTripDraft {
  const osMode = osTypeToMode(seg.type);
  const prior = activityConfidencePrior(seg.confidence);
  // The fused heuristic base: OS prior blended 50/50 with tripEngine's verdict.
  const blend = 0.5 * prior + 0.5 * gps.confidence;

  let mode = gps.mode;
  let confidence: number;

  if (osMode !== null && osMode === gps.mode) {
    // Both signals agree on the mode — reinforce with the agreement bonus.
    confidence = Math.min(CONFIDENCE_CEILING, blend + AGREE_BOOST);
  } else if (osMode !== null && (seg.confidence === 'medium' || seg.confidence === 'high')) {
    // Conflict, and the accelerometer is confident — the OS type wins over the
    // avg-speed band (this is how we stop calling every bus ride a car). Cap at
    // 0.6 so the reclassified trip lands needs_confirmation for the user to OK.
    mode = osMode;
    confidence = Math.min(OS_OVERRIDE_CONFIDENCE_CAP, blend);
  } else {
    // Conflict but the OS is only 'low' confidence (or unmappable) — trust the
    // GPS verdict entirely, unchanged.
    confidence = gps.confidence;
  }

  return {
    clientTripKey: gps.clientTripKey,
    actAliasKey: activityKey(seg.startMs),
    mode,
    distanceKm: gps.distanceKm,
    startTime: gps.startTime,
    endTime: gps.endTime,
    confidence: round2(confidence),
    needsDistance: null, // keep the GPS distance
    features: {
      signal: 'fused',
      osType: seg.type,
      osConfidence: seg.confidence,
      distanceSource: 'gps',
      pointCount: gps.features.pointCount,
      durationH: gps.features.durationH,
      avgSpeedKmh: gps.avgSpeedKmh,
    },
  };
}

function activityOnly(seg: ActivitySegment): FusedTripDraft | null {
  const mode = osTypeToMode(seg.type);
  if (mode === null) return null; // stationary/unknown — defensive, filtered upstream

  const durationH = (seg.endMs - seg.startMs) / 3_600_000;
  // walk tries the pedometer first; car AND cycling both try a routed distance
  // between CLVisit endpoints (visit-to-visit routing works for any
  // point-to-point trip, not just driving) — 'estimate' is the hook's fallback
  // when pedometer/route come up empty, never a first choice.
  const needsDistance: NeedsDistance = mode === 'walk' ? 'pedometer' : 'route';

  // STABLE across refreshes: CMMotionActivity history re-reports identical
  // startDates, but round down to the minute defensively so a sub-minute jitter
  // can't fork one trip into two rows. No separate GPS key exists for an
  // activity-only draft, so actAliasKey mirrors clientTripKey.
  const key = activityKey(seg.startMs);

  return {
    clientTripKey: key,
    actAliasKey: key,
    mode,
    distanceKm: null,
    startTime: new Date(seg.startMs),
    endTime: new Date(seg.endMs),
    confidence: round2(activityConfidencePrior(seg.confidence)),
    needsDistance,
    features: {
      signal: 'activity',
      osType: seg.type,
      osConfidence: seg.confidence,
      // Hint only — the pipeline overwrites this with the source that resolves
      // (falling back to 'estimate' when pedometer/route come up empty).
      distanceSource: needsDistance ?? 'estimate',
      durationH,
    },
  };
}

/**
 * Fuses GPS-classified trips with OS activity segments into a single draft list:
 *
 *   a. A GPS trip and a segment overlapping >= 50% of the SHORTER interval MERGE
 *      into one draft on the GPS trip's clientTripKey + distance, reconciling the
 *      mode/confidence (agree -> boost; confident conflict -> OS wins, capped;
 *      low-confidence conflict -> GPS unchanged).
 *   b. Segments with no GPS overlap become activity-only drafts (distance
 *      unresolved) — these are the trips the closed app never saw.
 *   c. GPS trips with no segment overlap pass through unchanged.
 *
 * Each segment merges into at most one GPS trip (greedy by largest overlap).
 * `nowMs` is accepted for signature symmetry / future use; overlap math needs no
 * clock.
 */
export function fuseSignals(
  gpsTrips: ClassifiedTrip[],
  segments: ActivitySegment[],
  _nowMs: number = Date.now(),
): FusedTripDraft[] {
  const drafts: FusedTripDraft[] = [];
  const usedSegments = new Set<number>();

  for (const gps of gpsTrips) {
    const gpsStart = gps.startTime.getTime();
    const gpsEnd = gps.endTime.getTime();
    const gpsDurationMs = gpsEnd - gpsStart;

    let bestIdx = -1;
    let bestOverlap = 0;
    for (let i = 0; i < segments.length; i++) {
      if (usedSegments.has(i)) continue;
      const seg = segments[i];
      const overlapMs = intervalOverlapMs(gpsStart, gpsEnd, seg.startMs, seg.endMs);
      if (overlapMs <= 0) continue;
      const shorter = Math.min(gpsDurationMs, seg.endMs - seg.startMs);
      const ratio = shorter > 0 ? overlapMs / shorter : 0;
      if (ratio >= MERGE_OVERLAP_RATIO && overlapMs > bestOverlap) {
        bestOverlap = overlapMs;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      drafts.push(gpsPassThrough(gps));
    } else {
      usedSegments.add(bestIdx);
      drafts.push(mergeTrip(gps, segments[bestIdx]));
    }
  }

  for (let i = 0; i < segments.length; i++) {
    if (usedSegments.has(i)) continue;
    const draft = activityOnly(segments[i]);
    if (draft) drafts.push(draft);
  }

  return drafts;
}

// ─── finalizeDraftStatus ────────────────────────────────────────────────────

/**
 * Decides the final detected_trips status for a fused draft AFTER distance
 * resolution — the single gate hooks/useTrips.ts calls once distanceKm and
 * distanceSource are settled (GPS/pedometer/route/estimate).
 *
 * Delegates to tripEngine's decideTripAction() for the normal mode/confidence/
 * distance heuristic, then applies one absolute override on top: ANY draft
 * whose distance ultimately came from the conservative estimateDistanceKm()
 * fallback — walk, cycling, OR car — is forced to needs_confirmation,
 * regardless of mode, resolved distance, or confidence. This is deliberately
 * NOT implemented as "just cap the confidence" (see ESTIMATE_CONFIDENCE_CAP):
 * confidence is a continuous, blendable number, and nothing about the cap
 * alone prevents an agreement boost or a future heuristic change from pushing
 * an estimated-distance trip's confidence back over an auto-confirm
 * threshold. Gating explicitly on distanceSource === 'estimate' is the only
 * guard that can't be silently defeated that way.
 */
export function finalizeDraftStatus(params: {
  mode: TripMode;
  confidence: number;
  distanceKm: number;
  distanceSource: DistanceSource;
}): TripStatus {
  if (params.distanceSource === 'estimate') return 'needs_confirmation';
  return decideTripAction(params);
}
