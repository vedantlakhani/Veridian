import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Subscribes to Supabase Realtime postgres_changes on challenge_participants for the given challenge.
 * On any INSERT/UPDATE/DELETE event, invalidates the ['leaderboard', challengeId] TanStack Query cache
 * so the leaderboard screen refreshes automatically.
 *
 * REQUIREMENT: supabase/migrations/20260315000014_challenge_realtime.sql (or equivalent) must have
 * been applied (ALTER PUBLICATION supabase_realtime ADD TABLE challenge_participants) for events to arrive.
 *
 * Mount this hook in app/challenge/[id].tsx so the subscription is scoped to the leaderboard screen
 * and automatically cleaned up when the user navigates away.
 */
export function useChallengeRealtime(challengeId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!challengeId) return; // no subscription without a valid challenge ID

    const channel = supabase
      .channel(`challenge_participants:${challengeId}`) // unique channel per challenge
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_participants',
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          // Invalidate leaderboard cache so it refetches with updated participant data
          queryClient.invalidateQueries({ queryKey: ['leaderboard', challengeId] });
        }
      )
      .subscribe();

    // CRITICAL: cleanup on unmount or challengeId change to prevent duplicate subscriptions
    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, queryClient]);
}
