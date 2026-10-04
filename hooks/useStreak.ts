import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { computeStreak } from '@/lib/streak';

// ─────────────────────────────────────────────────────────────────────────────
// useStreak — shared consecutive-logged-days streak. Deletes the duplicated
// streak logic that lived on both the Home and Profile screens.
// ─────────────────────────────────────────────────────────────────────────────

export function useStreak(userId: string | undefined): {
  streak: number;
  isLoading: boolean;
} {
  const { data: streakData, isLoading } = useQuery({
    queryKey: ['streak', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('date')
        .eq('user_id', userId!)
        .order('date', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as { date: string }[];
    },
    enabled: !!userId,
  });

  const streak = useMemo(
    () => computeStreak((streakData ?? []).map((row) => row.date)),
    [streakData],
  );

  return { streak, isLoading };
}
