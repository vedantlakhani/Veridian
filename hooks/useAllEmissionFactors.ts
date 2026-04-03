import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { EmissionFactor } from '@/types/emission';

export function useAllEmissionFactors() {
  return useQuery({
    queryKey: ['emission_factors', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emission_factors')
        .select('id, category, subcategory, item, unit, kg_co2e')
        .order('category', { ascending: true })
        .order('subcategory', { ascending: true })
        .order('item', { ascending: true });
      if (error) throw error;
      return data as EmissionFactor[];
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
