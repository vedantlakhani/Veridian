-- bank_transactions — one row per Plaid transaction synced for a linked item
-- (Sprint D Stage 2). Written exclusively by the plaid-sync edge function
-- (service_role, bypasses RLS); the client only ever reads its own rows.
--
-- entry_id / superseded_by carry the idempotency and Sprint-E-receipt-linkage
-- machinery described in SPRINT_D_SPEC.md Stage 3: a transaction becomes at
-- most one emission_entries row, and the guard for "has this transaction
-- already been turned into an entry" is `entry_id IS NULL` — see the partial
-- index below, which is exactly that query's shape.
CREATE TABLE bank_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id               UUID NOT NULL REFERENCES linked_items(id) ON DELETE CASCADE,
  plaid_transaction_id  TEXT UNIQUE NOT NULL,
  amount_usd            NUMERIC(10, 2) NOT NULL,
  merchant_name         TEXT,
  plaid_category        TEXT,
  mcc                   TEXT,
  txn_date              DATE NOT NULL,
  kg_co2e               NUMERIC(10, 4),
  factor_ref            TEXT,
  confidence            TEXT CHECK (confidence IN ('low', 'medium')),
  entry_id              UUID REFERENCES emission_entries(id) ON DELETE SET NULL,
  superseded_by         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Read-only for the client: a user may see their own transactions but never
-- write them directly. All writes (initial sync upsert, kg_co2e/factor_ref
-- backfill, entry_id linkage, removed/modified handling from /transactions/sync)
-- come only from the plaid-sync edge function via the service role, which
-- bypasses RLS entirely — so no INSERT/UPDATE/DELETE policy exists here.
CREATE POLICY "Users can view own bank transactions"
  ON bank_transactions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE INDEX bank_transactions_user_txn_date_idx ON bank_transactions(user_id, txn_date DESC);

-- Idempotency-guard shape: "find THIS ITEM's transactions not yet turned into
-- an emission entry" is `WHERE item_id = $1 AND entry_id IS NULL`. entry_id is
-- constant (NULL) across every row in the partial index, so it contributes no
-- selectivity on its own — item_id must lead the index or a per-item lookup
-- degrades to scanning every unprocessed row system-wide. The partial
-- predicate still keeps the index small as most rows eventually get an
-- entry_id.
--
-- NOTE for Stage 3: this index makes the lookup cheap, but it is not itself
-- the race guard against a webhook sync and a manual sync both processing the
-- same transaction. That guard must be an atomic
-- `UPDATE bank_transactions SET entry_id = $1 WHERE id = $2 AND entry_id IS NULL`
-- (or SELECT ... FOR UPDATE) on the primary key — do not create the emission
-- entry first and set entry_id second, or a concurrent pass can double-create.
CREATE INDEX bank_transactions_item_unprocessed_idx ON bank_transactions(item_id, entry_id) WHERE entry_id IS NULL;
