import {
  isSupportedCurrency,
  normalizeCurrency,
  checkItemBounds,
  MAX_ITEM_QTY,
} from '@/lib/receiptValidation';

describe('normalizeCurrency', () => {
  it('uppercases and trims', () => {
    expect(normalizeCurrency('  usd  ')).toBe('USD');
  });
  it('treats null/undefined as empty string', () => {
    expect(normalizeCurrency(null)).toBe('');
    expect(normalizeCurrency(undefined)).toBe('');
  });
});

describe('isSupportedCurrency', () => {
  it('accepts USD exactly', () => {
    expect(isSupportedCurrency('USD')).toBe(true);
  });
  it('accepts case-insensitive / whitespace-padded USD', () => {
    expect(isSupportedCurrency('usd')).toBe(true);
    expect(isSupportedCurrency('  Usd  ')).toBe(true);
  });
  it('treats blank/null/undefined as an implicit USD default', () => {
    expect(isSupportedCurrency('')).toBe(true);
    expect(isSupportedCurrency(null)).toBe(true);
    expect(isSupportedCurrency(undefined)).toBe(true);
  });
  it('rejects a non-USD currency', () => {
    expect(isSupportedCurrency('GBP')).toBe(false);
    expect(isSupportedCurrency('eur')).toBe(false);
  });
});

describe('checkItemBounds', () => {
  it('passes through a normal item unchanged', () => {
    const result = checkItemBounds({ name: 'Widget', qty: 2, priceUsd: 10 });
    expect(result).toEqual({ qty: 2, qtyClamped: false, skip: false });
  });

  it('skips an item with negative priceUsd (e.g. a coupon line) rather than writing a negative value', () => {
    const result = checkItemBounds({ name: 'Coupon', qty: 1, priceUsd: -5 });
    expect(result.skip).toBe(true);
    expect(result.qtyClamped).toBe(false);
    expect(result.reason).toMatch(/negative priceUsd/);
  });

  it('treats priceUsd of exactly 0 as valid (not negative)', () => {
    const result = checkItemBounds({ name: 'Freebie', qty: 1, priceUsd: 0 });
    expect(result.skip).toBe(false);
  });

  it('clamps qty above MAX_ITEM_QTY and flags it', () => {
    const result = checkItemBounds({ name: 'Bulk item', qty: 5000, priceUsd: 1 });
    expect(result.skip).toBe(false);
    expect(result.qty).toBe(MAX_ITEM_QTY);
    expect(result.qtyClamped).toBe(true);
    expect(result.reason).toMatch(/exceeds cap/);
  });

  it('clamps qty at exactly the cap without flagging', () => {
    const result = checkItemBounds({ name: 'Edge case', qty: MAX_ITEM_QTY, priceUsd: 1 });
    expect(result.qty).toBe(MAX_ITEM_QTY);
    expect(result.qtyClamped).toBe(false);
  });

  it('clamps a zero or negative qty up to 1', () => {
    expect(checkItemBounds({ name: 'Zero qty', qty: 0, priceUsd: 1 })).toMatchObject({
      qty: 1,
      qtyClamped: true,
      skip: false,
    });
    expect(checkItemBounds({ name: 'Negative qty', qty: -3, priceUsd: 1 })).toMatchObject({
      qty: 1,
      qtyClamped: true,
      skip: false,
    });
  });
});
