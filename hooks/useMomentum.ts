import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/emissions';
import { computeMomentum, type MomentumDayInput, type MomentumResult } from '@/lib/momentum';

// ─────────────────────────────────────────────────────────────────────────────
// useMomentum — Momentum, not streaks (NORTH_STAR.md §8 pattern 5). Reads the
// last 14 days of daily_summaries, fills gaps as unlogged days (never throws
// them out or resets), and hands a dense day-by-day window to the pure
// lib/momentum.ts model. Presentation-layer replacement for hooks/useStreak.ts
// on Home/Profile — useStreak itself is untouched; achievements still read
// streaks server-side.
// ─────────────────────────────────────────────────────────────────────────────

const WINDOW_DAYS = 14;

export function useMomentum(
  userId: string | undefined,
): MomentumResult & { isLoading: boolean } {
  const today = getLocalDateString();

  const { data, isLoading } = useQuery({
    queryKey: ['momentum', userId, today],
    queryFn: async () => {
      const from = new Date();
      from.setDate(from.getDate() - (WINDOW_DAYS - 1));
      const fromStr = getLocalDateString(from);
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('date, total_kg_co2e')
        .eq('user_id', userId!)
        .gte('date', fromStr)
        .order('date', { ascending: true });
      if (error) throw error;
      return data as { date: string; total_kg_co2e: number }[];
    },
    enabled: !!userId,
  });

  const result = useMemo(() => {
    const byDate = new Map((data ?? []).map((d) => [d.date, d.total_kg_co2e]));
    const days: MomentumDayInput[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getLocalDateString(d);
      const kg = byDate.get(key);
      days.push({ date: key, logged: kg !== undefined, totalKg: kg ?? 0 });
    }
    return computeMomentum(days);
  }, [data]);

  return { ...result, isLoading };
}
