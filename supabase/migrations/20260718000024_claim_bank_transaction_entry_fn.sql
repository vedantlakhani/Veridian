-- Closes the sub-window in Sprint D Stage 3's original race guard: a
-- webhook-triggered sync and a manual sync-now call can process the same
-- bank_transactions row concurrently. The prior approach (insert an
-- emission_entries row, then attempt an atomic UPDATE ... WHERE entry_id IS
-- NULL, and on loss DELETE the just-inserted row) left a real gap — if the
-- compensating DELETE ever failed (a realistic serverless/edge-function
-- event, not just a sub-millisecond timing fluke), an orphaned duplicate
-- emission_entries row would persist forever, permanently inflating a
-- user's totals with no way for any future sync pass to notice it (the
-- transaction's entry_id already pointed at the winner).
--
-- This function closes the gap structurally: it takes a row lock on the
-- bank_transactions row FIRST (SELECT ... FOR UPDATE), inside a single
-- Postgres function invocation (RPC calls run as one transaction). A
-- concurrent second caller blocks on that lock until the first caller's
-- transaction commits, then sees entry_id already set and returns the
-- existing id WITHOUT ever inserting a row — so the losing side can no
-- longer create an orphan in the first place. There is no compensating
-- DELETE anywhere in this design, and therefore nothing for a failed DELETE
-- to leave behind.
CREATE OR REPLACE FUNCTION claim_bank_transaction_entry(
  p_txn_id       UUID,
  p_user_id      UUID,
  p_factor_id    UUID,
  p_kg_co2e      NUMERIC,
  p_logged_at    TIMESTAMPTZ,
  p_confidence   NUMERIC,
  p_metadata     JSONB,
  p_factor_ref   TEXT,
  p_bt_confidence TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_entry_id UUID;
  v_new_entry_id      UUID;
BEGIN
  SELECT entry_id INTO v_existing_entry_id
  FROM bank_transactions
  WHERE id = p_txn_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bank_transactions row % not found', p_txn_id;
  END IF;

  IF v_existing_entry_id IS NOT NULL THEN
    -- Another caller claimed this transaction while we waited on the lock
    -- (or before we started) — never create a second entry for it.
    RETURN jsonb_build_object('entry_id', v_existing_entry_id, 'was_created', false);
  END IF;

  INSERT INTO emission_entries (
    user_id, factor_id, quantity, kg_co2e_total, logged_at,
    source, status, confidence, metadata
  ) VALUES (
    p_user_id, p_factor_id, 1, p_kg_co2e, p_logged_at,
    'transaction', 'auto_confirmed', p_confidence, p_metadata
  )
  RETURNING id INTO v_new_entry_id;

  UPDATE bank_transactions
  SET entry_id   = v_new_entry_id,
      kg_co2e    = p_kg_co2e,
      factor_ref = p_factor_ref,
      confidence = p_bt_confidence
  WHERE id = p_txn_id;

  RETURN jsonb_build_object('entry_id', v_new_entry_id, 'was_created', true);
END;
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default — that would
-- let any authenticated client call this function directly with fabricated
-- parameters (arbitrary user_id/factor_id/kg_co2e), creating forged emission
-- entries for any user, entirely bypassing emission_entries' own RLS
-- (SECURITY INVOKER here means the function runs as whatever role calls it —
-- service_role's BYPASSRLS attribute is what makes the INSERT/UPDATE above
-- work, and that must never be reachable by authenticated/anon).
REVOKE ALL ON FUNCTION claim_bank_transaction_entry(
  UUID, UUID, UUID, NUMERIC, TIMESTAMPTZ, NUMERIC, JSONB, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION claim_bank_transaction_entry(
  UUID, UUID, UUID, NUMERIC, TIMESTAMPTZ, NUMERIC, JSONB, TEXT, TEXT
) TO service_role;
