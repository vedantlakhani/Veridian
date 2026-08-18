import { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { VPressable } from './VPressable';
import { VIcon, type VIconName } from './VIcon';
import { colors, typography, radii, spacing, motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VChip — animated selection (background + border interpolate), press scale,
// optional icon, `grow` for equal-width rows.
// ─────────────────────────────────────────────────────────────────────────────

interface VChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  icon?: VIconName;
  iconColor?: string;
  /** Equal-width behavior in a row */
  grow?: boolean;
  /** Override the selected-state border/text color (defaults to colors.primaryLight) */
  activeColor?: string;
  /** Override the selected-state background color (defaults to colors.primaryGlow) */
  activeBg?: string;
}

export function VChip({
  label,
  selected = false,
  onPress,
  disabled = false,
  icon,
  iconColor,
  grow = false,
  activeColor,
  activeBg,
}: VChipProps) {
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, { duration: motion.timingFast });
  }, [selected, selection]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selection.value,
      [0, 1],
      [colors.surfaceElevated, activeBg ?? colors.primaryGlow],
    ),
    borderColor: interpolateColor(
      selection.value,
      [0, 1],
      [colors.border, activeColor ?? colors.primaryLight],
    ),
  }));

  const contentColor = selected ? (activeColor ?? colors.primaryLight) : colors.textSecondary;

  return (
    <VPressable
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      style={grow ? styles.grow : styles.selfStart}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <Animated.View style={[styles.chip, disabled && styles.chipDisabled, animatedStyle]}>
        {icon ? <VIcon name={icon} size={14} color={iconColor ?? contentColor} strokeWidth={2} /> : null}
        <Text style={[styles.label, { color: contentColor }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </VPressable>
  );
}

const styles = StyleSheet.create({
  selfStart: { alignSelf: 'flex-start' },
  grow: { flex: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
  },
  chipDisabled: { opacity: 0.5 },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
});
