-- Provenance migration (additive, zero-risk) — every emission_entries row gains
-- source/confidence/status/trip linkage so the ledger can be written by signals
-- other than the manual Log flow. Existing manual rows default to the same
-- values the app already implies (manual, user_confirmed), so behavior is
-- unchanged for anything written before this migration.
ALTER TABLE emission_entries
  ADD COLUMN source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'sensor', 'transaction', 'receipt')),
  ADD COLUMN confidence  NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  ADD COLUMN status      TEXT NOT NULL DEFAULT 'user_confirmed' CHECK (status IN ('pending', 'auto_confirmed', 'user_confirmed', 'dismissed')),
  ADD COLUMN trip_id     UUID REFERENCES detected_trips(id) ON DELETE SET NULL,
  ADD COLUMN metadata    JSONB;

-- 'pending' and 'dismissed' entry statuses are reserved for the future
-- transactions layer (Sprint D) — entries created this sprint only ever use
-- auto_confirmed (sensor-written) or user_confirmed (manual, the existing default).

-- UNIQUE: one emission entry per detected trip, enforced at the DB layer so
-- concurrent writers (multiple app instances, offline-queue replays) can never
-- double-count a trip — duplicates fail with 23505, which callers treat as
-- "already logged". Manual entries (trip_id IS NULL) are unaffected.
CREATE UNIQUE INDEX emission_entries_trip_id_unique_idx ON emission_entries(trip_id) WHERE trip_id IS NOT NULL;
