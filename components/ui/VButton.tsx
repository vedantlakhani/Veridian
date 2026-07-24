import type { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VPressable, type HapticStrength } from './VPressable';
import { VIcon, type VIconName } from './VIcon';
import { colors, typography, radii, gradients, spacing } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VButton — 3-stop gradient primary, spring press scale, haptic tick,
// fixed-layout loading state (no width jump).
// ─────────────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'apple';
type ButtonSize = 'sm' | 'md' | 'lg';

interface VButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Text label (kept for compat). Prefer children for rich content. */
  label?: string;
  children?: ReactNode;
  icon?: VIconName;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  haptic?: HapticStrength;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary:     { bg: 'transparent', text: '#FFFFFF', border: 'transparent' },
  secondary:   { bg: colors.surfaceElevated, text: colors.primaryLight, border: colors.borderStrong },
  ghost:       { bg: 'transparent', text: colors.primaryLight, border: 'transparent' },
  destructive: { bg: 'transparent', text: colors.danger, border: 'rgba(255,92,92,0.35)' },
  apple:       { bg: '#000000', text: '#FFFFFF', border: '#000000' },
};

const sizeStyles: Record<ButtonSize, { height: number; fontSize: number; paddingH: number; iconSize: number }> = {
  sm: { height: 36, fontSize: typography.sizes.sm, paddingH: 12, iconSize: 14 },
  md: { height: 48, fontSize: typography.sizes.md, paddingH: 20, iconSize: 16 },
  lg: { height: 56, fontSize: typography.sizes.lg, paddingH: 24, iconSize: 18 },
};

export function VButton({
  variant = 'primary',
  size = 'md',
  label,
  children,
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  haptic = 'light',
  onPress,
  style,
  accessibilityLabel,
}: VButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <VPressable
      style={[
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingH,
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: variant === 'primary' || variant === 'ghost' ? 0 : 1,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
      disabled={isDisabled}
      onPress={onPress}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
    >
      {variant === 'primary' && (
        <LinearGradient
          colors={gradients.primaryCTA}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientFill}
          pointerEvents="none"
        />
      )}
      {/* Content keeps its layout while loading so the button never resizes */}
      <View style={[styles.contentRow, loading && styles.contentHidden]}>
        {icon ? <VIcon name={icon} size={s.iconSize} color={v.text} strokeWidth={2} /> : null}
        {children ?? (
          <Text style={[styles.label, { fontSize: s.fontSize, color: v.text }]}>{label}</Text>
        )}
      </View>
      {loading && (
        <View style={styles.spinnerOverlay} pointerEvents="none">
          <ActivityIndicator color={v.text} size="small" />
        </View>
      )}
    </VPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  contentHidden: {
    opacity: 0,
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
