import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, radii, spacing } from '@/lib/theme';

type BadgeVariant = 'food' | 'transport' | 'energy' | 'success' | 'warning' | 'error' | 'neutral';

interface VBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  food:      { bg: '#FFF7ED', text: colors.food },
  transport: { bg: '#EFF6FF', text: colors.transport },
  energy:    { bg: '#FAF5FF', text: colors.energy },
  success:   { bg: '#F0FDF4', text: colors.success },
  warning:   { bg: '#FFFBEB', text: colors.warning },
  error:     { bg: colors.errorLight, text: colors.error },
  neutral:   { bg: colors.divider, text: colors.textSecondary },
};

export function VBadge({ label, variant = 'neutral' }: VBadgeProps) {
  const { bg, text } = variantColors[variant];
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
