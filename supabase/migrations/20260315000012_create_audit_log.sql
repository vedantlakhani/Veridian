CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  user_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view audit trail for their own records only
CREATE POLICY "Users can view own audit log"
  ON audit_log FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Only database triggers insert audit records (no direct client inserts)
-- Service role can insert (used by triggers)

CREATE INDEX audit_log_user_id_idx ON audit_log(user_id);
CREATE INDEX audit_log_table_record_idx ON audit_log(table_name, record_id);
CREATE INDEX audit_log_created_at_idx ON audit_log(created_at DESC);
