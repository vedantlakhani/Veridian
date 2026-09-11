# Eval spec: receipt-parse

This eval gates one decision: **do we ship a prompt or model change to `supabase/functions/receipt-parse/index.ts`'s Haiku extraction step.** Every receipt a user shares or imports gets parsed by this function into structured fields (merchant, date, currency, line items with a category guess, total), and that structured output is what downstream code turns into an emissions estimate via `resolveItemFactor()`. If the extraction gets worse — wrong prices, wrong categories, fabricated items — the emissions numbers built on top of it are wrong too, silently. This harness is what stands between a prompt edit and shipping it.

The output shape is **structured fields**, which is a case-cheap shape to grade: every field is either an exact/tolerance match or a lookup, so no field needs a human or an LLM judge to decide "close enough."

## Golden set

40 hand-written cases, split into four slices, with 6 held out and never used to tune anything — only reported at the end of a run.

| Slice | Cases | What it tests |
|---|---:|---|
| `happy_path` | 16 | Clean, common receipts (grocery, electronics, retail, gas, pharmacy) — the traffic that dominates real usage |
| `hard_legitimate` | 12 | Ambiguity that is still a normal receipt: missing totals, unusual formatting, multi-currency-looking text, bundled items |
| `confusion_pair` | 8 | **The domain-specific confusion pair for this app: grocery vs. restaurant/prepared-food category ambiguity.** A "hot bar" item at a grocery store, a grab-and-go sandwich, a bakery item — cases where `categoryGuess` could plausibly land on either NAICS 445110 (grocery) or 722513 (limited-service restaurant), which resolve to different emissions factors. This is the mistake the resolution logic is most likely to make, so it is oversampled and scored on its own. |
| `adversarial` | 4 | Non-receipt content, empty/garbage input, and content designed to see whether the model fabricates items or a total when there's nothing there to extract |

**Held out:** 6 of the 40 cases carry `holdout: true` in the JSONL and are excluded from every metric used to decide whether to ship a change. They exist purely as a check against tuning to the test — if the tuning-set score moves but the held-out score doesn't, that's a warning sign, not a proof of anything, but it's the cheapest warning sign available.

**Provenance.** All 40 cases were hand-written by the engineer (me), modeled on realistic receipt formats (Trader Joe's, Best Buy, Gap, Shell, CVS, Amazon order confirmations, etc.) — none are sourced from real Veridian users' actual receipts. This is an honest limitation: synthetic cases can miss the messiness of real OCR'd or forwarded receipt text (truncated lines, weird encoding, multi-page order confirmations). Real user receipts, sanitized, would meaningfully strengthen this set and are a natural next step once there's a way to collect a handful with consent. Until then, this is a legitimate first-run eval, not a finished one.

**Case format.** One JSON object per line: `{id, slice, source, holdout, input, expected: {merchant, orderDate, currency, totalUsd, items: [{name, qty, priceUsd, categoryKeyword}], note}}`. `expected.items[].categoryKeyword` is a plain string (e.g. `"grocery"`, `"restaurant"`, `"electronics"`) chosen deliberately so that passing it through `resolveItemFactor()` as if it were a Haiku `categoryGuess` resolves to the correct real NAICS code — see the grading rubric below for why that matters.

**Freeze rule.** This file, `golden-v1.jsonl`, is frozen as of 2026-09-11. It does not get edited once a run has happened against it — that would invalidate any before/after comparison. New cases go into `golden-v2.jsonl`, dated, whenever the set needs to grow (e.g. once real receipts are available, or a new failure mode is discovered).

## Grading rubric

| Field | How it's graded |
|---|---|
| `merchant` | Case-insensitive substring match in either direction (`"Trader Joe's"` matches `"TRADER JOE'S #412"` or vice versa), or both sides null |
| `orderDate` | Exact string match (`"YYYY-MM-DD"`), or both sides null |
| `currency` | Exact match (defaults to `"USD"` if unstated on either side) |
| `totalUsd` | Within $0.02, or both sides null |
| `items[].priceUsd` (by position) | Within $0.02, or both sides null (the one non-USD holdout case has null prices by design) |
| `items[].categoryGuess` (by position) | **Resolved through `lib/resolveCategory.mjs`, not string-compared.** Both the expected item (`name` + `categoryKeyword`) and the model's actual item (`name` + `categoryGuess`) are run through `resolveItemFactor()` — a faithful plain-Node port of the real production resolution logic in `supabase/functions/_shared/itemFactors.ts`. The grade is whether the two resolved NAICS codes match. |
| Item count | Must match before per-position comparison proceeds; a mismatch fails the case |

**Why NAICS-resolution, not string similarity, is the real metric.** The production code doesn't care whether Haiku wrote `"prepared food"` or `"grab and go"` for a rotisserie chicken — it cares whether that string, run through the same containment-matching logic that runs in production, resolves to the same emissions factor a human would expect. A model that writes wildly different-looking category strings that both correctly resolve to NAICS 445110 should pass; a model that writes a plausible-looking string that happens to resolve to the wrong factor should fail. String similarity would get both of those backwards. This is also why the `confusion_pair` slice exists: grocery and restaurant items are the pair where a plausible-sounding but wrong `categoryGuess` actually changes which emissions factor gets applied.

**No LLM judge.** Every field above is either exact/tolerance-comparable or resolves through a deterministic lookup. This is a deliberate choice, not an oversight — saying "this didn't need a judge" is a stronger answer than bolting one on for a task that doesn't need one. If a future version of this feature needs to grade something genuinely open-ended (e.g. a free-text receipt summary), that's the point to reconsider.

## Regression definition

**The hard gate.** Confusion-pair recall (pass rate on the 8 `confusion_pair` tuning-set cases) must not drop below its run-1 baseline value, once run 1 exists — even if overall accuracy goes up. Averaging the confusion pair into the aggregate is exactly how a change that improves easy cases while quietly breaking grocery-vs-restaurant classification would ship unnoticed. `run-harness.mjs` reads the last row of `RUN_LOG.md` and prints this gate's current baseline before every run, as a warning — it does not block the run automatically, because that decision (ship or don't) belongs to whoever is reading the numbers, not to the harness.

**The noise tolerance.** On a 40-case set (34 in the tuning split), treat any movement under about 3 points as noise unless it repeats across two consecutive runs. This set is small enough that a single flipped case moves the aggregate by several points on its own.

**The blocking failure.** Any case in the `adversarial` slice or the held-out set where the model fabricates an item, a price, or a total that isn't actually present in the input. This is checked independently of the aggregate score — a run can have a fine overall accuracy number and still be unshippable if it invents a receipt out of non-receipt content, because that's the specific failure mode that would corrupt a user's real emissions data with no basis in what they actually bought.

## Instrumentation

Tracked on every real run, printed to stdout and written to `RUN_LOG.md`:

| What | Why |
|---|---|
| Tuning-set accuracy (case pass rate, holdout excluded) | The headline number used to decide whether a change is an improvement |
| Confusion-pair recall (reported on its own, never averaged in) | The regression gate — see above |
| Held-out set accuracy | The check against tuning-to-the-test; never used to justify a change, only to sanity-check the tuning-set number |
| Per-slice breakdown (happy_path / hard_legitimate / confusion_pair / adversarial) | Localizes where a score change actually came from |
| Cost per case, and total run cost | Computed from actual `usage.input_tokens` / `usage.output_tokens` on each API response, using Haiku 4.5's posted $1/$5 per-Mtok input/output pricing — the same math `index.ts` already logs in production |
| Run date, prompt/version label | So `RUN_LOG.md` is a real dated history, not just the most recent number |

## Current status

**Harness built. Golden set frozen at `golden-v1.jsonl`. Zero runs executed.**

The Anthropic API key in `supabase/functions/.env` currently has no credit balance — confirmed by an actual test call, which returned `Your credit balance is too low to access the Anthropic API`. `run-harness.mjs` was run once to verify the harness itself: it correctly read all 40 golden cases, built the first request using the exact production prompt, called the real Anthropic API, and failed at that same credit-balance error (not a code bug). No `RUN_LOG.md` row was written, because the run did not complete — the script explicitly refuses to write a row for a partial or failed run, and the header-only `RUN_LOG.md` in this directory reflects that honestly.

No numbers anywhere in this README or in `RUN_LOG.md` are placeholders standing in for real results — there are no results yet.

## How to run it

Once the Anthropic account behind `ANTHROPIC_API_KEY` has credit:

```
node run-harness.mjs
```

This is run 1 and establishes the baseline. To test an alternative prompt against that baseline without editing the production prompt in this script:

```
node run-harness.mjs --prompt-file path/to/alternative-prompt.txt
```

Either way, the script prints a full summary to stdout and appends one row to `RUN_LOG.md` — but only if the run completes; a failed or partial run prints what it can and writes nothing to the log.
