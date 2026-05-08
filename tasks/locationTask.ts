import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TASK_NAME = 'veridian-location-task';
export const LOCATION_HISTORY_KEY = '@veridian/location_history';

export interface StoredLocation {
  latitude: number;
  longitude: number;
  speed: number | null; // m/s, null if unavailable
  timestamp: number;    // unix ms
}

// Must be defined at module level — Expo task manager requires this
TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    if (error) return;

    const { locations } = data;
    const raw = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
    const existing: StoredLocation[] = raw ? (JSON.parse(raw) as StoredLocation[]) : [];

    const incoming: StoredLocation[] = locations.map((loc) => ({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speed: loc.coords.speed,
      timestamp: loc.timestamp,
    }));

    // Keep last 48 hours, cap at 1000 points to bound storage
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const updated = [...existing, ...incoming]
      .filter((p) => p.timestamp > cutoff)
      .slice(-1000);

    await AsyncStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(updated));
  },
);
