import { computeTopMoves } from '@/lib/topMoves';
import type { EmissionEntryWithFactor, EmissionFactor } from '@/types/emission';

const DAY_MS = 24 * 60 * 60 * 1000;

const beefFactor: EmissionFactor = {
  id: 'f-beef',
  category: 'food',
  subcategory: 'beef',
  item: 'Beef (average)',
  unit: 'kg',
  kg_co2e: 27,
  source: 'test',
  year: 2026,
  created_at: '2026-01-01T00:00:00Z',
};

const lentilsFactor: EmissionFactor = {
  ...beefFactor,
  id: 'f-lentils',
  subcategory: 'lentils',
  item: 'Lentils',
  kg_co2e: 0.9,
};

const factors = [beefFactor, lentilsFactor];

function beefEntry(daysAgo: number, i: number): EmissionEntryWithFactor {
  return {
    id: `e-${i}`,
    user_id: 'u-1',
    factor_id: beefFactor.id,
    quantity: 1,
    kg_co2e_total: 27,
    logged_at: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
    notes: null,
    created_at: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
    source: 'manual',
    confidence: null,
    status: 'user_confirmed',
    trip_id: null,
    metadata: null,
    emission_factors: beefFactor,
  };
}

describe('computeTopMoves evidence floor', () => {
  it('returns nothing for a single log (one meal is not a weekly habit)', () => {
    expect(computeTopMoves([beefEntry(0, 1)], factors, 27)).toEqual([]);
  });

  it('returns nothing with too few entries even when they span a week', () => {
    const entries = [beefEntry(10, 1), beefEntry(5, 2), beefEntry(0, 3)];
    expect(computeTopMoves(entries, factors, 81)).toEqual([]);
  });

  it('returns nothing when entries are plentiful but all from the last few days', () => {
    const entries = [beefEntry(3, 1), beefEntry(2, 2), beefEntry(1, 3), beefEntry(0, 4)];
    expect(computeTopMoves(entries, factors, 108)).toEqual([]);
  });

  it('recommends a swap once there are 4+ entries spanning at least a week', () => {
    const entries = [beefEntry(12, 1), beefEntry(8, 2), beefEntry(4, 3), beefEntry(0, 4)];
    const moves = computeTopMoves(entries, factors, 108);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0].category).toBe('food');
    expect(moves[0].weeklySavingKg).toBeGreaterThan(0);
  });
});
