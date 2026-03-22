import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  Challenge,
  ChallengeParticipantWithProfile,
  LeaderboardEntry,
} from '@/types/challenge';

// ─── Internal helpers (exported with _ prefix for unit testing) ─────────────

/**
 * Computes reduction percentage from baseline and current kg.
 * Returns null when baseline is null or 0 (no data to compare against).
 * A positive return value means emissions were reduced; negative means increased.
 */
export function _computeReductionPct(
  baseline: number | null,
  current: number | null
): number | null {
  if (!baseline || baseline === 0) return null;
  return ((baseline - (current ?? 0)) / baseline) * 100;
}

/**
 * Sort array by reduction_pct DESC — null entries go to the bottom.
 */
export function _sortLeaderboard<T extends { reduction_pct: number | null }>(
  entries: T[]
): T[] {
  return [...entries].sort((a, b) => {
    if (a.reduction_pct === null && b.reduction_pct === null) return 0;
    if (a.reduction_pct === null) return 1;  // a goes after b
    if (b.reduction_pct === null) return -1; // b goes after a
    return b.reduction_pct - a.reduction_pct; // higher reduction = better rank
  });
}

// ─── useLeaderboard ──────────────────────────────────────────────────────────

/**
 * Fetches challenge participants joined with profile data, computes reduction_pct
 * for each participant, and returns LeaderboardEntry[] sorted by reduction_pct DESC
 * (null entries last).
 *
 * NOTE: The profiles JOIN works because Plan 04-01 added the "profiles_challenge_read"
 * RLS policy that allows authenticated users to read profiles for challenge participants.
 *
 * Privacy (SOCL-06): only reduction_pct, rank, display_name, avatar_url are exposed.
 * Raw baseline_kg and current_kg values are NOT included in the returned LeaderboardEntry.
 */
export function useLeaderboard(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['leaderboard', challengeId],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('*, profiles(display_name, avatar_url)')
        .eq('challenge_id', challengeId!);

      if (error) throw error;

      const participants = data as ChallengeParticipantWithProfile[];

      // Compute reduction_pct for each participant
      const withPct = participants.map((p) => ({
        ...p,
        reduction_pct: _computeReductionPct(p.baseline_kg, p.current_kg),
      }));

      // Sort: highest reduction first, null last
      const sorted = _sortLeaderboard(withPct);

      // Assign 1-based rank (sequential — null entries continue the rank numbering)
      return sorted.map((p, index): LeaderboardEntry => ({
        user_id: p.user_id,
        display_name: p.profiles.display_name,
        avatar_url: p.profiles.avatar_url,
        // LeaderboardEntry requires baseline_kg/current_kg as number (not null)
        // Use 0 as fallback — these are not shown in the UI (SOCL-06 privacy)
        baseline_kg: p.baseline_kg ?? 0,
        current_kg: p.current_kg ?? 0,
        reduction_pct: p.reduction_pct ?? 0,
        rank: index + 1,
      }));
    },
    enabled: !!challengeId,
  });
}

// ─── useChallengeDetail ──────────────────────────────────────────────────────

/**
 * Fetches the Challenge metadata (title, dates, target_reduction_pct, etc.)
 * for the challenge detail header.
 */
export function useChallengeDetail(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge_detail', challengeId],
    queryFn: async (): Promise<Challenge | null> => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId!)
        .single();

      if (error) throw error;
      return data as Challenge;
    },
    enabled: !!challengeId,
  });
}
