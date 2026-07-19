import {
  isAmountWithinTolerance,
  isDateWithinTolerance,
  isMerchantFuzzyMatch,
  matchReceiptToTransaction,
  AMOUNT_TOLERANCE_FRACTION,
  DATE_TOLERANCE_DAYS,
  type CandidateTransaction,
  type ReceiptForMatching,
} from '@/lib/receiptMatch';

describe('isAmountWithinTolerance', () => {
  it('matches exact amount', () => {
    expect(isAmountWithinTolerance(100, 100)).toBe(true);
  });

  it('matches at the exact +5% boundary', () => {
    expect(isAmountWithinTolerance(105, 100)).toBe(true);
  });

  it('matches at the exact -5% boundary', () => {
    expect(isAmountWithinTolerance(95, 100)).toBe(true);
  });

  it('rejects just above the +5% boundary', () => {
    expect(isAmountWithinTolerance(105.01, 100)).toBe(false);
  });

  it('rejects just below the -5% boundary', () => {
    expect(isAmountWithinTolerance(94.99, 100)).toBe(false);
  });

  it('handles zero total: only an exact zero amount matches', () => {
    expect(isAmountWithinTolerance(0, 0)).toBe(true);
    expect(isAmountWithinTolerance(1, 0)).toBe(false);
  });

  it('tolerance scales with the total (negative-safe via abs)', () => {
    expect(isAmountWithinTolerance(1050, 1000)).toBe(true);
    expect(isAmountWithinTolerance(1051, 1000)).toBe(false);
  });

  it('exposes the tolerance fraction as 0.05', () => {
    expect(AMOUNT_TOLERANCE_FRACTION).toBe(0.05);
  });
});

describe('isDateWithinTolerance', () => {
  it('matches same-day', () => {
    expect(isDateWithinTolerance('2026-07-18', '2026-07-18')).toBe(true);
  });

  it('matches at the exact +3 day boundary', () => {
    expect(isDateWithinTolerance('2026-07-21', '2026-07-18')).toBe(true);
  });

  it('matches at the exact -3 day boundary', () => {
    expect(isDateWithinTolerance('2026-07-15', '2026-07-18')).toBe(true);
  });

  it('rejects 4 days after', () => {
    expect(isDateWithinTolerance('2026-07-22', '2026-07-18')).toBe(false);
  });

  it('rejects 4 days before', () => {
    expect(isDateWithinTolerance('2026-07-14', '2026-07-18')).toBe(false);
  });

  it('handles month boundaries correctly', () => {
    expect(isDateWithinTolerance('2026-08-01', '2026-07-30')).toBe(true);
    expect(isDateWithinTolerance('2026-08-03', '2026-07-30')).toBe(false);
  });

  it('exposes the tolerance as 3 days', () => {
    expect(DATE_TOLERANCE_DAYS).toBe(3);
  });
});

describe('isMerchantFuzzyMatch', () => {
  it('matches identical strings', () => {
    expect(isMerchantFuzzyMatch('Amazon', 'Amazon')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(isMerchantFuzzyMatch('AMAZON', 'amazon')).toBe(true);
  });

  it('matches substring containment (Plaid-style suffixed merchant name)', () => {
    expect(isMerchantFuzzyMatch('AMAZON.COM*ABC123XYZ', 'Amazon')).toBe(true);
  });

  it('matches via token overlap for multi-word names', () => {
    expect(isMerchantFuzzyMatch('Trader Joes #123', "Trader Joe's Market")).toBe(true);
  });

  it('rejects unrelated merchants', () => {
    expect(isMerchantFuzzyMatch('Whole Foods Market', 'Best Buy')).toBe(false);
  });

  it('rejects on empty strings', () => {
    expect(isMerchantFuzzyMatch('', 'Amazon')).toBe(false);
    expect(isMerchantFuzzyMatch('Amazon', '')).toBe(false);
  });

  it('does not treat short common tokens (e.g. "the", "co") as meaningful overlap', () => {
    expect(isMerchantFuzzyMatch('The Gap Co', 'The Home Depot Co')).toBe(false);
  });
});

describe('matchReceiptToTransaction', () => {
  const baseReceipt: ReceiptForMatching = {
    merchant: 'Whole Foods',
    orderDate: '2026-07-18',
    totalUsd: 42.5,
  };

  function txn(overrides: Partial<CandidateTransaction> = {}): CandidateTransaction {
    return {
      id: 'txn-1',
      amountUsd: 42.5,
      merchantName: 'WHOLE FOODS MKT #123',
      txnDate: '2026-07-18',
      ...overrides,
    };
  }

  it('matches a single well-aligned candidate', () => {
    expect(matchReceiptToTransaction(baseReceipt, [txn()])).toBe('txn-1');
  });

  it('returns null when there are no candidates', () => {
    expect(matchReceiptToTransaction(baseReceipt, [])).toBeNull();
  });

  it('returns null when no candidate satisfies all three checks', () => {
    const candidates = [
      txn({ id: 'wrong-amount', amountUsd: 100 }),
      txn({ id: 'wrong-date', txnDate: '2026-07-01' }),
      txn({ id: 'wrong-merchant', merchantName: 'Target' }),
    ];
    expect(matchReceiptToTransaction(baseReceipt, candidates)).toBeNull();
  });

  it('returns null (ambiguous) when two or more candidates all satisfy the checks', () => {
    const candidates = [txn({ id: 'a' }), txn({ id: 'b', amountUsd: 43.0 })];
    expect(matchReceiptToTransaction(baseReceipt, candidates)).toBeNull();
  });

  it('does not silently pick the closest-by-amount candidate when ambiguous', () => {
    // 'closer' has amount exactly equal to receipt total; 'farther' is still
    // within tolerance. A "pick best" policy would choose 'closer' — this
    // policy must return null instead.
    const candidates = [
      txn({ id: 'closer', amountUsd: 42.5 }),
      txn({ id: 'farther', amountUsd: 44.0 }),
    ];
    expect(matchReceiptToTransaction(baseReceipt, candidates)).toBeNull();
  });

  it('fails closed when receipt.merchant is null', () => {
    expect(matchReceiptToTransaction({ ...baseReceipt, merchant: null }, [txn()])).toBeNull();
  });

  it('fails closed when receipt.orderDate is null', () => {
    expect(matchReceiptToTransaction({ ...baseReceipt, orderDate: null }, [txn()])).toBeNull();
  });

  it('fails closed when receipt.totalUsd is null', () => {
    expect(matchReceiptToTransaction({ ...baseReceipt, totalUsd: null }, [txn()])).toBeNull();
  });

  it('excludes a candidate with a null merchantName', () => {
    expect(matchReceiptToTransaction(baseReceipt, [txn({ merchantName: null })])).toBeNull();
  });
});
