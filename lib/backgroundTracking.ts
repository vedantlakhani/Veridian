import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK_NAME } from '@/tasks/locationTask';
import * as VeridianMotion from '@/modules/veridian-motion';

// Shared "success path" for granted background location — registers the
// background-location task if it isn't already running, and starts CLVisit
// monitoring once (guarded by visitMonitoringRef, shared across calls so a
// second caller in the same session is a no-op). Called both from
// useTrips' requestPermissions() (user-triggered grant) and from its
// mount-time permission-hydrate effect (when the OS permission was already
// granted before this app session, e.g. a previous install or an external
// Settings grant) — kept as one function, in its own module (deliberately
// free of useTrips.ts's heavier dependencies — supabase, react-query,
// AsyncStorage, tripEngine/activityFusion — so it can be unit-tested without
// mocking that whole graph) so the two call sites can't drift.
export async function ensureBackgroundTrackingRegistered(
  visitMonitoringRef: { current: boolean },
): Promise<void> {
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
  // CLVisit endpoints need "Always" location — start monitoring once so
  // automotive segments can be distance-estimated by routing between them.
  if (VeridianMotion.isAvailable() && !visitMonitoringRef.current) {
    visitMonitoringRef.current = true;
    try {
      await VeridianMotion.startVisitMonitoring();
    } catch {
      // Best-effort — visit-based distance simply falls back to estimate.
    }
  }
}
