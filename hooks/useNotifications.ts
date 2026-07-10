import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

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
      body: 'Track your impact and keep your streak going.',
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
    title: 'Morning check-in 🌿',
    body: "What's fuelling your day? Log breakfast in two taps.",
    hour: 8,
    minute: 30,
  },
  {
    identifier: 'veridian-meal-lunch',
    title: 'Midday moment 🥗',
    body: 'Log lunch and keep your carbon story going.',
    hour: 12,
    minute: 30,
  },
  {
    identifier: 'veridian-meal-dinner',
    title: 'Evening wind-down 🍽️',
    body: 'Dinner time — a quick log keeps your streak alive.',
    hour: 19,
    minute: 0,
  },
  {
    identifier: 'veridian-streak-nudge',
    title: "Don't break your streak 🔥",
    body: 'Log just one thing before midnight to keep it going.',
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
 * Fires an immediate (trigger: null) notification celebrating a streak milestone.
 * Only sends if notification permission is already granted.
 */
export async function notifyStreakMilestone(days: number): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${days}-day streak!`,
      body: `You've logged for ${days} days in a row. Keep it up!`,
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
