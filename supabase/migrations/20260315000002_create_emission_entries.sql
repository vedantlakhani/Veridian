CREATE TABLE emission_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_id       UUID NOT NULL REFERENCES emission_factors(id),
  quantity        NUMERIC(10, 3) NOT NULL CHECK (quantity > 0),
  kg_co2e_total   NUMERIC(10, 4) NOT NULL CHECK (kg_co2e_total >= 0),
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE emission_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON emission_entries FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own entries"
  ON emission_entries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own entries"
  ON emission_entries FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own entries"
  ON emission_entries FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE INDEX emission_entries_user_id_idx ON emission_entries(user_id);
CREATE INDEX emission_entries_logged_at_idx ON emission_entries(logged_at DESC);
CREATE INDEX emission_entries_user_logged_at_idx ON emission_entries(user_id, logged_at DESC);
