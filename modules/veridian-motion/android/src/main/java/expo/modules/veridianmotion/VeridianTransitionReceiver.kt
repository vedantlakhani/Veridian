package expo.modules.veridianmotion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import com.google.android.gms.location.ActivityTransitionResult
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * Persistent, SharedPreferences-backed ring buffer of raw Activity Recognition
 * transition events. Shared by [VeridianTransitionReceiver] (writer, may run in a
 * freshly cold-started process) and [VeridianMotionModule] (reader). Every access
 * is guarded by [lock] so the receiver appending while JS reads never corrupts the
 * JSON. Kept process-local (SharedPreferences is per-process); the manifest-declared
 * receiver runs in the app's default process, so a single JVM lock is sufficient.
 */
internal object VeridianTransitionStore {
  const val PREFS_NAME = "veridian.motion"
  const val KEY = "veridian.transitions"
  private const val MAX_EVENTS = 500

  private val lock = Any()

  /** Append one transition event, trimming the oldest so at most [MAX_EVENTS] remain. */
  fun append(context: Context, activityType: Int, transitionType: Int, timestampMs: Long) {
    synchronized(lock) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val array = readArray(prefs.getString(KEY, null))

      val event = JSONObject()
      event.put("activityType", activityType)
      event.put("transitionType", transitionType)
      event.put("timestampMs", timestampMs)
      array.put(event)

      // Trim from the front (oldest) once over the cap.
      val trimmed = if (array.length() > MAX_EVENTS) {
        val start = array.length() - MAX_EVENTS
        val next = JSONArray()
        for (i in start until array.length()) {
          next.put(array.get(i))
        }
        next
      } else {
        array
      }

      prefs.edit().putString(KEY, trimmed.toString()).apply()
    }
  }

  /** Snapshot every stored event as ordered triples. Empty when nothing recorded yet. */
  fun readEvents(context: Context): List<TransitionEvent> {
    synchronized(lock) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val array = readArray(prefs.getString(KEY, null))
      val events = ArrayList<TransitionEvent>(array.length())
      for (i in 0 until array.length()) {
        val obj = array.optJSONObject(i) ?: continue
        events.add(
          TransitionEvent(
            activityType = obj.optInt("activityType", -1),
            transitionType = obj.optInt("transitionType", -1),
            timestampMs = obj.optLong("timestampMs", 0L)
          )
        )
      }
      return events
    }
  }

  private fun readArray(raw: String?): JSONArray {
    if (raw.isNullOrEmpty()) {
      return JSONArray()
    }
    return try {
      JSONArray(raw)
    } catch (_: JSONException) {
      // Corrupt buffer (should never happen under the lock) — start clean rather than crash.
      JSONArray()
    }
  }

  data class TransitionEvent(
    val activityType: Int,
    val transitionType: Int,
    val timestampMs: Long
  )
}

/**
 * Receives ActivityTransition broadcasts fired by Play Services against the
 * PendingIntent registered in [VeridianMotionModule.startTransitionMonitoring].
 * Manifest-registered so it works with the app process dead.
 */
class VeridianTransitionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (!ActivityTransitionResult.hasResult(intent)) {
      return
    }
    val result = ActivityTransitionResult.extractResult(intent) ?: return

    // elapsedRealTimeNanos is measured against the monotonic "time since boot"
    // clock (SystemClock.elapsedRealtime), NOT wall-clock. Convert to epoch ms by
    // anchoring to the current boot instant:
    //   bootEpochMs = System.currentTimeMillis() - SystemClock.elapsedRealtime()
    //   eventEpochMs = bootEpochMs + nanos / 1_000_000
    // Compute the anchor ONCE per broadcast so every event in this batch shares a
    // consistent reference (both clocks are sampled together).
    val bootEpochMs = System.currentTimeMillis() - SystemClock.elapsedRealtime()

    for (event in result.transitionEvents) {
      val timestampMs = bootEpochMs + event.elapsedRealTimeNanos / 1_000_000L
      VeridianTransitionStore.append(
        context = context,
        activityType = event.activityType,
        transitionType = event.transitionType,
        timestampMs = timestampMs
      )
    }
  }
}
