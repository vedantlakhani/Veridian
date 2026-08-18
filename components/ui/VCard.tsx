import { View, StyleSheet, type ViewProps, type GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VPressable, type HapticStrength } from './VPressable';
import { colors, shadows, radii, gradients } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VCard — surface with a soft neutral shadow, permanent 1px top sheen so every
// card catches light, and an optional colored glow. No accent-color edge bar —
// that pattern is explicitly out per DESIGN_DIRECTION.md ("No accent rail on
// rounded cards"); category identity comes from the glow shadow instead.
// ─────────────────────────────────────────────────────────────────────────────

type ElevationVariant = 'flat' | 'sm' | 'md' | 'lg';
type GlowVariant = 'primary' | 'food' | 'transport' | 'energy';

interface VCardProps extends ViewProps {
  elevation?: ElevationVariant;
  padding?: number;
  onPress?: (e: GestureResponderEvent) => void;
  haptic?: HapticStrength;
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
      {children}
    </>
  );

  const baseStyle = [
    styles.base,
    elevationStyle,
    elevation === 'lg' && styles.baseStrong,
    { padding },
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
});
