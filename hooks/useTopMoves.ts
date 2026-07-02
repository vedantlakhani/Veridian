import { useMemo } from 'react';
import type { EmissionEntryWithFactor, EmissionFactor } from '@/types/emission';
import { computeTopMoves } from '@/lib/topMoves';
import type { TopMove } from '@/lib/topMoves';

/**
 * Derives ranked carbon-reduction moves from already-cached query data.
 * No network call — pure client-side math over what the user has logged.
 *
 * Inputs are all already live on Home:
 *   entries      — from useEmissionEntries (unfiltered; windowing is done inside computeTopMoves)
 *   factors      — from useAllEmissionFactors (staleTime: Infinity — one fetch per app lifetime)
 *   weeklyTotalKg — from useWeeklySummary (used only for the % context line)
 */
export function useTopMoves(
  entries: EmissionEntryWithFactor[],
  factors: EmissionFactor[] | undefined,
  weeklyTotalKg: number | null,
): TopMove[] {
  return useMemo(
    () => computeTopMoves(entries, factors ?? [], weeklyTotalKg),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, factors, weeklyTotalKg],
  );
}
