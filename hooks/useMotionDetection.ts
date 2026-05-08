import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import { LOCATION_TASK_NAME, LOCATION_HISTORY_KEY, type StoredLocation } from '@/tasks/locationTask';

// Background location tasks are not supported in Expo Go
const IS_EXPO_GO = Constants.appOwnership === 'expo';

const DISMISSED_KEY = '@veridian/dismissed_trips';
const TRIP_GAP_MS = 5 * 60 * 1000;   // 5-min silence = new trip
const MIN_DISTANCE_KM = 1.0;           // ignore sub-1km hops

export type DetectedMode = 'car' | 'cycling';

export interface DetectedTrip {
  id: string;             // stringified start timestamp — stable identity
  mode: DetectedMode;
  distanceKm: number;
  avgSpeedKmh: number;
  startTime: Date;
  endTime: Date;
  // DEFRA 2025 kg/km used for estimate display before factor lookup
  kgPerKm: number;
}

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Classification ───────────────────────────────────────────────────────────

function classifyMode(avgSpeedKmh: number): DetectedMode | null {
  if (avgSpeedKmh < 7) return null;   // walking or stationary — skip
  if (avgSpeedKmh < 28) return 'cycling';
  return 'car';
}

const KG_PER_KM: Record<DetectedMode, number> = {
  car: 0.168,     // DEFRA 2025 petrol car medium
  cycling: 0.0,
};

// ─── Analysis ─────────────────────────────────────────────────────────────────

function analyzeTrips(points: StoredLocation[]): DetectedTrip[] {
  if (points.length < 2) return [];

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = [...points]
    .filter((p) => p.timestamp > cutoff)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (recent.length < 2) return [];

  // Split into segments on gaps
  const segments: StoredLocation[][] = [];
  let seg: StoredLocation[] = [recent[0]];

  for (let i = 1; i < recent.length; i++) {
    if (recent[i].timestamp - recent[i - 1].timestamp > TRIP_GAP_MS) {
      if (seg.length > 1) segments.push(seg);
      seg = [recent[i]];
    } else {
      seg.push(recent[i]);
    }
  }
  if (seg.length > 1) segments.push(seg);

  const trips: DetectedTrip[] = [];

  for (const s of segments) {
    if (s.length < 2) continue;

    let distanceKm = 0;
    for (let i = 1; i < s.length; i++) {
      distanceKm += haversineKm(
        s[i - 1].latitude, s[i - 1].longitude,
        s[i].latitude, s[i].longitude,
      );
    }

    if (distanceKm < MIN_DISTANCE_KM) continue;

    const durationH = (s[s.length - 1].timestamp - s[0].timestamp) / 3_600_000;
    const avgSpeedKmh = durationH > 0 ? distanceKm / durationH : 0;
    const mode = classifyMode(avgSpeedKmh);

    if (!mode || mode === 'cycling') continue; // only surface car trips for now

    trips.push({
      id: String(s[0].timestamp),
      mode,
      distanceKm: Math.round(distanceKm * 10) / 10,
      avgSpeedKmh: Math.round(avgSpeedKmh),
      startTime: new Date(s[0].timestamp),
      endTime: new Date(s[s.length - 1].timestamp),
      kgPerKm: KG_PER_KM[mode],
    });
  }

  return trips;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMotionDetection() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [allTrips, setAllTrips] = useState<DetectedTrip[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loadDismissed = useCallback(async () => {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    setDismissed(new Set(raw ? (JSON.parse(raw) as string[]) : []));
  }, []);

  const refresh = useCallback(async () => {
    const raw = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
    if (!raw) return;
    setAllTrips(analyzeTrips(JSON.parse(raw) as StoredLocation[]));
  }, []);

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

  const dismiss = useCallback(
    async (tripId: string) => {
      const next = new Set([...dismissed, tripId]);
      setDismissed(next);
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
    },
    [dismissed],
  );

  // After user logs a trip, remove it from the list
  const markLogged = useCallback(
    async (tripId: string) => {
      await dismiss(tripId);
    },
    [dismiss],
  );

  useEffect(() => {
    void loadDismissed();
    void refresh();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });

    return () => sub.remove();
  }, []);

  return {
    hasPermission,
    requestPermissions,
    pendingTrips: allTrips.filter((t) => !dismissed.has(t.id)),
    dismiss,
    markLogged,
    refresh,
  };
}
