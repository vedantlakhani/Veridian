import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { CAR_KG_PER_KM } from '@/lib/tripEngine';
import { TRIP_KEYS } from '@/lib/queryKeys';
import {
  monthWindow,
  previousMonthWindow,
  yearWindow,
  previousYearWindow,
  formatMonthRange,
  formatYearRange,
  sumByCategory,
  sumTotal,
  computeDelta,
  aggregateByDay,
  distinctActiveDays,
  topCategoryInsight,
  selectPeriodWin,
  computePassportTripStats,
  type PeriodWindow,
  type CategorySplit,
  type WeekDelta,
  type TopCategory,
  type WeekWin,
  type RecapEntryInput,
  type RecapTripInput,
  type PassportTripInput,
  type PassportTripStats,
} from '@/lib/recap';
import type { EmissionEntryWithFactor, TripMode } from '@/types/emission';

// Purpose: the Carbon Passport data source (Sprint E Stage A4) — same query
// pattern as hooks/useWeeklyRecap.ts, generalized to month/year scale. All
// math lives in the pure lib/recap.ts; this hook only fetches + maps.

export type PassportPeriod = 'month' | 'year';

// ── Zero-emission trip row (walk/cycling), for the win celebration ──
interface ZeroTripRow {
  mode: 'walk' | 'cycling';
  distance_km: number;
  ended_at: string;
}

// ── Any-mode trip row (auto_confirmed/confirmed), for the passport stats ──
interface AnyTripRow {
  mode: TripMode;
  distance_km: number;
}

function toRecapEntries(entries: EmissionEntryWithFactor[]): RecapEntryInput[] {
  return entries.map((e) => ({
    category: e.emission_factors.category,
    kgCo2e: e.kg_co2e_total,
    at: new Date(e.logged_at),
  }));
}

function windowFor(period: PassportPeriod, date: Date): PeriodWindow {
  return period === 'month' ? monthWindow(date) : yearWindow(date);
}

function previousWindowFor(period: PassportPeriod, date: Date): PeriodWindow {
  return period === 'month' ? previousMonthWindow(date) : previousYearWindow(date);
}

function formatRangeFor(period: PassportPeriod, window: PeriodWindow): string {
  return period === 'month' ? formatMonthRange(window) : formatYearRange(window);
}

export interface CarbonPassportData {
  isLoading: boolean;
  /** true once there is at least one entry or zero-emission trip this period */
  isReady: boolean;
  period: PassportPeriod;
  window: PeriodWindow;
  previousWindow: PeriodWindow;
  rangeLabel: string;
  currentKg: number;
  previousKg: number;
  delta: WeekDelta;
  split: CategorySplit;
  topCategory: TopCategory | null;
  win: WeekWin;
  distinctDays: number;
  tripStats: PassportTripStats;
  /** raw current-period entries (feed rendering needs the joined factor) */
  periodEntries: EmissionEntryWithFactor[];
  /** current-period zero-emission trips, newest first */
  periodTrips: RecapTripInput[];
}

export function useCarbonPassport(
  userId: string | undefined,
  period: PassportPeriod,
): CarbonPassportData {
  const now = useMemo(() => new Date(), []);
  const window = useMemo(() => windowFor(period, now), [period, now]);
  const previousWindow = useMemo(() => previousWindowFor(period, now), [period, now]);

  const currentQuery = useEmissionEntries(userId, window.start, window.end);
  const previousQuery = useEmissionEntries(userId, previousWindow.start, previousWindow.end);

  // Zero-emission trips this period (walk/cycling) — for the win celebration.
  const zeroTripsQuery = useQuery({
    queryKey: [...TRIP_KEYS.recentAutoLogs(userId ?? ''), 'passport-zero', period, window.start, window.end],
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

  // All-mode auto/confirmed trips this period — for "N trips tracked
  // themselves" + the mode split (the spec's headline Passport stats).
  const allTripsQuery = useQuery({
    queryKey: [...TRIP_KEYS.recentAutoLogs(userId ?? ''), 'passport-all', period, window.start, window.end],
    queryFn: async () => {
      const [sy, sm, sd] = window.start.split('-').map(Number);
      const [ey, em, ed] = window.end.split('-').map(Number);
      const localStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      const localEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      const { data, error } = await supabase
        .from('detected_trips')
        .select('mode, distance_km')
        .eq('user_id', userId!)
        .in('status', ['auto_confirmed', 'confirmed'])
        .gte('ended_at', localStart.toISOString())
        .lte('ended_at', localEnd.toISOString());
      if (error) throw error;
      return (data as AnyTripRow[]).map((t) => ({
        mode: t.mode,
        distanceKm: t.distance_km,
      })) as PassportTripInput[];
    },
    enabled: !!userId,
  });

  const periodEntries = useMemo(() => currentQuery.data ?? [], [currentQuery.data]);
  const periodTrips = useMemo(() => zeroTripsQuery.data ?? [], [zeroTripsQuery.data]);
  const allTrips = useMemo(() => allTripsQuery.data ?? [], [allTripsQuery.data]);

  return useMemo(() => {
    const currentEntries = toRecapEntries(periodEntries);
    const previousEntries = toRecapEntries(previousQuery.data ?? []);

    const currentKg = sumTotal(currentEntries);
    const previousKg = sumTotal(previousEntries);
    const split = sumByCategory(currentEntries);
    const dayTotals = aggregateByDay(currentEntries);

    return {
      isLoading:
        currentQuery.isLoading ||
        previousQuery.isLoading ||
        zeroTripsQuery.isLoading ||
        allTripsQuery.isLoading,
      isReady: currentKg > 0 || periodTrips.length > 0,
      period,
      window,
      previousWindow,
      rangeLabel: formatRangeFor(period, window),
      currentKg,
      previousKg,
      delta: computeDelta(currentKg, previousKg, period),
      split,
      topCategory: topCategoryInsight(split),
      win: selectPeriodWin(periodTrips, dayTotals),
      distinctDays: distinctActiveDays(currentEntries, periodTrips),
      tripStats: computePassportTripStats(allTrips),
      periodEntries,
      periodTrips,
    };
  }, [
    periodEntries,
    periodTrips,
    allTrips,
    previousQuery.data,
    currentQuery.isLoading,
    previousQuery.isLoading,
    zeroTripsQuery.isLoading,
    allTripsQuery.isLoading,
    period,
    window,
    previousWindow,
  ]);
}
