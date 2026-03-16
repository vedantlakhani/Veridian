import { View, Text, StyleSheet } from 'react-native';
import { VButton } from './VButton';
import { colors, typography, spacing } from '@/lib/theme';

interface VEmptyStateProps {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  icon?: string;
}

export function VEmptyState({
  title,
  body,
  ctaLabel,
  onCta,
  icon = '🌱',
}: VEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon} accessibilityRole="image" accessibilityLabel={title}>
        {icon}
      </Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {ctaLabel && onCta ? (
        <View style={styles.ctaWrapper}>
          <VButton label={ctaLabel} onPress={onCta} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  icon: { fontSize: 56 },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  ctaWrapper: { marginTop: spacing.sm },
});
