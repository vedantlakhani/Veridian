# Sprint D — The Money Layer (Executable Spec)

*Authored by the Fable orchestrator (July 2026) as a banked blueprint. A Sonnet-led session can execute this
mechanically: run stages in order, each as a tightly-scoped agent with the house rules below, followed by the
Sprint A–C verification pattern (tsc + jest + lint gate, then adversarial TS review with concrete-scenario
standard, then human-visible summary). Read docs/NORTH_STAR.md §5 first — the strategy and vendor decisions
are already made there and are NOT to be re-litigated.*

## Goal / exit criteria

Shopping, food, and fuel spending appears in the ledger automatically after a one-time bank link.
Exit: a user links a card (Plaid **sandbox**), transactions flow in within a session, each becomes an
emission entry with `source='transaction'`, a visible "estimated" treatment, and the `shopping` category
finally has live data. $0 spent (sandbox only) until the human decides to request Plaid production access.

## House rules (inherited, non-negotiable)

- TypeScript strict; Reanimated only; no UI libraries; match existing style; tests for every pure module.
- The estimate gate (`finalizeDraftStatus`) pattern extends here: **spend-based numbers are estimates and
  must be visually labeled as such** — never presented with false precision (research: accuracy
  disappointment is a documented churn cause; see NORTH_STAR §5).
- Secrets NEVER ship in the app bundle. Plaid secret keys live only in Supabase edge-function env.
- One new npm dependency is pre-approved: `react-native-plaid-link-sdk` (requires dev-client rebuild).
  Nothing else without human sign-off.
- Two hard-won lessons from Sprints B–C: (1) `app.json` edits do NOT sync into the persistent `ios/`
  directory — if any iOS-native config is needed, patch `ios/Veridian/Info.plist` too; (2) any
  permission-consuming native path must have its manifest/plist declaration or iOS hard-crashes.

## Human prerequisites (block Stage 3+, not Stages 1–2)

1. Create a Plaid account (free), get **sandbox** client_id + secret. Put them in Supabase edge-function
   secrets (`supabase secrets set PLAID_CLIENT_ID=... PLAID_SECRET=... PLAID_ENV=sandbox`).
2. Later (not this sprint): apply for Plaid limited-production/startup tier for real banks.

## Stage 1 — Factor engine (pure, no vendor, no network)

- `data/useeio_factors.json` — checked-in snapshot of EPA USEEIO Supply Chain GHG factors, **"with margins"
  (purchaser price) variant**, keyed by NAICS/commodity code, kg CO₂e per 2022 USD. Pin the dataset version
  in a `_meta` block (source URL, version, retrieved date, dollar-year). A small `scripts/build-useeio.ts`
  documents how it was derived from the EPA CSV (the CSV itself is not committed).
  ⚠ Dollar-year matters: include a CPI adjustment factor in `_meta` and apply it in the engine.
- `data/category_to_naics.json` — crosswalk from Plaid `personal_finance_category` (primary+detailed) and
  common MCC codes → NAICS sector. Start with the ~60 most common consumer categories; unknown → a
  conservative "general retail" fallback flagged `low_confidence`.
- `lib/spendFactors.ts` (pure, tested): `estimateTransactionKg({amountUsd, plaidCategory, mcc?}) →
  {kgCo2e, factorRef, confidence: 'low'|'medium', naics}`. Negative amounts (refunds) → negative kg with the
  same factor. Transfers/credit-card-payments/cash-withdrawal categories → `null` (not emissions).
- Tests: crosswalk coverage, refund math, non-emission exclusions, CPI adjustment, fallback confidence.

## Stage 2 — Schema (additive migration, then `supabase db push` by human or with consent)

- `linked_items` (server-only access): id, user_id, plaid_item_id UNIQUE, institution_name, cursor TEXT,
  status, created_at. **access_token column readable by service_role only** (no RLS policy for
  authenticated = invisible to clients; edge functions use service key).
- `bank_transactions`: id, user_id, item_id FK, plaid_transaction_id UNIQUE, amount_usd, merchant_name,
  plaid_category, mcc, txn_date DATE, kg_co2e NUMERIC NULL, factor_ref TEXT, confidence TEXT,
  entry_id UUID NULL REFERENCES emission_entries ON DELETE SET NULL, superseded_by TEXT NULL
  (receipt linkage for Sprint E), created_at. RLS: SELECT own only (writes come from edge functions).
- `emission_entries` needs no schema change (Sprint A already added source/'transaction', confidence,
  metadata). Factor handling: seed `emission_factors` with one row per NAICS sector used
  (category 'shopping'/'food'/'transport' as appropriate, unit 'USD', source 'EPA USEEIO vX'), so
  `factor_id NOT NULL` stays satisfied and the calc engine stays uniform.

## Stage 3 — Edge functions (Deno, in supabase/functions/)

- `plaid-link-token` — POST, auth'd user → Plaid /link/token/create → link_token.
- `plaid-exchange` — POST public_token → /item/public_token/exchange → store item + access_token
  (service-role insert into linked_items) → kick first sync.
- `plaid-sync` — cursor-based `/transactions/sync` per item: upsert bank_transactions (idempotent on
  plaid_transaction_id), run the factor engine, and for each new estimable transaction create the
  emission entry (source 'transaction', status 'auto_confirmed', confidence from engine, loggedAt txn_date
  midday local, metadata {plaid_transaction_id, merchant}) — reuse the exact insert shape of
  useCreateEntry (read it first) and recompute the affected day/week summaries server-side or via a
  follow-up client invalidation. **Idempotency rule: entry creation keyed on bank_transactions.entry_id
  being NULL — set it in the same transaction.** Handle removed/modified arrays from /sync (delete/update
  linked entries + resync summaries).
- `plaid-webhook` — verify Plaid webhook signature (JWT verification per Plaid docs), enqueue sync for the
  item. (Sandbox: also expose manual "sync now" from the app for demo purposes.)
- Unit-test the pure parts (factor calls, idempotency guards) with Deno tests if the repo has precedent;
  otherwise document manual sandbox verification steps.

## Stage 4 — App UI

- `app/link-bank.tsx` (modal): the trust-first connect screen — this is the highest-leverage conversion
  surface in the app (NORTH_STAR §5). Copy requirements: "We never see your credentials", "Unlink anytime",
  plain-language why, and a skip path that keeps sensors-only mode first-class. Then Plaid Link via the SDK.
- Profile: linked accounts row (institution, unlink → edge function /item/remove + local cleanup).
- Feed treatment: transaction entries render with the merchant name via feedCopy ("Groceries at Trader
  Joe's — est. 4.2 kg"), an `~` or "est." marker on the chip, and a distinct source glyph. Estimated
  chip style must NOT look identical to sensor-measured entries.
- Insights: shopping category now has data; verify charts/colors flow (shopping tokens exist since Sprint A).

## Stage 5 — Verify (Sprint A–C pattern)

Gate (tsc/jest/lint) + adversarial review focused on: entry double-creation on webhook+manual sync race
(the unique plaid_transaction_id + entry_id-null guard must be airtight), refund/negative flows breaking
summary math, timezone of txn_date→loggedAt, RLS holes on linked_items (client must NOT be able to read
access_token — prove it), factor fallback overconfidence. Then human sandbox walkthrough script:
link sandbox bank → sync → see feed entries → unlink → entries remain but no new syncs.

## Known limitations (built, shipped, and explicitly flagged — not silently decided)

- **Refund netting**: a refund arrives from Plaid as its own transaction (distinct `plaid_transaction_id`),
  not a modification of the original purchase. The implementation does not look up and net the original
  purchase's `emission_entries` row against it, so a refunded purchase's emissions stay counted in the
  user's total indefinitely (`supabase/functions/_shared/plaidSync.ts`, the refund-skip branch). Proper
  netting needs fuzzy-matching a refund to its original purchase (Plaid does not guarantee a direct link
  between the two) — real engineering effort, not a quick fix. **Human decision needed**: fix now, defer to
  a follow-up, or accept as a permanent v1 limitation (likely rare in practice — refunds are a small
  fraction of transactions, and sandbox testing may not exercise this path at all).

## Explicitly out of scope

Real-bank production access, EU/India aggregators, offset anything, receipts matching (Sprint E),
Teller fallback (only if Plaid sandbox proves unusable — escalate to human first).
