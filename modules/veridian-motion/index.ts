import { requireOptionalNativeModule } from 'expo';

import type {
  ActivitySegment,
  MotionPermissionStatus,
  PedometerSample,
  RouteEstimate,
  VeridianMotionNativeModule,
  Visit,
} from './src/VeridianMotion.types';

export type {
  ActivityConfidence,
  ActivitySegment,
  ActivityType,
  MotionPermissionStatus,
  PedometerSample,
  RouteEstimate,
  Visit,
} from './src/VeridianMotion.types';

// `requireOptionalNativeModule` returns null instead of throwing when the native
// module isn't linked — i.e. on Android, in Expo Go, on web, or in any build that
// predates the next `npx expo run:ios`. Every export below tolerates that null so
// the JS trip pipeline can call these unconditionally without Platform checks.
const native = requireOptionalNativeModule<VeridianMotionNativeModule>('VeridianMotion');

/**
 * Whether the iOS motion module is linked in this build. Callers should gate the
 * whole retroactive-motion path on this; when false, everything below returns
 * empty/null defaults.
 */
export function isAvailable(): boolean {
  return native != null;
}

/**
 * Whether the device exposes the motion-activity coprocessor. False when the
 * module is absent and on the iOS Simulator (which records no CoreMotion data).
 */
export async function isActivityAvailable(): Promise<boolean> {
  if (!native) {
    return false;
  }
  try {
    return await native.isActivityAvailable();
  } catch {
    return false;
  }
}

/** Current Motion & Fitness authorization. 'undetermined' when the module is absent. */
export async function getMotionPermission(): Promise<MotionPermissionStatus> {
  if (!native) {
    return 'undetermined';
  }
  return native.getMotionPermission();
}

/**
 * Trigger the system Motion & Fitness prompt (when undetermined) and resolve the
 * resulting status. No-op returning 'undetermined' when the module is absent.
 */
export async function requestMotionPermission(): Promise<MotionPermissionStatus> {
  if (!native) {
    return 'undetermined';
  }
  return native.requestMotionPermission();
}

/**
 * Reconstruct activity segments over [fromMs, toMs] from the OS's precomputed
 * ~7-day history. Returns [] when the module is absent. May reject with
 * ERR_MOTION_PERMISSION / ERR_MOTION_QUERY when the module IS present — the
 * caller is expected to have checked permission first.
 */
export async function queryActivityHistory(
  fromMs: number,
  toMs: number
): Promise<ActivitySegment[]> {
  if (!native) {
    return [];
  }
  return native.queryActivityHistory(fromMs, toMs);
}

/**
 * Pedometer distance + steps over [fromMs, toMs]. Returns null when the module is
 * absent or the device has no pedometer.
 */
export async function queryPedometerDistance(
  fromMs: number,
  toMs: number
): Promise<PedometerSample | null> {
  if (!native) {
    return null;
  }
  return native.queryPedometerDistance(fromMs, toMs);
}

/**
 * Driving-route distance/duration between two coordinates via MapKit. Resolves
 * null on any failure (throttling, no route, module absent) — never rejects — so
 * the caller can fall back to a straight-line estimate.
 */
export async function routeDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteEstimate | null> {
  if (!native) {
    return null;
  }
  return native.routeDistanceKm(fromLat, fromLng, toLat, toLng);
}

/**
 * Start CLVisit monitoring (requires "Always" location). Resolves whether
 * monitoring actually started; false when the module is absent or location isn't
 * authorized "Always".
 */
export async function startVisitMonitoring(): Promise<boolean> {
  if (!native) {
    return false;
  }
  return native.startVisitMonitoring();
}

/** Persisted visits with arrival or departure at/after `sinceMs`. [] when absent. */
export async function getRecentVisits(sinceMs: number): Promise<Visit[]> {
  if (!native) {
    return [];
  }
  return native.getRecentVisits(sinceMs);
}
