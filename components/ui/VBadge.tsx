import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, radii, spacing } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VBadge — category / status pill. Sizes, dot indicator, icon slot,
// dedicated warning background, optional 30%-opacity border.
// ─────────────────────────────────────────────────────────────────────────────

type BadgeVariant = 'food' | 'transport' | 'energy' | 'success' | 'warning' | 'error' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface VBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
  /** Uppercase — defaults on for category variants */
  caps?: boolean;
  bordered?: boolean;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  food:      { bg: colors.foodBg, text: colors.food },
  transport: { bg: colors.transportBg, text: colors.transport },
  energy:    { bg: colors.energyBg, text: colors.energy },
  success:   { bg: colors.successBg, text: colors.success },
  warning:   { bg: colors.warningBg, text: colors.warning },
  error:     { bg: colors.errorLight, text: colors.error },
  neutral:   { bg: colors.divider, text: colors.textSecondary },
};

const CATEGORY_VARIANTS: BadgeVariant[] = ['food', 'transport', 'energy'];

export function VBadge({
  label,
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  caps,
  bordered = false,
}: VBadgeProps) {
  const { bg, text } = variantColors[variant];
  const uppercase = caps ?? CATEGORY_VARIANTS.includes(variant);

  return (
    <View
      style={[
        styles.container,
        size === 'sm' ? styles.containerSm : styles.containerMd,
        { backgroundColor: bg },
        bordered && { borderWidth: 1, borderColor: `${text}4D` },
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: text }]} /> : null}
      {icon}
      <Text
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          { color: text },
          uppercase && styles.textCaps,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  containerMd: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  containerSm: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radii.full,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 10,
  },
  textCaps: {
    textTransform: 'uppercase',
  },
});
