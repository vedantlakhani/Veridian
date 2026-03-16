export type AchievementCriteriaType =
  | 'first_log'
  | 'streak_days'
  | 'reduction_pct'
  | 'total_entries';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: AchievementCriteriaType;
  criteria_value: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

// Joined type for display
export interface UserAchievementWithDetails extends UserAchievement {
  achievements: Achievement;
}
