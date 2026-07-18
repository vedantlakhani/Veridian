-- linked_items — one row per Plaid Item a user has connected (Sprint D Stage 2).
-- Holds the long-lived Plaid access_token, which is the single most sensitive
-- secret this app stores server-side: it is a bearer credential that reads a
-- user's real bank account until they explicitly unlink.
--
-- ⚠ RLS DESIGN — access_token must be COMPLETELY INVISIBLE to the authenticated
-- client role, not merely "filtered to the user's own row". A USING-clause
-- policy (as used on every other user-owned table in this repo, e.g.
-- detected_trips) would let the row's *owner* SELECT access_token straight
-- back out over PostgREST — RLS restricts which ROWS a role sees, not which
-- COLUMNS, so column-level secrecy cannot be expressed as a row policy at all.
-- Two real options exist: (a) grant SELECT on a column subset / view and rely
-- on privilege grants, or (b) grant the authenticated role no access
-- whatsoever and read/write exclusively through the service role. This
-- migration takes option (b), the simpler and safer of the two:
--
--   RLS is enabled and NO POLICY of any kind is created for `authenticated`
--   (or `anon`). With RLS enabled and zero matching policies, PostgREST's
--   authenticated/anon roles get zero rows for every command — SELECT,
--   INSERT, UPDATE, DELETE all return empty/denied. The Supabase service_role
--   key used by edge functions (plaid-exchange, plaid-sync, plaid-webhook)
--   BYPASSES RLS entirely (it carries BYPASSRLS in Postgres), so it is the
--   only path — client or server — that can ever read or write this table.
-- There is deliberately no "public read of institution_name/status" policy
-- either: even the non-secret columns are served to the client only via an
-- edge function response (e.g. plaid-exchange's return value, or a future
-- "list linked accounts" function), never via direct PostgREST table access.
CREATE TABLE linked_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id     TEXT UNIQUE NOT NULL,
  access_token      TEXT NOT NULL,
  institution_name  TEXT,
  cursor            TEXT,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'revoked')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE linked_items ENABLE ROW LEVEL SECURITY;

-- No policies for `authenticated` or `anon` — see design note above. Only
-- service_role (edge functions) can read or write this table.

CREATE INDEX linked_items_user_id_idx ON linked_items(user_id);
