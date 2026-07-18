/**
 * supabase/functions/_shared/spendFactors.ts — Deno port of lib/spendFactors.ts
 * (Sprint D Stage 3)
 *
 * IMPORT-VS-DUPLICATE DECISION (documented per SPRINT_D_SPEC.md Stage 3):
 * lib/spendFactors.ts itself has zero Node/React/Supabase imports and is
 * otherwise a pure module — but it imports its two data files via the `@/`
 * path alias (`@/data/category_to_naics.json`, `@/data/useeio_factors.json`).
 * That alias is resolved by tsconfig's `paths` + Metro at app-build time; it
 * is NOT a thing Deno's module resolver understands at runtime (Deno resolves
 * relative/absolute specifiers or entries in an import map — there is no
 * import_map.json in supabase/functions, and the app's tsconfig.json itself
 * `exclude`s supabase/functions, i.e. this repo already treats edge functions
 * as a separate module universe from the app). So `lib/spendFactors.ts`
 * cannot be imported as-is by a Deno edge function.
 *
 * Rather than duplicate everything, this file duplicates ONLY the ~80 lines
 * of pure resolution/CPI/rounding logic (ported verbatim, same algorithm,
 * same precedence rules, same confidence policy) and imports the underlying
 * DATA FILES by relative path straight from the repo-root `data/` directory
 * — the same two checked-in JSON files the app uses, with `type: "json"`
 * import attributes (supported by the Deno runtime Supabase Edge Functions
 * run on). That keeps a SINGLE source of truth for the 69-row factor table
 * and 127-row crosswalk (the large, error-prone-to-duplicate part); only the
 * small logic layer is a maintained copy. If lib/spendFactors.ts's algorithm
 * ever changes, this file must change in lockstep — same reconciliation
 * obligation the Stage 2 seed migration already documents for the data side.
 */

// deno-lint-ignore-file no-explicit-any
import crosswalkJson from '../../../data/category_to_naics.json' with { type: 'json' };
import factorsJson from '../../../data/useeio_factors.json' with { type: 'json' };

// ─── Types (identical to lib/spendFactors.ts) ──────────────────────────────

export type SpendConfidence = 'low' | 'medium';

export interface SpendEstimate {
  kgCo2e: number; // negative for refunds (negative amountUsd), same factor
  factorRef: string;
  confidence: SpendConfidence;
  naicsCode: string;
}

export interface TransactionInput {
  amountUsd: number; // nominal USD at transaction time; negative = refund/credit
  plaidPrimary: string;
  plaidDetailed: string;
  mcc?: string;
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

const rowByDetailed = new Map<string, CrosswalkRow>();
const emissionPrimaries = new Set<string>();
const nonEmissionPrimaries = new Set<string>();

for (const row of crosswalk.categories) {
  rowByDetailed.set(row.plaidDetailed, row);
  if (row.nonEmission) nonEmissionPrimaries.add(row.plaidPrimary);
  else emissionPrimaries.add(row.plaidPrimary);
}
for (const p of emissionPrimaries) nonEmissionPrimaries.delete(p);

const FACTORS = factorsFile.factors;
export const FALLBACK_NAICS = crosswalk._meta.fallback.naicsCode;
export const USEEIO_VERSION = factorsFile._meta.datasetVersion;

export const CPI_SOURCE_INDEX = factorsFile._meta.cpi.sourceYearIndex;
export const CPI_TARGET_INDEX = factorsFile._meta.cpi.targetYearIndex;
export const CPI_DEFLATOR = CPI_SOURCE_INDEX / CPI_TARGET_INDEX;

function mapConfidence(crosswalkConfidence: string, isFallback: boolean): SpendConfidence {
  if (isFallback) return 'low';
  return crosswalkConfidence === 'high' ? 'medium' : 'low';
}

function roundKg(kg: number): number {
  const r = Math.round(Math.abs(kg) * 1e4) / 1e4;
  return kg < 0 ? -r : r;
}

interface Resolved {
  naicsCode: string;
  confidence: string;
  isFallback: boolean;
}

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

/**
 * Looks up the raw factor-file metadata for a NAICS code — used by
 * plaidSync.ts's find-or-create emission_factors step so a defensive INSERT
 * (the seed migration should already have every code the crosswalk can
 * produce, but this guards a future crosswalk/seed drift) has a real
 * category + title instead of a placeholder.
 */
export function getFactorMeta(
  naicsCode: string
): { appCategory: string; naicsTitle: string; kgCo2ePerUsd2022: number } | null {
  const factor = FACTORS[naicsCode];
  if (!factor) return null;
  return { appCategory: factor.appCategory, naicsTitle: factor.naicsTitle, kgCo2ePerUsd2022: factor.kgCo2ePerUsd2022 };
}

/**
 * Estimates the carbon footprint of one bank transaction. See
 * lib/spendFactors.ts for the full doc comment — this is a byte-for-byte
 * algorithmic port, only the data-import mechanism differs.
 */
export function estimateTransactionKg(input: TransactionInput): SpendEstimate | null {
  const resolved = resolveNaics(input.plaidPrimary, input.plaidDetailed);
  if (!resolved) return null;

  const factor = FACTORS[resolved.naicsCode];
  if (!factor) return null;

  const kgCo2e = roundKg(input.amountUsd * CPI_DEFLATOR * factor.kgCo2ePerUsd2022);

  return {
    kgCo2e,
    factorRef: `USEEIO ${USEEIO_VERSION} · NAICS ${resolved.naicsCode}${resolved.isFallback ? ' (fallback)' : ''}`,
    confidence: mapConfidence(resolved.confidence, resolved.isFallback),
    naicsCode: resolved.naicsCode,
  };
}
