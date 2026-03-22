import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { colors, spacing, typography } from '@/lib/theme';
import type { Achievement, AchievementCriteriaType } from '@/types/achievement';

// ─── Badge Icon SVG Paths ────────────────────────────────────────────────────
const BADGE_ICONS: Record<AchievementCriteriaType, string> = {
  first_log:
    'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z',
  streak_days:
    'M13 2.05V2C13 1.45 12.55 1 12 1C11.45 1 11 1.45 11 2V2.05C7.06 2.52 4 5.86 4 9.94C4 13.33 6.26 16.17 9.33 17.21L8.5 19H15.5L14.67 17.21C17.74 16.17 20 13.33 20 9.94C20 5.86 16.94 2.52 13 2.05ZM12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z',
  reduction_pct:
    'M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z',
  total_entries:
    'M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 19 20.1 19 19V5C19 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z',
};

// ─── Props ───────────────────────────────────────────────────────────────────
interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  size?: number;
}

// ─── AchievementBadge Component ──────────────────────────────────────────────
export default function AchievementBadge({
  achievement,
  earned,
  size = 56,
}: AchievementBadgeProps) {
  const circleColor = earned ? colors.primary : (colors.textTertiary ?? '#9CA3AF');
  const iconPath = BADGE_ICONS[achievement.criteria_type];

  return (
    <View style={{ alignItems: 'center', marginRight: spacing.sm }}>
      <Svg width={size} height={size} viewBox="0 0 56 56">
        {/* Background circle */}
        <Circle cx={28} cy={28} r={26} fill={circleColor} />

        {/* Badge icon — centered 24×24 icon inside 56×56 circle */}
        <G transform="translate(16, 16)">
          <Path
            d={iconPath}
            fill={colors.surface}
            opacity={earned ? 1 : 0.5}
          />
        </G>

        {/* Lock overlay for locked badges */}
        {!earned && (
          <G transform="translate(16, 18) scale(0.8)">
            <Path
              d="M18 8V6A6 6 0 000 12H2A4 4 0 014 8ZM20 10H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2zm-8 7a2 2 0 110-4 2 2 0 010 4z"
              fill={colors.surface}
              opacity={0.7}
            />
          </G>
        )}
      </Svg>

      {/* Badge name label */}
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          color: earned ? colors.textPrimary : colors.textSecondary,
          textAlign: 'center',
          marginTop: 4,
          maxWidth: size + spacing.md,
        }}
      >
        {achievement.name}
      </Text>
    </View>
  );
}
