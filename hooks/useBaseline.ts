// hooks/useBaseline.ts
// Saves the carbon calculator result to profiles.baseline_kg post-signup
// Called from ResultsScreen after user creates an account

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useBaseline() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const saveBaselineMutation = useMutation({
    mutationFn: async (baselineKg: number) => {
      if (!user?.id) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('profiles')
        .update({ baseline_kg: baselineKg })
        .eq('id', user.id);

      if (error) throw error;
      return baselineKg;
    },
    onSuccess: () => {
      // Invalidate profile query so UI reflects saved baseline
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  return {
    saveBaseline: saveBaselineMutation.mutateAsync,
    isPending: saveBaselineMutation.isPending,
    error: saveBaselineMutation.error,
  };
}
