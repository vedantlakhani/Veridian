// lib/recap reuses getISOWeekStart/getLocalDateString from lib/emissions, which
// eagerly imports lib/supabase (createClient needs env that isn't set under
// Jest). Stub the client so the pure helpers under test load in isolation.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

import {
  weekWindow,
  previousWeekWindow,
  formatWeekRange,
  sumByCategory,
  sumTotal,
  computeWeekDelta,
  aggregateByDay,
  weekSparkline,
  distinctActiveDays,
  topCategoryInsight,
  selectWeekWin,
  winCopy,
  type RecapEntryInput,
  type RecapTripInput,
} from '@/lib/recap';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function entry(overrides: Partial<RecapEntryInput>): RecapEntryInput {
  return {
    category: 'food',
    kgCo2e: 3,
    at: new Date(2026, 2, 18, 8, 0), // Wed 2026-03-18
    ...overrides,
  };
}

function trip(overrides: Partial<RecapTripInput>): RecapTripInput {
  return {
    mode: 'walk',
    distanceKm: 2,
    savedKg: 0.34,
    at: new Date(2026, 2, 18, 8, 0),
    ...overrides,
  };
}

// ─── Week windowing ─────────────────────────────────────────────────────────────

describe('week windowing', () => {
  it('computes the ISO Mon–Sun window for a midweek date', () => {
    // 2026-03-18 is a Wednesday
    expect(weekWindow(new Date(2026, 2, 18))).toEqual({
      start: '2026-03-16',
      end: '2026-03-22',
    });
  });

  it('treats Sunday as the last day of its ISO week (not the next)', () => {
    // 2026-03-22 is a Sunday — still belongs to the week starting 2026-03-16
    expect(weekWindow(new Date(2026, 2, 22))).toEqual({
      start: '2026-03-16',
      end: '2026-03-22',
    });
  });

  it('computes the immediately-preceding ISO week', () => {
    expect(previousWeekWindow(new Date(2026, 2, 18))).toEqual({
      start: '2026-03-09',
      end: '2026-03-15',
    });
  });

  it('crosses a month boundary correctly (both ends)', () => {
    // 2026-04-01 is a Wednesday → week is Mar 30 – Apr 5
    expect(weekWindow(new Date(2026, 3, 1))).toEqual({
      start: '2026-03-30',
      end: '2026-04-05',
    });
    expect(previousWeekWindow(new Date(2026, 3, 1))).toEqual({
      start: '2026-03-23',
      end: '2026-03-29',
    });
  });

  it('formats a same-month range compactly', () => {
    expect(formatWeekRange({ start: '2026-03-16', end: '2026-03-22' })).toBe('Mar 16 – 22');
  });

  it('formats a cross-month range with both month names', () => {
    expect(formatWeekRange({ start: '2026-03-30', end: '2026-04-05' })).toBe('Mar 30 – Apr 5');
  });
});

// ─── Category split ───────────────────────────────────────────────────────────────

describe('sumByCategory / sumTotal', () => {
  it('aggregates per category and total', () => {
    const split = sumByCategory([
      entry({ category: 'food', kgCo2e: 4 }),
      entry({ category: 'transport', kgCo2e: 6 }),
      entry({ category: 'transport', kgCo2e: 2 }),
      entry({ category: 'energy', kgCo2e: 1 }),
    ]);
    expect(split).toEqual({ food: 4, transport: 8, energy: 1, shopping: 0, total: 13 });
  });

  it('sumTotal matches sumByCategory.total', () => {
    const rows = [entry({ kgCo2e: 2 }), entry({ kgCo2e: 5 })];
    expect(sumTotal(rows)).toBe(sumByCategory(rows).total);
  });

  it('returns all zeros for an empty week', () => {
    expect(sumByCategory([])).toEqual({ food: 0, transport: 0, energy: 0, shopping: 0, total: 0 });
  });
});

// ─── Delta math ─────────────────────────────────────────────────────────────────────

describe('computeWeekDelta', () => {
  it('reports a lighter week as an improvement with a "Down X%" line', () => {
    const d = computeWeekDelta(88, 100);
    expect(d.direction).toBe('down');
    expect(d.improved).toBe(true);
    expect(d.percent).toBe(12);
    expect(d.sentence).toBe('Down 12% from last week');
  });

  it('frames a heavier week neutrally — never as shame, improved=false', () => {
    const d = computeWeekDelta(120, 100);
    expect(d.direction).toBe('up');
    expect(d.improved).toBe(false);
    expect(d.percent).toBe(20);
    expect(d.sentence).toBe('Up 20% from last week — a fresh start this week');
    expect(d.sentence.toLowerCase()).not.toMatch(/worse|bad|fail/);
  });

  it('guards divide-by-zero on the first tracked week (previous = 0)', () => {
    const d = computeWeekDelta(42, 0);
    expect(d.direction).toBe('first-week');
    expect(d.percent).toBeNull();
    expect(d.improved).toBe(true);
    expect(d.sentence).toBe('Your first tracked week — this is your baseline');
  });

  it('handles a first week with no data at all (0 vs 0)', () => {
    const d = computeWeekDelta(0, 0);
    expect(d.direction).toBe('first-week');
    expect(d.percent).toBeNull();
    expect(d.sentence).toBe('Your first week starts here');
  });

  it('treats a sub-1% change as flat', () => {
    const d = computeWeekDelta(100.3, 100);
    expect(d.direction).toBe('flat');
    expect(d.percent).toBe(0);
    expect(d.improved).toBe(true);
    expect(d.sentence).toBe('About the same as last week');
  });

  it('caps an extreme percentage at 999', () => {
    const d = computeWeekDelta(50000, 100);
    expect(d.percent).toBe(999);
    expect(d.sentence).toBe('Up 999% from last week — a fresh start this week');
  });
});

// ─── Daily aggregates + sparkline ──────────────────────────────────────────────────

describe('aggregateByDay / weekSparkline / distinctActiveDays', () => {
  it('aggregates entries into per-day totals sorted ascending', () => {
    const days = aggregateByDay([
      entry({ at: new Date(2026, 2, 18, 9, 0), kgCo2e: 3 }),
      entry({ at: new Date(2026, 2, 18, 20, 0), kgCo2e: 2 }),
      entry({ at: new Date(2026, 2, 16, 9, 0), kgCo2e: 5 }),
    ]);
    expect(days).toEqual([
      { date: '2026-03-16', totalKg: 5 },
      { date: '2026-03-18', totalKg: 5 },
    ]);
  });

  it('aligns the sparkline Mon→Sun with 0 for empty days', () => {
    const window = { start: '2026-03-16', end: '2026-03-22' };
    const spark = weekSparkline(
      [
        entry({ at: new Date(2026, 2, 16), kgCo2e: 5 }), // Mon
        entry({ at: new Date(2026, 2, 18), kgCo2e: 3 }), // Wed
        entry({ at: new Date(2026, 2, 22), kgCo2e: 7 }), // Sun
      ],
      window,
    );
    expect(spark).toEqual([5, 0, 3, 0, 0, 0, 7]);
  });

  it('counts distinct active days across entries and trips (union)', () => {
    const n = distinctActiveDays(
      [entry({ at: new Date(2026, 2, 16) }), entry({ at: new Date(2026, 2, 16) })],
      [trip({ at: new Date(2026, 2, 18) })],
    );
    expect(n).toBe(2);
  });
});

// ─── Top category insight ───────────────────────────────────────────────────────────

describe('topCategoryInsight', () => {
  it('returns the dominant category with its share and a doable swap', () => {
    const top = topCategoryInsight({ food: 4, transport: 12, energy: 4, shopping: 0, total: 20 });
    expect(top?.category).toBe('transport');
    expect(top?.kg).toBe(12);
    expect(top?.share).toBeCloseTo(0.6);
    expect(top?.insight).toMatch(/swap/i);
  });

  it('returns null for an empty week', () => {
    expect(topCategoryInsight({ food: 0, transport: 0, energy: 0, shopping: 0, total: 0 })).toBeNull();
  });
});

// ─── Week win selection ───────────────────────────────────────────────────────────────

describe('selectWeekWin', () => {
  it('celebrates zero-emission movement when any trips exist', () => {
    const win = selectWeekWin(
      [
        trip({ mode: 'walk', distanceKm: 3, savedKg: 0.5 }),
        trip({ mode: 'cycling', distanceKm: 8, savedKg: 1.34 }),
        trip({ mode: 'walk', distanceKm: 1, savedKg: 0.17 }),
      ],
      [{ date: '2026-03-16', totalKg: 2 }],
    );
    expect(win.kind).toBe('zero');
    if (win.kind === 'zero') {
      expect(win.walkKm).toBe(4);
      expect(win.cycleKm).toBe(8);
      expect(win.totalZeroKm).toBe(12);
      expect(win.savedKg).toBeCloseTo(2.01);
      // biggest single saving is the 8 km cycle
      expect(win.bestTrip.distanceKm).toBe(8);
      expect(win.bestTrip.mode).toBe('cycling');
    }
  });

  it('falls back to the lightest day when there are no zero-emission trips', () => {
    const win = selectWeekWin(
      [],
      [
        { date: '2026-03-16', totalKg: 12 },
        { date: '2026-03-17', totalKg: 3 },
        { date: '2026-03-18', totalKg: 9 },
      ],
    );
    expect(win).toEqual({ kind: 'light-day', date: '2026-03-17', totalKg: 3 });
  });

  it('is empty when there is neither a trip nor a logged day', () => {
    expect(selectWeekWin([], [])).toEqual({ kind: 'empty' });
  });
});

describe('winCopy', () => {
  it('phrases a walk-and-cycle win with both distances and kg saved', () => {
    const copy = winCopy({
      kind: 'zero',
      walkKm: 4,
      cycleKm: 8,
      totalZeroKm: 12,
      savedKg: 2.01,
      bestTrip: { mode: 'cycling', distanceKm: 8, savedKg: 1.34 },
    });
    expect(copy.title).toBe('You walked 4 km and cycled 8 km');
    expect(copy.body).toMatch(/saved about/);
  });

  it('names the weekday for a lightest-day fallback', () => {
    const copy = winCopy({ kind: 'light-day', date: '2026-03-17', totalKg: 3 });
    expect(copy.title).toBe('Tuesday was your lightest'); // 2026-03-17 is a Tuesday
  });
});
