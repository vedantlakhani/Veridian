import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { FunctionsHttpError } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AiInsight {
  id: string;
  user_id: string;
  content: string;
  suggestion: string;
  generated_at: string;
  expires_at: string;
}

/**
 * EmissionContext is passed in the body of the generate-suggestions Edge Function call.
 * The Home screen builds this from useWeeklySummary + useEmissionEntries.
 */
export interface EmissionContext {
  weeklyTotalKg: number;
  foodKg: number;
  transportKg: number;
  energyKg: number;
  topItems: Array<{ item: string; category: string; totalKg: number }>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Cache-first AI insight hook.
 *
 * Flow:
 *   1. Query ai_insights for a row where expires_at > now() (Supabase-side TTL).
 *   2. If found: return it immediately — no Claude call.
 *   3. If not found AND context has data: call generate-suggestions Edge Function.
 *   4. If not found AND context is empty (new user): return null silently.
 *
 * staleTime: 23h avoids re-running queryFn on every mount within the same session.
 * It is NOT the authoritative TTL — the SELECT with gt('expires_at', now) is.
 *
 * @param userId  - from useAuthStore — hook is disabled when undefined
 * @param context - built from weekly summary + entries; pass null if not yet loaded
 */
export function useAiInsight(
  userId: string | undefined,
  context: EmissionContext | null,
) {
  return useQuery<AiInsight | null, Error>({
    queryKey: ['ai_insight', userId],
    queryFn: async (): Promise<AiInsight | null> => {
      if (!userId) return null;

      // Step 1: Check Supabase for a non-expired cached insight
      const now = new Date().toISOString();
      const { data: cached, error: selectError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', now)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) throw selectError;
      if (cached) return cached as AiInsight;

      // Step 2: No fresh cache — guard against calling Claude with no data
      if (!context || context.weeklyTotalKg === 0) return null;

      // Step 3: Call Edge Function — supabase.functions.invoke attaches the
      // session's access token automatically via the anon key client
      const { data, error } = await supabase.functions.invoke<AiInsight>(
        'generate-suggestions',
        { body: context },
      );

      if (error) {
        // 401 = token expired or user deauthorised; surface as a meaningful error
        if ((error as FunctionsHttpError).context?.status === 401) {
          throw new Error('AI service unauthorized — please sign in again');
        }
        throw new Error(`AI service error: ${error.message}`);
      }

      return data;
    },
    enabled: !!userId && !!context,
    staleTime: 1000 * 60 * 60 * 23, // 23h — avoids redundant Supabase reads within session
    retry: 1,                         // one retry covers Edge Function cold-start 503
    retryDelay: 2000,                 // 2s delay gives cold-start time to recover
  });
}
