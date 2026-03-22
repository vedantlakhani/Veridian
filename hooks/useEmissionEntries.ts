import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  calcEmission,
  getLocalDateString,
  getISOWeekStart,
  upsertDailySummary,
  upsertWeeklySummary,
} from '@/lib/emissions';
import type { EmissionEntryWithFactor, EmissionFactor } from '@/types/emission';

// ─── Query Keys ────────────────────────────────────────────────────────────
export const ENTRY_KEYS = {
  all: ['emission_entries'] as const,
  list: (userId: string, dateFrom?: string, dateTo?: string) =>
    ['emission_entries', userId, dateFrom, dateTo] as const,
};

// ─── Input Types ───────────────────────────────────────────────────────────
export interface CreateEntryInput {
  userId: string;
  factor: EmissionFactor;
  quantity: number;
}

export interface UpdateEntryInput {
  id: string;
  userId: string;
  factor: EmissionFactor;
  quantity: number;
  loggedAt: string; // ISO string — needed to recompute correct day's summary
}

// ─── Read Hook ─────────────────────────────────────────────────────────────
/**
 * Fetches emission_entries joined with emission_factors for display.
 * dateFrom / dateTo are optional ISO date strings "YYYY-MM-DD".
 * PITFALL GUARD: enabled: !!userId prevents null user firing RLS-blocked query.
 */
export function useEmissionEntries(
  userId: string | undefined,
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: ENTRY_KEYS.list(userId ?? '', dateFrom, dateTo),
    queryFn: async () => {
      let query = supabase
        .from('emission_entries')
        .select('*, emission_factors(*)')
        .eq('user_id', userId!)
        .order('logged_at', { ascending: false });

      if (dateFrom) {
        // Parse as local date components to get correct local midnight in UTC
        const [y, m, d] = dateFrom.split('-').map(Number);
        const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
        query = query.gte('logged_at', localStart.toISOString());
      }
      if (dateTo) {
        const [y, m, d] = dateTo.split('-').map(Number);
        const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
        query = query.lte('logged_at', localEnd.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmissionEntryWithFactor[];
    },
    enabled: !!userId, // CRITICAL: guard prevents null user RLS failure
  });
}

// ─── Create Hook ───────────────────────────────────────────────────────────
export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEntryInput) => {
      const kgCo2eTotal = calcEmission(input.factor.kg_co2e, input.quantity);
      const loggedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('emission_entries')
        .insert({
          user_id: input.userId,
          factor_id: input.factor.id,
          quantity: input.quantity,
          kg_co2e_total: kgCo2eTotal,
          logged_at: loggedAt,
        })
        .select('*, emission_factors(*)')
        .single();

      if (error) throw error;

      // Recompute summaries for today (after insert)
      const today = getLocalDateString();
      const weekStart = getISOWeekStart(new Date());
      await upsertDailySummary(input.userId, today);
      await upsertWeeklySummary(input.userId, weekStart);

      return data as EmissionEntryWithFactor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENTRY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['weekly_summary'] });
    },
  });
}

// ─── Update Hook ───────────────────────────────────────────────────────────
export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateEntryInput) => {
      const kgCo2eTotal = calcEmission(input.factor.kg_co2e, input.quantity);

      const { data, error } = await supabase
        .from('emission_entries')
        .update({
          factor_id: input.factor.id,
          quantity: input.quantity,
          kg_co2e_total: kgCo2eTotal,
        })
        .eq('id', input.id)
        .select('*, emission_factors(*)')
        .single();

      if (error) throw error;

      // Recompute summaries for the affected date (NOT necessarily today)
      const affectedDate = getLocalDateString(new Date(input.loggedAt));
      const weekStart = getISOWeekStart(new Date(input.loggedAt));
      await upsertDailySummary(input.userId, affectedDate);
      await upsertWeeklySummary(input.userId, weekStart);

      return data as EmissionEntryWithFactor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENTRY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['weekly_summary'] });
    },
  });
}

// ─── Delete Hook ───────────────────────────────────────────────────────────
export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; userId: string; loggedAt: string }) => {
      const { error } = await supabase
        .from('emission_entries')
        .delete()
        .eq('id', input.id);

      if (error) throw error;

      // Recompute summaries for the affected date after deletion
      const affectedDate = getLocalDateString(new Date(input.loggedAt));
      const weekStart = getISOWeekStart(new Date(input.loggedAt));
      await upsertDailySummary(input.userId, affectedDate);
      await upsertWeeklySummary(input.userId, weekStart);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENTRY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['weekly_summary'] });
    },
  });
}
