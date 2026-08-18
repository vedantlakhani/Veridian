/**
 * lib/recapNotification.ts — the weekly recap local notification
 *
 * Schedules a single repeating Sunday-evening nudge ("Your week is ready")
 * that deep-invites the user into the Weekly Recap story (NORTH_STAR.md §8
 * pattern 9). Isolated here (not in useNotifications) so the no-duplicate logic
 * is unit-testable without mocking the whole notifications hook graph.
 *
 * DUPLICATE GUARD (critical): a STABLE identifier + a cancel-by-identifier
 * before every (re)schedule means repeated app foregrounds — which is when the
 * caller runs this — can NEVER stack duplicate weekly notifications. See
 * __tests__/lib/recapNotification.test.ts.
 *
 * PERMISSION GATE: only schedules when notification permission is ALREADY
 * granted (mirrors notifyStreakMilestone) — never prompts on its own.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

/** Stable id — reused on every reschedule so there is only ever one. */
export const WEEKLY_RECAP_IDENTIFIER = 'veridian-weekly-recap';

// Sunday 18:30 local. expo-notifications weekday is 1–7 with 1 = Sunday.
const RECAP_WEEKDAY = 1;
const RECAP_HOUR = 18;
const RECAP_MINUTE = 30;

export async function scheduleWeeklyRecapNotification(): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Veridian Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  // Cancel the previous instance BEFORE scheduling the new one — the stable
  // identifier makes this idempotent, so calling on every foreground is safe.
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_RECAP_IDENTIFIER);
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_RECAP_IDENTIFIER,
    content: {
      title: 'Your week is ready',
      body: 'See your carbon story for the week.',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.CALENDAR,
      weekday: RECAP_WEEKDAY,
      hour: RECAP_HOUR,
      minute: RECAP_MINUTE,
      repeats: true,
    },
  });
}
