import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getLocalDateString, getISOWeekStart } from '@/lib/emissions';
import type { DailySummary, WeeklySummary } from '@/types/emission';

export interface MonthlyTotals {
  totalKg: number;
  foodKg: number;
  transportKg: number;
  energyKg: number;
  previousMonthTotalKg: number;
  trendPercent: number | null; // null if no previous month data
}

/**
 * Queries daily_summaries for today's row.
 * Falls back to null (not an error) if no entry logged yet today.
 * PITFALL GUARD: enabled: !!userId
 */
export function useDailySummary(userId: string | undefined) {
  const today = getLocalDateString();
  return useQuery({
    queryKey: ['daily_summary', userId, today],
    queryFn: async (): Promise<DailySummary | null> => {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', userId!)
        .eq('date', today)
        .maybeSingle(); // returns null (not error) if no row
      if (error) throw error;
      return data as DailySummary | null;
    },
    enabled: !!userId,
  });
}

/**
 * Queries weekly_summaries for the current ISO week (Monday start).
 * Returns null if no entries logged this week yet.
 */
export function useWeeklySummary(userId: string | undefined) {
  const weekStart = getISOWeekStart(new Date());
  return useQuery({
    queryKey: ['weekly_summary', userId, weekStart],
    queryFn: async (): Promise<WeeklySummary | null> => {
      const { data, error } = await supabase
        .from('weekly_summaries')
        .select('*')
        .eq('user_id', userId!)
        .eq('week_start', weekStart)
        .maybeSingle();
      if (error) throw error;
      return data as WeeklySummary | null;
    },
    enabled: !!userId,
  });
}

/**
 * Aggregates monthly totals from daily_summaries (no monthly_summaries table in schema).
 * Returns current month totals and previous month totals for trend comparison (TRACK-07).
 * month: "YYYY-MM" string, e.g. "2026-03"
 */
export function useMonthlyTotals(userId: string | undefined, month?: string) {
  const now = new Date();
  const targetMonth =
    month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [year, monthNum] = targetMonth.split('-').map(Number);
  // Local start/end of the target month as UTC ISO strings
  const monthStart = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999); // day 0 = last day of month

  // Previous month bounds
  const prevDate = new Date(year, monthNum - 2, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonthNum = prevDate.getMonth() + 1;
  const prevStart = new Date(prevYear, prevMonthNum - 1, 1, 0, 0, 0, 0);
  const prevEnd = new Date(prevYear, prevMonthNum, 0, 23, 59, 59, 999);

  return useQuery({
    queryKey: ['monthly_totals', userId, targetMonth],
    queryFn: async (): Promise<MonthlyTotals> => {
      // Query emission_entries directly — avoids daily_summaries pre-aggregation gaps
      const { data: currentRows, error: currentError } = await supabase
        .from('emission_entries')
        .select('kg_co2e_total, logged_at, emission_factors(category)')
        .eq('user_id', userId!)
        .gte('logged_at', monthStart.toISOString())
        .lte('logged_at', monthEnd.toISOString());
      if (currentError) throw currentError;

      const { data: prevRows, error: prevError } = await supabase
        .from('emission_entries')
        .select('kg_co2e_total')
        .eq('user_id', userId!)
        .gte('logged_at', prevStart.toISOString())
        .lte('logged_at', prevEnd.toISOString());
      if (prevError) throw prevError;

      type EFRow = { category: string };
      type EntryRow = { kg_co2e_total: number; emission_factors: EFRow[] | EFRow | null };
      const current = (currentRows as unknown as EntryRow[] ?? []).reduce(
        (acc, row) => {
          const cat = (Array.isArray(row.emission_factors) ? row.emission_factors[0]?.category : row.emission_factors?.category) ?? '';
          return {
            total: acc.total + row.kg_co2e_total,
            food: acc.food + (cat === 'food' ? row.kg_co2e_total : 0),
            transport: acc.transport + (cat === 'transport' ? row.kg_co2e_total : 0),
            energy: acc.energy + (cat === 'energy' ? row.kg_co2e_total : 0),
          };
        },
        { total: 0, food: 0, transport: 0, energy: 0 }
      );

      const prevTotal = (prevRows ?? []).reduce(
        (acc: number, r: { kg_co2e_total: number }) => acc + r.kg_co2e_total,
        0
      );

      const trendPercent =
        prevTotal > 0 ? ((current.total - prevTotal) / prevTotal) * 100 : null;

      return {
        totalKg: current.total,
        foodKg: current.food,
        transportKg: current.transport,
        energyKg: current.energy,
        previousMonthTotalKg: prevTotal,
        trendPercent,
      };
    },
    enabled: !!userId,
  });
}
