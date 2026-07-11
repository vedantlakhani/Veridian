# veridian-motion

Local Expo native module (iOS only) that surfaces the motion signals iOS has
**already computed for free**, so Veridian can reconstruct past trips on app open
instead of tracking in the background. This is the heart of the carbon autopilot:
one weekly app-open backfills the ledger at near-zero battery cost.

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

## Graceful degradation

On Android, in Expo Go, on web, or in any build before the next native compile,
`requireOptionalNativeModule('VeridianMotion')` returns `null` and every function
degrades: `isAvailable()` → `false`, queries → `[]` / `null`. The JS trip pipeline
can call these unconditionally with no `Platform.OS` checks.

## Building & testing

- The Swift is **not** compiled by Metro. It links on the next native build:

  ```sh
  npx expo run:ios
  ```

- **Device-only.** The iOS **Simulator returns no CoreMotion data** (no activity
  history, no pedometer distance). Test activity/pedometer features on a physical
  device with Motion & Fitness granted. `routeDistanceKm` works in the Simulator
  (MapKit), and `startVisitMonitoring` requires real movement + "Always" location.
- Permission: `NSMotionUsageDescription` is declared in `app.json`
  (`ios.infoPlist`). Visit monitoring reuses the existing location permissions.
