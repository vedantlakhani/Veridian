// Types for the veridian-motion local native module. These describe the shapes
// the iOS module resolves; the JS wrapper in ../index.ts guarantees these same
// shapes (or graceful empty/null defaults) on platforms where the module is
// absent (Android, Expo Go, web).

/** Motion & Fitness authorization, mirroring CMAuthorizationStatus. */
export type MotionPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

/** Raw OS activity classification for a reconstructed segment. */
export type ActivityType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'automotive'
  | 'stationary'
  | 'unknown';

/** CoreMotion's per-sample confidence level. */
export type ActivityConfidence = 'low' | 'medium' | 'high';

/**
 * A contiguous activity segment, reconstructed by pairing consecutive
 * point-in-time CMMotionActivity samples. `endMs` of the last segment in a query
 * is clamped to the query's `toMs`.
 */
export interface ActivitySegment {
  type: ActivityType;
  confidence: ActivityConfidence;
  /** Segment start, epoch milliseconds. */
  startMs: number;
  /** Segment end, epoch milliseconds. */
  endMs: number;
}

/**
 * Pedometer distance + steps over a window. `distanceKm` is null when CoreMotion
 * has no distance estimate (cycling, or the Simulator); `steps` is always present.
 */
export interface PedometerSample {
  distanceKm: number | null;
  steps: number;
}

/** Driving-route estimate from MapKit between two coordinates. */
export interface RouteEstimate {
  distanceKm: number;
  durationMin: number;
}

/**
 * A persisted CLVisit endpoint. `arrivalMs` is -1 when the arrival predates
 * monitoring; `departureMs` is -1 when the visit is still ongoing.
 */
export interface Visit {
  lat: number;
  lng: number;
  arrivalMs: number;
  departureMs: number;
}

/** The native module surface, as registered by VeridianMotionModule.swift. */
export interface VeridianMotionNativeModule {
  isActivityAvailable(): Promise<boolean>;
  getMotionPermission(): Promise<MotionPermissionStatus>;
  requestMotionPermission(): Promise<MotionPermissionStatus>;
  queryActivityHistory(fromMs: number, toMs: number): Promise<ActivitySegment[]>;
  queryPedometerDistance(fromMs: number, toMs: number): Promise<PedometerSample | null>;
  routeDistanceKm(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<RouteEstimate | null>;
  startVisitMonitoring(): Promise<boolean>;
  getRecentVisits(sinceMs: number): Promise<Visit[]>;
  /**
   * Android-only: register for Activity Recognition Transition ENTER/EXIT
   * updates so the OS starts recording transitions (there is no retroactive
   * backlog on Android — see the Kotlin module header). Optional because the iOS
   * Swift module records history without registration and never registers this.
   * Resolves whether monitoring actually started (false when the permission is
   * missing). The JS `ensureTransitionMonitoring()` wrapper gates this to Android.
   */
  startTransitionMonitoring?(): Promise<boolean>;
}
