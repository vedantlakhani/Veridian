-- Additive follow-up to 20260718000025_create_receipts.sql, closing an
-- adversarial-review finding: a non-USD receipt was being silently priced as
-- if it were USD (no FX conversion, no rejection), undercounting/overcounting
-- emissions by the FX gap with nobody the wiser.
--
-- SCHEMA DECISION: rather than overload the existing 'failed' parse_status
-- (which means "Haiku's output wasn't usable JSON" — a genuinely different
-- failure mode from "we understood this receipt fine, but its currency isn't
-- supported yet"), this adds a distinct 'unsupported_currency' value so a
-- future UI can render the two cases differently (retry vs. "we can't handle
-- this currency yet"). A `notes` column captures the human-readable reason
-- for either failure mode rather than silently dropping that information.
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_parse_status_check;
ALTER TABLE receipts
  ADD CONSTRAINT receipts_parse_status_check
  CHECK (parse_status IN ('pending', 'parsed', 'failed', 'unsupported_currency'));

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS notes TEXT;

-- receipt_items.price_usd was NOT NULL from its creation migration, which
-- assumed every item always has a known USD price. That's no longer true for
-- an unsupported-currency receipt: its items are still inserted (so the user
-- sees "we received this") but with price_usd/kg_co2e left NULL rather than
-- fabricating a USD number out of a foreign-currency amount.
ALTER TABLE receipt_items ALTER COLUMN price_usd DROP NOT NULL;
