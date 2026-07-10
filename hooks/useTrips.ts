import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LOCATION_TASK_NAME, LOCATION_HISTORY_KEY, type StoredLocation } from '@/tasks/locationTask';
import {
  analyzeTrips,
  detectActiveTrip,
  CAR_KG_PER_KM,
  IDLE_ACTIVE_TRIP,
  type ActiveTripState,
} from '@/lib/tripEngine';
import { useAllEmissionFactors } from '@/hooks/useAllEmissionFactors';
import { useDurableCreateEntry } from '@/hooks/useDurableCreateEntry';
import { TRIP_KEYS } from '@/lib/queryKeys';
import type { DetectedTrip, EmissionFactor, TripMode } from '@/types/emission';

// Purpose: the single stateful trip pipeline — owns the GPS permission flow,
// reads the background-task ring buffer, runs it through lib/tripEngine, and
// syncs the result into detected_trips. Replaces useMotionDetection +
// useAutoLog, which raced each other over the same client-only trip list.
//
// MUST BE MOUNTED EXACTLY ONCE — via TripsProvider in app/_layout.tsx; screens
// consume it through useTripsContext(). A second mount would run a second
// copy of the entry-creation effect with its own in-memory guards, racing the
// first for the same trips (the unique emission_entries(trip_id) index is the
// DB backstop, but one pipeline is the design).

// Background location tasks are not supported in Expo Go
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Unified "don't re-sync this trip again" guard — replaces the old
// @veridian/auto_logged_trips + @veridian/dismissed_trips pair, which tracked
// the same idea (client_trip_key -> already handled) across two keys.
const SYNCED_KEYS_KEY = '@veridian/synced_trip_keys';
const LEGACY_AUTO_LOGGED_KEY = '@veridian/auto_logged_trips';
const LEGACY_DISMISSED_KEY = '@veridian/dismissed_trips';

const MAX_RECENT_AUTO_LOGS = 5;
// How many recent auto_confirmed trips to scan for a missing emission entry —
// bounds the retry query; a car trip failing to write for this many
// subsequent auto-confirmed trips is an edge case the offline queue's own
// reconnect-triggered flush (app/_layout.tsx) is the real safety net for.
const AUTO_CONFIRMED_SCAN_LIMIT = 20;

// ─── Display shape — same fields useAutoLog's home-screen consumers expect ───
export interface AutoLogEntry {
  tripId: string; // detected_trips.id
  mode: TripMode;
  distanceKm: number;
  kgCo2e: number;
  entryId: string; // linked emission_entries.id, '' for zero-emission trips
  loggedAt: Date;
  savedKg: number; // zero-emission trips: km saved vs. driving
}

// ─── Query Keys ────────────────────────────────────────────────────────────
// Defined in lib/queryKeys.ts (shared with the offline queue and entry hooks
// without hook-to-hook imports); re-exported here for existing importers.
export { TRIP_KEYS };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findCarFactor(factors: EmissionFactor[]): EmissionFactor | undefined {
  return (
    factors.find(
      (f) =>
        f.category === 'transport' &&
        (f.subcategory.toLowerCase().includes('car') ||
          f.item.toLowerCase().includes('petrol')),
    ) ??
    // Fallback: anything in the petrol-car kg/km range
    factors.find((f) => f.category === 'transport' && f.kg_co2e > 0.1 && f.kg_co2e < 0.25)
  );
}

async function fireNotification(title: string, body: string): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // Notifications are best-effort — never block trip sync on them
  }
}

async function readAsyncStorageSet(key: string): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(key);
  return new Set(raw ? (JSON.parse(raw) as string[]) : []);
}

interface AutoConfirmedRow {
  id: string;
  mode: TripMode;
  distance_km: number;
  confidence: number;
  ended_at: string;
}

interface PendingEntryTrip {
  id: string;
  distanceKm: number;
  confidence: number;
  endedAt: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrips(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: factors } = useAllEmissionFactors();
  const { createDurable } = useDurableCreateEntry();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTripState>(IDLE_ACTIVE_TRIP);
  const [hydrated, setHydrated] = useState(false);

  // Persisted across sessions — client_trip_keys already upserted to detected_trips.
  const syncedKeysRef = useRef<Set<string>>(new Set());
  // In-memory only — guards a key mid-upsert against a concurrent/overlapping refresh().
  const syncingRef = useRef<Set<string>>(new Set());
  // In-memory only — guards a detected_trips id mid-entry-creation, mirrors
  // useAutoLog's old processingRef.
  const attemptRef = useRef<Set<string>>(new Set());
  // In-memory only — car trip ids already handed to the durable offline queue
  // this session, so a still-unflushed queue write isn't re-enqueued every
  // refresh. Restart safety comes from enqueueEntry's own per-tripId dedupe
  // plus the unique emission_entries(trip_id) index, not from this ref.
  const queuedEntryIdsRef = useRef<Set<string>>(new Set());

  // ── One-time hydrate + migrate the legacy dismissed/auto-logged sets ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await AsyncStorage.getItem(SYNCED_KEYS_KEY);
      if (existing) {
        if (!cancelled) syncedKeysRef.current = new Set(JSON.parse(existing) as string[]);
      } else {
        const [logged, dismissed] = await Promise.all([
          readAsyncStorageSet(LEGACY_AUTO_LOGGED_KEY),
          readAsyncStorageSet(LEGACY_DISMISSED_KEY),
        ]);
        const migrated = new Set([...logged, ...dismissed]);
        await AsyncStorage.setItem(SYNCED_KEYS_KEY, JSON.stringify([...migrated]));
        await AsyncStorage.multiRemove([LEGACY_AUTO_LOGGED_KEY, LEGACY_DISMISSED_KEY]);
        if (!cancelled) syncedKeysRef.current = migrated;
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSyncedKeys = useCallback(async () => {
    await AsyncStorage.setItem(SYNCED_KEYS_KEY, JSON.stringify([...syncedKeysRef.current]));
  }, []);

  // ── needs_confirmation trips — the Log screen's confirm card ──
  const needsConfirmationQuery = useQuery({
    queryKey: TRIP_KEYS.needsConfirmation(userId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('detected_trips')
        .select('*')
        .eq('user_id', userId!)
        .eq('status', 'needs_confirmation')
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data as DetectedTrip[];
    },
    enabled: !!userId, // CRITICAL: guard prevents null user RLS failure
  });

  // ── auto_confirmed trips + their linked entries — home screen feed AND the
  // source of truth for which car trips still need an emission entry ──
  const autoConfirmedQuery = useQuery({
    queryKey: TRIP_KEYS.recentAutoLogs(userId ?? ''),
    queryFn: async () => {
      const { data: trips, error } = await supabase
        .from('detected_trips')
        .select('id, mode, distance_km, confidence, ended_at')
        .eq('user_id', userId!)
        .eq('status', 'auto_confirmed')
        .order('ended_at', { ascending: false })
        .limit(AUTO_CONFIRMED_SCAN_LIMIT);
      if (error) throw error;

      const rows = (trips ?? []) as AutoConfirmedRow[];
      const carRows = rows.filter((t) => t.mode === 'car');

      let entryByTripId = new Map<string, { id: string; kg_co2e_total: number }>();
      if (carRows.length > 0) {
        const { data: entries, error: entriesError } = await supabase
          .from('emission_entries')
          .select('id, trip_id, kg_co2e_total')
          .in('trip_id', carRows.map((t) => t.id));
        if (entriesError) throw entriesError;
        entryByTripId = new Map(
          (entries ?? []).map((e) => [e.trip_id as string, { id: e.id as string, kg_co2e_total: e.kg_co2e_total as number }]),
        );
      }

      const autoLogs: AutoLogEntry[] = rows.map((t) => {
        const zeroEmission = t.mode !== 'car';
        const linked = entryByTripId.get(t.id);
        return {
          tripId: t.id,
          mode: t.mode,
          distanceKm: t.distance_km,
          kgCo2e: zeroEmission ? 0 : (linked?.kg_co2e_total ?? 0),
          entryId: linked?.id ?? '',
          loggedAt: new Date(t.ended_at),
          savedKg: zeroEmission ? t.distance_km * CAR_KG_PER_KM : 0,
        };
      });

      const pendingEntryTrips: PendingEntryTrip[] = carRows
        .filter((t) => !entryByTripId.has(t.id))
        .map((t) => ({ id: t.id, distanceKm: t.distance_km, confidence: t.confidence, endedAt: t.ended_at }));

      return { autoLogs, pendingEntryTrips };
    },
    enabled: !!userId,
  });

  // ── Retry entry creation for auto_confirmed car trips missing an entry ──
  // Runs whenever the auto_confirmed list changes (mount, post-refresh
  // invalidation, or a successful retry elsewhere) — mirrors useAutoLog's old
  // effect watching pendingTrips.
  useEffect(() => {
    if (!userId || !factors || factors.length === 0) return;
    const pending = autoConfirmedQuery.data?.pendingEntryTrips ?? [];
    if (pending.length === 0) return;

    const carFactor = findCarFactor(factors);
    if (!carFactor) return;

    const process = async () => {
      for (const trip of pending) {
        if (attemptRef.current.has(trip.id) || queuedEntryIdsRef.current.has(trip.id)) continue;
        attemptRef.current.add(trip.id);
        try {
          const result = await createDurable({
            userId,
            factor: carFactor,
            quantity: trip.distanceKm,
            source: 'sensor',
            status: 'auto_confirmed',
            confidence: trip.confidence,
            tripId: trip.id,
            loggedAt: trip.endedAt,
          });
          if ('queued' in result) {
            // Offline/network failure — queued durably; the root-mounted
            // offline queue (app/_layout.tsx) completes it on reconnect. A
            // queued trip counts as logged so it isn't retried every refresh.
            queuedEntryIdsRef.current.add(trip.id);
          } else {
            await fireNotification(
              '🚗 Trip logged',
              `${trip.distanceKm.toFixed(1)} km drive · ${result.kg_co2e_total.toFixed(2)} kg CO₂e`,
            );
            queryClient.invalidateQueries({ queryKey: TRIP_KEYS.recentAutoLogs(userId) });
          }
        } catch (error) {
          // 23505 = the unique emission_entries(trip_id) index rejected a
          // duplicate — the entry already exists (another writer or a queue
          // flush beat this effect). Refetch so pendingEntryTrips drops it.
          if ((error as { code?: unknown })?.code === '23505') {
            queryClient.invalidateQueries({ queryKey: TRIP_KEYS.recentAutoLogs(userId) });
          }
          // Anything else (RLS, validation, …) — leave un-entried; the trip
          // stays auto_confirmed and this same query surfaces it again next
          // refresh.
        } finally {
          attemptRef.current.delete(trip.id);
        }
      }
    };

    void process();
  }, [userId, factors, autoConfirmedQuery.data, createDurable, queryClient]);

  // ── Buffer -> engine -> sync ──
  const refresh = useCallback(async () => {
    const raw = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
    const points: StoredLocation[] = raw ? (JSON.parse(raw) as StoredLocation[]) : [];
    setActiveTrip(detectActiveTrip(points));

    if (!userId || !hydrated || points.length === 0) return;

    const classified = analyzeTrips(points);
    const unsynced = classified.filter(
      (t) => !syncedKeysRef.current.has(t.clientTripKey) && !syncingRef.current.has(t.clientTripKey),
    );
    if (unsynced.length === 0) return;

    for (const trip of unsynced) {
      syncingRef.current.add(trip.clientTripKey);
      try {
        const { error } = await supabase.from('detected_trips').upsert(
          {
            user_id: userId,
            client_trip_key: trip.clientTripKey,
            started_at: trip.startTime.toISOString(),
            ended_at: trip.endTime.toISOString(),
            distance_km: trip.distanceKm,
            avg_speed_kmh: trip.avgSpeedKmh,
            mode: trip.mode,
            confidence: trip.confidence,
            status: trip.status,
            features: trip.features,
          },
          { onConflict: 'user_id,client_trip_key', ignoreDuplicates: false },
        );
        if (error) throw error;

        syncedKeysRef.current.add(trip.clientTripKey);
        await persistSyncedKeys();

        if (trip.status === 'auto_confirmed' && (trip.mode === 'walk' || trip.mode === 'cycling')) {
          const savedKg = trip.distanceKm * CAR_KG_PER_KM;
          await fireNotification(
            trip.mode === 'cycling' ? '🚲 Great choice!' : '🚶 Nice walk!',
            `${trip.distanceKm.toFixed(1)} km ${trip.mode === 'cycling' ? 'by bike' : 'on foot'} · You avoided ${savedKg.toFixed(2)} kg CO₂`,
          );
        }
      } catch {
        // Upsert failed (offline, RLS, …) — leave unsynced so the next pass retries.
      } finally {
        syncingRef.current.delete(trip.clientTripKey);
      }
    }

    queryClient.invalidateQueries({ queryKey: TRIP_KEYS.needsConfirmation(userId) });
    queryClient.invalidateQueries({ queryKey: TRIP_KEYS.recentAutoLogs(userId) });
  }, [userId, hydrated, persistSyncedKeys, queryClient]);

  // Writes a fake 12 km car track (45 km/h avg) to AsyncStorage for Expo Go testing.
  // The trip ends 20 minutes ago so it surfaces as a completed pending trip,
  // not an active one.
  const simulateTrip = useCallback(async () => {
    const endTime = Date.now() - 20 * 60 * 1000;
    const intervalMs = 60_000;         // one point per minute
    const numIntervals = 16;           // 16 min at 45 km/h ≈ 12 km
    const kmPerInterval = 0.75;        // 45 km/h → 0.75 km per minute
    const latPerInterval = kmPerInterval / 111; // ~111 km per degree latitude

    const fake: StoredLocation[] = [];
    for (let i = 0; i <= numIntervals; i++) {
      fake.push({
        latitude: 51.5074 + i * latPerInterval,
        longitude: -0.1278,
        speed: 12.5, // m/s ≈ 45 km/h
        timestamp: endTime - (numIntervals - i) * intervalMs,
      });
    }

    const raw = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
    const existing: StoredLocation[] = raw ? (JSON.parse(raw) as StoredLocation[]) : [];
    const merged = [...existing, ...fake].sort((a, b) => a.timestamp - b.timestamp);
    await AsyncStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(merged));
    await refresh();
  }, [refresh]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (IS_EXPO_GO) {
      // Background location is unsupported in Expo Go — inform caller
      setHasPermission(false);
      return false;
    }

    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== 'granted') {
        setHasPermission(false);
        return false;
      }

      const bg = await Location.requestBackgroundPermissionsAsync();
      const granted = bg.status === 'granted';
      setHasPermission(granted);

      if (granted) {
        const already = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (!already) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 100,
            deferredUpdatesInterval: 60_000,
            showsBackgroundLocationIndicator: false,
            pausesUpdatesAutomatically: true,
          });
        }
      }

      return granted;
    } catch {
      setHasPermission(false);
      return false;
    }
  }, []);

  // ── confirmTrip / dismissTrip — the Log screen's confirm card actions ──
  const confirmTripMutation = useMutation({
    mutationFn: async ({ trip, modeOverride }: { trip: DetectedTrip; modeOverride?: TripMode }) => {
      const mode = modeOverride ?? trip.mode;
      const zeroEmission = mode === 'walk' || mode === 'cycling';

      const { error: updateError } = await supabase
        .from('detected_trips')
        .update({ status: 'confirmed', mode, updated_at: new Date().toISOString() })
        .eq('id', trip.id);
      if (updateError) throw updateError;

      if (!zeroEmission) {
        const carFactor = factors ? findCarFactor(factors) : undefined;
        if (!carFactor) throw new Error('No transport emission factor found');
        // Queued (offline/network failure) still counts as confirmed — the
        // trip's status update above already committed; the flush path
        // completes the entry itself on reconnect.
        await createDurable({
          userId: userId!,
          factor: carFactor,
          quantity: trip.distance_km,
          source: 'sensor',
          status: 'user_confirmed',
          confidence: trip.confidence,
          tripId: trip.id,
          loggedAt: trip.ended_at,
        });
      }
    },
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: TRIP_KEYS.needsConfirmation(userId) });
      queryClient.invalidateQueries({ queryKey: TRIP_KEYS.recentAutoLogs(userId) });
    },
  });

  const dismissTripMutation = useMutation({
    mutationFn: async (trip: DetectedTrip) => {
      const { error } = await supabase
        .from('detected_trips')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', trip.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: TRIP_KEYS.needsConfirmation(userId) });
    },
  });

  const confirmTrip = useCallback(
    (trip: DetectedTrip, modeOverride?: TripMode) => confirmTripMutation.mutateAsync({ trip, modeOverride }),
    [confirmTripMutation],
  );
  const dismissTrip = useCallback(
    (trip: DetectedTrip) => dismissTripMutation.mutateAsync(trip),
    [dismissTripMutation],
  );

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return {
    hasPermission,
    requestPermissions,
    needsConfirmation: needsConfirmationQuery.data ?? [],
    confirmTrip,
    dismissTrip,
    recentAutoLogs: (autoConfirmedQuery.data?.autoLogs ?? []).slice(0, MAX_RECENT_AUTO_LOGS),
    isInMotion: activeTrip.isInMotion,
    currentTripKm: activeTrip.currentTripKm,
    refresh,
    simulateTrip,
  };
}
