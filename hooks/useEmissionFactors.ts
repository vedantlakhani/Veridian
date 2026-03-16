import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { EmissionCategory, EmissionFactor } from '@/types/emission';

export function useEmissionFactors(category: EmissionCategory | null) {
  return useQuery({
    queryKey: ['emission_factors', category],
    queryFn: async () => {
      if (!category) return [];
      const { data, error } = await supabase
        .from('emission_factors')
        .select('id, category, subcategory, item, unit, kg_co2e')
        .eq('category', category)
        .order('subcategory', { ascending: true })
        .order('item', { ascending: true });
      if (error) throw error;
      return data as EmissionFactor[];
    },
    enabled: !!category,
    staleTime: Infinity,          // emission_factors is seed data, never changes
    gcTime: 1000 * 60 * 60 * 24, // 24h garbage collection
  });
}
