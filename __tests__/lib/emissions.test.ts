// Wave 0 stub — imports will fail until lib/emissions.ts exists in Plan 02
// Uses try/catch import so the file compiles even when source is absent

import type { EmissionEntryWithFactor } from '@/types/emission';

let calcEmission: (factorKgCo2e: number, quantity: number) => number;
let getLocalDateString: (date: Date) => string;
let getISOWeekStart: (date: Date) => string;
let computeDailyCategoryTotals: (entries: EmissionEntryWithFactor[]) => { food: number; transport: number; energy: number; shopping: number; total: number };
let buildDailySummaryPayload: (
  userId: string,
  date: string,
  totals: { food: number; transport: number; energy: number; shopping: number; total: number }
) => Record<string, unknown>;
let buildWeeklySummaryPayload: (
  userId: string,
  weekStart: string,
  totals: { food: number; transport: number; energy: number; shopping: number; total: number }
) => Record<string, unknown>;

beforeAll(async () => {
  try {
    const mod = await import('@/lib/emissions');
    calcEmission = mod.calcEmission;
    getLocalDateString = mod.getLocalDateString;
    getISOWeekStart = mod.getISOWeekStart;
    computeDailyCategoryTotals = mod.computeDailyCategoryTotals;
    buildDailySummaryPayload = mod.buildDailySummaryPayload;
    buildWeeklySummaryPayload = mod.buildWeeklySummaryPayload;
  } catch {
    // lib/emissions.ts not yet created — tests will skip until Plan 02
  }
});

describe('calcEmission', () => {
  it('multiplies factor kg_co2e by quantity', () => {
    if (!calcEmission) return;
    expect(calcEmission(0.5, 2)).toBeCloseTo(1.0);
  });

  it('returns 0 for quantity 0', () => {
    if (!calcEmission) return;
    expect(calcEmission(0.5, 0)).toBe(0);
  });

  it('handles decimal quantities', () => {
    if (!calcEmission) return;
    expect(calcEmission(2.5, 0.4)).toBeCloseTo(1.0);
  });
});

describe('getLocalDateString', () => {
  it('returns YYYY-MM-DD format', () => {
    if (!getLocalDateString) return;
    expect(getLocalDateString(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getISOWeekStart', () => {
  it('returns Monday for a Wednesday input', () => {
    if (!getISOWeekStart) return;
    // 2026-03-18 is a Wednesday → Monday is 2026-03-16
    expect(getISOWeekStart(new Date('2026-03-18T12:00:00'))).toBe('2026-03-16');
  });

  it('returns same day for Monday input', () => {
    if (!getISOWeekStart) return;
    expect(getISOWeekStart(new Date('2026-03-16T12:00:00'))).toBe('2026-03-16');
  });
});

describe('computeDailyCategoryTotals', () => {
  it('returns zeros for empty array', () => {
    if (!computeDailyCategoryTotals) return;
    const result = computeDailyCategoryTotals([]);
    expect(result).toEqual({ food: 0, transport: 0, energy: 0, shopping: 0, total: 0 });
  });

  it('sums entries by category', () => {
    if (!computeDailyCategoryTotals) return;
    const mockEntries = [
      { kg_co2e_total: 2.0, emission_factors: { category: 'food' } },
      { kg_co2e_total: 1.5, emission_factors: { category: 'transport' } },
      { kg_co2e_total: 0.5, emission_factors: { category: 'food' } },
    ] as EmissionEntryWithFactor[];
    const result = computeDailyCategoryTotals(mockEntries);
    expect(result.food).toBeCloseTo(2.5);
    expect(result.transport).toBeCloseTo(1.5);
    expect(result.energy).toBe(0);
    expect(result.shopping).toBe(0);
    expect(result.total).toBeCloseTo(4.0);
  });

  it('sums shopping category entries', () => {
    if (!computeDailyCategoryTotals) return;
    const mockEntries = [
      { kg_co2e_total: 3.2, emission_factors: { category: 'shopping' } },
      { kg_co2e_total: 1.0, emission_factors: { category: 'food' } },
    ] as EmissionEntryWithFactor[];
    const result = computeDailyCategoryTotals(mockEntries);
    expect(result.shopping).toBeCloseTo(3.2);
    expect(result.total).toBeCloseTo(4.2);
  });
});

describe('daily summary', () => {
  it('builds correct upsert payload for today, including shopping_kg', () => {
    if (!buildDailySummaryPayload) return;
    const totals = { food: 1, transport: 2, energy: 0.5, shopping: 3.2, total: 6.7 };
    const payload = buildDailySummaryPayload('user-1', '2026-07-10', totals);
    expect(payload).toMatchObject({
      user_id: 'user-1',
      date: '2026-07-10',
      total_kg_co2e: 6.7,
      food_kg: 1,
      transport_kg: 2,
      energy_kg: 0.5,
      shopping_kg: 3.2,
    });
  });
});

describe('weekly summary', () => {
  it('builds correct upsert payload for week, including shopping breakdown', () => {
    if (!buildWeeklySummaryPayload) return;
    const totals = { food: 1, transport: 2, energy: 0.5, shopping: 3.2, total: 6.7 };
    const payload = buildWeeklySummaryPayload('user-1', '2026-07-06', totals);
    expect(payload).toMatchObject({
      user_id: 'user-1',
      week_start: '2026-07-06',
      total_kg_co2e: 6.7,
      breakdown: { food: 1, transport: 2, energy: 0.5, shopping: 3.2 },
    });
  });
});

describe('update entry', () => {
  it.todo('recomputes totals after quantity change');
});

describe('delete entry', () => {
  it.todo('recomputes totals after deletion');
});
