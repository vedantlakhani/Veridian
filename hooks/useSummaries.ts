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
  // Default to current month if not provided
  const now = new Date();
  const targetMonth =
    month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Previous month calculation
  const [year, monthNum] = targetMonth.split('-').map(Number);
  const prevDate = new Date(year, monthNum - 2, 1); // month is 0-indexed
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  return useQuery({
    queryKey: ['monthly_totals', userId, targetMonth],
    queryFn: async (): Promise<MonthlyTotals> => {
      // Query current month
      const { data: currentRows, error: currentError } = await supabase
        .from('daily_summaries')
        .select('total_kg_co2e, food_kg, transport_kg, energy_kg')
        .eq('user_id', userId!)
        .gte('date', `${targetMonth}-01`)
        .lte('date', `${targetMonth}-31`);
      if (currentError) throw currentError;

      // Query previous month for trend comparison
      const { data: prevRows, error: prevError } = await supabase
        .from('daily_summaries')
        .select('total_kg_co2e')
        .eq('user_id', userId!)
        .gte('date', `${prevMonth}-01`)
        .lte('date', `${prevMonth}-31`);
      if (prevError) throw prevError;

      type SumRow = { total_kg_co2e: number; food_kg: number; transport_kg: number; energy_kg: number };
      const sumRows = (rows: SumRow[] | null) =>
        (rows ?? []).reduce(
          (acc, row) => ({
            total: acc.total + (row.total_kg_co2e ?? 0),
            food: acc.food + (row.food_kg ?? 0),
            transport: acc.transport + (row.transport_kg ?? 0),
            energy: acc.energy + (row.energy_kg ?? 0),
          }),
          { total: 0, food: 0, transport: 0, energy: 0 }
        );

      const current = sumRows(currentRows);
      const prevTotal = (prevRows ?? []).reduce(
        (acc: number, r: { total_kg_co2e: number }) => acc + (r.total_kg_co2e ?? 0),
        0
      );

      // trendPercent: positive = worse than previous, negative = better
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
