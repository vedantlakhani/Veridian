/**
 * lib/tripNotifications.ts — set-math and notification delivery for the
 * batched "trips spotted" flow.
 *
 * ARCHITECTURE NOTE: selectNewlyNotifiableKeys is a PURE function — no React,
 * no Supabase, no AsyncStorage, no native module. hooks/useTrips.ts owns the
 * stateful side (reading/persisting the notified-keys set); this file just
 * answers "of the trips that landed needs_confirmation in this refresh pass,
 * which have we not already notified the user about?" so the set difference is
 * unit-testable in isolation. fireNotification is the one side-effecting
 * exception — it lives here (rather than inline in the hook) so its
 * granted/no-permission/error branches are testable the same way, by mocking
 * expo-notifications (see __tests__/lib/tripNotifications.test.ts, mirroring
 * lib/recapNotification.ts's pattern).
 *
 * WHY IT EXISTS: refresh() can run many times over a trip's life (every app
 * foreground, plus the mount pass) and re-detect the same real-world trip via
 * its stable client_trip_key. Without a persisted "already notified" set, a
 * user would get a fresh "1 trip spotted" ping on every refresh for a trip they
 * haven't confirmed yet. This keeps the notification a one-shot per trip.
 */

import * as Notifications from 'expo-notifications';

/**
 * Fires a local notification best-effort. Returns true ONLY when
 * scheduleNotificationAsync was actually invoked and resolved successfully —
 * false when permission isn't granted or anything throws. Callers that just
 * want a fire-and-forget ping (car auto-log, walk/cycle celebration) can
 * ignore the return value; callers that gate persisted state on the
 * notification actually existing (the batched "trips spotted" path in
 * hooks/useTrips.ts) MUST check it — otherwise a trip can be marked notified
 * with no notification ever having been shown (e.g. permission not yet
 * granted), permanently suppressing it even if permission is granted later.
 */
export async function fireNotification(title: string, body: string): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return false;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
    return true;
  } catch {
    // Notifications are best-effort — never block trip sync on them.
    return false;
  }
}

/**
 * Given the client_trip_keys of trips that just became needs_confirmation this
 * pass and the set already notified in a prior pass, return the keys we have NOT
 * notified for yet — order-preserving and de-duplicated within the input.
 * useTrips fires exactly ONE notification when the result is non-empty (count =
 * result.length) and folds the returned keys into the notified set so a later
 * refresh re-detecting the same trips doesn't re-notify.
 */
export function selectNewlyNotifiableKeys(
  candidateKeys: readonly string[],
  alreadyNotified: ReadonlySet<string>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of candidateKeys) {
    if (alreadyNotified.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
