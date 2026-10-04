-- Scope receipt de-duplication to the uploading user.
--
-- content_hash was UNIQUE across ALL users, and receipt-parse's idempotency
-- check selected by content_hash alone with the service-role client. Two
-- users submitting byte-identical content (the same chain e-receipt text, the
-- same CSV row) meant the second user was handed the FIRST user's receipt and
-- line items, and could never store their own copy. The edge function now
-- filters by user_id too; this makes the constraint match.
ALTER TABLE receipts DROP CONSTRAINT receipts_content_hash_key;

ALTER TABLE receipts
  ADD CONSTRAINT receipts_user_id_content_hash_key UNIQUE (user_id, content_hash);
