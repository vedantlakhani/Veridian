// hooks/useBaseline.ts
// Saves the carbon calculator result to profiles.baseline_kg post-signup
// Called from ResultsScreen after user creates an account

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { PROFILE_KEYS } from './useProfile';
import type { UserProfile } from '@/types/user';

export function useBaseline() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const saveBaselineMutation = useMutation({
    mutationFn: async (baselineKg: number) => {
      if (!user?.id) throw new Error('No authenticated user');

      // upsert handles both new users (no row yet) and existing users
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, baseline_kg: baselineKg }, { onConflict: 'id' });

      if (error) throw error;
      return baselineKg;
    },
    onSuccess: (baselineKg) => {
      // Patch the cache immediately so the gate in (tabs)/_layout sees the
      // updated value before the background refetch completes.
      // Without this, stale baseline_kg: null triggers another redirect.
      queryClient.setQueryData<UserProfile | null>(
        PROFILE_KEYS.detail(user?.id ?? ''),
        (old) => old ? { ...old, baseline_kg: baselineKg } : old,
      );
      void queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.detail(user?.id ?? '') });
    },
  });

  return {
    saveBaseline: saveBaselineMutation.mutateAsync,
    isPending: saveBaselineMutation.isPending,
    error: saveBaselineMutation.error,
  };
}
