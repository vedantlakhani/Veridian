# Sprint D Stage 3 — manual sandbox verification

No Deno test runner/config exists anywhere in `supabase/functions/` yet (no
`deno.json`, no `*_test.ts` precedent), so per SPRINT_D_SPEC.md Stage 3 this
is the documented manual-verification path instead of a Deno test suite.
Everything below uses Plaid's **sandbox** environment and `user_good` /
`pass_good` test credentials — no real bank, no real money, $0 spent.

Run `supabase start` locally first, and export:

```bash
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_ANON_KEY="<anon key from `supabase status`>"
export USER_JWT="<a real user's access_token — sign in via the app, or
  `supabase auth admin` / the Studio Auth panel to mint one for a test user>"
export PLAID_CLIENT_ID="<sandbox client_id>"
export PLAID_SECRET="<sandbox secret>"
```

## 1. Get a sandbox public_token WITHOUT going through Plaid Link UI

Plaid's sandbox exposes a helper that skips the interactive Link flow
entirely — good for curl-only testing:

```bash
curl -s https://sandbox.plaid.com/sandbox/public_token/create \
  -H 'Content-Type: application/json' \
  -d "{\"client_id\":\"$PLAID_CLIENT_ID\",\"secret\":\"$PLAID_SECRET\",\"institution_id\":\"ins_109508\",\"initial_products\":[\"transactions\"]}"
```

`ins_109508` is Plaid's standard sandbox test institution ("First Platypus
Bank"); its default test transactions cover groceries, restaurants, ride
share, etc. — enough to exercise several crosswalk categories. Copy the
`public_token` from the response (short-lived, ~30 min).

## 2. (Optional) Confirm plaid-link-token works end-to-end

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/plaid-link-token" \
  -H "Authorization: Bearer $USER_JWT" \
  -H 'Content-Type: application/json'
# expect: { "link_token": "link-sandbox-..." }
```

This isn't required to test the rest of the flow (Step 1 already produced a
public_token directly), but proves the authenticated-caller + Plaid-call
plumbing works before wiring up the real mobile Link SDK screen (Stage 4).

## 3. Exchange the public_token — this also triggers the FIRST sync

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/plaid-exchange" \
  -H "Authorization: Bearer $USER_JWT" \
  -H 'Content-Type: application/json' \
  -d '{"public_token":"<from step 1>","institution_name":"First Platypus Bank"}'
```

Expect `{ linked_item: {...}, sync: { added, modified, removed,
entriesCreated, ... }, sync_error: null }`. `sync.entriesCreated` should be
> 0 if the sandbox seed transactions include any crosswalk-resolvable
category (groceries/restaurants/etc. reliably do).

## 4. Confirm rows landed correctly

Via `supabase db` / Studio SQL editor (service role, since `linked_items` and
writes to `bank_transactions` are invisible/blocked to the client role by
design):

```sql
select id, plaid_transaction_id, amount_usd, plaid_category, kg_co2e, factor_ref, confidence, entry_id
from bank_transactions
order by created_at desc limit 20;

select id, source, status, confidence, kg_co2e_total, logged_at, metadata
from emission_entries
where source = 'transaction'
order by created_at desc limit 20;
```

Confirm: every row with a resolvable category has `entry_id` NOT NULL and a
matching `emission_entries` row with `source='transaction'`,
`status='auto_confirmed'`, `metadata->>'plaid_transaction_id'` matching, and
`kg_co2e_total >= 0` (refunds/negative amounts should show a negative
`bank_transactions.kg_co2e` but NO linked entry — see plaidSync.ts's
documented reasoning: `emission_entries.kg_co2e_total` has `CHECK (>= 0)`).

Also confirm `daily_summaries` / `weekly_summaries` for the test user picked
up the new totals.

## 5. Force a re-sync on demand (sandbox/demo convenience)

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/plaid-sync-now" \
  -H "Authorization: Bearer $USER_JWT"
# expect: { "synced": [ { "itemId": "...", "added": 0, ... } ] } — 0 added
# the second time, since /transactions/sync is cursor-based.
```

Re-run the exact same curl a second time in a row: `sync.added` /
`sync.modified` should be `0` and `entriesCreated` should be `0` — this is
the idempotency proof that matters most (SPRINT_D_SPEC.md Stage 5's
"entry double-creation on webhook+manual sync race" concern). To actually
exercise the RACE (not just serial idempotency), fire two `plaid-sync-now`
requests concurrently (`curl ... & curl ... & wait`) immediately after a
fresh link — `entriesCreated` summed across both responses plus any
already-existing entries should still equal exactly the number of
resolvable transactions, never double.

## 6. Webhook path (requires a publicly reachable URL)

`plaid-webhook` cannot be exercised by a same-machine curl the way the
others can, because a *valid* signature can only be produced by Plaid
itself signing with their real private key — there is no way to fabricate
a passing `Plaid-Verification` JWT locally. To test for real:

1. Deploy `plaid-webhook` (or tunnel your local instance, e.g. with `ngrok
   http 54321`) to get a public HTTPS URL.
2. Set that URL as the item's webhook, either at `/link/token/create` time
   (add a `webhook` field) or after linking via
   `POST /item/webhook/update {client_id, secret, access_token, webhook}`.
3. Fire a test webhook: `POST https://sandbox.plaid.com/sandbox/item/fire_webhook`
   `{client_id, secret, access_token, webhook_code: "SYNC_UPDATES_AVAILABLE"}`.
4. Confirm Plaid's dashboard (or your endpoint's logs) shows a 200, and that
   `bank_transactions`/`emission_entries` updated.

**Not independently verifiable in this environment**: this task was
completed without any live call to the Plaid API or a real fired webhook —
the request/response shapes for `/link/token/create`,
`/item/public_token/exchange`, `/transactions/sync`, and the webhook JWT/JWK
scheme are all implemented from Plaid's publicly documented schemas rather
than a captured live response. Run the steps above with real sandbox
credentials before trusting this in front of a user.
