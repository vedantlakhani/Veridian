-- Enable Supabase Realtime for emission_entries table
-- Required for TRACK-12: cross-device sync via postgres_changes subscription
-- Without this, supabase.channel().on('postgres_changes', ...) receives no events
ALTER PUBLICATION supabase_realtime ADD TABLE emission_entries;
