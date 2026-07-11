import ExpoModulesCore
import CoreMotion
import CoreLocation
import MapKit

// MARK: - VeridianMotionModule
//
// Exposes iOS's pre-computed motion signals to JS. The whole point of this
// module is retroactive, zero-battery trip reconstruction: on app open we pull
// up to ~7 days of activity/pedometer history that the motion coprocessor logged
// while the app was NOT running. Nothing here schedules background work.
//
// Threading: CoreMotion query completions arrive on the OperationQueue we hand
// them; MKDirections completions arrive on an arbitrary, undocumented queue —
// NOT guaranteed to be the main thread. `Promise` is safe to resolve/reject
// from any thread, so we resolve directly from those callbacks either way; the
// code below needs no explicit dispatch back to main to be thread-safe.
// The `CMMotionActivityManager` / `CMPedometer` / `MKDirections` instances are
// captured in their completion closures so ARC keeps them alive until the query
// finishes (a manager released before its completion fires never calls back).

public final class VeridianMotionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VeridianMotion")

    // Wire the visit-monitoring singleton (CLLocationManager + delegate) at
    // module creation, on the main thread so visit callbacks are delivered on a
    // thread with an active run loop.
    OnCreate {
      DispatchQueue.main.async {
        VeridianVisitTracker.shared.prepare()
      }
    }

    // Whether the device has the motion-activity coprocessor. False on the
    // iOS Simulator and older/unsupported hardware.
    AsyncFunction("isActivityAvailable") { () -> Bool in
      return CMMotionActivityManager.isActivityAvailable()
    }

    // Current Motion & Fitness authorization, mapped to a stable JS string.
    AsyncFunction("getMotionPermission") { () -> String in
      return mapMotionAuthStatus(CMMotionActivityManager.authorizationStatus())
    }

    // Trigger the system Motion & Fitness prompt (when undetermined) by issuing a
    // tiny 1-minute history query, then report the resulting status. CoreMotion
    // has no dedicated request API — a query is how the prompt is surfaced.
    AsyncFunction("requestMotionPermission") { (promise: Promise) in
      guard CMMotionActivityManager.isActivityAvailable() else {
        promise.resolve(mapMotionAuthStatus(CMMotionActivityManager.authorizationStatus()))
        return
      }
      let manager = CMMotionActivityManager()
      let now = Date()
      let from = now.addingTimeInterval(-60)
      manager.queryActivityStarting(from: from, to: now, to: OperationQueue()) { [manager] _, _ in
        _ = manager // keep the manager alive until the query completes
        promise.resolve(mapMotionAuthStatus(CMMotionActivityManager.authorizationStatus()))
      }
    }

    // Reconstruct activity segments over [fromMs, toMs]. CMMotionActivity samples
    // are point-in-time state changes, so each sample's start is paired with the
    // NEXT sample's start to form a segment; the final segment ends at `toMs`.
    // Rejects with a coded error when Motion & Fitness access is denied/restricted.
    AsyncFunction("queryActivityHistory") { (fromMs: Double, toMs: Double, promise: Promise) in
      guard CMMotionActivityManager.isActivityAvailable() else {
        promise.resolve([[String: Any]]())
        return
      }
      let status = CMMotionActivityManager.authorizationStatus()
      if status == .denied || status == .restricted {
        promise.reject(
          "ERR_MOTION_PERMISSION",
          "Motion & Fitness access is \(mapMotionAuthStatus(status)); cannot read activity history."
        )
        return
      }
      let manager = CMMotionActivityManager()
      let from = Date(timeIntervalSince1970: fromMs / 1000.0)
      let to = Date(timeIntervalSince1970: toMs / 1000.0)
      manager.queryActivityStarting(from: from, to: to, to: OperationQueue()) { [manager] activities, error in
        _ = manager // keep the manager alive until the query completes
        if let error = error {
          promise.reject("ERR_MOTION_QUERY", error.localizedDescription)
          return
        }
        guard let activities = activities, !activities.isEmpty else {
          promise.resolve([[String: Any]]())
          return
        }
        let toMsValue = to.timeIntervalSince1970 * 1000.0
        var segments: [[String: Any]] = []
        segments.reserveCapacity(activities.count)
        for index in activities.indices {
          let activity = activities[index]
          let rawStartMs = activity.startDate.timeIntervalSince1970 * 1000.0
          // CoreMotion can return a first sample that predates the requested
          // window — clamp only the first segment's start so it never reports
          // as starting before what was asked for.
          let startMs = index == 0 ? max(rawStartMs, fromMs) : rawStartMs
          let endMs: Double = (index + 1 < activities.count)
            ? activities[index + 1].startDate.timeIntervalSince1970 * 1000.0
            : toMsValue
          segments.append([
            "type": motionActivityType(activity),
            "confidence": motionConfidence(activity.confidence),
            "startMs": startMs,
            "endMs": endMs
          ])
        }
        promise.resolve(segments)
      }
    }

    // Pedometer distance + steps over [fromMs, toMs]. `distance` covers walking &
    // running only (nil for cycling, and always nil on the Simulator), so
    // `distanceKm` is null when CoreMotion has no distance estimate. Resolves null
    // when the device has no pedometer at all.
    AsyncFunction("queryPedometerDistance") { (fromMs: Double, toMs: Double, promise: Promise) in
      guard CMPedometer.isStepCountingAvailable() else {
        promise.resolve(nil)
        return
      }
      let pedometer = CMPedometer()
      let from = Date(timeIntervalSince1970: fromMs / 1000.0)
      let to = Date(timeIntervalSince1970: toMs / 1000.0)
      pedometer.queryPedometerData(from: from, to: to) { [pedometer] data, error in
        _ = pedometer // keep the pedometer alive until the query completes
        guard let data = data, error == nil else {
          promise.resolve(nil)
          return
        }
        var result: [String: Any] = [
          "steps": data.numberOfSteps.intValue
        ]
        if let distance = data.distance {
          result["distanceKm"] = distance.doubleValue / 1000.0
        } else {
          result["distanceKm"] = NSNull()
        }
        promise.resolve(result)
      }
    }

    // Headless driving-route distance between two coordinates via MapKit. Used to
    // estimate automotive trip distance from CLVisit endpoints (CMPedometer gives
    // no cycling/automotive distance). Never rejects — resolves null on any
    // failure (throttling, no route, offline) so the caller falls back to an
    // estimate. MapKit throttles MKDirections; treat null as "try an estimate".
    AsyncFunction("routeDistanceKm") { (fromLat: Double, fromLng: Double, toLat: Double, toLng: Double, promise: Promise) in
      let source = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: fromLat, longitude: fromLng)))
      let destination = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: toLat, longitude: toLng)))
      let request = MKDirections.Request()
      request.source = source
      request.destination = destination
      request.transportType = .automobile
      request.requestsAlternateRoutes = false
      let directions = MKDirections(request: request)
      directions.calculate { [directions] response, error in
        _ = directions // keep the request alive until it completes
        guard error == nil, let route = response?.routes.first else {
          promise.resolve(nil)
          return
        }
        promise.resolve([
          "distanceKm": route.distance / 1000.0,
          "durationMin": route.expectedTravelTime / 60.0
        ])
      }
    }

    // Begin monitoring significant place arrivals/departures (CLVisit). Only
    // starts when location authorization is `authorizedAlways`; returns whether
    // monitoring actually started. Visits are persisted to a capped ring buffer
    // (see VeridianVisitTracker) as they arrive, including while the app is
    // suspended. Runs on main to touch CLLocationManager safely.
    AsyncFunction("startVisitMonitoring") { () -> Bool in
      return VeridianVisitTracker.shared.startMonitoring()
    }
    .runOnQueue(.main)

    // Return persisted visits whose arrival OR departure is at/after `sinceMs`.
    AsyncFunction("getRecentVisits") { (sinceMs: Double) -> [[String: Any]] in
      return VeridianVisitTracker.shared.recentVisits(sinceMs: sinceMs)
    }
  }
}

// MARK: - Visit tracking singleton
//
// A single long-lived CLLocationManager + delegate, owned by the module process
// (not tied to a Module instance, which can be recreated). It persists each
// CLVisit into UserDefaults as a capped ring buffer so getRecentVisits can read
// visits that arrived while JS wasn't running.

final class VeridianVisitTracker: NSObject, CLLocationManagerDelegate {
  static let shared = VeridianVisitTracker()

  private static let defaultsKey = "veridian.visits"
  private static let maxEntries = 50

  private var locationManager: CLLocationManager?

  private override init() {
    super.init()
  }

  // Lazily create the CLLocationManager and wire the delegate. Must be called on
  // the main thread so visit callbacks are delivered on the main run loop.
  func prepare() {
    if locationManager == nil {
      let manager = CLLocationManager()
      manager.delegate = self
      locationManager = manager
    }
  }

  // Start visit monitoring iff location is authorized "Always". Must run on main.
  func startMonitoring() -> Bool {
    prepare()
    guard let manager = locationManager else {
      return false
    }
    guard manager.authorizationStatus == .authorizedAlways else {
      return false
    }
    manager.startMonitoringVisits()
    return true
  }

  // Filter persisted visits by the contract: departureMs >= sinceMs OR arrivalMs >= sinceMs —
  // EXCEPT departureMs == -1, which is not "before sinceMs", it's the sentinel
  // for "still ongoing" (CLVisit.departureDate == .distantFuture per
  // msOrSentinel below). An ongoing visit must always be surfaced regardless
  // of sinceMs, since its true departure time is unknown and could be well
  // after the query window's start.
  func recentVisits(sinceMs: Double) -> [[String: Any]] {
    let stored = UserDefaults.standard.array(forKey: Self.defaultsKey) as? [[String: Any]] ?? []
    return stored.filter { entry in
      let arrival = (entry["arrivalMs"] as? Double) ?? -1
      let departure = (entry["departureMs"] as? Double) ?? -1
      if departure == -1 { return true }
      return departure >= sinceMs || arrival >= sinceMs
    }
  }

  // MARK: CLLocationManagerDelegate

  func locationManager(_ manager: CLLocationManager, didVisit visit: CLVisit) {
    let entry: [String: Any] = [
      "lat": visit.coordinate.latitude,
      "lng": visit.coordinate.longitude,
      "arrivalMs": Self.msOrSentinel(visit.arrivalDate),
      "departureMs": Self.msOrSentinel(visit.departureDate)
    ]
    var stored = UserDefaults.standard.array(forKey: Self.defaultsKey) as? [[String: Any]] ?? []
    stored.append(entry)
    if stored.count > Self.maxEntries {
      stored = Array(stored.suffix(Self.maxEntries))
    }
    UserDefaults.standard.set(stored, forKey: Self.defaultsKey)
  }

  // CLVisit uses Date.distantPast (arrived before monitoring began) and
  // Date.distantFuture (still there) for open-ended visits. Both map to the -1
  // sentinel so JS never sees an absurd epoch value.
  private static func msOrSentinel(_ date: Date) -> Double {
    if date == Date.distantPast || date == Date.distantFuture {
      return -1
    }
    return date.timeIntervalSince1970 * 1000.0
  }
}

// MARK: - Mapping helpers

private func mapMotionAuthStatus(_ status: CMAuthorizationStatus) -> String {
  switch status {
  case .authorized:
    return "granted"
  case .denied:
    return "denied"
  case .restricted:
    return "restricted"
  case .notDetermined:
    return "undetermined"
  @unknown default:
    return "undetermined"
  }
}

// Collapse a CMMotionActivity's boolean flags to a single type. Multiple flags
// can be true (e.g. stationary + automotive at a red light); moving modes win
// over stationary so a trip isn't split by stops. No true flag => "unknown".
private func motionActivityType(_ activity: CMMotionActivity) -> String {
  if activity.automotive {
    return "automotive"
  }
  if activity.cycling {
    return "cycling"
  }
  if activity.running {
    return "running"
  }
  if activity.walking {
    return "walking"
  }
  if activity.stationary {
    return "stationary"
  }
  return "unknown"
}

private func motionConfidence(_ confidence: CMMotionActivityConfidence) -> String {
  switch confidence {
  case .low:
    return "low"
  case .medium:
    return "medium"
  case .high:
    return "high"
  @unknown default:
    return "low"
  }
}
