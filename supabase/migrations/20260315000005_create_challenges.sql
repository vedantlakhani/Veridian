CREATE TABLE challenges (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  description           TEXT,
  creator_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  target_reduction_pct  NUMERIC(5, 2) NOT NULL CHECK (target_reduction_pct > 0 AND target_reduction_pct <= 100),
  invite_code           TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (end_date > start_date)
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = creator_id);

CREATE POLICY "Creators can update own challenges"
  ON challenges FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = creator_id)
  WITH CHECK ((select auth.uid()) = creator_id);

CREATE POLICY "Creators can delete own challenges"
  ON challenges FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = creator_id);

CREATE INDEX challenges_creator_id_idx ON challenges(creator_id);
CREATE INDEX challenges_invite_code_idx ON challenges(invite_code);
