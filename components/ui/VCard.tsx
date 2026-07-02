import { View, StyleSheet, type ViewProps, type GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VPressable, type HapticStrength } from './VPressable';
import { colors, shadows, radii, gradients } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VCard — surface with green-black shadow, permanent 1px top sheen so every
// card catches light, optional category accent edge and colored glow.
// ─────────────────────────────────────────────────────────────────────────────

type ElevationVariant = 'flat' | 'sm' | 'md' | 'lg';
type GlowVariant = 'primary' | 'food' | 'transport' | 'energy';

interface VCardProps extends ViewProps {
  elevation?: ElevationVariant;
  padding?: number;
  onPress?: (e: GestureResponderEvent) => void;
  haptic?: HapticStrength;
  /** Category accent color rendered as a thin edge bar */
  accentColor?: string;
  /** 'top' = 2px top bar, 'left' = 3px left bar */
  accentEdge?: 'top' | 'left';
  glow?: GlowVariant;
}

const glowShadows: Record<GlowVariant, object> = {
  primary: shadows.glowPrimary,
  food: shadows.glowFood,
  transport: shadows.glowTransport,
  energy: shadows.glowEnergy,
};

export function VCard({
  elevation = 'sm',
  padding = 16,
  onPress,
  haptic,
  accentColor,
  accentEdge = 'top',
  glow,
  style,
  children,
  ...props
}: VCardProps) {
  const elevationStyle = glow
    ? glowShadows[glow]
    : elevation === 'flat'
      ? undefined
      : shadows[elevation];

  const inner = (
    <>
      {/* Top-edge sheen — every card catches light */}
      <LinearGradient
        colors={gradients.cardSheen}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.sheen}
        pointerEvents="none"
      />
      {accentColor ? (
        <View
          style={[
            accentEdge === 'top' ? styles.accentTop : styles.accentLeft,
            { backgroundColor: accentColor },
          ]}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </>
  );

  const baseStyle = [
    styles.base,
    elevationStyle,
    elevation === 'lg' && styles.baseStrong,
    { padding },
    accentColor && accentEdge === 'top' ? { paddingTop: padding + 2 } : null,
    style,
  ];

  if (onPress) {
    return (
      <VPressable style={baseStyle} onPress={onPress} haptic={haptic ?? 'light'} {...props}>
        {inner}
      </VPressable>
    );
  }

  return (
    <View style={baseStyle} {...props}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  baseStrong: {
    borderColor: colors.borderStrong,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
  },
  accentTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  accentLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
  },
});
