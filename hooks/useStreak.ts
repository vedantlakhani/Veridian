import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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

  const streak = useMemo(() => {
    if (!streakData || streakData.length === 0) return 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    let s = 0;
    const check = new Date(todayDate);
    for (const row of streakData) {
      const d = new Date(row.date);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === check.getTime()) {
        s++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return s;
  }, [streakData]);

  return { streak, isLoading };
}
