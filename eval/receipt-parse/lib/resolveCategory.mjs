/**
 * eval/receipt-parse/lib/resolveCategory.mjs
 *
 * Plain-Node ESM port of supabase/functions/_shared/itemFactors.ts's
 * resolveItemFactor(), for use by the grading script (run-harness.mjs).
 *
 * This is a FAITHFUL PORT, not a reinterpretation: same two source-of-truth
 * data files, same precedence order, same text-containment matching rule.
 * If itemFactors.ts's algorithm ever changes, this file must change with it
 * (same reconciliation obligation itemFactors.ts documents for its own
 * relationship to spendFactors.ts).
 *
 * Precedence (verbatim from itemFactors.ts):
 *   1. categoryGuess against data/category_to_naics.json's naicsLabel text
 *      (best-effort keyword containment, either direction)
 *   2. item name (and categoryGuess) against data/item_categories.json's
 *      small low-confidence keyword fallback
 *   3. give up -> null (never fabricate a NAICS code with no textual basis)
 *
 * Data files are read from the repo-root `data/` directory, two levels up
 * from this file's parent (eval/receipt-parse/lib -> eval/receipt-parse ->
 * eval -> repo root -> data/), matching the relative depth
 * `../../../data/...` uses from supabase/functions/_shared/.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../data');

const crosswalkJson = JSON.parse(readFileSync(path.join(DATA_DIR, 'category_to_naics.json'), 'utf8'));
const itemCategoriesJson = JSON.parse(readFileSync(path.join(DATA_DIR, 'item_categories.json'), 'utf8'));
const factorsJson = JSON.parse(readFileSync(path.join(DATA_DIR, 'useeio_factors.json'), 'utf8'));

const crosswalk = crosswalkJson;
const itemKeywords = itemCategoriesJson.keywords;
const USEEIO_VERSION = factorsJson._meta.datasetVersion;

// Build a lookup of "searchable label text" -> naicsCode from the crosswalk's
// emission-bearing rows, so a Haiku categoryGuess like "coffee shop" or
// "clothing" can match against e.g. naicsLabel "Family Clothing Stores".
const labelRows = crosswalk.categories.filter((r) => !r.nonEmission && r.naicsCode != null);

function normalize(s) {
  return s.toLowerCase().trim();
}

/**
 * Resolves a receipt item's NAICS code from a categoryGuess and/or the item
 * name. Returns null if no textual match is found anywhere — mirrors
 * itemFactors.ts's resolveItemFactor() exactly, including that it never
 * falls back to a generic default NAICS code.
 *
 * @param {string} itemName
 * @param {string | null} categoryGuess
 * @returns {{ naicsCode: string, matchedVia: 'category_to_naics' | 'item_categories_fallback', factorRef: string } | null}
 */
export function resolveItemFactor(itemName, categoryGuess) {
  const guess = categoryGuess ? normalize(categoryGuess) : '';
  const name = normalize(itemName ?? '');

  // 1. Try categoryGuess against the crosswalk's naicsLabel text.
  if (guess.length > 0) {
    for (const row of labelRows) {
      const label = row.naicsLabel ? normalize(row.naicsLabel) : '';
      if (label.length === 0) continue;
      if (guess.includes(label) || label.includes(guess)) {
        return {
          naicsCode: row.naicsCode,
          matchedVia: 'category_to_naics',
          factorRef: `USEEIO ${USEEIO_VERSION} · NAICS ${row.naicsCode} (item categoryGuess)`,
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
        matchedVia: 'item_categories_fallback',
        factorRef: `USEEIO ${USEEIO_VERSION} · NAICS ${kw.naicsCode} (item keyword fallback: "${kw.keyword}")`,
      };
    }
  }

  return null;
}
