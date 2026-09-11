#!/usr/bin/env node
/**
 * eval/receipt-parse/run-harness.mjs
 *
 * Runnable eval harness for the Veridian receipt-parse feature
 * (supabase/functions/receipt-parse/index.ts). See README.md in this
 * directory for the full eval spec (golden set design, grading rubric,
 * regression definition, instrumentation).
 *
 * Usage:
 *   node run-harness.mjs                          # run 1, baseline prompt
 *   node run-harness.mjs --prompt-file alt.txt     # run N, alternative prompt
 *
 * What it does:
 *   1. Reads ANTHROPIC_API_KEY from ../../supabase/functions/.env
 *   2. Loads golden-v1.jsonl (40 hand-written cases)
 *   3. Calls the Anthropic Messages API directly (fetch, no SDK dependency)
 *      per case, using the exact STRUCTURED_OUTPUT_PROMPT text copied
 *      verbatim from receipt-parse/index.ts (or an override file)
 *   4. Grades each response against the golden set, resolving categories
 *      through lib/resolveCategory.mjs (the real production NAICS-resolution
 *      logic) rather than doing loose string comparison
 *   5. Prints a summary table and appends a row to RUN_LOG.md
 *
 * No fabricated data: if the API call fails (e.g. insufficient credits),
 * this script prints partial progress and exits without writing a
 * misleading RUN_LOG row.
 */

import { readFileSync, existsSync, appendFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resolveItemFactor } from './lib/resolveCategory.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let promptFileOverride = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--prompt-file') {
    promptFileOverride = args[i + 1];
    i++;
  }
}

// ─── STRUCTURED_OUTPUT_PROMPT — copied VERBATIM from
// supabase/functions/receipt-parse/index.ts. Do not paraphrase; if the
// production prompt changes, re-copy it here (or use --prompt-file for a
// deliberate variant you are testing against the baseline). ────────────────

const STRUCTURED_OUTPUT_PROMPT = `You are extracting structured data from a purchase receipt. Read the receipt content below and return ONLY valid JSON (no markdown, no code fences, no extra text) matching exactly this shape:

{
  "merchant": string | null,
  "orderDate": string | null,   // "YYYY-MM-DD", null if not determinable
  "currency": string,           // ISO 4217, default "USD" if not stated
  "items": [
    { "name": string, "qty": number, "priceUsd": number, "categoryGuess": string | null }
  ],
  "totalUsd": number | null,
  "confidence": number          // 0-1, your confidence in this extraction
}

Rules:
- Do not invent items, prices, or a merchant name that is not actually present in the receipt content.
- qty defaults to 1 if not stated.
- priceUsd must be the LINE TOTAL for this item (unit price x quantity), NOT a per-unit price. For example, if a receipt shows "2 x Widget @ $5.00 = $10.00", priceUsd must be 10.00, not 5.00. This matches the convention the app's other ingestion paths (CSV import) already use, so downstream emissions math never multiplies by qty again — doing so here would double it.
- categoryGuess should be a short, plain-English product category (e.g. "coffee", "clothing", "electronics"), not a store department code.
- If the content is not a receipt at all, return items: [] and confidence: 0.
- totalUsd should be the receipt's final charged total if stated, else null (do not sum items yourself if a total is not printed).`;

function loadPrompt() {
  if (!promptFileOverride) return { prompt: STRUCTURED_OUTPUT_PROMPT, label: 'baseline (verbatim from index.ts)' };
  const p = path.resolve(process.cwd(), promptFileOverride);
  if (!existsSync(p)) {
    console.error(`--prompt-file ${promptFileOverride} not found at ${p}`);
    process.exit(1);
  }
  return { prompt: readFileSync(p, 'utf8'), label: `override: ${promptFileOverride}` };
}

// ─── .env parsing (no dotenv dependency) ───────────────────────────────────

function readApiKey() {
  const envPath = path.resolve(__dirname, '../../supabase/functions/.env');
  if (!existsSync(envPath)) {
    throw new Error(`.env not found at ${envPath}`);
  }
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // strip surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key === 'ANTHROPIC_API_KEY') return value;
  }
  throw new Error(`ANTHROPIC_API_KEY not found in ${envPath}`);
}

// ─── Golden set loading ─────────────────────────────────────────────────────

function loadGoldenSet() {
  const p = path.resolve(__dirname, 'golden-v1.jsonl');
  const text = readFileSync(p, 'utf8').trim();
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

// ─── Anthropic API call ─────────────────────────────────────────────────────

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1536;

function buildTextMessage(prompt, content) {
  return [{ role: 'user', content: `${prompt}\n\nReceipt content:\n${content}` }];
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAnthropic(apiKey, messages, { retried = false } = {}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      messages,
    }),
  });

  const bodyText = await res.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = { raw: bodyText };
  }

  if (!res.ok) {
    const isTransient = res.status === 429 || res.status >= 500;
    if (isTransient && !retried) {
      console.warn(`  transient error (HTTP ${res.status}), retrying once after 1s...`);
      await sleep(1000);
      return callAnthropic(apiKey, messages, { retried: true });
    }
    const err = new Error(
      `Anthropic API error (HTTP ${res.status}): ${body?.error?.message ?? bodyText}`
    );
    err.httpStatus = res.status;
    err.apiErrorType = body?.error?.type;
    throw err;
  }

  return body;
}

function parseModelJson(rawText) {
  const stripped = rawText.replace(/^```json\s*|```\s*$/g, '').trim();
  return JSON.parse(stripped);
}

// ─── Grading ────────────────────────────────────────────────────────────────

const PRICE_TOLERANCE = 0.02;

function bothNull(a, b) {
  return a == null && b == null;
}

function gradeMerchant(expected, actual) {
  if (bothNull(expected, actual)) return true;
  if (expected == null || actual == null) return false;
  const e = expected.toLowerCase().trim();
  const a = actual.toLowerCase().trim();
  return e.includes(a) || a.includes(e);
}

function gradeDate(expected, actual) {
  if (bothNull(expected, actual)) return true;
  return expected === actual;
}

function gradeCurrency(expected, actual) {
  return (expected ?? 'USD') === (actual ?? 'USD');
}

function gradeTotal(expected, actual) {
  if (bothNull(expected, actual)) return true;
  if (expected == null || actual == null) return false;
  return Math.abs(expected - actual) <= PRICE_TOLERANCE;
}

/** Resolve the "expected" side of a category match: the golden set encodes
 * expected category as a `categoryKeyword` chosen so it resolves correctly
 * against the real NAICS crosswalk when passed through resolveItemFactor
 * as if it were a categoryGuess string (per the golden-set design note). */
function resolveExpectedCategory(item) {
  return resolveItemFactor(item.name, item.categoryKeyword);
}

function resolveActualCategory(item) {
  return resolveItemFactor(item.name ?? '', item.categoryGuess ?? null);
}

/** Grades one case. Returns { pass, detail } where detail lists field-level
 * results for debugging/inspection. */
function gradeCase(goldenCase, parsed) {
  const expected = goldenCase.expected;
  const detail = {};

  detail.merchant = gradeMerchant(expected.merchant, parsed?.merchant);
  detail.orderDate = gradeDate(expected.orderDate, parsed?.orderDate);
  detail.currency = gradeCurrency(expected.currency, parsed?.currency);
  detail.total = gradeTotal(expected.totalUsd, parsed?.totalUsd);

  const expectedItems = expected.items ?? [];
  const actualItems = parsed?.items ?? [];
  detail.itemCountMatch = expectedItems.length === actualItems.length;

  const itemResults = [];
  const n = Math.max(expectedItems.length, actualItems.length);
  for (let i = 0; i < n; i++) {
    const e = expectedItems[i];
    const a = actualItems[i];
    if (!e || !a) {
      itemResults.push({ index: i, pass: false, reason: 'missing on one side' });
      continue;
    }
    const priceOk = gradeTotal(e.priceUsd, a.priceUsd);
    const expectedRes = resolveExpectedCategory(e);
    const actualRes = resolveActualCategory(a);
    const categoryOk =
      (expectedRes == null && actualRes == null) ||
      (expectedRes != null && actualRes != null && expectedRes.naicsCode === actualRes.naicsCode);
    itemResults.push({
      index: i,
      pass: priceOk && categoryOk,
      priceOk,
      categoryOk,
      expectedNaics: expectedRes?.naicsCode ?? null,
      actualNaics: actualRes?.naicsCode ?? null,
    });
  }
  detail.items = itemResults;
  const allItemsPass = detail.itemCountMatch && itemResults.every((r) => r.pass);

  const pass =
    detail.merchant && detail.orderDate && detail.currency && detail.total && allItemsPass;

  return { pass, detail };
}

// ─── Cost estimation (same $1/$5 per Mtok Haiku pricing as index.ts) ───────

function estCostUsd(inputTokens, outputTokens) {
  return (inputTokens / 1_000_000) * 1 + (outputTokens / 1_000_000) * 5;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { prompt, label: promptLabel } = loadPrompt();
  let apiKey;
  try {
    apiKey = readApiKey();
  } catch (err) {
    console.error(`Could not read API key: ${err.message}`);
    process.exit(1);
  }

  const goldenSet = loadGoldenSet();
  console.log(`Loaded ${goldenSet.length} cases from golden-v1.jsonl`);
  console.log(`Prompt: ${promptLabel}`);
  console.log(`Model: ${CLAUDE_MODEL}\n`);

  // Load prior confusion-pair recall baseline from RUN_LOG.md, if any, to
  // warn about regressions (does not block — this is a warning, per the
  // README's regression-gate rule, which a human applies before shipping).
  const priorConfusionRecall = readPriorConfusionPairRecall();
  if (priorConfusionRecall != null) {
    console.log(
      `Prior confusion-pair recall baseline (from RUN_LOG.md): ${(priorConfusionRecall * 100).toFixed(1)}%`
    );
    console.log(`REGRESSION GATE: this run's confusion-pair recall must not drop below that baseline.\n`);
  } else {
    console.log('No prior run in RUN_LOG.md — this run establishes the baseline.\n');
  }

  const results = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let stoppedEarly = false;
  let stopReason = null;

  for (let i = 0; i < goldenSet.length; i++) {
    const c = goldenSet[i];
    process.stdout.write(`[${i + 1}/${goldenSet.length}] ${c.id} (${c.slice}${c.holdout ? ', HOLDOUT' : ''}) ... `);

    let response;
    try {
      const messages = buildTextMessage(prompt, c.input);
      response = await callAnthropic(apiKey, messages);
    } catch (err) {
      console.log('FAILED');
      console.error(`\nAPI call failed on case ${c.id}: ${err.message}`);
      if (err.apiErrorType) console.error(`  error type: ${err.apiErrorType}`);
      stoppedEarly = true;
      stopReason = err.message;
      break;
    }

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;

    const rawText = response.content?.[0]?.text ?? '';
    let parsed = null;
    let parseError = null;
    try {
      parsed = parseModelJson(rawText);
    } catch (err) {
      parseError = err.message;
    }

    if (parseError) {
      console.log('FAIL (unparseable JSON)');
      results.push({ case: c, pass: false, parseError, detail: null });
    } else {
      const { pass, detail } = gradeCase(c, parsed);
      console.log(pass ? 'PASS' : 'FAIL');
      results.push({ case: c, pass, detail, parsed });
    }

    if (i < goldenSet.length - 1) await sleep(300);
  }

  // ─── Summarize ────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  if (results.length === 0) {
    console.log('No cases completed — nothing to summarize.');
  } else {
    printSummary(results, { totalInputTokens, totalOutputTokens, promptLabel });
  }

  if (stoppedEarly) {
    console.log('\n' + '='.repeat(70));
    console.log(`RUN DID NOT COMPLETE: stopped after ${results.length}/${goldenSet.length} cases.`);
    console.log(`Reason: ${stopReason}`);
    console.log('No RUN_LOG.md row written — a partial run is not a real run.');
    if (stopReason && /credit balance/i.test(stopReason)) {
      console.log('\nThis looks like the known Anthropic API credit-balance issue.');
      console.log('Add credits to the account behind ANTHROPIC_API_KEY and re-run:');
      console.log('  node run-harness.mjs');
    }
    process.exit(1);
  }

  // ─── Append to RUN_LOG.md ───────────────────────────────────────────────
  appendRunLog(results, { totalInputTokens, totalOutputTokens, promptLabel });
  console.log('\nAppended run to RUN_LOG.md');
}

function sliceStats(results, slice) {
  const inSlice = results.filter((r) => r.case.slice === slice);
  const passed = inSlice.filter((r) => r.pass).length;
  return { total: inSlice.length, passed, rate: inSlice.length ? passed / inSlice.length : null };
}

function printSummary(results, { totalInputTokens, totalOutputTokens, promptLabel }) {
  const tuning = results.filter((r) => !r.case.holdout);
  const holdout = results.filter((r) => r.case.holdout);

  const tuningPassed = tuning.filter((r) => r.pass).length;
  const tuningAccuracy = tuning.length ? tuningPassed / tuning.length : null;

  const confusionTuning = tuning.filter((r) => r.case.slice === 'confusion_pair');
  const confusionPassed = confusionTuning.filter((r) => r.pass).length;
  const confusionRecall = confusionTuning.length ? confusionPassed / confusionTuning.length : null;

  const holdoutPassed = holdout.filter((r) => r.pass).length;
  const holdoutAccuracy = holdout.length ? holdoutPassed / holdout.length : null;

  const cost = estCostUsd(totalInputTokens, totalOutputTokens);
  const costPerCase = results.length ? cost / results.length : 0;

  console.log(`RESULTS — prompt: ${promptLabel}`);
  console.log('-'.repeat(70));
  console.log(`Tuning-set accuracy (never includes holdout): ${fmtPct(tuningAccuracy)} (${tuningPassed}/${tuning.length})`);
  console.log(`Confusion-pair recall (tuning set, reported separately, never averaged in): ${fmtPct(confusionRecall)} (${confusionPassed}/${confusionTuning.length})`);
  console.log(`Held-out set accuracy (${holdout.length} cases, reported separately, never used to tune): ${fmtPct(holdoutAccuracy)} (${holdoutPassed}/${holdout.length})`);
  console.log('-'.repeat(70));
  console.log('Per-slice breakdown (tuning set only):');
  for (const slice of ['happy_path', 'hard_legitimate', 'confusion_pair', 'adversarial']) {
    const s = sliceStats(tuning, slice);
    console.log(`  ${slice.padEnd(18)} ${fmtPct(s.rate)} (${s.passed}/${s.total})`);
  }
  console.log('-'.repeat(70));
  console.log(`Total cases run: ${results.length}`);
  console.log(`Total tokens: ${totalInputTokens} in / ${totalOutputTokens} out`);
  console.log(`Estimated cost: $${cost.toFixed(6)} total, $${costPerCase.toFixed(6)}/case`);
  console.log('='.repeat(70));

  return { tuningAccuracy, confusionRecall, holdoutAccuracy, cost, costPerCase };
}

function fmtPct(x) {
  if (x == null) return 'n/a';
  return `${(x * 100).toFixed(1)}%`;
}

function readPriorConfusionPairRecall() {
  const p = path.resolve(__dirname, 'RUN_LOG.md');
  if (!existsSync(p)) return null;
  const text = readFileSync(p, 'utf8');
  const lines = text.split('\n').filter((l) => l.trim().startsWith('|') && !l.includes('---') && !l.includes('Date'));
  if (lines.length === 0) return null;
  const last = lines[lines.length - 1];
  const cols = last.split('|').map((c) => c.trim());
  // | Date | Version | What changed | Accuracy | Confusion-pair recall | Held-out accuracy | Cost |
  // cols[0] is '' (before leading pipe), so confusion-pair recall is cols[5]
  const recallStr = cols[5];
  if (!recallStr) return null;
  const match = recallStr.match(/([\d.]+)%/);
  if (!match) return null;
  return parseFloat(match[1]) / 100;
}

function appendRunLog(results, { totalInputTokens, totalOutputTokens, promptLabel }) {
  const p = path.resolve(__dirname, 'RUN_LOG.md');
  const summary = printSummary(results, { totalInputTokens, totalOutputTokens, promptLabel });
  const date = new Date().toISOString().slice(0, 10);

  // Determine version label: baseline if no prior rows, else ask the prompt
  // label to double as the "what changed" note.
  const existing = existsSync(p) ? readFileSync(p, 'utf8') : '';
  const hasPriorRun = /\n\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(existing);
  const version = hasPriorRun ? `prompt-update-${date}` : 'prompt-v1-baseline';
  const whatChanged = hasPriorRun ? `Prompt: ${promptLabel}` : 'Initial run against golden-v1.jsonl, verbatim production prompt';

  const row = `| ${date} | ${version} | ${whatChanged} | ${fmtPct(summary.tuningAccuracy)} | ${fmtPct(summary.confusionRecall)} | ${fmtPct(summary.holdoutAccuracy)} | $${summary.cost.toFixed(4)} total ($${summary.costPerCase.toFixed(6)}/case) |\n`;

  if (!existsSync(p)) {
    writeFileSync(
      p,
      `# Run log — receipt-parse eval\n\nA row is added here after every real run of \`run-harness.mjs\` against \`golden-v1.jsonl\`. Never edited after the fact — earlier numbers stay put so a comparison across runs is trustworthy.\n\n| Date | Version | What changed | Accuracy | Confusion-pair recall | Held-out accuracy | Cost |\n|---|---|---|---|---|---|---|\n${row}`
    );
  } else {
    appendFileSync(p, row);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
