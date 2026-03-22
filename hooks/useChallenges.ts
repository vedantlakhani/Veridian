import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/emissions';
import type { Challenge, ChallengeParticipant } from '@/types/challenge';

// ─── Query Keys ─────────────────────────────────────────────────────────────
export const CHALLENGE_KEYS = {
  myChallenges: (userId: string) => ['my_challenges', userId] as const,
};

// ─── Input Types ─────────────────────────────────────────────────────────────
export interface CreateChallengeInput {
  userId: string;
  title: string;
  durationDays: number;
  targetReductionPct: number;
}

export interface JoinChallengeInput {
  userId: string;
  inviteCode: string;
}

// ─── Internal Helper ─────────────────────────────────────────────────────────
async function getBaselineKg(userId: string): Promise<number> {
  const { data } = await supabase
    .from('weekly_summaries')
    .select('total_kg_co2e')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1)
    .single();
  return data?.total_kg_co2e ?? 0;
}

// ─── My Challenges Hook ──────────────────────────────────────────────────────
/**
 * Returns all challenge_participants rows for the user with nested Challenge data.
 * PITFALL GUARD: enabled: !!userId prevents null user firing RLS-blocked query.
 */
export function useMyChallenges(userId: string | undefined) {
  return useQuery({
    queryKey: CHALLENGE_KEYS.myChallenges(userId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('*, challenges(*)')
        .eq('user_id', userId!)
        .order('joined_at', { ascending: false });
      if (error) throw error;
      return data as (ChallengeParticipant & { challenges: Challenge })[];
    },
    enabled: !!userId,
  });
}

// ─── Create Challenge Hook ───────────────────────────────────────────────────
export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChallengeInput) => {
      const startDate = getLocalDateString();
      const endDateObj = new Date();
      endDateObj.setDate(endDateObj.getDate() + input.durationDays);
      const endDate = endDateObj.toISOString().split('T')[0];

      // INSERT challenge — invite_code is DB-generated
      const { data: newChallenge, error: insertError } = await supabase
        .from('challenges')
        .insert({
          creator_id: input.userId,
          title: input.title,
          start_date: startDate,
          end_date: endDate,
          target_reduction_pct: input.targetReductionPct,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // Add creator as first participant
      const baselineKg = await getBaselineKg(input.userId);
      const { error: participantError } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: newChallenge.id,
          user_id: input.userId,
          baseline_kg: baselineKg,
        });

      if (participantError) throw participantError;

      return newChallenge as Challenge;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: CHALLENGE_KEYS.myChallenges(variables.userId),
      });
    },
  });
}

// ─── Join Challenge Hook ─────────────────────────────────────────────────────
export function useJoinChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: JoinChallengeInput) => {
      // Look up challenge by invite code (uppercase normalised)
      const { data: challenge, error: lookupError } = await supabase
        .from('challenges')
        .select('*')
        .eq('invite_code', input.inviteCode.toUpperCase())
        .single();

      if (lookupError || !challenge) {
        throw new Error('Challenge not found. Check your invite code.');
      }

      // Get baseline from most recent weekly summary
      const baselineKg = await getBaselineKg(input.userId);

      // Insert participant row
      const { error: insertError } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challenge.id,
          user_id: input.userId,
          baseline_kg: baselineKg,
        });

      if (insertError) throw insertError;

      return challenge as Challenge;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: CHALLENGE_KEYS.myChallenges(variables.userId),
      });
    },
  });
}
