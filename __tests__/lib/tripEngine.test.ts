import {
  haversineKm,
  segmentTrips,
  computeSegmentStats,
  classifyTrip,
  decideTripAction,
  analyzeTrips,
  detectActiveTrip,
  CAR_KG_PER_KM,
  TRIP_GAP_MS,
  type TripPoint,
  type SegmentStats,
} from '@/lib/tripEngine';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Builds a straight-line track: `count` points, `stepKm` apart, `stepMs` apart in time. */
function buildTrack(
  count: number,
  stepKm: number,
  stepMs: number,
  startTimestamp = 0,
  startLat = 51.5,
): TripPoint[] {
  const kmPerDegreeLat = 111; // ~111km per degree latitude
  const points: TripPoint[] = [];
  for (let i = 0; i < count; i++) {
    points.push({
      latitude: startLat + (i * stepKm) / kmPerDegreeLat,
      longitude: -0.1,
      speed: null,
      timestamp: startTimestamp + i * stepMs,
    });
  }
  return points;
}

function statsFor(avgSpeedKmh: number, distanceKm: number, pointCount = 10, durationH = 0.5): SegmentStats {
  return {
    avgSpeedKmh,
    distanceKm,
    pointCount,
    durationH,
    startTime: new Date(0),
    endTime: new Date(durationH * 3_600_000),
  };
}

// ─── haversineKm ──────────────────────────────────────────────────────────────

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });

  it('returns ~111km for one degree of latitude', () => {
    expect(haversineKm(51.5, -0.1, 52.5, -0.1)).toBeCloseTo(111.19, 0);
  });
});

// ─── segmentTrips ─────────────────────────────────────────────────────────────

describe('segmentTrips', () => {
  it('returns empty for fewer than 2 points', () => {
    expect(segmentTrips([])).toEqual([]);
    expect(segmentTrips(buildTrack(1, 1, 60_000))).toEqual([]);
  });

  it('keeps one segment when points are continuous (no gap)', () => {
    const points = buildTrack(10, 1, 60_000); // 1 point/min, 1km apart
    const now = points[points.length - 1].timestamp + TRIP_GAP_MS + 1000; // silence has closed the trip
    const segments = segmentTrips(points, now);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toHaveLength(10);
  });

  it('splits into two segments on a >5min gap', () => {
    const first = buildTrack(5, 1, 60_000, 0); // t=0..4min
    const gapStart = first[first.length - 1].timestamp + TRIP_GAP_MS + 60_000; // 6 min after last point
    const second = buildTrack(5, 1, 60_000, gapStart);
    const points = [...first, ...second];
    const now = second[second.length - 1].timestamp + TRIP_GAP_MS + 1000; // silence has closed the second trip

    const segments = segmentTrips(points, now);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toHaveLength(5);
    expect(segments[1]).toHaveLength(5);
  });

  it('drops segments with fewer than 2 points (isolated point after a gap)', () => {
    const first = buildTrack(5, 1, 60_000, 0);
    const isolatedTimestamp = first[first.length - 1].timestamp + TRIP_GAP_MS + 60_000;
    const points = [...first, { latitude: 51.6, longitude: -0.1, speed: null, timestamp: isolatedTimestamp }];
    const now = isolatedTimestamp + 1000;

    const segments = segmentTrips(points, now);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toHaveLength(5);
  });

  it('excludes points older than 24h', () => {
    const now = 30 * 60 * 60 * 1000; // 30h mark
    const stale = buildTrack(5, 1, 60_000, 0); // all in the first hour — stale
    const recent = buildTrack(5, 1, 60_000, now - 10 * 60 * 1000); // last 10 min — fresh
    const points = [...stale, ...recent];

    const segments = segmentTrips(points, now);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toHaveLength(5);
  });

  it('excludes a still-open trailing segment (trip may still be in progress)', () => {
    // clientTripKey is permanent per segment start, so a mid-drive sync would
    // lock in partial distance forever — the live segment belongs to
    // detectActiveTrip, not to trip creation.
    const points = buildTrack(4, 1, 60_000, 0);
    const now = points[points.length - 1].timestamp + 1000; // barely after last point — no gap yet
    expect(segmentTrips(points, now)).toHaveLength(0);
  });

  it('includes the trailing segment once 5 min of silence has closed it', () => {
    const points = buildTrack(4, 1, 60_000, 0);
    const now = points[points.length - 1].timestamp + TRIP_GAP_MS + 1000;
    const segments = segmentTrips(points, now);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toHaveLength(4);
  });
});

// ─── computeSegmentStats ──────────────────────────────────────────────────────

describe('computeSegmentStats', () => {
  it('sums distance across consecutive points', () => {
    const points = buildTrack(5, 2, 60_000); // 4 legs * 2km = 8km
    const stats = computeSegmentStats(points);
    expect(stats.distanceKm).toBeCloseTo(8, 0);
    expect(stats.pointCount).toBe(5);
  });

  it('derives avg speed from distance / duration', () => {
    // 10 points, 1 min apart, 1km apart -> 9km in 9min -> 60km/h avg
    const points = buildTrack(10, 1, 60_000);
    const stats = computeSegmentStats(points);
    expect(stats.avgSpeedKmh).toBeCloseTo(60, -1);
  });

  it('returns 0 avg speed for zero-duration segment', () => {
    const points: TripPoint[] = [
      { latitude: 51.5, longitude: -0.1, speed: null, timestamp: 1000 },
      { latitude: 51.5001, longitude: -0.1, speed: null, timestamp: 1000 },
    ];
    const stats = computeSegmentStats(points);
    expect(stats.avgSpeedKmh).toBe(0);
  });
});

// ─── classifyTrip ─────────────────────────────────────────────────────────────

describe('classifyTrip', () => {
  it('discards below the 2 km/h speed floor', () => {
    expect(classifyTrip(statsFor(1, 5))).toBeNull();
  });

  it('discards below the 1 km distance floor even at driving speed', () => {
    expect(classifyTrip(statsFor(40, 0.5))).toBeNull();
  });

  it('classifies 2-7 km/h as walk (reinstated)', () => {
    const result = classifyTrip(statsFor(4.5, 2));
    expect(result?.mode).toBe('walk');
  });

  it('classifies 7-28 km/h as cycling', () => {
    const result = classifyTrip(statsFor(17, 5));
    expect(result?.mode).toBe('cycling');
  });

  it('classifies >=28 km/h as car', () => {
    const result = classifyTrip(statsFor(45, 10));
    expect(result?.mode).toBe('car');
  });

  it('boundary: exactly 7 km/h resolves to cycling, not walk', () => {
    expect(classifyTrip(statsFor(7, 3))?.mode).toBe('cycling');
  });

  it('boundary: exactly 28 km/h resolves to car, not cycling', () => {
    expect(classifyTrip(statsFor(28, 3))?.mode).toBe('car');
  });

  it('confidence is always within [0.3, 0.95]', () => {
    const speeds = [2, 3, 4.5, 6.9, 7, 15, 27.9, 28, 45, 90, 200];
    for (const s of speeds) {
      const result = classifyTrip(statsFor(s, 10, 20, 1));
      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThanOrEqual(0.3);
      expect(result!.confidence).toBeLessThanOrEqual(0.95);
    }
  });

  it('confidence rises moving away from a band boundary toward its center (walk)', () => {
    const nearBoundary = classifyTrip(statsFor(2.1, 5, 10, 0.5))!.confidence;
    const center = classifyTrip(statsFor(4.5, 5, 10, 0.5))!.confidence;
    const nearOtherBoundary = classifyTrip(statsFor(6.9, 5, 10, 0.5))!.confidence;
    expect(center).toBeGreaterThan(nearBoundary);
    expect(center).toBeGreaterThan(nearOtherBoundary);
  });

  it('confidence rises moving away from a band boundary toward its center (cycling)', () => {
    const nearBoundary = classifyTrip(statsFor(7.5, 5, 10, 0.5))!.confidence;
    const center = classifyTrip(statsFor(17.5, 5, 10, 0.5))!.confidence;
    const nearOtherBoundary = classifyTrip(statsFor(27.5, 5, 10, 0.5))!.confidence;
    expect(center).toBeGreaterThan(nearBoundary);
    expect(center).toBeGreaterThan(nearOtherBoundary);
  });

  it('car confidence increases monotonically further above the floor, then saturates', () => {
    const atFloor = classifyTrip(statsFor(28, 5, 10, 0.5))!.confidence;
    const mid = classifyTrip(statsFor(35, 5, 10, 0.5))!.confidence;
    const deep = classifyTrip(statsFor(50, 5, 10, 0.5))!.confidence;
    const veryFast = classifyTrip(statsFor(120, 5, 10, 0.5))!.confidence;
    expect(mid).toBeGreaterThan(atFloor);
    expect(deep).toBeGreaterThanOrEqual(mid);
    // Saturates rather than dropping for very high (but still car-band) speeds
    expect(veryFast).toBe(deep);
  });

  it('more points raises confidence, all else equal', () => {
    const fewPoints = classifyTrip(statsFor(45, 10, 2, 0.5))!.confidence;
    const manyPoints = classifyTrip(statsFor(45, 10, 20, 0.5))!.confidence;
    expect(manyPoints).toBeGreaterThan(fewPoints);
  });

  it('longer duration raises confidence, all else equal', () => {
    const short = classifyTrip(statsFor(45, 10, 10, 0.05))!.confidence;
    const long = classifyTrip(statsFor(45, 10, 10, 1))!.confidence;
    expect(long).toBeGreaterThan(short);
  });
});

// ─── decideTripAction ─────────────────────────────────────────────────────────

describe('decideTripAction', () => {
  it('auto-confirms a confident, long-enough car trip', () => {
    expect(decideTripAction({ mode: 'car', confidence: 0.75, distanceKm: 2 })).toBe('auto_confirmed');
    expect(decideTripAction({ mode: 'car', confidence: 0.9, distanceKm: 10 })).toBe('auto_confirmed');
  });

  it('needs confirmation for a low-confidence car trip even if long', () => {
    expect(decideTripAction({ mode: 'car', confidence: 0.74, distanceKm: 10 })).toBe('needs_confirmation');
  });

  it('needs confirmation for a confident but too-short car trip', () => {
    expect(decideTripAction({ mode: 'car', confidence: 0.9, distanceKm: 1.9 })).toBe('needs_confirmation');
  });

  it('auto-confirms walk/cycling above 0.5km regardless of confidence', () => {
    expect(decideTripAction({ mode: 'walk', confidence: 0.3, distanceKm: 0.5 })).toBe('auto_confirmed');
    expect(decideTripAction({ mode: 'cycling', confidence: 0.3, distanceKm: 5 })).toBe('auto_confirmed');
  });

  it('needs confirmation for walk/cycling below 0.5km', () => {
    expect(decideTripAction({ mode: 'walk', confidence: 0.95, distanceKm: 0.49 })).toBe('needs_confirmation');
    expect(decideTripAction({ mode: 'cycling', confidence: 0.95, distanceKm: 0.1 })).toBe('needs_confirmation');
  });

  it('falls back to needs_confirmation for unhandled modes', () => {
    expect(decideTripAction({ mode: 'bus', confidence: 0.95, distanceKm: 10 })).toBe('needs_confirmation');
    expect(decideTripAction({ mode: 'unknown', confidence: 0.95, distanceKm: 10 })).toBe('needs_confirmation');
  });
});

// ─── analyzeTrips (full pipeline) ─────────────────────────────────────────────

describe('analyzeTrips', () => {
  it('returns an empty array for an empty buffer', () => {
    expect(analyzeTrips([])).toEqual([]);
  });

  it('produces one auto_confirmed car trip for a 12km/45km/h drive', () => {
    // 16 points, 1 min apart, 0.75km apart -> 45km/h avg, 11.25km total
    const points = buildTrack(17, 0.75, 60_000, 0);
    const now = points[points.length - 1].timestamp + TRIP_GAP_MS + 1000; // trip closed by silence
    const trips = analyzeTrips(points, now);
    expect(trips).toHaveLength(1);
    expect(trips[0].mode).toBe('car');
    expect(trips[0].status).toBe('auto_confirmed');
    expect(trips[0].clientTripKey).toBe(String(points[0].timestamp));
  });

  it('discards a short stationary blip', () => {
    // 3 points, barely moving, 1 min apart
    const points: TripPoint[] = [
      { latitude: 51.5, longitude: -0.1, speed: null, timestamp: 0 },
      { latitude: 51.50001, longitude: -0.1, speed: null, timestamp: 60_000 },
      { latitude: 51.50002, longitude: -0.1, speed: null, timestamp: 120_000 },
    ];
    const trips = analyzeTrips(points, 130_000);
    expect(trips).toEqual([]);
  });
});

// ─── detectActiveTrip ─────────────────────────────────────────────────────────

describe('detectActiveTrip', () => {
  it('is idle for fewer than 3 points', () => {
    expect(detectActiveTrip([]).isInMotion).toBe(false);
    expect(detectActiveTrip(buildTrack(2, 1, 60_000)).isInMotion).toBe(false);
  });

  it('is idle when the most recent point is stale', () => {
    const points = buildTrack(5, 1, 60_000, 0);
    const now = points[points.length - 1].timestamp + 20 * 60 * 1000; // 20 min later
    expect(detectActiveTrip(points, now).isInMotion).toBe(false);
  });

  it('detects an active fast-moving trip with a fresh last point', () => {
    // 1km apart, 1 min apart -> 60km/h avg for the last 2 legs
    const points = buildTrack(5, 1, 60_000, 0);
    const now = points[points.length - 1].timestamp + 1000;
    const active = detectActiveTrip(points, now);
    expect(active.isInMotion).toBe(true);
    expect(active.currentTripKm).toBeGreaterThan(0);
  });

  it('is idle when recent average speed is at/below the walking-adjacent threshold', () => {
    // 0.1km apart, 1 min apart -> 6km/h avg — well below the 28km/h active threshold
    const points = buildTrack(5, 0.1, 60_000, 0);
    const now = points[points.length - 1].timestamp + 1000;
    expect(detectActiveTrip(points, now).isInMotion).toBe(false);
  });
});

// ─── CAR_KG_PER_KM sanity ─────────────────────────────────────────────────────

describe('CAR_KG_PER_KM', () => {
  it('is the DEFRA 2025 petrol car medium factor', () => {
    expect(CAR_KG_PER_KM).toBeCloseTo(0.168);
  });
});
