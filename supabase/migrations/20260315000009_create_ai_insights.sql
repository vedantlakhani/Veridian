CREATE TABLE ai_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  suggestion      TEXT NOT NULL,
  generated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON ai_insights FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "System can insert insights (Edge Function)"
  ON ai_insights FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX ai_insights_user_id_idx ON ai_insights(user_id);
CREATE INDEX ai_insights_generated_at_idx ON ai_insights(generated_at DESC);
