import { computeMomentum, momentumBand, type MomentumDayInput } from '@/lib/momentum';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function day(overrides: Partial<MomentumDayInput> = {}): MomentumDayInput {
  return {
    date: '2026-07-01',
    logged: false,
    totalKg: 0,
    ...overrides,
  };
}

/** n consecutive logged days, each with the same totalKg (default a heavy,
 *  non-"light" day so only the base LOG_BOOST applies). */
function loggedDays(n: number, totalKg = 20): MomentumDayInput[] {
  return Array.from({ length: n }, (_, i) => day({ date: `logged-${i}`, logged: true, totalKg }));
}

/** n consecutive missed (unlogged) days. */
function missedDays(n: number): MomentumDayInput[] {
  return Array.from({ length: n }, (_, i) => day({ date: `missed-${i}`, logged: false }));
}

// ─── momentumBand ───────────────────────────────────────────────────────────

describe('momentumBand', () => {
  it('labels a fresh/low score as building', () => {
    expect(momentumBand(0)).toBe('building');
    expect(momentumBand(34)).toBe('building');
  });

  it('labels a mid score as steady', () => {
    expect(momentumBand(35)).toBe('steady');
    expect(momentumBand(69)).toBe('steady');
  });

  it('labels a high score as strong', () => {
    expect(momentumBand(70)).toBe('strong');
    expect(momentumBand(100)).toBe('strong');
  });
});

// ─── computeMomentum — basics ────────────────────────────────────────────────

describe('computeMomentum · basics', () => {
  it('a brand-new user with no history has zero momentum, building band', () => {
    const result = computeMomentum([]);
    expect(result.score).toBe(0);
    expect(result.band).toBe('building');
  });

  it('14 days of nothing logged stays at zero — never goes negative', () => {
    const result = computeMomentum(missedDays(14));
    expect(result.score).toBe(0);
    expect(result.band).toBe('building');
  });

  it('is a pure function — identical input yields identical output', () => {
    const input = [...loggedDays(3), ...missedDays(2), day({ logged: true, totalKg: 5 })];
    const a = computeMomentum(input);
    const b = computeMomentum(input.map((d) => ({ ...d })));
    expect(a).toEqual(b);
  });

  it('rises with consecutive logged days and reaches "strong" within a week', () => {
    // Day-by-day should be monotonically increasing while logging continues.
    let prev = 0;
    for (let n = 1; n <= 7; n++) {
      const { score } = computeMomentum(loggedDays(n));
      expect(score).toBeGreaterThan(prev);
      prev = score;
    }
    expect(computeMomentum(loggedDays(7)).band).toBe('strong');
  });

  it('a single logged day only reaches "building", not an instant streak-style jump', () => {
    const { band } = computeMomentum(loggedDays(1));
    expect(band).toBe('building');
  });

  it('a light (low-emission) logged day boosts more than a heavy logged day', () => {
    const heavy = computeMomentum(loggedDays(3, 20)); // well above half the ~22kg budget
    const light = computeMomentum(loggedDays(3, 2)); // well under half the budget
    expect(light.score).toBeGreaterThan(heavy.score);
  });
});

// ─── computeMomentum — no cliff / gentle decay ───────────────────────────────

describe('computeMomentum · gentle decay, no cliff', () => {
  it('one missed day nudges the score down gently — never resets to zero', () => {
    const built = computeMomentum(loggedDays(7));
    expect(built.score).toBeGreaterThan(50);

    const afterOneMiss = computeMomentum([...loggedDays(7), day({ logged: false })]);

    // Nudged down, but the vast majority of the built-up momentum survives a
    // single missed day — nothing like a streak's hard reset to 0.
    expect(afterOneMiss.score).toBeLessThan(built.score);
    expect(afterOneMiss.score).toBeGreaterThan(built.score * 0.7);
    expect(afterOneMiss.score).toBeGreaterThan(0);
  });

  it('decay after a break is monotonic and smooth — no sudden cliffs', () => {
    const base = loggedDays(10);
    const scores: number[] = [];
    for (let n = 0; n <= 6; n++) {
      scores.push(computeMomentum([...base, ...missedDays(n)]).score);
    }
    for (let i = 1; i < scores.length; i++) {
      // Strictly decreasing...
      expect(scores[i]).toBeLessThan(scores[i - 1]);
      // ...and each step only ever loses a bounded fraction of the previous
      // day's score (gentle multiplicative decay, not a cliff/reset).
      const drop = scores[i - 1] - scores[i];
      expect(drop).toBeLessThan(scores[i - 1] * 0.3);
    }
  });

  it('missing many days approaches zero but the trajectory stays smooth throughout', () => {
    const base = loggedDays(10);
    const { score } = computeMomentum([...base, ...missedDays(30)]);
    expect(score).toBeLessThan(1);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ─── computeMomentum — cap / floor ───────────────────────────────────────────

describe('computeMomentum · cap and floor', () => {
  it('never exceeds 100 even with a long run of light logged days', () => {
    const { score } = computeMomentum(loggedDays(60, 1));
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBe(100);
  });

  it('never drops below 0', () => {
    const { score } = computeMomentum(missedDays(60));
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('respects a custom dailyBudgetKg for the "light day" threshold', () => {
    // With a tiny budget, a 2kg day is no longer "light" (over half of 1kg).
    const tinyBudget = computeMomentum(loggedDays(3, 2), 1);
    const normalBudget = computeMomentum(loggedDays(3, 2), 22);
    expect(tinyBudget.score).toBeLessThan(normalBudget.score);
  });
});
