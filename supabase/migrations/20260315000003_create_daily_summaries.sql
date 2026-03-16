CREATE TABLE daily_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  total_kg_co2e   NUMERIC(10, 4) NOT NULL DEFAULT 0,
  food_kg         NUMERIC(10, 4) NOT NULL DEFAULT 0,
  transport_kg    NUMERIC(10, 4) NOT NULL DEFAULT 0,
  energy_kg       NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, date)
);

ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily summaries"
  ON daily_summaries FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own daily summaries"
  ON daily_summaries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own daily summaries"
  ON daily_summaries FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX daily_summaries_user_id_idx ON daily_summaries(user_id);
CREATE INDEX daily_summaries_user_date_idx ON daily_summaries(user_id, date DESC);
