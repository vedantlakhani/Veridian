package expo.modules.veridianmotion

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.DetectedActivity
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// MARK: - VeridianMotionModule (Android)
//
// Android counterpart to the iOS Swift module. It exposes the SAME JS function
// names so index.ts stays one surface — but Android's sensing model is inverted:
//
//   iOS  : CoreMotion logs activity for ~7 days with NO registration, and we read
//          it retroactively on app open.
//   Android: there is NO retroactive OS history. The Activity Recognition
//          Transition API only records transitions from the moment we register
//          (startTransitionMonitoring) forward. queryActivityHistory therefore
//          replays events WE persisted since registration, not an OS backlog.
//
// This module never shows a permission dialog: the ACTIVITY_RECOGNITION runtime
// request is made JS-side via PermissionsAndroid (a later stage). It only reads the
// current grant state and, when granted, registers/queries transitions.
//
// Android v1 gaps (queryPedometerDistance / routeDistanceKm / startVisitMonitoring
// / getRecentVisits) resolve null / null / false / [] respectively. The JS trip
// pipeline's straight-line estimate fallback plus the needs_confirmation gate
// already cover these, so no Platform.OS branching is required in JS.

class VeridianMotionModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("VeridianMotion")

    // Play Services present AND API >= 29. Android v1 targets API 29+ so
    // ACTIVITY_RECOGNITION is a proper runtime permission with clean grant
    // semantics; below 29 it is an install-time permission and the transition API
    // uses a different (Play-services) permission we deliberately don't support in v1.
    AsyncFunction("isActivityAvailable") {
      val playServices = GoogleApiAvailability.getInstance()
        .isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS
      playServices && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
    }

    // Maps checkSelfPermission(ACTIVITY_RECOGNITION) to the shared JS vocabulary.
    //
    // Android exposes no "notDetermined" state and no way for a HEADLESS module to
    // tell a never-asked user apart from a denied one (shouldShowRequestPermissionRationale
    // needs an Activity plus a prior in-process request, neither observable here).
    // So the mapping is deliberately coarse:
    //   PERMISSION_GRANTED -> "granted"   (also the install-time result on API < 29)
    //   otherwise          -> "undetermined"
    // We never emit "denied"/"restricted": the granted-vs-denied decision is owned
    // by the JS PermissionsAndroid layer, which CAN observe the request lifecycle.
    AsyncFunction("getMotionPermission") {
      val granted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACTIVITY_RECOGNITION
      ) == PackageManager.PERMISSION_GRANTED
      if (granted) "granted" else "undetermined"
    }

    // Register for ENTER/EXIT transitions on the moving modes + STILL. Returns false
    // when the permission is missing (never throws, never prompts). Idempotent:
    // requestActivityTransitionUpdates with the same PendingIntent identity replaces
    // the previous registration rather than stacking a second one.
    //
    // NOTE: Android-only surface — there is no iOS counterpart (iOS records history
    // without registration). Callers wire this in during the JS permission stage.
    AsyncFunction("startTransitionMonitoring") { promise: Promise ->
      val granted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACTIVITY_RECOGNITION
      ) == PackageManager.PERMISSION_GRANTED
      if (!granted) {
        promise.resolve(false)
        return@AsyncFunction
      }

      val transitions = ArrayList<ActivityTransition>()
      for (type in MONITORED_ACTIVITIES) {
        transitions.add(
          ActivityTransition.Builder()
            .setActivityType(type)
            .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
            .build()
        )
        transitions.add(
          ActivityTransition.Builder()
            .setActivityType(type)
            .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
            .build()
        )
      }

      val request = ActivityTransitionRequest(transitions)
      // EXPLICIT intent targeting the receiver class — the manifest receiver has no
      // intent-filter, so an action-based (implicit) broadcast would never reach it.
      // Explicit-component delivery works regardless of filters and, because the
      // component is identical every call, FLAG_UPDATE_CURRENT reuses the same
      // PendingIntent — making re-registration idempotent.
      //
      // FLAG_MUTABLE (NOT FLAG_IMMUTABLE) is required here: Play Services delivers
      // ActivityTransitionResult via PendingIntent "fill-in" — it adds the result
      // extras to a COPY of the Intent stored in this PendingIntent at broadcast
      // time. FLAG_IMMUTABLE disables fill-in entirely, so the extras never attach
      // and VeridianTransitionReceiver's ActivityTransitionResult.hasResult(intent)
      // would always be false — zero transition events would ever reach
      // VeridianTransitionStore, silently. This is safe to make mutable because:
      // the receiver is exported=false (only this app / Play Services can target
      // it), the Intent is explicit (component fixed to VeridianTransitionReceiver,
      // not resolved by action), and only Play Services (holding this exact
      // PendingIntent) ever fills it in — there is no attacker-controlled sender
      // that can inject extras through it.
      val intent = Intent(context, VeridianTransitionReceiver::class.java)
      val pendingIntent = PendingIntent.getBroadcast(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
      )

      ActivityRecognition.getClient(context)
        .requestActivityTransitionUpdates(request, pendingIntent)
        .addOnSuccessListener { promise.resolve(true) }
        .addOnFailureListener { e ->
          promise.reject("ERR_MOTION_REGISTER", e.localizedMessage ?: "transition registration failed", e)
        }
    }

    // Reconstruct activity segments over [fromMs, toMs] from the transitions WE
    // persisted since registration (Android has no OS backlog — see class header).
    // ENTER of an activity opens a segment; the matching EXIT, or the next ENTER of
    // a different activity, closes it. A still-open segment at the end is closed at
    // toMs. Segments are then clipped to the query window.
    //
    // Confidence is uniformly "medium": ARTA transitions carry NO confidence value
    // (unlike CoreMotion's per-sample confidence), so there is nothing to map.
    AsyncFunction("queryActivityHistory") { fromMs: Double, toMs: Double ->
      val events = VeridianTransitionStore.readEvents(context)
        .filter { it.transitionType == ActivityTransition.ACTIVITY_TRANSITION_ENTER ||
                  it.transitionType == ActivityTransition.ACTIVITY_TRANSITION_EXIT }
        .sortedBy { it.timestampMs }

      val segments = ArrayList<Map<String, Any>>()
      var openType: Int? = null
      var openStartMs: Long = 0L

      fun closeSegment(endMs: Long) {
        val type = openType ?: return
        val mapped = mapActivityType(type)
        if (mapped != null && endMs > openStartMs) {
          segments.add(
            mapOf(
              "type" to mapped,
              "confidence" to "medium",
              "startMs" to openStartMs.toDouble(),
              "endMs" to endMs.toDouble()
            )
          )
        }
        openType = null
      }

      for (event in events) {
        when (event.transitionType) {
          ActivityTransition.ACTIVITY_TRANSITION_ENTER -> {
            if (openType != null && openType != event.activityType) {
              closeSegment(event.timestampMs)
            }
            if (openType == null) {
              openType = event.activityType
              openStartMs = event.timestampMs
            }
          }
          ActivityTransition.ACTIVITY_TRANSITION_EXIT -> {
            if (openType == event.activityType) {
              closeSegment(event.timestampMs)
            }
          }
        }
      }
      // Close any segment still open at the end of the query window.
      if (openType != null) {
        closeSegment(toMs.toLong())
      }

      // Clip to [fromMs, toMs]; drop segments with no overlap.
      segments.mapNotNull { seg ->
        val start = (seg["startMs"] as Double)
        val end = (seg["endMs"] as Double)
        val clippedStart = maxOf(start, fromMs)
        val clippedEnd = minOf(end, toMs)
        if (clippedEnd <= clippedStart) {
          null
        } else {
          mapOf(
            "type" to (seg["type"] as String),
            "confidence" to (seg["confidence"] as String),
            "startMs" to clippedStart,
            "endMs" to clippedEnd
          )
        }
      }
    }

    // --- Documented Android v1 gaps -----------------------------------------
    // These mirror the iOS signatures so index.ts calls the same names, but Android
    // has no equivalent free signal in v1. The JS estimate fallback + the
    // needs_confirmation gate handle the absence.

    // No CMPedometer-equivalent distance we can read retroactively without extra
    // sensors/permission. Steps could come from Health Connect later; null for now.
    AsyncFunction("queryPedometerDistance") { _: Double, _: Double, promise: Promise ->
      promise.resolve(null)
    }

    // No MapKit-equivalent free routing engine bundled; JS uses a straight-line estimate.
    AsyncFunction("routeDistanceKm") { _: Double, _: Double, _: Double, _: Double, promise: Promise ->
      promise.resolve(null)
    }

    // CLVisit has no Android analog we use in v1 (would need geofencing + background
    // location, which §4 forbids). Never starts; report that honestly.
    AsyncFunction("startVisitMonitoring") {
      false
    }

    // No visit store on Android v1.
    AsyncFunction("getRecentVisits") { _: Double ->
      emptyList<Map<String, Any>>()
    }
  }

  companion object {
    // The moving modes we care about, plus STILL so a trip isn't left open across a
    // stop. UNKNOWN/TILTING/ON_FOOT are intentionally excluded (ON_FOOT is a
    // superset of WALKING/RUNNING and would double-fire).
    private val MONITORED_ACTIVITIES = intArrayOf(
      DetectedActivity.IN_VEHICLE,
      DetectedActivity.ON_BICYCLE,
      DetectedActivity.WALKING,
      DetectedActivity.RUNNING,
      DetectedActivity.STILL
    )

    // Map ARTA's DetectedActivity codes to the shared ActivityType vocabulary.
    // STILL -> "stationary" (parity with iOS, which also emits stationary segments).
    // Anything unmapped returns null and is dropped from the reconstruction.
    private fun mapActivityType(activityType: Int): String? = when (activityType) {
      DetectedActivity.IN_VEHICLE -> "automotive"
      DetectedActivity.ON_BICYCLE -> "cycling"
      DetectedActivity.WALKING -> "walking"
      DetectedActivity.RUNNING -> "running"
      DetectedActivity.STILL -> "stationary"
      else -> null
    }
  }
}
