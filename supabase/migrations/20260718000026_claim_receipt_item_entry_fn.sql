-- Mirrors claim_bank_transaction_entry (migration 20260718000024) exactly,
-- for receipt_items instead of bank_transactions. Sprint D's adversarial
-- review found the original insert-then-conditional-update-then-delete-on-
-- loss design left a real gap: if the compensating DELETE ever failed, an
-- orphaned emission_entries row would persist forever with nothing left
-- pointing at it. That bug must not be reintroduced under a different table
-- name for the receipt-supersede path, so this function uses the same
-- lock-before-insert structure: SELECT ... FOR UPDATE on the receipt_items
-- row FIRST, inside one Postgres function invocation (RPC calls run as one
-- transaction), so a concurrent second caller blocks on the lock and — once
-- the winner commits — sees entry_id already set and returns the existing id
-- WITHOUT ever inserting a row. There is no compensating DELETE anywhere in
-- this design, so there is nothing for a failed DELETE to leave behind.
CREATE OR REPLACE FUNCTION claim_receipt_item_entry(
  p_item_id      UUID,
  p_user_id      UUID,
  p_factor_id    UUID,
  p_kg_co2e      NUMERIC,
  p_logged_at    TIMESTAMPTZ,
  p_confidence   NUMERIC,
  p_metadata     JSONB,
  p_factor_ref   TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_entry_id UUID;
  v_new_entry_id      UUID;
BEGIN
  SELECT entry_id INTO v_existing_entry_id
  FROM receipt_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'receipt_items row % not found', p_item_id;
  END IF;

  IF v_existing_entry_id IS NOT NULL THEN
    -- Another caller (e.g. a retried/duplicate parse of the same content
    -- hash racing itself) already claimed this item — never create a
    -- second entry for it.
    RETURN jsonb_build_object('entry_id', v_existing_entry_id, 'was_created', false);
  END IF;

  INSERT INTO emission_entries (
    user_id, factor_id, quantity, kg_co2e_total, logged_at,
    source, status, confidence, metadata
  ) VALUES (
    p_user_id, p_factor_id, 1, p_kg_co2e, p_logged_at,
    'receipt', 'auto_confirmed', p_confidence, p_metadata
  )
  RETURNING id INTO v_new_entry_id;

  UPDATE receipt_items
  SET entry_id   = v_new_entry_id,
      kg_co2e    = p_kg_co2e,
      factor_ref = p_factor_ref
  WHERE id = p_item_id;

  RETURN jsonb_build_object('entry_id', v_new_entry_id, 'was_created', true);
END;
$$;

-- Same PUBLIC-execute lockdown as claim_bank_transaction_entry — Postgres
-- grants EXECUTE on new functions to PUBLIC by default, which would let any
-- authenticated client call this with fabricated parameters and forge
-- emission_entries rows for any user, bypassing emission_entries' RLS.
REVOKE ALL ON FUNCTION claim_receipt_item_entry(
  UUID, UUID, UUID, NUMERIC, TIMESTAMPTZ, NUMERIC, JSONB, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION claim_receipt_item_entry(
  UUID, UUID, UUID, NUMERIC, TIMESTAMPTZ, NUMERIC, JSONB, TEXT
) TO service_role;
