CREATE TABLE weekly_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start      DATE NOT NULL,
  total_kg_co2e   NUMERIC(10, 4) NOT NULL DEFAULT 0,
  breakdown       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, week_start)
);

ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly summaries"
  ON weekly_summaries FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own weekly summaries"
  ON weekly_summaries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own weekly summaries"
  ON weekly_summaries FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX weekly_summaries_user_id_idx ON weekly_summaries(user_id);
CREATE INDEX weekly_summaries_user_week_idx ON weekly_summaries(user_id, week_start DESC);
