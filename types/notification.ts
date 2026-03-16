// Re-export notification types from user.ts for convenience
export type { NotificationPreferences, PushToken } from './user';

export interface ScheduledNotification {
  id: string;
  userId: string;
  type: 'daily_reminder' | 'streak_milestone';
  scheduledFor: Date;
  sent: boolean;
}
