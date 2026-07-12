import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { CAR_KG_PER_KM } from '@/lib/tripEngine';
import { TRIP_KEYS } from '@/lib/queryKeys';
import {
  weekWindow,
  previousWeekWindow,
  formatWeekRange,
  sumByCategory,
  sumTotal,
  computeWeekDelta,
  aggregateByDay,
  weekSparkline,
  distinctActiveDays,
  topCategoryInsight,
  selectWeekWin,
  type WeekWindow,
  type CategorySplit,
  type WeekDelta,
  type TopCategory,
  type WeekWin,
  type RecapEntryInput,
  type RecapTripInput,
} from '@/lib/recap';
import type { EmissionEntryWithFactor } from '@/types/emission';

// Purpose: the single data source for the Weekly Recap story (app/recap.tsx)
// AND Home's "Your week" teaser + "Earlier this week" backfill section
// (app/(tabs)/index.tsx). Computes the current + previous ISO week from
// date-ranged emission_entries queries — entries are the source of truth (the
// ring fix established that weekly_summaries lag their writes) — plus this
// week's zero-emission trips (walk/cycling), which never create an emission
// entry and so must come from detected_trips directly. All math lives in the
// pure lib/recap.ts; this hook only fetches + maps.

// ── Zero-emission trip row (walk/cycling) ──
interface ZeroTripRow {
  mode: 'walk' | 'cycling';
  distance_km: number;
  ended_at: string;
}

/** Maps a date-ranged entries list onto the pure calc input shape. */
function toRecapEntries(entries: EmissionEntryWithFactor[]): RecapEntryInput[] {
  return entries.map((e) => ({
    category: e.emission_factors.category,
    kgCo2e: e.kg_co2e_total,
    at: new Date(e.logged_at),
  }));
}

export interface WeeklyRecapData {
  isLoading: boolean;
  /** true once there is at least one entry or zero-emission trip this week */
  isReady: boolean;
  window: WeekWindow;
  previousWindow: WeekWindow;
  weekRangeLabel: string;
  currentKg: number;
  previousKg: number;
  delta: WeekDelta;
  split: CategorySplit;
  topCategory: TopCategory | null;
  win: WeekWin;
  /** 7 daily totals Mon→Sun (kg) for the teaser sparkline */
  sparkline: number[];
  distinctDays: number;
  /** raw current-week entries (feed rendering needs the joined factor) */
  weekEntries: EmissionEntryWithFactor[];
  /** current-week zero-emission trips, newest first */
  weekTrips: RecapTripInput[];
}

export function useWeeklyRecap(userId: string | undefined): WeeklyRecapData {
  const now = useMemo(() => new Date(), []);
  const window = useMemo(() => weekWindow(now), [now]);
  const previousWindow = useMemo(() => previousWeekWindow(now), [now]);

  const currentQuery = useEmissionEntries(userId, window.start, window.end);
  const previousQuery = useEmissionEntries(userId, previousWindow.start, previousWindow.end);

  // Zero-emission trips this ISO week. Keyed UNDER TRIP_KEYS.recentAutoLogs so
  // confirmTrip's existing invalidation (which invalidates that key) reaches
  // this query too — a walk/cycling trip the user retroactively confirms
  // (status 'confirmed', no emission entry) then appears here immediately,
  // same as a confirmed car trip does via the entries query. Includes both
  // auto_confirmed and user-confirmed so nothing celebratory is dropped.
  const tripsQuery = useQuery({
    queryKey: [...TRIP_KEYS.recentAutoLogs(userId ?? ''), 'week', window.start, window.end],
    queryFn: async () => {
      const [sy, sm, sd] = window.start.split('-').map(Number);
      const [ey, em, ed] = window.end.split('-').map(Number);
      const localStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      const localEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      const { data, error } = await supabase
        .from('detected_trips')
        .select('mode, distance_km, ended_at')
        .eq('user_id', userId!)
        .in('mode', ['walk', 'cycling'])
        .in('status', ['auto_confirmed', 'confirmed'])
        .gte('ended_at', localStart.toISOString())
        .lte('ended_at', localEnd.toISOString())
        .order('ended_at', { ascending: false });
      if (error) throw error;
      return (data as ZeroTripRow[]).map((t) => ({
        mode: t.mode,
        distanceKm: t.distance_km,
        savedKg: t.distance_km * CAR_KG_PER_KM,
        at: new Date(t.ended_at),
      })) as RecapTripInput[];
    },
    enabled: !!userId,
  });

  const weekEntries = useMemo(() => currentQuery.data ?? [], [currentQuery.data]);
  const weekTrips = useMemo(() => tripsQuery.data ?? [], [tripsQuery.data]);

  return useMemo(() => {
    const currentEntries = toRecapEntries(weekEntries);
    const previousEntries = toRecapEntries(previousQuery.data ?? []);

    const currentKg = sumTotal(currentEntries);
    const previousKg = sumTotal(previousEntries);
    const split = sumByCategory(currentEntries);
    const dayTotals = aggregateByDay(currentEntries);

    return {
      isLoading: currentQuery.isLoading || previousQuery.isLoading || tripsQuery.isLoading,
      isReady: currentKg > 0 || weekTrips.length > 0,
      window,
      previousWindow,
      weekRangeLabel: formatWeekRange(window),
      currentKg,
      previousKg,
      delta: computeWeekDelta(currentKg, previousKg),
      split,
      topCategory: topCategoryInsight(split),
      win: selectWeekWin(weekTrips, dayTotals),
      sparkline: weekSparkline(currentEntries, window),
      distinctDays: distinctActiveDays(currentEntries, weekTrips),
      weekEntries,
      weekTrips,
    };
  }, [
    weekEntries,
    weekTrips,
    previousQuery.data,
    currentQuery.isLoading,
    previousQuery.isLoading,
    tripsQuery.isLoading,
    window,
    previousWindow,
  ]);
}
