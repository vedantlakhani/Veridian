import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, spacing, motion, shadows } from '@/lib/theme';
import type { Achievement, AchievementCriteriaType } from '@/types/achievement';

// ─── Badge Icon SVG Paths (24×24 grid) ──────────────────────────────────────
const BADGE_ICONS: Record<string, string> = {
  first_log:
    'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z',
  streak_days:
    'M13 2.05V2C13 1.45 12.55 1 12 1C11.45 1 11 1.45 11 2V2.05C7.06 2.52 4 5.86 4 9.94C4 13.33 6.26 16.17 9.33 17.21L8.5 19H15.5L14.67 17.21C17.74 16.17 20 13.33 20 9.94C20 5.86 16.94 2.52 13 2.05ZM12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z',
  reduction_pct:
    'M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z',
  total_entries:
    'M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 19 20.1 19 19V5C19 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z',
};

// Fallback for unknown criteria — a simple medal star
const FALLBACK_ICON =
  'M12 2L14.4 8.4L21 9.2L16.2 13.6L17.6 20.4L12 17L6.4 20.4L7.8 13.6L3 9.2L9.6 8.4L12 2Z';

interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  size?: number;
  /** Spring pop for newly-earned badges */
  justEarned?: boolean;
  /** Progress hint for locked badges, e.g. "3 of 7 days" */
  progressHint?: string;
}

export default function AchievementBadge({
  achievement,
  earned,
  size = 40,
  justEarned = false,
  progressHint,
}: AchievementBadgeProps) {
  const iconPath =
    BADGE_ICONS[achievement.criteria_type as AchievementCriteriaType] ?? FALLBACK_ICON;

  // Presence stays a gentle fade-in rather than a bouncy "prize" pop — this
  // shelf is a quiet personal record, not a trophy case.
  const pop = useSharedValue(justEarned ? 0.85 : 1);

  useEffect(() => {
    if (justEarned) {
      pop.value = withSpring(1, motion.springGentle);
    }
  }, [justEarned, pop]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <View style={[styles.wrap, { marginRight: spacing.sm }]}>
      <Animated.View style={[earned && styles.earnedLift, popStyle]}>
        <Svg width={size} height={size} viewBox="0 0 56 56">
          {/* Background circle — muted tint for earned, dim surface for
              locked. Deliberately not a bright/saturated fill: this is a
              record, not a medal. */}
          <Circle
            cx={28}
            cy={28}
            r={26}
            fill={earned ? colors.primaryContainer : colors.surfaceElevated}
            stroke={earned ? colors.primaryLight : colors.border}
            strokeWidth={1}
          />

          {/* Badge icon — centered 24×24 inside the 56×56 circle */}
          <G transform="translate(16, 16)">
            <Path
              d={iconPath}
              fill={earned ? '#052015' : colors.textTertiary}
              opacity={earned ? 1 : 0.45}
            />
          </G>

          {/* Lock overlay for locked badges — scales with badge size */}
          {!earned && (
            <G transform="translate(20, 20) scale(0.67)">
              <Path
                d="M6 10 V7 A6 6 0 0 1 18 7 V10 M4 10 H20 A2 2 0 0 1 22 12 V21 A2 2 0 0 1 20 23 H4 A2 2 0 0 1 2 21 V12 A2 2 0 0 1 4 10 Z M12 15 A1.6 1.6 0 1 1 12 18.2 A1.6 1.6 0 1 1 12 15"
                fill="none"
                stroke={colors.textSecondary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8}
              />
            </G>
          )}
        </Svg>
      </Animated.View>

      <Text
        numberOfLines={1}
        style={[
          styles.name,
          { maxWidth: size + spacing.md },
          earned ? styles.nameEarned : styles.nameLocked,
        ]}
      >
        {achievement.name}
      </Text>
      {!earned && progressHint ? (
        <Text style={styles.hint} numberOfLines={1}>
          {progressHint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  // A plain, neutral lift — matching the rest of the screen's card elevation
  // rather than a colored "prize" glow — so an earned badge doesn't outrank
  // the surrounding UI.
  earnedLift: {
    ...shadows.sm,
    borderRadius: 28,
  },
  name: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  nameEarned: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  nameLocked: {
    color: colors.textTertiary,
  },
  hint: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 1,
  },
});
