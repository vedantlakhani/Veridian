import { requireOptionalNativeModule } from 'expo';
import { Platform, PermissionsAndroid } from 'react-native';

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
// module isn't linked — i.e. in Expo Go, on web, or in any build that predates
// the next `npx expo run:ios` / `run:android`. The module IS now linked on
// Android too (the Kotlin Activity-Recognition side), so on Android `native` is
// non-null and `isAvailable()` is true — the fusion path (queryActivityHistory)
// runs there. The permission wrappers still fork on Platform.OS below, because
// Android's ACTIVITY_RECOGNITION grant is owned by the JS PermissionsAndroid
// layer (the Kotlin module deliberately never shows a dialog and has no
// requestMotionPermission). Every export tolerates a null `native` so the JS
// trip pipeline can call these unconditionally.
const native = requireOptionalNativeModule<VeridianMotionNativeModule>('VeridianMotion');

// ── Android ACTIVITY_RECOGNITION helpers ──
// ACTIVITY_RECOGNITION is a runtime permission only on API 29+ (Android 10); on
// older APIs it's install-time granted, so both wrappers short-circuit to
// 'granted' there. Neither the Kotlin module's headless getMotionPermission nor
// PermissionsAndroid.check can distinguish "denied" from "never asked" (Android
// exposes no such state without an Activity), so getMotionPermission maps a
// missing grant to 'undetermined' — request() is the only place a real denial
// surfaces.
const ANDROID_RUNTIME_PERMISSION_API = 29;

function androidNeedsRuntimeRequest(): boolean {
  return !(typeof Platform.Version === 'number' && Platform.Version < ANDROID_RUNTIME_PERMISSION_API);
}

async function getAndroidMotionPermission(): Promise<MotionPermissionStatus> {
  if (!androidNeedsRuntimeRequest()) return 'granted';
  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    );
    return granted ? 'granted' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

async function requestAndroidMotionPermission(): Promise<MotionPermissionStatus> {
  if (!androidNeedsRuntimeRequest()) return 'granted';
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    );
    // GRANTED -> granted; DENIED and NEVER_ASK_AGAIN both collapse to 'denied'
    // (the fusion path only ever gates on === 'granted').
    return result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
  } catch {
    return 'undetermined';
  }
}

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

/**
 * Current motion authorization — iOS Motion & Fitness (CMAuthorizationStatus) or
 * Android ACTIVITY_RECOGNITION. On Android this reads PermissionsAndroid.check
 * (the Kotlin module never owns the grant decision); 'granted' | 'undetermined'
 * only there. 'undetermined' when the module is absent.
 */
export async function getMotionPermission(): Promise<MotionPermissionStatus> {
  if (Platform.OS === 'android') {
    return getAndroidMotionPermission();
  }
  if (!native) {
    return 'undetermined';
  }
  return native.getMotionPermission();
}

/**
 * Trigger the motion permission prompt and resolve the resulting status. On iOS
 * this is the system Motion & Fitness prompt (native, only shows when
 * undetermined); on Android it's PermissionsAndroid.request for
 * ACTIVITY_RECOGNITION. No-op returning 'undetermined' when the module is absent
 * (non-Android).
 */
export async function requestMotionPermission(): Promise<MotionPermissionStatus> {
  if (Platform.OS === 'android') {
    return requestAndroidMotionPermission();
  }
  if (!native) {
    return 'undetermined';
  }
  return native.requestMotionPermission();
}

/**
 * Android-only: register for Activity Recognition Transition updates so the OS
 * begins recording ENTER/EXIT events (Android has no retroactive backlog, so
 * this must run before queryActivityHistory can return anything). No-ops
 * resolving false on iOS (CoreMotion needs no registration), in Expo Go/web, or
 * when the native module is absent. Never rejects — a native registration
 * failure resolves false so callers can treat it as "monitoring not active".
 */
export async function ensureTransitionMonitoring(): Promise<boolean> {
  if (Platform.OS !== 'android' || !native || !native.startTransitionMonitoring) {
    return false;
  }
  try {
    return await native.startTransitionMonitoring();
  } catch {
    return false;
  }
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
