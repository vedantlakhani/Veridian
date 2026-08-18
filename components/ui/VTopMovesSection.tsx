import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { VText } from './VText';
import { VTopMoveCard } from './VTopMoveCard';
import { VStaggerIn } from './VStaggerIn';
import { colors, spacing } from '@/lib/theme';
import type { TopMove } from '@/lib/topMoves';

// ─────────────────────────────────────────────────────────────────────────────
// VTopMovesSection — section header + up to 3 VTopMoveCard + footer line.
//
// Placement: replaces the insightWrap block on Home, below "Tracked for you",
// above "Recent". Falls back to VAiInsightCard when moves is empty.
// ─────────────────────────────────────────────────────────────────────────────

interface VTopMovesSectionProps {
  moves: TopMove[];
}

export function VTopMovesSection({ moves }: VTopMovesSectionProps) {
  const handlePress = () => {
    router.push('/log');
  };

  // Footer: shown when ≥2 moves and at least one has a weeklyPercent
  const hasTwoMoves = moves.length >= 2;
  const totalSaving = moves.reduce((s, m) => s + m.weeklySavingKg, 0);
  const totalPercent =
    hasTwoMoves && moves.every((m) => m.weeklyPercent !== null)
      ? moves.reduce((s, m) => s + (m.weeklyPercent ?? 0), 0)
      : null;

  return (
    <View style={styles.section}>
      {/* ── Section header ── */}
      <VText variant="label" style={styles.sectionLabel}>
        TOP MOVES FOR YOU
      </VText>
      <VText variant="caption" style={styles.sectionSub}>
        Ranked by impact, from your last 4 weeks.
      </VText>

      {/* ── Cards ── */}
      {moves.map((move, i) => (
        <VStaggerIn key={move.id} index={i}>
          <VTopMoveCard move={move} index={i} onPress={handlePress} />
        </VStaggerIn>
      ))}

      {/* ── Footer summary ── */}
      {hasTwoMoves && totalPercent !== null && (
        <VText variant="caption" style={styles.footer}>
          {`All ${moves.length} moves → −${totalSaving.toFixed(1)} kg/week — ${totalPercent}% of your footprint.`}
        </VText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    paddingHorizontal: spacing.md,
  },
  sectionSub: {
    fontSize: 11,
    paddingHorizontal: spacing.md,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  footer: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
});
