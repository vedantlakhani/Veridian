export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  start_date: string;            // DATE as ISO date string
  end_date: string;
  target_reduction_pct: number;  // e.g. 10.00 = 10%
  invite_code: string;
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  baseline_kg: number | null;
  current_kg: number | null;
  rank: number | null;
}

// Joined type for leaderboard display
export interface ChallengeParticipantWithProfile extends ChallengeParticipant {
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Computed leaderboard entry
export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  baseline_kg: number;
  current_kg: number;
  reduction_pct: number;
  rank: number;
}
