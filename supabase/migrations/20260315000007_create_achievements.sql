CREATE TABLE achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL,
  icon            TEXT NOT NULL,
  criteria_type   TEXT NOT NULL CHECK (criteria_type IN ('first_log', 'streak_days', 'reduction_pct', 'total_entries')),
  criteria_value  NUMERIC(10, 2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on achievements"
  ON achievements FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed initial achievements in this migration
INSERT INTO achievements (name, description, icon, criteria_type, criteria_value) VALUES
  ('First Step',        'Log your first emission entry',            '🌱', 'first_log',      1),
  ('Streak: 3 Days',    'Log emissions for 3 consecutive days',     '🔥', 'streak_days',    3),
  ('Streak: 7 Days',    'Log emissions for 7 consecutive days',     '⚡', 'streak_days',    7),
  ('Streak: 30 Days',   'Log emissions for 30 consecutive days',    '🏆', 'streak_days',   30),
  ('10% Reduction',     'Reduce your weekly emissions by 10%',      '📉', 'reduction_pct', 10),
  ('Centurion',         'Log 100 emission entries',                 '💯', 'total_entries', 100);
