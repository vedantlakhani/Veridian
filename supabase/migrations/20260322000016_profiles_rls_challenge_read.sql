-- Allow authenticated users to read profiles of fellow challenge participants.
-- Without this, leaderboard JOIN to profiles silently returns null for non-self rows.
CREATE POLICY "profiles_challenge_read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT cp2.user_id
      FROM public.challenge_participants cp2
      WHERE cp2.challenge_id IN (
        SELECT cp1.challenge_id
        FROM public.challenge_participants cp1
        WHERE cp1.user_id = (select auth.uid())
      )
    )
    OR id = (select auth.uid())  -- always allow own row
  );
