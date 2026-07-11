import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK_NAME } from '@/tasks/locationTask';
import * as VeridianMotion from '@/modules/veridian-motion';
import type { MotionPermissionStatus } from '@/modules/veridian-motion';

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

// Requests Motion & Fitness permission if it's still 'undetermined'. Mirrors
// requestPermissions()'s own best-effort motion prompt (which fires
// unconditionally right after a user-triggered location grant), but this one
// is called from useTrips' mount-time location-hydrate effect — which runs on
// EVERY app launch, not just once per user tap — so it must check the current
// status first. Without that check, a user who already granted or denied
// Motion & Fitness would have this native call re-issued every cold start;
// skipping it here also means it can never re-request against a decided
// permission, so it can't race requestPermissions() into two overlapping
// native prompts. Returns null (no-op for the caller) when the module isn't
// linked or the query/request throws — best-effort, same as the inline logic
// it replaces.
export async function ensureMotionPermissionRequested(): Promise<MotionPermissionStatus | null> {
  if (!VeridianMotion.isAvailable()) return null;
  try {
    const current = await VeridianMotion.getMotionPermission();
    if (current !== 'undetermined') return current;
    return await VeridianMotion.requestMotionPermission();
  } catch {
    return null;
  }
}
