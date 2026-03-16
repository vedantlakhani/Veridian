CREATE TABLE notification_preferences (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_reminder_enabled      BOOLEAN NOT NULL DEFAULT false,
  reminder_time               TIME NOT NULL DEFAULT '20:00:00',
  streak_notifications        BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at                  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX notification_preferences_user_id_idx ON notification_preferences(user_id);
