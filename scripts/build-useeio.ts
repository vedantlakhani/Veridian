/**
 * scripts/build-useeio.ts — derivation of data/useeio_factors.json (Sprint D Stage 1)
 *
 * The EPA CSV itself is NOT committed (≈120 KB, 1,016 rows). This script
 * documents — and reproduces — exactly how the checked-in factor snapshot was
 * derived from it, so the provenance is auditable and re-runnable.
 *
 * SOURCE (public domain, EPA):
 *   EPA Supply Chain Greenhouse Gas Emission Factors v1.3, by NAICS-6.
 *   CSV: https://pasteur.epa.gov/uploads/10.23719/1531143/SupplyChainGHGEmissionFactors_v1.3.0_NAICS_CO2e_USD2022.csv
 *   Landing: https://catalog.data.gov/dataset/supply-chain-greenhouse-gas-emission-factors-v1-3-by-naics-6
 *   Unit: kg CO2e per 2022 USD, purchaser price. Variant used: "Supply Chain
 *   Emission Factors with Margins" (column 7). GWP: IPCC AR5 100-yr. NAICS 2017.
 *
 * METHOD: for each 6-digit NAICS code referenced by data/category_to_naics.json
 * (plus the general-retail fallback), copy the "with margins" cell VERBATIM.
 * No value is averaged, interpolated, or estimated — one crosswalk code maps to
 * exactly one EPA row.
 *
 * The CPI block in _meta is maintained by hand from BLS CPI-U (series CPIAUCNS,
 * via FRED): 2022 annual average = 292.655 (complete); 2025 = 321.943 (11-month
 * average, Oct 2025 was unpublished in the retrieved snapshot). See that block
 * for the exact adjustment semantics.
 *
 * USAGE (not run in CI; requires a TS runner, e.g. `npx tsx`):
 *   npx tsx scripts/build-useeio.ts /path/to/SupplyChainGHGEmissionFactors_v1.3.0_NAICS_CO2e_USD2022.csv
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CSV_WITH_MARGINS_COL = 6; // 0-indexed: "Supply Chain Emission Factors with Margins"
const FALLBACK_NAICS = '452319';

interface CrosswalkFile {
  categories: { naicsCode: string | null; nonEmission: boolean }[];
}

/** Minimal CSV row splitter for the EPA file (quoted titles may contain commas). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function appCategory(code: string): 'food' | 'transport' | 'energy' | 'shopping' {
  const food = ['445310', '722515', '722513', '445110', '722511', '454210', '445120'];
  const transport = ['447110', '485113', '485310', '485999', '488490', '481111', '532111', '532284', '812930'];
  const energy = ['221210', '221310', '221320', '221330', '562111'];
  if (food.includes(code)) return 'food';
  if (transport.includes(code)) return 'transport';
  if (energy.includes(code)) return 'energy';
  return 'shopping';
}

function main(): void {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('usage: tsx scripts/build-useeio.ts <path-to-EPA-csv>');
    process.exit(1);
  }

  // Parse EPA CSV → { naicsCode: { title, withMargins } }
  const epa = new Map<string, { title: string; withMargins: number }>();
  const lines = readFileSync(csvPath, 'utf8').split(/\r?\n/);
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    const code = cols[0].replace(/"/g, '').trim();
    if (!/^\d{6}$/.test(code)) continue;
    epa.set(code, { title: cols[1].replace(/"/g, '').trim(), withMargins: Number(cols[CSV_WITH_MARGINS_COL]) });
  }

  // Which codes do we need? Everything the crosswalk references + fallback.
  const dataDir = join(__dirname, '..', 'data');
  const crosswalk = JSON.parse(readFileSync(join(dataDir, 'category_to_naics.json'), 'utf8')) as CrosswalkFile;
  const needed = new Set<string>([FALLBACK_NAICS]);
  for (const c of crosswalk.categories) if (!c.nonEmission && c.naicsCode) needed.add(c.naicsCode);

  const factors: Record<string, { naicsTitle: string; kgCo2ePerUsd2022: number; appCategory: string }> = {};
  for (const code of [...needed].sort()) {
    const row = epa.get(code);
    if (!row) throw new Error(`crosswalk references NAICS ${code} but it is absent from the EPA CSV`);
    factors[code] = { naicsTitle: row.title, kgCo2ePerUsd2022: row.withMargins, appCategory: appCategory(code) };
  }

  // Re-emit only the `factors` block; the hand-maintained _meta (CPI, gaps,
  // provenance) in the committed file is intentionally NOT overwritten here.
  const outPath = join(dataDir, 'useeio_factors.factors.generated.json');
  writeFileSync(outPath, JSON.stringify({ factors }, null, 2));
  console.log(`wrote ${Object.keys(factors).length} factor rows to ${outPath}`);
}

main();
