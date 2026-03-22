import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/emissions';
import type { Achievement, AchievementCriteriaType, UserAchievementWithDetails } from '@/types/achievement';

// ─── Query Keys ────────────────────────────────────────────────────────────
export const ACHIEVEMENT_KEYS = {
  all: ['achievements'] as const,
  user: (userId: string) => ['achievements', userId] as const,
};

// ─── useAchievements Hook ──────────────────────────────────────────────────
/**
 * Fetches all achievements and the user's earned achievements.
 * enabled: !!userId guard prevents RLS-blocked query for unauthenticated users.
 */
export function useAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ACHIEVEMENT_KEYS.user(userId ?? ''),
    queryFn: async () => {
      const [achievementsResult, earnedResult] = await Promise.all([
        supabase.from('achievements').select('*'),
        supabase
          .from('user_achievements')
          .select('*, achievements(*)')
          .eq('user_id', userId!),
      ]);

      if (achievementsResult.error) throw achievementsResult.error;
      if (earnedResult.error) throw earnedResult.error;

      return {
        achievements: achievementsResult.data as Achievement[],
        earned: earnedResult.data as UserAchievementWithDetails[],
      };
    },
    enabled: !!userId,
  });
}

// ─── Internal: checkCriteria ──────────────────────────────────────────────
/**
 * Evaluates whether a single achievement's criteria is met for a given user.
 * NOT exported — only called from checkAndUnlockAchievements.
 */
async function checkCriteria(achievement: Achievement, userId: string): Promise<boolean> {
  switch (achievement.criteria_type as AchievementCriteriaType) {
    case 'first_log': {
      const { count, error } = await supabase
        .from('emission_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) return false;
      return (count ?? 0) > 0;
    }

    case 'streak_days': {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error || !data || data.length === 0) return false;

      // Walk forward in descending date order counting consecutive days
      const today = getLocalDateString();
      let consecutiveCount = 0;
      let expectedDate = today;

      for (const row of data) {
        if (row.date === expectedDate) {
          consecutiveCount++;
          // Compute previous date
          const d = new Date(expectedDate + 'T00:00:00');
          d.setDate(d.getDate() - 1);
          expectedDate = d.toLocaleDateString('en-CA');
        } else {
          break;
        }
      }

      return consecutiveCount >= achievement.criteria_value;
    }

    case 'reduction_pct': {
      const { data, error } = await supabase
        .from('weekly_summaries')
        .select('total_kg_co2e')
        .eq('user_id', userId)
        .order('week_start', { ascending: false })
        .limit(2);
      if (error || !data || data.length < 2) return false;

      // rows[0] = current week (most recent), rows[1] = prior week
      const currentWeek = data[0].total_kg_co2e as number;
      const priorWeek = data[1].total_kg_co2e as number;
      if (priorWeek <= 0) return false;

      const reductionPct = ((priorWeek - currentWeek) / priorWeek) * 100;
      return reductionPct >= achievement.criteria_value;
    }

    case 'total_entries': {
      const { count, error } = await supabase
        .from('emission_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) return false;
      return (count ?? 0) >= achievement.criteria_value;
    }

    default:
      return false;
  }
}

// ─── checkAndUnlockAchievements ───────────────────────────────────────────
/**
 * Plain async function (NOT a hook) — safe to call inside mutation onSuccess.
 * Checks all unearned achievements and inserts newly earned ones into user_achievements.
 * Returns array of newly earned Achievement objects (caller can show toast for each).
 */
export async function checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
  // 1. Fetch all achievements
  const { data: allAchievements, error: achError } = await supabase
    .from('achievements')
    .select('*');
  if (achError || !allAchievements) return [];

  // 2. Fetch already-earned achievement IDs
  const { data: earnedRows, error: earnedError } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);
  if (earnedError) return [];

  const earnedIds = new Set((earnedRows ?? []).map((r) => r.achievement_id as string));

  // 3. Filter to unearned achievements
  const unearned = (allAchievements as Achievement[]).filter((a) => !earnedIds.has(a.id));

  // 4. Check each unearned achievement and collect newly earned ones
  const newlyEarned: Achievement[] = [];

  for (const achievement of unearned) {
    const met = await checkCriteria(achievement, userId);
    if (met) {
      const { error: insertError } = await supabase
        .from('user_achievements')
        .insert({ user_id: userId, achievement_id: achievement.id });
      if (!insertError) {
        newlyEarned.push(achievement);
      }
    }
  }

  return newlyEarned;
}
