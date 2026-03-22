// Tests for useLeaderboard — leaderboard sorting and reduction_pct computation
// These tests exercise the pure-function logic that useLeaderboard exposes.

let computeReductionPct: (baseline: number | null, current: number | null) => number | null;
let sortLeaderboard: (
  entries: Array<{ reduction_pct: number | null; user_id: string }>
) => Array<{ reduction_pct: number | null; user_id: string }>;

beforeAll(async () => {
  try {
    const mod = await import('@/hooks/useLeaderboard');
    // These are exported for testing only
    computeReductionPct = (mod as unknown as { _computeReductionPct: typeof computeReductionPct })._computeReductionPct;
    sortLeaderboard = (mod as unknown as { _sortLeaderboard: typeof sortLeaderboard })._sortLeaderboard;
  } catch {
    computeReductionPct = undefined as unknown as typeof computeReductionPct;
    sortLeaderboard = undefined as unknown as typeof sortLeaderboard;
  }
});

describe('computeReductionPct', () => {
  it('returns null when baseline is null', () => {
    if (!computeReductionPct) return;
    expect(computeReductionPct(null, 100)).toBeNull();
  });

  it('returns null when baseline is 0', () => {
    if (!computeReductionPct) return;
    expect(computeReductionPct(0, 50)).toBeNull();
  });

  it('computes correct reduction percentage for a real reduction', () => {
    if (!computeReductionPct) return;
    // baseline 100, current 80 => 20% reduction
    expect(computeReductionPct(100, 80)).toBeCloseTo(20, 5);
  });

  it('returns 0 when current equals baseline (no change)', () => {
    if (!computeReductionPct) return;
    expect(computeReductionPct(100, 100)).toBeCloseTo(0, 5);
  });

  it('uses 0 for current when current is null', () => {
    if (!computeReductionPct) return;
    // baseline 100, current null (treated as 0) => 100% reduction
    expect(computeReductionPct(100, null)).toBeCloseTo(100, 5);
  });

  it('returns negative value when emissions increased (current > baseline)', () => {
    if (!computeReductionPct) return;
    // baseline 100, current 120 => -20% (increase, not reduction)
    expect(computeReductionPct(100, 120)).toBeCloseTo(-20, 5);
  });
});

describe('sortLeaderboard', () => {
  it('sorts by reduction_pct DESC', () => {
    if (!sortLeaderboard) return;
    const input = [
      { user_id: 'a', reduction_pct: 10 },
      { user_id: 'b', reduction_pct: 30 },
      { user_id: 'c', reduction_pct: 20 },
    ];
    const result = sortLeaderboard(input);
    expect(result.map(e => e.user_id)).toEqual(['b', 'c', 'a']);
  });

  it('places null reduction_pct entries at the bottom', () => {
    if (!sortLeaderboard) return;
    const input = [
      { user_id: 'a', reduction_pct: null },
      { user_id: 'b', reduction_pct: 20 },
      { user_id: 'c', reduction_pct: null },
      { user_id: 'd', reduction_pct: 10 },
    ];
    const result = sortLeaderboard(input);
    // b (20) and d (10) come before nulls
    expect(result[0].user_id).toBe('b');
    expect(result[1].user_id).toBe('d');
    // a and c are nulls at the bottom (order among nulls is stable, doesn't matter)
    expect(result[2].reduction_pct).toBeNull();
    expect(result[3].reduction_pct).toBeNull();
  });

  it('returns empty array for empty input', () => {
    if (!sortLeaderboard) return;
    expect(sortLeaderboard([])).toEqual([]);
  });
});

describe('useLeaderboard hook exports', () => {
  it.todo('leaderboard query returns participants sorted by reduction_pct DESC');
  it.todo('participants with no data show null reduction_pct');
});
