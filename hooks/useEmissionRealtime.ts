import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Subscribes to Supabase Realtime postgres_changes on emission_entries for the current user.
 * On any INSERT/UPDATE/DELETE event, invalidates TanStack Query caches so all screens refresh.
 *
 * REQUIREMENT: supabase/migrations/20260315000013_enable_realtime.sql must have been applied
 * (ALTER PUBLICATION supabase_realtime ADD TABLE emission_entries) for events to arrive.
 *
 * Mount this hook in the root layout (_layout.tsx) after auth is confirmed, so the subscription
 * persists across tab navigation without re-subscribing.
 */
export function useEmissionRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return; // no subscription without auth

    const channel = supabase
      .channel(`emission_entries:${userId}`) // unique channel per user
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emission_entries',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate all emission and summary caches on any change
          queryClient.invalidateQueries({ queryKey: ['emission_entries'] });
          queryClient.invalidateQueries({ queryKey: ['daily_summary'] });
          queryClient.invalidateQueries({ queryKey: ['weekly_summary'] });
          queryClient.invalidateQueries({ queryKey: ['monthly_totals'] });
        }
      )
      .subscribe();

    // CRITICAL: cleanup on unmount or userId change to prevent duplicate subscriptions
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
