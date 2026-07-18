import {
  estimateTransactionKg,
  CPI_SOURCE_INDEX,
  CPI_TARGET_INDEX,
  CPI_DEFLATOR,
  FALLBACK_NAICS,
  USEEIO_VERSION,
  type SpendEstimate,
} from '@/lib/spendFactors';
import crosswalk from '@/data/category_to_naics.json';
import factorsFile from '@/data/useeio_factors.json';

const factors = factorsFile.factors as Record<string, { kgCo2ePerUsd2022: number }>;
const emissionRows = crosswalk.categories.filter((c) => !c.nonEmission);
const nonEmissionRows = crosswalk.categories.filter((c) => c.nonEmission);

/** Convenience: estimate a $100 charge for a crosswalk row. */
function est(row: { plaidPrimary: string; plaidDetailed: string }, amountUsd = 100): SpendEstimate | null {
  return estimateTransactionKg({ amountUsd, plaidPrimary: row.plaidPrimary, plaidDetailed: row.plaidDetailed });
}

// ─── CPI adjustment ─────────────────────────────────────────────────────────────

describe('CPI dollar-year adjustment', () => {
  it('uses the cited 2022 and recent-year CPI-U indices from the factor file', () => {
    expect(CPI_SOURCE_INDEX).toBeCloseTo(292.655, 3);
    expect(CPI_TARGET_INDEX).toBeCloseTo(321.943, 3);
  });

  it('deflates nominal spend to 2022 dollars (deflator < 1, = source/target)', () => {
    expect(CPI_DEFLATOR).toBeCloseTo(CPI_SOURCE_INDEX / CPI_TARGET_INDEX, 10);
    expect(CPI_DEFLATOR).toBeLessThan(1);
  });

  it('applies kg = amount × deflator × factor exactly', () => {
    // Groceries → NAICS 445110 (0.186 kg / 2022 USD)
    const naics = '445110';
    const factor = factors[naics].kgCo2ePerUsd2022;
    const amount = 100;
    const expected = Math.round(Math.abs(amount * CPI_DEFLATOR * factor) * 1e4) / 1e4;
    const r = estimateTransactionKg({
      amountUsd: amount,
      plaidPrimary: 'FOOD_AND_DRINK',
      plaidDetailed: 'FOOD_AND_DRINK_GROCERIES',
    });
    expect(r).not.toBeNull();
    expect(r!.naicsCode).toBe(naics);
    expect(r!.kgCo2e).toBeCloseTo(expected, 6);
    // sanity: a $100 grocery run is deflated below the naive 100 × 0.186 = 18.6
    expect(r!.kgCo2e).toBeLessThan(amount * factor);
  });
});

// ─── Crosswalk coverage ─────────────────────────────────────────────────────────

describe('crosswalk coverage', () => {
  it('has at least the ~60 categories the spec asks for', () => {
    expect(crosswalk.categories.length).toBeGreaterThanOrEqual(60);
    expect(emissionRows.length).toBeGreaterThan(0);
  });

  it('every emission crosswalk row resolves to a real, non-null estimate', () => {
    const unresolved = emissionRows.filter((row) => est(row) == null);
    expect(unresolved.map((r) => r.plaidDetailed)).toEqual([]);
  });

  it('every emission crosswalk NAICS code exists in the factor table', () => {
    const missing = emissionRows.filter((row) => !(row.naicsCode! in factors));
    expect(missing.map((r) => r.naicsCode)).toEqual([]);
  });

  it('every factor row carries a real (positive, finite) kg/$ value', () => {
    for (const [code, f] of Object.entries(factors)) {
      expect(Number.isFinite(f.kgCo2ePerUsd2022)).toBe(true);
      expect(f.kgCo2ePerUsd2022).toBeGreaterThan(0);
      expect(code).toMatch(/^\d{6}$/); // 6-digit 2017 NAICS
    }
  });

  it('the fallback NAICS code has a factor row', () => {
    expect(FALLBACK_NAICS in factors).toBe(true);
  });
});

// ─── Non-emission exclusions ─────────────────────────────────────────────────────

describe('non-emission exclusions', () => {
  it('returns null for every non-emission crosswalk row', () => {
    const leaked = nonEmissionRows.filter((row) => est(row) != null);
    expect(leaked.map((r) => r.plaidDetailed)).toEqual([]);
  });

  it.each([
    ['TRANSFER_OUT', 'TRANSFER_OUT_ACCOUNT_TRANSFER'],
    ['LOAN_PAYMENTS', 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'],
    ['TRANSFER_OUT', 'TRANSFER_OUT_WITHDRAWAL'],
    ['INCOME', 'INCOME_SALARY'],
    ['BANK_FEES', 'BANK_FEES_ATM_FEES'],
    ['RENT_AND_UTILITIES', 'RENT_AND_UTILITIES_RENT'],
    ['GOVERNMENT_AND_NON_PROFIT', 'GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT'],
  ])('%s / %s → null', (primary, detailed) => {
    expect(estimateTransactionKg({ amountUsd: 100, plaidPrimary: primary, plaidDetailed: detailed })).toBeNull();
  });

  it('government departments/agencies is reclassified to non-emission → null', () => {
    expect(
      estimateTransactionKg({
        amountUsd: 100,
        plaidPrimary: 'GOVERNMENT_AND_NON_PROFIT',
        plaidDetailed: 'GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES',
      })
    ).toBeNull();
  });
});

// ─── Refund / negative math ──────────────────────────────────────────────────────

describe('refund (negative amount) math', () => {
  it('flips the sign and keeps the identical factor/naics/confidence', () => {
    const base = { plaidPrimary: 'GENERAL_MERCHANDISE', plaidDetailed: 'GENERAL_MERCHANDISE_ELECTRONICS' };
    const charge = estimateTransactionKg({ amountUsd: 249.99, ...base })!;
    const refund = estimateTransactionKg({ amountUsd: -249.99, ...base })!;
    expect(refund.kgCo2e).toBeCloseTo(-charge.kgCo2e, 10);
    expect(refund.naicsCode).toBe(charge.naicsCode);
    expect(refund.factorRef).toBe(charge.factorRef);
    expect(refund.confidence).toBe(charge.confidence);
  });

  it('a full refund exactly negates the charge across every emission category', () => {
    for (const row of emissionRows) {
      const charge = est(row, 73.5);
      const refund = est(row, -73.5);
      expect(refund).not.toBeNull();
      expect(refund!.kgCo2e).toBe(-charge!.kgCo2e);
    }
  });

  it('a $0 emission transaction yields 0 kg (not null)', () => {
    const r = est({ plaidPrimary: 'FOOD_AND_DRINK', plaidDetailed: 'FOOD_AND_DRINK_GROCERIES' }, 0);
    expect(r).not.toBeNull();
    expect(r!.kgCo2e).toBe(0);
  });
});

// ─── Fallback tier ────────────────────────────────────────────────────────────────

describe('general-retail fallback', () => {
  it('an unknown detailed code under a KNOWN spending primary hits the low-confidence fallback', () => {
    const r = estimateTransactionKg({
      amountUsd: 50,
      plaidPrimary: 'GENERAL_MERCHANDISE',
      plaidDetailed: 'GENERAL_MERCHANDISE_SOME_FUTURE_UNSEEN_CODE',
    });
    expect(r).not.toBeNull();
    expect(r!.naicsCode).toBe(FALLBACK_NAICS);
    expect(r!.confidence).toBe('low');
    expect(r!.factorRef).toContain('(fallback)');
  });

  it('an unknown detailed under a NON-emission primary stays null (no invented emissions)', () => {
    expect(
      estimateTransactionKg({
        amountUsd: 50,
        plaidPrimary: 'TRANSFER_OUT',
        plaidDetailed: 'TRANSFER_OUT_SOME_FUTURE_UNSEEN_CODE',
      })
    ).toBeNull();
  });

  it('a wholly-unknown primary is null (cannot confirm it is spend)', () => {
    expect(
      estimateTransactionKg({
        amountUsd: 50,
        plaidPrimary: 'SOMETHING_PLAID_NEVER_EMITS',
        plaidDetailed: 'SOMETHING_PLAID_NEVER_EMITS_X',
      })
    ).toBeNull();
  });
});

// ─── Confidence policy ────────────────────────────────────────────────────────────

describe('confidence policy', () => {
  it('never returns high — the ceiling for a spend estimate is medium', () => {
    for (const row of emissionRows) {
      const r = est(row);
      expect(['low', 'medium']).toContain(r!.confidence);
    }
  });

  it("a high-confidence crosswalk match maps to 'medium'", () => {
    // GROCERIES is graded 'high' in the crosswalk
    const groceries = emissionRows.find((r) => r.plaidDetailed === 'FOOD_AND_DRINK_GROCERIES')!;
    expect(groceries.confidence).toBe('high');
    expect(est(groceries)!.confidence).toBe('medium');
  });

  it("a low/medium-confidence crosswalk match maps to 'low'", () => {
    // BIKES_AND_SCOOTERS is graded 'low' in the crosswalk
    const bikes = emissionRows.find((r) => r.plaidDetailed === 'TRANSPORTATION_BIKES_AND_SCOOTERS')!;
    expect(bikes.confidence).toBe('low');
    expect(est(bikes)!.confidence).toBe('low');
  });

  it('stamps the USEEIO version into every factorRef', () => {
    const r = est({ plaidPrimary: 'FOOD_AND_DRINK', plaidDetailed: 'FOOD_AND_DRINK_GROCERIES' })!;
    expect(r.factorRef).toContain(USEEIO_VERSION);
    expect(r.factorRef).toContain('NAICS 445110');
  });
});
