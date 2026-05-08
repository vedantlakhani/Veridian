import { View, Text, StyleSheet } from 'react-native';
import { VCard } from '@/components/ui/VCard';
import { VSkeleton } from '@/components/ui/VSkeleton';
import { colors, spacing, typography, radii } from '@/lib/theme';
import type { AiInsight } from '@/hooks/useAiInsight';

interface VAiInsightCardProps {
  insight: AiInsight | null | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function VAiInsightCard({ insight, isLoading, error }: VAiInsightCardProps) {
  // Loading state: show skeleton card so layout does not jump
  if (isLoading) {
    return (
      <VCard elevation="md" style={styles.card}>
        <VSkeleton width={120} height={14} style={{ marginBottom: spacing.sm }} />
        <VSkeleton width={'100%' as `${number}%`} height={40} style={{ marginBottom: spacing.sm }} />
        <VSkeleton width={'85%' as `${number}%`} height={32} />
      </VCard>
    );
  }

  // Error or no data: graceful degradation — card is simply absent, no crash
  if (error || !insight) {
    return null;
  }

  return (
    <VCard elevation="md" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.aiDot} />
        <Text style={styles.label}>AI INSIGHT</Text>
      </View>
      <Text style={styles.content}>{insight.content}</Text>
      <View style={styles.suggestionRow}>
        <Text style={styles.suggestionLabel}>Try this</Text>
        <Text style={styles.suggestion}>{insight.suggestion}</Text>
      </View>
    </VCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  content: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    lineHeight: typography.sizes.sm * 1.5,
    marginBottom: spacing.sm,
  },
  suggestionRow: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  suggestionLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  suggestion: {
    fontSize: typography.sizes.sm,
    color: colors.primaryLight,
    fontWeight: '600',
  },
});
