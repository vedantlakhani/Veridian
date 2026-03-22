-- Enable Realtime for challenge_participants so useChallengeRealtime receives events
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;
