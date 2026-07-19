/**
 * lib/receiptValidation.ts — Sprint E receipt ingestion guards (adversarial-
 * review fixes), extracted into a pure, testable module following the exact
 * discipline lib/receiptMatch.ts and lib/tripEngine.ts already use: no React,
 * no Supabase, no network, no Deno-only APIs — safe to import from both the
 * receipt-parse edge function (Deno) and lib/importParsers.ts (CSV backfill,
 * runs in the app).
 *
 * WHY THIS EXISTS (see final report for the full adversarial-review write-up):
 *
 * 1. CURRENCY: a non-USD receipt (Haiku-extracted OR CSV-imported) must never
 *    be silently treated as USD — that would undercount/overcount emissions
 *    by the FX gap with nobody the wiser. `isSupportedCurrency` is the single
 *    source of truth both ingestion paths call before doing any USD-priced
 *    math. Convention: absent/blank currency defaults to USD (matching the
 *    pre-existing `parsed.currency || 'USD'` fallback elsewhere in this
 *    codebase); anything else must match "USD" case-insensitively after
 *    trimming whitespace.
 *
 * 2. BOUNDS: a parsed line item can legitimately carry a negative priceUsd
 *    (e.g. a "-$5.00 coupon" line on an ordinary receipt — not adversarial
 *    input, just normal receipt content) or an absurd qty (OCR/LLM
 *    misreads). `checkItemBounds` is the single gate both ingestion paths
 *    must run BEFORE any DB write: negative priceUsd => skip the item
 *    entirely (never write a negative value anywhere — there is no CHECK
 *    constraint on receipt_items.price_usd/kg_co2e enforcing this at the DB
 *    layer, so it is an application-level invariant); qty above
 *    MAX_ITEM_QTY => clamp and flag, never reject outright (an oversized but
 *    plausible qty like a 500-pack should still be recorded, just capped).
 */

export const MAX_ITEM_QTY = 1000;

export interface CurrencyCheckable {
  currency: string | null | undefined;
}

/** Normalizes a currency code the same way both ingestion paths need to:
 * trim whitespace, uppercase. Never throws on null/undefined/empty. */
export function normalizeCurrency(currency: string | null | undefined): string {
  return (currency ?? '').trim().toUpperCase();
}

/**
 * True if `currency` is USD or effectively unset (blank/null/undefined,
 * which the rest of this codebase already treats as an implicit USD
 * default — see receipts.currency's own `DEFAULT 'USD'` and the
 * `parsed.currency || 'USD'` fallback in receipt-parse/index.ts). False for
 * any other ISO 4217 code — those must not be priced/computed as if they
 * were USD.
 */
export function isSupportedCurrency(currency: string | null | undefined): boolean {
  const normalized = normalizeCurrency(currency);
  return normalized === '' || normalized === 'USD';
}

export interface ReceiptItemLike {
  name: string;
  qty: number;
  priceUsd: number;
}

export interface ItemBoundsResult {
  /** Final qty to store — clamped to MAX_ITEM_QTY if the input exceeded it. */
  qty: number;
  /** True if qty was clamped (input > MAX_ITEM_QTY). */
  qtyClamped: boolean;
  /** True if this item must not be written at all (negative priceUsd). */
  skip: boolean;
  /** Human-readable reason, present whenever skip or qtyClamped is true. */
  reason?: string;
}

/**
 * Bounds-checks a single parsed receipt item BEFORE any DB write.
 *
 * - priceUsd < 0  -> skip: true (caller must not insert this item, and must
 *   not fabricate a zero/absolute-value replacement — the item is simply
 *   dropped from this receipt's item list, logged, nothing more).
 * - qty > MAX_ITEM_QTY -> clamped to MAX_ITEM_QTY, qtyClamped: true.
 * - qty <= 0 (nonsensical, e.g. a 0 or negative quantity) -> clamped to 1,
 *   qtyClamped: true, since a receipt line item was still charged for at
 *   least one unit.
 */
export function checkItemBounds(item: ReceiptItemLike): ItemBoundsResult {
  if (item.priceUsd < 0) {
    return {
      qty: item.qty,
      qtyClamped: false,
      skip: true,
      reason: `negative priceUsd (${item.priceUsd}) for item "${item.name}" — skipped, never written`,
    };
  }

  const rawQty = item.qty ?? 1;
  if (rawQty > MAX_ITEM_QTY) {
    return {
      qty: MAX_ITEM_QTY,
      qtyClamped: true,
      skip: false,
      reason: `qty ${rawQty} for item "${item.name}" exceeds cap of ${MAX_ITEM_QTY} — clamped`,
    };
  }
  if (rawQty <= 0) {
    return {
      qty: 1,
      qtyClamped: true,
      skip: false,
      reason: `qty ${rawQty} for item "${item.name}" is not positive — clamped to 1`,
    };
  }
  return { qty: rawQty, qtyClamped: false, skip: false };
}
