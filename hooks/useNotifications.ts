import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { scheduleWeeklyRecapNotification } from '@/lib/recapNotification';

// ─── scheduleDailyReminder ────────────────────────────────────────────────
/**
 * Cancels all existing scheduled notifications and schedules a new
 * DAILY reminder at the given hour and minute (local time).
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Veridian Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Log your carbon today',
      body: 'A couple of taps keeps your momentum moving.',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// ─── scheduleMealNotifications ────────────────────────────────────────────
/**
 * Schedules 4 daily notifications (breakfast, lunch, dinner, streak nudge).
 * Cancels any existing ones first by identifier so the user's custom daily
 * reminder (scheduled separately) is left untouched.
 */
const MEAL_NOTIFICATIONS: {
  identifier: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
}[] = [
  {
    identifier: 'veridian-meal-breakfast',
    title: 'Morning check-in',
    body: "What's fuelling your day? Log breakfast in two taps.",
    hour: 8,
    minute: 30,
  },
  {
    identifier: 'veridian-meal-lunch',
    title: 'Midday moment',
    body: 'Log lunch and keep your carbon story going.',
    hour: 12,
    minute: 30,
  },
  {
    identifier: 'veridian-meal-dinner',
    title: 'Evening wind-down',
    body: 'Dinner time — a quick log keeps your streak alive.',
    hour: 19,
    minute: 0,
  },
  {
    identifier: 'veridian-momentum-nudge',
    title: 'Evening nudge',
    body: 'Log just one thing before midnight to keep your momentum building.',
    hour: 21,
    minute: 0,
  },
];

export async function scheduleMealNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Veridian Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  // Cancel existing meal notifications by identifier (once, before scheduling all 4)
  await Promise.all(
    MEAL_NOTIFICATIONS.map((n) =>
      Notifications.cancelScheduledNotificationAsync(n.identifier),
    ),
  );

  for (const n of MEAL_NOTIFICATIONS) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.identifier,
      content: { title: n.title, body: n.body },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: n.hour,
        minute: n.minute,
      },
    });
  }
}

// ─── notifyStreakMilestone ────────────────────────────────────────────────
/**
 * Fires an immediate (trigger: null) notification celebrating a consistency
 * milestone. Momentum framing, zero loss-aversion (NORTH_STAR.md §8 pattern
 * 5 "Momentum, Not Streaks") — "N days of momentum, nice rhythm", never
 * "don't break your streak". Only sends if notification permission is
 * already granted. (Name kept for the call site in useEmissionEntries.ts;
 * the underlying consecutive-day count still comes from the server-side
 * streak computation there.)
 */
export async function notifyStreakMilestone(days: number): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${days} days of momentum`,
      body: `You've kept a nice rhythm going for ${days} days straight.`,
    },
    trigger: null,
  });
}

// ─── registerPushToken ────────────────────────────────────────────────────
/**
 * Gets the Expo push token and upserts it into the push_tokens table.
 * No-ops if permission is not granted or projectId is unavailable.
 */
export async function registerPushToken(userId: string): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    (Constants?.easConfig as { projectId?: string } | undefined)?.projectId;
  if (!projectId) return;
  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    // Push tokens require the "aps-environment" entitlement, which free
    // personal-team dev builds can't have. No-op until a paid Apple
    // Developer account is used (EAS Build / production).
    return;
  }
  await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform: Platform.OS },
    { onConflict: 'user_id' }
  );
}

// ─── Internal: scheduleIfEnabled ─────────────────────────────────────────
/**
 * Reads notification_preferences for the user, schedules daily reminder if
 * enabled, and registers push token.
 */
async function scheduleIfEnabled(userId: string): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    if (requested !== 'granted') return;
  }

  const { data } = await supabase
    .from('notification_preferences')
    .select('daily_reminder_enabled, reminder_time')
    .eq('user_id', userId)
    .single();

  if (data?.daily_reminder_enabled && data.reminder_time) {
    const [h, m] = (data.reminder_time as string).split(':').map(Number);
    // NOTE: scheduleDailyReminder cancels ALL scheduled notifications, so it
    // must run BEFORE scheduleMealNotifications (which cancels by identifier).
    await scheduleDailyReminder(h, m);
    await scheduleMealNotifications();
  }

  // Weekly recap nudge. MUST run AFTER scheduleDailyReminder (which calls
  // cancelAllScheduledNotificationsAsync) so it isn't wiped; its own stable
  // identifier + cancel-before-schedule makes this foreground-safe (no
  // duplicate stacking). Permission is already granted at this point.
  await scheduleWeeklyRecapNotification();

  await registerPushToken(userId);
}

// ─── useNotifications hook ────────────────────────────────────────────────
/**
 * React hook — on mount (when userId is defined) requests notification
 * permissions, reads notification_preferences, schedules daily reminder if
 * enabled, and registers push token. Re-runs whenever the app returns to
 * the foreground.
 */
export function useNotifications(userId: string | undefined): void {
  useEffect(() => {
    if (!userId) return;
    void scheduleIfEnabled(userId);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void scheduleIfEnabled(userId);
    });
    return () => sub.remove();
  }, [userId]);
}
