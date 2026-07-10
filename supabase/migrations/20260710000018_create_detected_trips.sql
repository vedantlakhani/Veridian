CREATE TABLE detected_trips (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_trip_key   TEXT NOT NULL,          -- device-stable identity (stringified start timestamp today)
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ NOT NULL,
  distance_km       NUMERIC(8, 2) NOT NULL CHECK (distance_km >= 0),
  avg_speed_kmh     NUMERIC(6, 1),
  mode              TEXT NOT NULL CHECK (mode IN ('walk', 'cycling', 'car', 'bus', 'train', 'unknown')),
  confidence        NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status            TEXT NOT NULL DEFAULT 'needs_confirmation' CHECK (status IN ('needs_confirmation', 'auto_confirmed', 'confirmed', 'dismissed')),
  features          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_trip_key)
);

ALTER TABLE detected_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own detected trips"
  ON detected_trips FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own detected trips"
  ON detected_trips FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own detected trips"
  ON detected_trips FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- No DELETE policy — dismissal is a status change, not a row deletion

CREATE INDEX detected_trips_user_status_idx ON detected_trips(user_id, status);
CREATE INDEX detected_trips_user_started_at_idx ON detected_trips(user_id, started_at DESC);
