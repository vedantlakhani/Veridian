/**
 * supabase/functions/_shared/itemFactors.ts — item-level NAICS/factor
 * resolution for receipt line items (Sprint E Stage R2).
 *
 * Reuses spendFactors.ts's crosswalk/factor data and confidence-ceiling
 * discipline (never fabricate a number; low/medium only) rather than
 * duplicating it, but resolution here is keyed off Haiku's per-item
 * categoryGuess + item name text, not a Plaid personal_finance_category —
 * receipts have no Plaid category at all. Precedence, per the task spec:
 *   1. categoryGuess against data/category_to_naics.json's naicsLabel/plaidDetailed
 *      text (best-effort keyword containment — Haiku is prompted to return
 *      a short human category like "coffee" or "clothing", not a Plaid enum)
 *   2. item name (and categoryGuess) against data/item_categories.json's
 *      small low-confidence keyword fallback
 *   3. give up -> null (never fabricate a NAICS code with no textual basis)
 */

// deno-lint-ignore-file no-explicit-any
import crosswalkJson from '../../../data/category_to_naics.json' with { type: 'json' };
import itemCategoriesJson from '../../../data/item_categories.json' with { type: 'json' };
import { getFactorMeta, USEEIO_VERSION, type SpendConfidence } from './spendFactors.ts';

interface CrosswalkRow {
  plaidPrimary: string;
  plaidDetailed: string;
  naicsCode: string | null;
  naicsLabel: string | null;
  nonEmission: boolean;
  confidence: string;
}
const crosswalk = crosswalkJson as unknown as { categories: CrosswalkRow[] };

interface ItemKeywordRow {
  keyword: string;
  naicsCode: string;
  naicsLabel: string;
}
const itemKeywords = (itemCategoriesJson as unknown as { keywords: ItemKeywordRow[] }).keywords;

// Build a lookup of "searchable label text" -> naicsCode from the crosswalk's
// emission-bearing rows, so a Haiku categoryGuess like "coffee shop" or
// "clothing" can match against e.g. naicsLabel "Family Clothing Stores".
const labelRows = crosswalk.categories.filter((r) => !r.nonEmission && r.naicsCode != null);

export interface ItemResolution {
  naicsCode: string;
  confidence: SpendConfidence;
  factorRef: string;
  matchedVia: 'category_to_naics' | 'item_categories_fallback';
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Resolves a receipt item's NAICS code from Haiku's categoryGuess and/or the
 * item name. Returns null if no textual match is found anywhere — this
 * function never guesses a default NAICS code for an item (unlike
 * spendFactors.ts's transaction-level fallback, which can fall back to a
 * generic-merchandise NAICS because a Plaid *primary* category still gives
 * real signal; a bare item name with an unrecognized categoryGuess has no
 * equivalent signal to fall back on).
 */
export function resolveItemFactor(itemName: string, categoryGuess: string | null): ItemResolution | null {
  const guess = categoryGuess ? normalize(categoryGuess) : '';
  const name = normalize(itemName);

  // 1. Try categoryGuess against the crosswalk's naicsLabel text.
  if (guess.length > 0) {
    for (const row of labelRows) {
      const label = row.naicsLabel ? normalize(row.naicsLabel) : '';
      if (label.length === 0) continue;
      if (guess.includes(label) || label.includes(guess)) {
        return {
          naicsCode: row.naicsCode!,
          confidence: 'low', // categoryGuess->label text match is inherently low-confidence
          factorRef: `USEEIO ${USEEIO_VERSION} · NAICS ${row.naicsCode} (item categoryGuess)`,
          matchedVia: 'category_to_naics',
        };
      }
    }
  }

  // 2. Fall back to the small item_categories.json keyword crosswalk,
  // checked against both the item name and the categoryGuess.
  for (const kw of itemKeywords) {
    const needle = normalize(kw.keyword);
    if (name.includes(needle) || (guess.length > 0 && guess.includes(needle))) {
      return {
        naicsCode: kw.naicsCode,
        confidence: 'low',
        factorRef: `USEEIO ${USEEIO_VERSION} · NAICS ${kw.naicsCode} (item keyword fallback: "${kw.keyword}")`,
        matchedVia: 'item_categories_fallback',
      };
    }
  }

  return null;
}

export { getFactorMeta };
