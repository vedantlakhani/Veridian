-- receipts / receipt_items — ingestion-channel-agnostic receipt storage
-- (Sprint E Stage R2, schema adapted per the human's authorized deviation:
-- Stage R1's inbound-email channel is deferred — no domain configured yet —
-- so this schema is deliberately NOT the email-specific receipts_raw/
-- purge-after-parse design SPRINT_E_SPEC.md describes for that channel.
-- `source` only distinguishes 'share' (share-intent) and 'import' (manual)
-- today; an email channel can add a third source value later without any
-- column/shape change here — that is the entire point of keeping this
-- schema channel-agnostic).
--
-- Written exclusively by the receipt-parse edge function (service_role,
-- bypasses RLS) — same zero-authenticated-write-policy pattern as
-- linked_items/bank_transactions, because parsing must stay server-side
-- (the Anthropic API key never reaches the client).
CREATE TABLE receipts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source                TEXT NOT NULL CHECK (source IN ('share', 'import')),
  content_hash          TEXT UNIQUE NOT NULL, -- sha256 of raw shared/imported content — de-dupe key
  merchant              TEXT,
  order_date            DATE,
  currency              TEXT NOT NULL DEFAULT 'USD',
  total_usd             NUMERIC(10, 2),
  parse_status          TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending', 'parsed', 'failed')),
  matched_transaction_id UUID REFERENCES bank_transactions(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Read-only for the client, same as bank_transactions: a user sees only
-- their own receipts, but all writes come from receipt-parse's service role.
CREATE POLICY "Users can view own receipts"
  ON receipts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE INDEX receipts_user_id_idx ON receipts(user_id);
-- content_hash is already UNIQUE (creates its own btree index), which is the
-- idempotency lookup this table needs — no separate index required.

-- receipt_items — one row per line item on a parsed receipt. entry_id mirrors
-- bank_transactions' entry_id linkage exactly: "has this item already been
-- turned into an emission_entries row" is `entry_id IS NULL`.
CREATE TABLE receipt_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  qty             NUMERIC(10, 2) NOT NULL DEFAULT 1,
  price_usd       NUMERIC(10, 2) NOT NULL,
  category_guess  TEXT,
  kg_co2e         NUMERIC(10, 4),
  factor_ref      TEXT,
  entry_id        UUID REFERENCES emission_entries(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own receipt items"
  ON receipt_items FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE INDEX receipt_items_receipt_id_idx ON receipt_items(receipt_id);

-- Same partial-index shape as bank_transactions_item_unprocessed_idx (Sprint
-- D Stage 2): "find this receipt's items not yet turned into an emission
-- entry" is `WHERE receipt_id = $1 AND entry_id IS NULL`.
CREATE INDEX receipt_items_unprocessed_idx ON receipt_items(receipt_id) WHERE entry_id IS NULL;

-- ─── superseded_by reconciliation ──────────────────────────────────────────
-- bank_transactions already has a `superseded_by TEXT` column from Sprint D
-- Stage 2 (see 20260718000022_create_bank_transactions.sql), added at a time
-- when the receipts table (and therefore its id type) did not exist yet, so
-- it could only be a placeholder TEXT. Sprint E's spec calls for
-- `superseded_by UUID REFERENCES receipts(id)`. Leaving both a stale TEXT
-- column and a new correctly-typed column around would be exactly the "two
-- conflicting superseded_by-ish columns" the task warns against, so this
-- migration converts the existing column in place: it is Sprint D's design
-- draft, not a stable data column anyone should already depend on (no
-- Sprint-D code path ever writes to it — grep confirms plaidSync.ts never
-- references `superseded_by`), so an in-place ALTER is safe. Any accidental
-- prior TEXT values are dropped by USING NULL::UUID rather than attempting a
-- text->uuid cast that could throw on stray data.
ALTER TABLE bank_transactions
  ALTER COLUMN superseded_by DROP DEFAULT,
  ALTER COLUMN superseded_by TYPE UUID USING NULL::UUID,
  ADD CONSTRAINT bank_transactions_superseded_by_fkey
    FOREIGN KEY (superseded_by) REFERENCES receipts(id) ON DELETE SET NULL;
