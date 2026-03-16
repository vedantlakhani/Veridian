// Barrel export for all domain types
export type {
  UserProfile,
  AiInsight,
  NotificationPreferences,
  PushToken,
  AuditLog,
} from './user';

export type {
  EmissionCategory,
  EmissionFactor,
  EmissionEntry,
  EmissionEntryWithFactor,
  DailySummary,
  WeeklySummary,
  WeeklyBreakdown,
} from './emission';

export { DAILY_CARBON_BUDGET_KG, TARGET_CARBON_BUDGET_KG } from './emission';

export type {
  Challenge,
  ChallengeParticipant,
  ChallengeParticipantWithProfile,
  LeaderboardEntry,
} from './challenge';

export type {
  AchievementCriteriaType,
  Achievement,
  UserAchievement,
  UserAchievementWithDetails,
} from './achievement';

export type { ScheduledNotification } from './notification';
