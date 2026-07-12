# veridian-motion

Local Expo native module (iOS + Android) that surfaces device motion signals for
trip reconstruction without background GPS. On iOS it reads the signals the OS has
**already computed for free**, so Veridian can reconstruct past trips on app open
instead of tracking in the background. This is the heart of the carbon autopilot:
one weekly app-open backfills the ledger at near-zero battery cost.

**The two platforms sense in opposite directions** — see the asymmetry table below.
iOS is *retroactive* (read a 7-day OS backlog); Android is *forward-only* (records
transitions only from the moment we register). Both expose the same JS surface via
`index.ts`, so the trip pipeline never branches on `Platform.OS`.

## Platform asymmetry (read this first)

| Aspect | iOS (CoreMotion) | Android (Activity Recognition Transition API) |
|---|---|---|
| **History model** | **Retroactive.** The motion coprocessor logs ~7 days of activity with no registration; we query it on app open. | **Forward-only.** Transitions are recorded **only from `startTransitionMonitoring()` onward** — there is **no OS backlog**. A user who just installed has zero history until they move post-registration. |
| **Backfill** | One app-open reconstructs the past week. | Nothing to backfill; the ledger fills as the user moves after registration. |
| **Registration** | None — history is always there. | Required: `startTransitionMonitoring()` builds an `ActivityTransitionRequest` and registers a manifest `BroadcastReceiver` (fires with the app process dead). |
| **Permission** | `NSMotionUsageDescription`, Motion & Fitness (has a `notDetermined` state). | `ACTIVITY_RECOGNITION` runtime permission (API 29+). **Not** gated by Play's background-location review (NORTH_STAR §4). No `notDetermined` state; the request itself is made JS-side via `PermissionsAndroid` (later stage) — this module never shows a dialog. |
| **Confidence** | Per-sample `low`/`medium`/`high` from CoreMotion. | ARTA transitions **carry no confidence** → reported uniformly as `medium`. |
| **Segments** | Reconstructed by pairing consecutive point-in-time samples. | Reconstructed by pairing `ENTER`/`EXIT` events (or the next differing `ENTER`); still-open segments clamp to the query's `toMs`. |
| **Pedometer / routing / visits** | `queryPedometerDistance`, `routeDistanceKm`, `startVisitMonitoring`, `getRecentVisits` all backed by CoreMotion/MapKit/CLVisit. | **v1 gaps** — resolve `null` / `null` / `false` / `[]`. The JS straight-line estimate fallback + the `needs_confirmation` gate cover the absence. |

The forward-only limitation is inherent to the Android sensing model and cannot be
worked around without background location (forbidden by §4). Document it in any
onboarding copy: Android trip detection starts *after* the user grants permission.

## Why it exists

The M-series motion coprocessor continuously logs activity and step data **even
when the app isn't running**, and iOS retains roughly the trailing **7 days**. We
read that history retroactively rather than polling GPS (which burns 10–14%/hour).
No background modes, no continuous location, no push — nothing that a **free Apple
personal team** can't sign.

## What it exposes (`import ... from '@/modules/veridian-motion'`)

| JS function | Native source | Returns |
|---|---|---|
| `isAvailable()` | module linked? | `boolean` (sync) |
| `isActivityAvailable()` | `CMMotionActivityManager.isActivityAvailable()` | `boolean` |
| `getMotionPermission()` | `CMMotionActivityManager.authorizationStatus()` | `'granted' \| 'denied' \| 'undetermined' \| 'restricted'` |
| `requestMotionPermission()` | tiny 1-min query to trigger the prompt | status string |
| `queryActivityHistory(fromMs, toMs)` | `queryActivityStarting(from:to:to:)` | `ActivitySegment[]` |
| `queryPedometerDistance(fromMs, toMs)` | `CMPedometer.queryPedometerData` | `PedometerSample \| null` |
| `routeDistanceKm(fromLat, fromLng, toLat, toLng)` | `MKDirections` (`.automobile`) | `RouteEstimate \| null` |
| `startVisitMonitoring()` | `CLLocationManager.startMonitoringVisits()` | `boolean` |
| `getRecentVisits(sinceMs)` | persisted `CLVisit` ring buffer | `Visit[]` |

Exported types: `ActivitySegment`, `PedometerSample`, `RouteEstimate`, `Visit`
(plus `ActivityType`, `ActivityConfidence`, `MotionPermissionStatus`).

### Notes on the signals

- **Segments are reconstructed.** `CMMotionActivity` samples are point-in-time
  state changes with only a `startDate`. Each sample's end is inferred as the next
  sample's start; the last segment ends at the query's `toMs`. A sample with no
  active flag becomes `'unknown'`; when several flags are set, moving modes win
  over `stationary` so a trip isn't split at red lights.
- **Pedometer distance is walking/running only.** `distanceKm` is `null` for
  cycling and on the Simulator; `steps` is always present. Cycling/automotive
  distance comes from `routeDistanceKm` between endpoints instead.
- **`routeDistanceKm` never rejects** — it resolves `null` on throttling / no
  route / offline so the caller falls back to a straight-line estimate. MapKit
  throttles `MKDirections`; call it sparingly.
- **Visits** persist to a capped 50-entry ring buffer in `UserDefaults`
  (`veridian.visits`), populated even while the app is suspended. Open-ended
  `CLVisit` dates (`distantPast` arrival / `distantFuture` departure) map to the
  `-1` sentinel. Monitoring only starts when location is authorized **Always**.

### Android-native surface

The Android Kotlin module (`expo.modules.veridianmotion.VeridianMotionModule`)
registers the **same JS function names** so `index.ts` is one surface, plus one
Android-only function, `startTransitionMonitoring()` (no iOS counterpart — iOS needs
no registration). Behavior:

| JS function | Android backing | Returns |
|---|---|---|
| `isActivityAvailable()` | Play Services available **and** API ≥ 29 | `boolean` |
| `getMotionPermission()` | `checkSelfPermission(ACTIVITY_RECOGNITION)` | `'granted'` when granted, else `'undetermined'` (see mapping note) |
| `startTransitionMonitoring()` | registers `ActivityTransitionRequest` → `VeridianTransitionReceiver` | `boolean` (`false` if permission missing) — **Android-only**, not yet in `index.ts` |
| `queryActivityHistory(from,to)` | replays persisted transition events | `ActivitySegment[]`, `confidence` always `'medium'` |
| `queryPedometerDistance` / `routeDistanceKm` / `startVisitMonitoring` / `getRecentVisits` | v1 gaps | `null` / `null` / `false` / `[]` |

**Permission mapping note:** Android has no `notDetermined` state, and a headless
module cannot distinguish never-asked from denied (`shouldShowRequestPermissionRationale`
needs an Activity + a prior in-process request). So the native module maps
granted→`'granted'` and everything else→`'undetermined'`; it never emits `'denied'`
or `'restricted'`. The granted-vs-denied decision is owned by the JS
`PermissionsAndroid` layer (later stage), which can observe the request lifecycle.

**Transitions persist to `SharedPreferences`** (`veridian.motion` / key
`veridian.transitions`) as a synchronized 500-event JSON ring buffer, written by the
manifest-registered `VeridianTransitionReceiver` even when the app process is dead,
and read back by `queryActivityHistory`. `elapsedRealTimeNanos` is converted to
wall-clock epoch ms via a single per-broadcast anchor
(`System.currentTimeMillis() - SystemClock.elapsedRealtime() + nanos/1e6`).

## Graceful degradation

In Expo Go, on web, or in any build before the next native compile,
`requireOptionalNativeModule('VeridianMotion')` returns `null` and every function
degrades: `isAvailable()` → `false`, queries → `[]` / `null`. The JS trip pipeline
can call these unconditionally with no `Platform.OS` checks. On a compiled Android
build the module IS present, so `isAvailable()` → `true` and the Android behavior in
the table above applies.

## Building & testing

- Neither the Swift nor the Kotlin is compiled by Metro. Each links on the next
  native build for its platform:

  ```sh
  npx expo run:ios       # links the Swift module
  npx expo run:android   # links the Kotlin module (also runs on the next prebuild)
  ```

  The Android module (`android/build.gradle`, `AndroidManifest.xml`, the two Kotlin
  files) is picked up by autolinking from `expo-module.config.json`
  (`platforms: ["apple","android"]`); `play-services-location` resolves on that first
  Android compile. Nothing here is validated on a device yet.

- **Device-only.** The iOS **Simulator returns no CoreMotion data** (no activity
  history, no pedometer distance). Test activity/pedometer features on a physical
  device with Motion & Fitness granted. `routeDistanceKm` works in the Simulator
  (MapKit), and `startVisitMonitoring` requires real movement + "Always" location.
- Permission (iOS): `NSMotionUsageDescription` is declared in `app.json`
  (`ios.infoPlist`). Visit monitoring reuses the existing location permissions.
- Permission (Android): `ACTIVITY_RECOGNITION` is declared both in this module's
  `AndroidManifest.xml` and in `app.json` `android.permissions`. `ACCESS_BACKGROUND_LOCATION`
  was removed from `app.json` (NORTH_STAR §4 — no background location on Android v1);
  foreground location entries remain. The runtime request is a later JS stage.
