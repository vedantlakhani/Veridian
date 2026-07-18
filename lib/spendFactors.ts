/**
 * lib/spendFactors.ts — Spend-based Emission Factor Engine (Sprint D Stage 1)
 *
 * ARCHITECTURE NOTE: PURE functions only — no React, no Supabase, no network.
 * This file turns one bank transaction (amount + Plaid category) into an
 * estimated kg CO₂e, so it is fully unit-testable in isolation (see
 * __tests__/lib/spendFactors.test.ts) and reused verbatim by the Deno
 * `plaid-sync` edge function (Stage 3) — which is why it must never import
 * anything stateful.
 *
 * Data sources (both checked-in, both cited in their own `_meta` blocks):
 *   • data/useeio_factors.json   — EPA USEEIO v1.3 "with margins" factors,
 *                                  kg CO₂e per 2022 USD (purchaser price), by
 *                                  6-digit 2017 NAICS. Values copied verbatim
 *                                  from the EPA CSV — none are estimated.
 *   • data/category_to_naics.json — Plaid PFCv2 detailed category → 2017 NAICS.
 *
 * Every spend-based number is an ESTIMATE and must be surfaced as such
 * (NORTH_STAR §5: false precision is a documented churn driver). Accordingly
 * this engine never returns 'high' confidence — the ceiling is 'medium'.
 */

import crosswalkJson from '@/data/category_to_naics.json';
import factorsJson from '@/data/useeio_factors.json';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SpendConfidence = 'low' | 'medium';

export interface SpendEstimate {
  kgCo2e: number; // negative for refunds (negative amountUsd), same factor
  factorRef: string; // stable provenance string, e.g. "USEEIO v1.3.0 · NAICS 445110"
  confidence: SpendConfidence;
  naicsCode: string;
}

export interface TransactionInput {
  amountUsd: number; // nominal USD at transaction time; negative = refund/credit
  plaidPrimary: string;
  plaidDetailed: string;
  mcc?: string; // reserved — see MCC note below; not yet consulted
}

interface CrosswalkRow {
  plaidPrimary: string;
  plaidDetailed: string;
  naicsCode: string | null;
  naicsLabel: string | null;
  nonEmission: boolean;
  confidence: string;
  note?: string;
}

interface FactorRow {
  naicsTitle: string;
  kgCo2ePerUsd2022: number;
  appCategory: string;
}

const crosswalk = crosswalkJson as unknown as {
  _meta: { fallback: { naicsCode: string } };
  categories: CrosswalkRow[];
};
const factorsFile = factorsJson as unknown as {
  _meta: {
    datasetVersion: string;
    cpi: { sourceYearIndex: number; targetYearIndex: number };
  };
  factors: Record<string, FactorRow>;
};

// ─── Derived lookup structures (built once at module load) ──────────────────────

const rowByDetailed = new Map<string, CrosswalkRow>();
const emissionPrimaries = new Set<string>();
const nonEmissionPrimaries = new Set<string>();

for (const row of crosswalk.categories) {
  rowByDetailed.set(row.plaidDetailed, row);
  // A primary is "emission" if ANY of its detailed children is estimable, and
  // "non-emission" only if ALL of its children are non-emission. INCOME /
  // TRANSFER_* / LOAN_* / BANK_FEES are wholly non-emission; the rest are spend.
  if (row.nonEmission) nonEmissionPrimaries.add(row.plaidPrimary);
  else emissionPrimaries.add(row.plaidPrimary);
}
// A primary that has even one emission child is a spending primary — remove it
// from the non-emission set so an unknown detailed under it hits the fallback.
for (const p of emissionPrimaries) nonEmissionPrimaries.delete(p);

const FACTORS = factorsFile.factors;
export const FALLBACK_NAICS = crosswalk._meta.fallback.naicsCode;
export const USEEIO_VERSION = factorsFile._meta.datasetVersion;

// ─── CPI dollar-year adjustment ────────────────────────────────────────────────
//
// USEEIO factors are kg CO₂e per **2022** USD (purchaser price). A transaction
// amount is in nominal dollars at transaction time (~2025+). Because prices rose
// after 2022, a nominal dollar buys less real product than a 2022 dollar did, so
// we DEFLATE the nominal amount to 2022 dollars before applying the factor:
//
//   kg = amountUsd × (CPI_2022 / CPI_target) × factor_per2022USD
//
// The deflator (CPI_2022 / CPI_target < 1) is the reciprocal of the price growth
// stored as `cpiAdjustmentTo2025` in the factor file. Modeling assumption:
// spend-based emissions track real consumption, so nominal spend is expressed in
// the factor's dollar-year. Both index values are the CPI-U (CPIAUCNS) annual
// averages cited in data/useeio_factors.json → _meta.cpi.
export const CPI_SOURCE_INDEX = factorsFile._meta.cpi.sourceYearIndex; // 2022 annual avg
export const CPI_TARGET_INDEX = factorsFile._meta.cpi.targetYearIndex; // recent-year avg
export const CPI_DEFLATOR = CPI_SOURCE_INDEX / CPI_TARGET_INDEX;

// ─── Confidence policy ──────────────────────────────────────────────────────────
//
// The crosswalk grades each mapping high/medium/low, but a per-transaction
// spend estimate can never be "high" — it is a sector-average factor applied to
// a dollar amount with no line-item detail. So we cap the ceiling at 'medium'
// and only a HIGH-confidence exact crosswalk match earns it; everything else
// (medium/low crosswalk matches, and the general-retail fallback) is 'low'.
function mapConfidence(crosswalkConfidence: string, isFallback: boolean): SpendConfidence {
  if (isFallback) return 'low';
  return crosswalkConfidence === 'high' ? 'medium' : 'low';
}

// Round symmetrically about zero so a refund is the exact negation of the
// matching charge (guards the summary/refund math — see tests).
function roundKg(kg: number): number {
  const r = Math.round(Math.abs(kg) * 1e4) / 1e4;
  return kg < 0 ? -r : r;
}

// ─── Resolution ─────────────────────────────────────────────────────────────────

interface Resolved {
  naicsCode: string;
  confidence: string;
  isFallback: boolean;
}

/**
 * Resolves a Plaid category to a NAICS code + crosswalk confidence, or null.
 *
 * Precedence:
 *   1. Exact (primary+detailed) crosswalk row wins. If it's non-emission → null.
 *   2. No detailed match, but the PRIMARY is a known spending primary → the
 *      conservative general-retail fallback, flagged low-confidence. This is the
 *      spec's "unknown → conservative general-retail fallback flagged
 *      low_confidence" tier (SPRINT_D_SPEC §Stage 1) — it fires only for a new/
 *      unrecognised detailed code UNDER a primary we already know is spend.
 *   3. Otherwise (non-emission primary, or a wholly-unknown primary) → null.
 *      We do NOT invent emissions for transfers, fees, or categories we cannot
 *      even confirm are purchases.
 */
function resolveNaics(primary: string, detailed: string): Resolved | null {
  const row = rowByDetailed.get(detailed);
  if (row) {
    if (row.nonEmission || row.naicsCode == null) return null;
    return { naicsCode: row.naicsCode, confidence: row.confidence, isFallback: false };
  }
  if (emissionPrimaries.has(primary) && !nonEmissionPrimaries.has(primary)) {
    return { naicsCode: FALLBACK_NAICS, confidence: 'low', isFallback: true };
  }
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────────

/**
 * Estimates the carbon footprint of one bank transaction.
 * Returns null when the transaction is not an emission (transfers, loan/CC
 * payments, fees, income, tax, rent) or cannot be crosswalked at all.
 *
 * kg = amountUsd × CPI_DEFLATOR × factorKgPer2022Usd
 * Negative amountUsd (refund) → negative kg with the identical factor.
 *
 * MCC note: `mcc` is accepted for forward-compatibility but not yet consulted —
 * the checked-in crosswalk keys off Plaid's personal_finance_category only and
 * carries no MCC table. Wiring an MCC-first override is a documented follow-up.
 */
export function estimateTransactionKg(input: TransactionInput): SpendEstimate | null {
  const resolved = resolveNaics(input.plaidPrimary, input.plaidDetailed);
  if (!resolved) return null;

  const factor = FACTORS[resolved.naicsCode];
  // Defensive: a crosswalk code with no factor row would be a data-integrity
  // bug (the coverage test forbids it). Fail safe to null rather than emit NaN.
  if (!factor) return null;

  const kgCo2e = roundKg(input.amountUsd * CPI_DEFLATOR * factor.kgCo2ePerUsd2022);

  return {
    kgCo2e,
    factorRef: `USEEIO ${USEEIO_VERSION} · NAICS ${resolved.naicsCode}${resolved.isFallback ? ' (fallback)' : ''}`,
    confidence: mapConfidence(resolved.confidence, resolved.isFallback),
    naicsCode: resolved.naicsCode,
  };
}
