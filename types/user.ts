export interface UserProfile {
  id: string;                    // UUID, PK, references auth.users
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;            // ISO 8601 string from Supabase
  baseline_kg?: number | null;   // Annual kg CO₂e from onboarding carbon calculator
}

export interface AiInsight {
  id: string;
  user_id: string;
  content: string;
  suggestion: string;
  generated_at: string;
  expires_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  daily_reminder_enabled: boolean;
  reminder_time: string;         // TIME as string e.g. "20:00:00"
  streak_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}
