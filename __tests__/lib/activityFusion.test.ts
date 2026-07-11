import {
  filterMeaningfulSegments,
  fuseSignals,
  estimateDistanceKm,
  findVisitEndpoints,
  finalizeDraftStatus,
  osTypeToMode,
  activityConfidencePrior,
  ESTIMATE_CONFIDENCE_CAP,
  MERGE_OVERLAP_RATIO,
  VISIT_MATCH_MS,
  type ActivitySegment,
  type ActivityType,
  type ActivityConfidence,
  type Visit,
} from '@/lib/activityFusion';
import type { ClassifiedTrip } from '@/lib/tripEngine';
import type { TripMode } from '@/types/emission';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const MIN = 60_000; // ms per minute

/** A GPS-classified trip spanning [startMin, endMin], expressed in minutes. */
function gpsTrip(
  startMin: number,
  endMin: number,
  mode: TripMode,
  confidence: number,
  distanceKm = 10,
): ClassifiedTrip {
  const durationH = (endMin - startMin) / 60;
  return {
    clientTripKey: String(startMin * MIN),
    mode,
    distanceKm,
    avgSpeedKmh: durationH > 0 ? Math.round(distanceKm / durationH) : 0,
    startTime: new Date(startMin * MIN),
    endTime: new Date(endMin * MIN),
    confidence,
    status: 'needs_confirmation',
    features: { pointCount: 10, durationH },
  };
}

function segment(
  type: ActivityType,
  confidence: ActivityConfidence,
  startMin: number,
  endMin: number,
): ActivitySegment {
  return { type, confidence, startMs: startMin * MIN, endMs: endMin * MIN };
}

// A `now` far past every fixture's timeline so nothing reads as in-progress.
const NOW = 10_000 * MIN;

// ─── osTypeToMode / activityConfidencePrior ─────────────────────────────────

describe('osTypeToMode', () => {
  it('maps OS activity families to trip modes (running collapses to walk)', () => {
    expect(osTypeToMode('automotive')).toBe('car');
    expect(osTypeToMode('cycling')).toBe('cycling');
    expect(osTypeToMode('walking')).toBe('walk');
    expect(osTypeToMode('running')).toBe('walk');
  });

  it('returns null for non-movement types', () => {
    expect(osTypeToMode('stationary')).toBeNull();
    expect(osTypeToMode('unknown')).toBeNull();
  });
});

describe('activityConfidencePrior', () => {
  it('maps low/medium/high to 0.4/0.65/0.85', () => {
    expect(activityConfidencePrior('low')).toBe(0.4);
    expect(activityConfidencePrior('medium')).toBe(0.65);
    expect(activityConfidencePrior('high')).toBe(0.85);
  });
});

// ─── filterMeaningfulSegments ─────────────────────────────────────────────────

describe('filterMeaningfulSegments', () => {
  it('drops stationary and unknown regardless of duration', () => {
    const segs = [segment('stationary', 'high', 0, 60), segment('unknown', 'high', 0, 60)];
    expect(filterMeaningfulSegments(segs, NOW)).toEqual([]);
  });

  it('keeps automotive/cycling >= 5 min, drops shorter', () => {
    expect(filterMeaningfulSegments([segment('automotive', 'high', 0, 5)], NOW)).toHaveLength(1);
    expect(filterMeaningfulSegments([segment('cycling', 'high', 0, 5)], NOW)).toHaveLength(1);
    expect(filterMeaningfulSegments([segment('automotive', 'high', 0, 4)], NOW)).toEqual([]);
    expect(filterMeaningfulSegments([segment('cycling', 'high', 0, 4)], NOW)).toEqual([]);
  });

  it('keeps walking/running >= 10 min, drops shorter (the higher walk threshold)', () => {
    expect(filterMeaningfulSegments([segment('walking', 'high', 0, 10)], NOW)).toHaveLength(1);
    expect(filterMeaningfulSegments([segment('running', 'high', 0, 10)], NOW)).toHaveLength(1);
    // 8 min: long enough for a vehicle, too short for a walk
    expect(filterMeaningfulSegments([segment('walking', 'high', 0, 8)], NOW)).toEqual([]);
    expect(filterMeaningfulSegments([segment('running', 'high', 0, 8)], NOW)).toEqual([]);
  });

  it('drops a segment whose end is within 5 min of now (still in progress)', () => {
    const now = 100 * MIN;
    // ends exactly 5 min before now -> still counts as in-progress (dropped)
    const atBoundary = segment('automotive', 'high', 80, 95);
    expect(filterMeaningfulSegments([atBoundary], now)).toEqual([]);
    // ends just over 5 min before now -> closed, kept
    const closed: ActivitySegment = { type: 'automotive', confidence: 'high', startMs: 80 * MIN, endMs: 95 * MIN - 1 };
    expect(filterMeaningfulSegments([closed], now)).toHaveLength(1);
  });
});

// ─── fuseSignals: pass-through ─────────────────────────────────────────────────

describe('fuseSignals — GPS-only pass-through', () => {
  it('passes a GPS trip through unchanged when there are no segments', () => {
    const t = gpsTrip(0, 20, 'car', 0.8, 12);
    const [draft] = fuseSignals([t], [], NOW);
    expect(draft.clientTripKey).toBe(t.clientTripKey);
    expect(draft.mode).toBe('car');
    expect(draft.distanceKm).toBe(12);
    expect(draft.confidence).toBeCloseTo(0.8, 5);
    expect(draft.needsDistance).toBeNull();
    expect(draft.features.signal).toBe('gps');
    expect(draft.features.distanceSource).toBe('gps');
    expect(draft.features.osType).toBeNull();
    expect(draft.features.pointCount).toBe(10);
    expect(draft.features.avgSpeedKmh).toBe(t.avgSpeedKmh);
  });
});

// ─── fuseSignals: merge-overlap math ───────────────────────────────────────────

describe('fuseSignals — merge overlap math', () => {
  it('merges when overlap is exactly 50% of the shorter interval', () => {
    const t = gpsTrip(0, 20, 'car', 0.6, 10); // 20 min
    const seg = segment('automotive', 'high', 10, 30); // overlap [10,20]=10min; shorter=20 -> 0.5
    const drafts = fuseSignals([t], [seg], NOW);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].features.signal).toBe('fused');
  });

  it('measures the ratio against the SHORTER interval, not the GPS trip', () => {
    const t = gpsTrip(0, 60, 'car', 0.6, 30); // 60 min
    const seg = segment('automotive', 'high', 50, 60); // 10 min fully inside; ratio 1.0 vs shorter
    const drafts = fuseSignals([t], [seg], NOW);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].features.signal).toBe('fused');
  });

  it('does NOT merge below 50% overlap — GPS passes through, segment becomes activity-only', () => {
    const t = gpsTrip(0, 20, 'car', 0.6, 10); // 20 min
    const seg = segment('automotive', 'high', 12, 60); // overlap 8min; shorter=20 -> 0.4
    const drafts = fuseSignals([t], [seg], NOW);
    expect(drafts).toHaveLength(2);
    const signals = drafts.map((d) => d.features.signal).sort();
    expect(signals).toEqual(['activity', 'gps']);
  });

  it('consumes each segment at most once (a merged segment is not re-emitted as activity-only)', () => {
    const t = gpsTrip(0, 20, 'car', 0.6, 10);
    const seg = segment('automotive', 'high', 0, 20); // full overlap
    const drafts = fuseSignals([t], [seg], NOW);
    expect(drafts).toHaveLength(1);
    expect(drafts.filter((d) => d.features.signal === 'activity')).toHaveLength(0);
  });

  it('MERGE_OVERLAP_RATIO is 0.5', () => {
    expect(MERGE_OVERLAP_RATIO).toBe(0.5);
  });
});

// ─── fuseSignals: reconciliation rules ─────────────────────────────────────────

describe('fuseSignals — agree / conflict / low-confidence reconciliation', () => {
  it('agree: boosts confidence via a 50/50 blend + 0.15', () => {
    // OS automotive(high, prior 0.85) agrees with GPS car(0.61)
    // blend = 0.5*(0.85 + 0.61) = 0.73; +0.15 = 0.88
    const t = gpsTrip(0, 20, 'car', 0.61, 12);
    const [draft] = fuseSignals([t], [segment('automotive', 'high', 0, 20)], NOW);
    expect(draft.mode).toBe('car');
    expect(draft.confidence).toBeCloseTo(0.88, 2);
    expect(draft.distanceKm).toBe(12); // GPS distance kept
    expect(draft.needsDistance).toBeNull();
    expect(draft.features.signal).toBe('fused');
    expect(draft.features.osType).toBe('automotive');
    expect(draft.features.osConfidence).toBe('high');
    expect(draft.features.distanceSource).toBe('gps');
  });

  it('agree: caps the boosted confidence at 0.95', () => {
    // blend = 0.5*(0.85 + 0.9) = 0.875; +0.15 = 1.025 -> capped 0.95
    const t = gpsTrip(0, 20, 'car', 0.9, 10);
    const [draft] = fuseSignals([t], [segment('automotive', 'high', 0, 20)], NOW);
    expect(draft.confidence).toBeCloseTo(0.95, 5);
  });

  it('conflict + confident OS: the OS type wins, capped at 0.6 (lands needs_confirmation)', () => {
    // GPS says cycling; OS automotive(high) disagrees -> car wins, capped at 0.6
    const t = gpsTrip(0, 20, 'cycling', 0.7, 8);
    const [draft] = fuseSignals([t], [segment('automotive', 'high', 0, 20)], NOW);
    expect(draft.mode).toBe('car');
    expect(draft.confidence).toBeCloseTo(0.6, 5);
    expect(draft.distanceKm).toBe(8); // GPS distance still kept
    expect(draft.features.signal).toBe('fused');
  });

  it('conflict + medium OS below the cap: OS wins but confidence stays under 0.6', () => {
    // blend = 0.5*(0.65 + 0.3) = 0.475 -> under the 0.6 cap
    const t = gpsTrip(0, 20, 'walk', 0.3, 3);
    const [draft] = fuseSignals([t], [segment('automotive', 'medium', 0, 20)], NOW);
    expect(draft.mode).toBe('car');
    expect(draft.confidence).toBeLessThan(0.6);
    expect(draft.confidence).toBeGreaterThan(0.4);
  });

  it('conflict + low OS confidence: the GPS verdict is kept unchanged', () => {
    const t = gpsTrip(0, 20, 'cycling', 0.72, 8);
    const [draft] = fuseSignals([t], [segment('automotive', 'low', 0, 20)], NOW);
    expect(draft.mode).toBe('cycling'); // GPS wins
    expect(draft.confidence).toBeCloseTo(0.72, 5); // unchanged — no blend, no boost
    expect(draft.features.signal).toBe('fused');
  });
});

// ─── fuseSignals: activity-only drafts ─────────────────────────────────────────

describe('fuseSignals — activity-only drafts (no GPS overlap)', () => {
  it('maps automotive -> car needing route distance', () => {
    const [draft] = fuseSignals([], [segment('automotive', 'high', 0, 20)], NOW);
    expect(draft.mode).toBe('car');
    expect(draft.distanceKm).toBeNull();
    expect(draft.needsDistance).toBe('route');
    expect(draft.confidence).toBeCloseTo(0.85, 5); // prior only
    expect(draft.features.signal).toBe('activity');
    expect(draft.features.distanceSource).toBe('route');
  });

  it('maps walking -> walk needing pedometer distance', () => {
    const [draft] = fuseSignals([], [segment('walking', 'medium', 0, 20)], NOW);
    expect(draft.mode).toBe('walk');
    expect(draft.needsDistance).toBe('pedometer');
    expect(draft.confidence).toBeCloseTo(0.65, 5);
  });

  it('maps running -> walk needing pedometer distance', () => {
    const [draft] = fuseSignals([], [segment('running', 'high', 0, 20)], NOW);
    expect(draft.mode).toBe('walk');
    expect(draft.needsDistance).toBe('pedometer');
  });

  it('maps cycling -> cycling needing a routed distance (visit endpoints work for any point-to-point trip)', () => {
    const [draft] = fuseSignals([], [segment('cycling', 'high', 0, 20)], NOW);
    expect(draft.mode).toBe('cycling');
    expect(draft.needsDistance).toBe('route');
    expect(draft.features.distanceSource).toBe('route');
  });

  it('derives a stable clientTripKey: act_ + start floored to the minute', () => {
    const base = 999_999_960_000; // a whole-minute epoch
    const jitterA: ActivitySegment = { type: 'walking', confidence: 'high', startMs: base + 10_000, endMs: base + 20 * MIN };
    const jitterB: ActivitySegment = { type: 'walking', confidence: 'high', startMs: base + 40_000, endMs: base + 20 * MIN };
    const [a] = fuseSignals([], [jitterA], NOW);
    const [b] = fuseSignals([], [jitterB], NOW);
    expect(a.clientTripKey).toBe(`act_${base}`);
    expect(b.clientTripKey).toBe(`act_${base}`); // same minute -> identical key
  });

  it('carries actAliasKey equal to clientTripKey (no separate GPS key exists)', () => {
    const [draft] = fuseSignals([], [segment('walking', 'high', 0, 20)], NOW);
    expect(draft.actAliasKey).toBe(draft.clientTripKey);
  });
});

// ─── fuseSignals: actAliasKey (merged-trip identity aliasing) ─────────────────

describe('fuseSignals — actAliasKey on merged drafts', () => {
  it('a merged draft keeps the GPS clientTripKey but records the segment act_ identity as actAliasKey', () => {
    const t = gpsTrip(0, 20, 'car', 0.7, 10);
    const seg = segment('automotive', 'high', 0, 20); // full overlap -> merge
    const [draft] = fuseSignals([t], [seg], NOW);
    expect(draft.features.signal).toBe('fused');
    expect(draft.clientTripKey).toBe(t.clientTripKey); // GPS identity kept
    expect(draft.actAliasKey).toBe(`act_${0 * MIN}`); // segment's own act_ identity
    expect(draft.actAliasKey).not.toBe(draft.clientTripKey);
  });

  it('floors the merged segment start to the minute for actAliasKey, same as activity-only', () => {
    const t = gpsTrip(0, 20, 'car', 0.7, 10);
    const seg: ActivitySegment = { type: 'automotive', confidence: 'high', startMs: 90_000, endMs: 20 * MIN }; // 1min30s -> floors to 1 min
    const [draft] = fuseSignals([t], [seg], NOW);
    expect(draft.features.signal).toBe('fused');
    expect(draft.actAliasKey).toBe(`act_${60_000}`);
  });

  it('a GPS-only pass-through draft (no segment involved) has no actAliasKey', () => {
    const t = gpsTrip(0, 20, 'car', 0.8, 12);
    const [draft] = fuseSignals([t], [], NOW);
    expect(draft.actAliasKey).toBeUndefined();
  });
});

// ─── fuseSignals: combined scenario ────────────────────────────────────────────

describe('fuseSignals — mixed batch', () => {
  it('emits a fused, a GPS-only, and an activity-only draft together', () => {
    const merged = gpsTrip(0, 20, 'car', 0.7, 10);
    const gpsOnly = gpsTrip(100, 120, 'car', 0.8, 15);
    const mergeSeg = segment('automotive', 'high', 0, 20); // overlaps `merged`
    const loneSeg = segment('walking', 'high', 200, 220); // no GPS overlap

    const drafts = fuseSignals([merged, gpsOnly], [mergeSeg, loneSeg], NOW);
    const bySignal = new Map(drafts.map((d) => [d.features.signal, d]));
    expect(drafts).toHaveLength(3);
    expect(bySignal.get('fused')?.clientTripKey).toBe(merged.clientTripKey);
    expect(bySignal.get('gps')?.clientTripKey).toBe(gpsOnly.clientTripKey);
    expect(bySignal.get('activity')?.mode).toBe('walk');
  });
});

// ─── estimateDistanceKm ───────────────────────────────────────────────────────

describe('estimateDistanceKm', () => {
  it('uses conservative per-mode urban speeds', () => {
    expect(estimateDistanceKm('car', 1)).toBe(30); // 30 km/h
    expect(estimateDistanceKm('cycling', 1)).toBe(14); // 14 km/h
    expect(estimateDistanceKm('walk', 1)).toBe(4.5); // 4.5 km/h
  });

  it('scales with duration and rounds to 0.1 km', () => {
    expect(estimateDistanceKm('car', 0.5)).toBe(15);
    expect(estimateDistanceKm('walk', 1 / 6)).toBeCloseTo(0.8, 5); // 10 min walk ~ 0.75 -> 0.8
  });

  it('exposes the 0.5 confidence cap constant for estimated trips (never auto-logged)', () => {
    expect(ESTIMATE_CONFIDENCE_CAP).toBe(0.5);
  });
});

// ─── findVisitEndpoints ────────────────────────────────────────────────────────

describe('findVisitEndpoints', () => {
  const trip = { startTime: new Date(100 * MIN), endTime: new Date(130 * MIN) };

  function visit(arrivalMin: number, departureMin: number): Visit {
    return {
      lat: 51.5,
      lng: -0.1,
      arrivalMs: arrivalMin < 0 ? -1 : arrivalMin * MIN,
      departureMs: departureMin < 0 ? -1 : departureMin * MIN,
    };
  }

  it('pairs the visit departing near start with the visit arriving near end', () => {
    const origin = visit(40, 98); // departs 2 min before start
    const destination = visit(133, -1); // arrives 3 min after end, still there
    const result = findVisitEndpoints(trip, [origin, destination]);
    expect(result).not.toBeNull();
    expect(result!.origin).toBe(origin);
    expect(result!.destination).toBe(destination);
  });

  it('returns null when no visit departs near the trip start', () => {
    const origin = visit(40, 88); // departs 12 min before start -> outside ±10 min
    const destination = visit(133, -1);
    expect(findVisitEndpoints(trip, [origin, destination])).toBeNull();
  });

  it('ignores sentinel timestamps (-1 departure cannot be an origin)', () => {
    const ongoing = visit(99, -1); // near start by arrival, but departure is sentinel
    const destination = visit(133, -1);
    expect(findVisitEndpoints(trip, [ongoing, destination])).toBeNull();
  });

  it('a -1 departure sentinel never wins the origin match via raw numeric proximity', () => {
    // Trip starts at 5 min: |-1 - 5min| = 300,001ms, which is UNDER the 10-min
    // (600,000ms) match window — without the explicit `departureMs >= 0` guard,
    // this ongoing visit would incorrectly numerically qualify as the origin.
    const earlyTrip = { startTime: new Date(5 * MIN), endTime: new Date(35 * MIN) };
    const ongoing = visit(-1, -1); // still ongoing — no known departure at all
    const destination = visit(38, -1);
    expect(findVisitEndpoints(earlyTrip, [ongoing, destination])).toBeNull();
  });

  it('matches at the ±10 min boundary (inclusive)', () => {
    const origin = visit(40, 90); // departs exactly 10 min before start
    const destination = visit(140, -1); // arrives exactly 10 min after end
    const result = findVisitEndpoints(trip, [origin, destination]);
    expect(result).not.toBeNull();
    expect(result!.origin).toBe(origin);
    expect(result!.destination).toBe(destination);
  });

  it('VISIT_MATCH_MS is 10 minutes', () => {
    expect(VISIT_MATCH_MS).toBe(10 * MIN);
  });
});

// ─── finalizeDraftStatus ────────────────────────────────────────────────────

describe('finalizeDraftStatus', () => {
  it('CRITICAL: forces needs_confirmation for an estimated distance regardless of mode, confidence, or distance', () => {
    // High confidence, well past every auto-confirm threshold for each mode —
    // the estimate override must still win.
    expect(
      finalizeDraftStatus({ mode: 'car', confidence: 0.95, distanceKm: 50, distanceSource: 'estimate' }),
    ).toBe('needs_confirmation');
    expect(
      finalizeDraftStatus({ mode: 'walk', confidence: 0.95, distanceKm: 10, distanceSource: 'estimate' }),
    ).toBe('needs_confirmation');
    expect(
      finalizeDraftStatus({ mode: 'cycling', confidence: 0.95, distanceKm: 10, distanceSource: 'estimate' }),
    ).toBe('needs_confirmation');
  });

  it('delegates to decideTripAction for non-estimate sources: a qualifying car trip still auto-confirms', () => {
    expect(
      finalizeDraftStatus({ mode: 'car', confidence: 0.8, distanceKm: 5, distanceSource: 'gps' }),
    ).toBe('auto_confirmed');
    expect(
      finalizeDraftStatus({ mode: 'car', confidence: 0.8, distanceKm: 5, distanceSource: 'route' }),
    ).toBe('auto_confirmed');
  });

  it('delegates to decideTripAction for pedometer-sourced walk distance', () => {
    expect(
      finalizeDraftStatus({ mode: 'walk', confidence: 0.5, distanceKm: 1, distanceSource: 'pedometer' }),
    ).toBe('auto_confirmed');
  });

  it('still lands needs_confirmation for a non-estimate source that fails decideTripAction on its own merits', () => {
    // Low confidence car, below the auto-confirm threshold — not an estimate
    // override, just the ordinary heuristic.
    expect(
      finalizeDraftStatus({ mode: 'car', confidence: 0.5, distanceKm: 5, distanceSource: 'gps' }),
    ).toBe('needs_confirmation');
  });
});
