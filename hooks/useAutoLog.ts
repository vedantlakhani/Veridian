import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useMotionDetection } from '@/hooks/useMotionDetection';
import { useAllEmissionFactors } from '@/hooks/useAllEmissionFactors';
import { useCreateEntry } from '@/hooks/useEmissionEntries';
import type { EmissionFactor } from '@/types/emission';

// Purpose: watch pendingTrips, auto-create emission entries, fire notifications.
// This is the passive intelligence layer — trips get logged with zero user taps.

const AUTO_LOGGED_KEY = '@veridian/auto_logged_trips';
const RECORDS_KEY = '@veridian/auto_log_records';

const CAR_KG_PER_KM = 0.168;   // DEFRA 2025 petrol car medium — for cycling savings
const MIN_CAR_KM = 2.0;        // auto-log car trips at/above this distance
const MIN_CYCLING_KM = 1.0;    // celebrate cycling trips at/above this distance
const MAX_RECORDS = 5;         // recent auto-logs kept for home screen display

export interface AutoLogEntry {
  tripId: string;
  mode: 'car' | 'cycling';
  distanceKm: number;
  kgCo2e: number;
  entryId: string;  // the created emission_entry id for undo ('' for cycling)
  loggedAt: Date;
  savedKg: number;  // for cycling: how much was saved vs driving
}

// Serialized shape in AsyncStorage — loggedAt round-trips as ISO string
interface StoredAutoLogEntry extends Omit<AutoLogEntry, 'loggedAt'> {
  loggedAt: string;
}

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
    // Notifications are best-effort — never block auto-logging on them
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAutoLog(userId: string | undefined): {
  recentAutoLogs: AutoLogEntry[];
} {
  const { pendingTrips, markLogged } = useMotionDetection();
  const { data: factors } = useAllEmissionFactors();
  const createEntry = useCreateEntry();

  const [recentAutoLogs, setRecentAutoLogs] = useState<AutoLogEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Trip IDs already auto-logged (persisted) — prevents re-logging across sessions
  const loggedRef = useRef<Set<string>>(new Set());
  // Trips currently mid-mutation — prevents duplicate mutations on re-renders
  const processingRef = useRef<Set<string>>(new Set());
  // Latest records — avoids setState closure races during sequential processing
  const recordsRef = useRef<AutoLogEntry[]>([]);

  // ── Hydrate from AsyncStorage on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loggedRaw, recordsRaw] = await Promise.all([
        AsyncStorage.getItem(AUTO_LOGGED_KEY),
        AsyncStorage.getItem(RECORDS_KEY),
      ]);
      if (cancelled) return;
      loggedRef.current = new Set(loggedRaw ? (JSON.parse(loggedRaw) as string[]) : []);
      const stored: StoredAutoLogEntry[] = recordsRaw
        ? (JSON.parse(recordsRaw) as StoredAutoLogEntry[])
        : [];
      recordsRef.current = stored.map((r) => ({ ...r, loggedAt: new Date(r.loggedAt) }));
      setRecentAutoLogs(recordsRef.current);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rememberLogged = useCallback(async (tripId: string) => {
    loggedRef.current.add(tripId);
    await AsyncStorage.setItem(AUTO_LOGGED_KEY, JSON.stringify([...loggedRef.current]));
  }, []);

  const recordAutoLog = useCallback(async (entry: AutoLogEntry) => {
    const next = [entry, ...recordsRef.current].slice(0, MAX_RECORDS);
    recordsRef.current = next;
    setRecentAutoLogs(next);
    const serialized: StoredAutoLogEntry[] = next.map((r) => ({
      ...r,
      loggedAt: r.loggedAt.toISOString(),
    }));
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(serialized));
  }, []);

  // ── Process pending trips whenever they change ──
  useEffect(() => {
    if (!userId || !hydrated) return;
    if (!factors || factors.length === 0) return;
    if (pendingTrips.length === 0) return;

    const carFactor = findCarFactor(factors);

    const process = async () => {
      for (const trip of pendingTrips) {
        if (loggedRef.current.has(trip.id)) continue;
        if (processingRef.current.has(trip.id)) continue;

        if (trip.mode === 'car') {
          if (trip.distanceKm < MIN_CAR_KM || !carFactor) continue;
          processingRef.current.add(trip.id);
          try {
            const entry = await createEntry.mutateAsync({
              userId,
              factor: carFactor,
              quantity: trip.distanceKm,
            });
            await rememberLogged(trip.id);
            await markLogged(trip.id);
            await recordAutoLog({
              tripId: trip.id,
              mode: 'car',
              distanceKm: trip.distanceKm,
              kgCo2e: entry.kg_co2e_total,
              entryId: entry.id,
              loggedAt: new Date(),
              savedKg: 0,
            });
            await fireNotification(
              '🚗 Trip logged',
              `${trip.distanceKm.toFixed(1)} km drive · ${entry.kg_co2e_total.toFixed(2)} kg CO₂e`,
            );
          } catch {
            // Mutation failed (offline, RLS, …) — leave un-logged so the next
            // pass retries; the trip also remains reviewable on the Log screen.
          } finally {
            processingRef.current.delete(trip.id);
          }
        } else if (trip.mode === 'cycling') {
          if (trip.distanceKm < MIN_CYCLING_KM) continue;
          processingRef.current.add(trip.id);
          try {
            const savedKg = trip.distanceKm * CAR_KG_PER_KM;
            // Cycling = 0 kg CO₂e — no entry created, but celebrate the win
            await rememberLogged(trip.id);
            await markLogged(trip.id);
            await recordAutoLog({
              tripId: trip.id,
              mode: 'cycling',
              distanceKm: trip.distanceKm,
              kgCo2e: 0,
              entryId: '',
              loggedAt: new Date(),
              savedKg,
            });
            await fireNotification(
              '🚲 Great choice!',
              `${trip.distanceKm.toFixed(1)} km by bike · You avoided ${savedKg.toFixed(2)} kg CO₂`,
            );
          } finally {
            processingRef.current.delete(trip.id);
          }
        }
      }
    };

    void process();
  }, [userId, hydrated, factors, pendingTrips, createEntry, markLogged, rememberLogged, recordAutoLog]);

  return { recentAutoLogs };
}
