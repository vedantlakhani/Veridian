/**
 * lib/receiptMatch.ts — Receipt-to-transaction supersede matching (Sprint E
 * Stage R2).
 *
 * ARCHITECTURE NOTE: PURE functions only — no React, no Supabase, no
 * network — mirroring lib/tripEngine.ts's discipline exactly, so this is
 * fully unit-testable in isolation (see __tests__/lib/receiptMatch.test.ts)
 * and safely reusable from the receipt-parse edge function without pulling
 * in any Deno-incompatible import.
 *
 * WHAT THIS DECIDES: whether a freshly-parsed receipt corresponds to an
 * existing bank_transactions row for the same user — i.e. the same
 * real-world purchase already counted once (coarsely, via spend-based
 * estimation) that should now be SUPERSEDED by the receipt's item-level
 * detail rather than double-counted.
 *
 * AMBIGUOUS-MATCH POLICY (documented, tested): if more than one candidate
 * transaction satisfies amount + date + merchant tolerance, this returns
 * null (no match) rather than guessing. Silently picking "best" among two
 * genuinely plausible candidates risks superseding — and deleting the
 * emission_entries row for — the WRONG transaction, which is a worse
 * failure mode than leaving both the receipt and the original coarse
 * transaction estimate in place (a false negative here just means the user
 * keeps a slightly less precise estimate; a false positive silently
 * destroys a correct entry and links a receipt to unrelated spending).
 */

export interface ReceiptForMatching {
  merchant: string | null;
  orderDate: string | null; // "YYYY-MM-DD"
  totalUsd: number | null;
}

export interface CandidateTransaction {
  id: string;
  amountUsd: number;
  merchantName: string | null;
  txnDate: string; // "YYYY-MM-DD"
}

export const AMOUNT_TOLERANCE_FRACTION = 0.05; // ±5%
export const DATE_TOLERANCE_DAYS = 3; // ±3 days

// ─── Amount tolerance ──────────────────────────────────────────────────────

/**
 * True if `amount` is within ±AMOUNT_TOLERANCE_FRACTION of `total`. Tolerance
 * is computed against `total` (the receipt's stated total), not the
 * transaction amount, so the ±5% window is fixed relative to the receipt —
 * the more "known" of the two numbers here since it's an actual line-item
 * sum, not a category-level estimate.
 */
export function isAmountWithinTolerance(amountUsd: number, totalUsd: number): boolean {
  if (totalUsd === 0) return amountUsd === 0;
  const diff = Math.abs(amountUsd - totalUsd);
  return diff <= Math.abs(totalUsd) * AMOUNT_TOLERANCE_FRACTION;
}

// ─── Date tolerance ────────────────────────────────────────────────────────

function daysBetween(dateA: string, dateB: string): number {
  const [ay, am, ad] = dateA.split('-').map(Number);
  const [by, bm, bd] = dateB.split('-').map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.abs(a - b) / (24 * 60 * 60 * 1000);
}

/** True if `txnDate` is within ±DATE_TOLERANCE_DAYS of `orderDate`. */
export function isDateWithinTolerance(txnDate: string, orderDate: string): boolean {
  return daysBetween(txnDate, orderDate) <= DATE_TOLERANCE_DAYS;
}

// ─── Merchant fuzzy match ──────────────────────────────────────────────────

// Common words that carry no distinguishing signal between two merchant
// names even at length >= 3 (business-entity suffixes and articles) — token
// overlap on these alone must not count as a match.
const MERCHANT_STOPWORDS = new Set(['the', 'inc', 'llc', 'ltd', 'corp', 'co', 'and', 'store', 'shop']);

function normalizeMerchant(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length > 0 && !MERCHANT_STOPWORDS.has(tok));
}

/**
 * Case-insensitive, token-overlap-or-substring fuzzy match — deliberately
 * NOT exact string equality, since Plaid merchant names ("AMAZON.COM*ABC123")
 * and receipt-parsed merchant names ("Amazon") routinely differ in exactly
 * this way. True if either normalized string contains the other as a
 * substring, or if they share at least one token of length >= 3 (short
 * tokens like "co", "inc" are too common to be meaningful signal).
 */
export function isMerchantFuzzyMatch(a: string, b: string): boolean {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();
  if (normA.length === 0 || normB.length === 0) return false;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const tokensA = new Set(normalizeMerchant(a).filter((t) => t.length >= 3));
  const tokensB = new Set(normalizeMerchant(b).filter((t) => t.length >= 3));
  for (const tok of tokensA) {
    if (tokensB.has(tok)) return true;
  }
  return false;
}

// ─── Top-level match ───────────────────────────────────────────────────────

/**
 * Matches a parsed receipt against a user's candidate bank_transactions rows.
 *
 * Policy:
 *   - Any field missing on the receipt (merchant/orderDate/totalUsd) that is
 *     required for a given check makes that check fail closed (no match),
 *     since a missing value can never safely satisfy a tolerance check.
 *   - Zero candidates satisfying all three checks -> null.
 *   - Exactly one candidate satisfying all three checks -> that candidate's id.
 *   - Two or more candidates satisfying all three checks -> null (ambiguous;
 *     see policy note in the file doc comment above). This is NOT "pick the
 *     closest by amount" — that would silently resolve a genuine ambiguity
 *     the caller should instead leave unmatched.
 */
export function matchReceiptToTransaction(
  receipt: ReceiptForMatching,
  candidateTransactions: CandidateTransaction[]
): string | null {
  if (receipt.merchant == null || receipt.orderDate == null || receipt.totalUsd == null) {
    return null;
  }

  const matches = candidateTransactions.filter((txn) => {
    if (!isAmountWithinTolerance(txn.amountUsd, receipt.totalUsd!)) return false;
    if (!isDateWithinTolerance(txn.txnDate, receipt.orderDate!)) return false;
    if (txn.merchantName == null) return false;
    if (!isMerchantFuzzyMatch(txn.merchantName, receipt.merchant!)) return false;
    return true;
  });

  if (matches.length === 1) return matches[0].id;
  return null; // zero or ambiguous (>=2) -> no match
}
