CREATE TABLE challenge_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  baseline_kg     NUMERIC(10, 4),
  current_kg      NUMERIC(10, 4),
  rank            INTEGER,
  UNIQUE (challenge_id, user_id)
);

ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view participants"
  ON challenge_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join challenges (insert own)"
  ON challenge_participants FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own participation"
  ON challenge_participants FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can leave challenges (delete own)"
  ON challenge_participants FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE INDEX challenge_participants_challenge_id_idx ON challenge_participants(challenge_id);
CREATE INDEX challenge_participants_user_id_idx ON challenge_participants(user_id);
