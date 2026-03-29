import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, typography } from '@/lib/theme';
import type { LeaderboardEntry } from '@/types/challenge';

// ─── Props ────────────────────────────────────────────────────────────────────
interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formats the reduction_pct value for display.
 * Positive = reduction (show as -X.X%), negative = increase (show as +X.X%), null = '--'.
 * Privacy (SOCL-06): only reduction % is shown — no raw kg values.
 */
function formatReductionPct(pct: number): string {
  if (pct >= 0) return `-${Math.abs(pct).toFixed(1)}%`;
  return `+${Math.abs(pct).toFixed(1)}%`;
}

/**
 * Determines the color for the reduction % value.
 * Green = positive reduction, red = increase.
 */
function reductionColor(pct: number): string {
  return pct >= 0 ? colors.primary : colors.error;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  const rankColor = isCurrentUser ? colors.primary : colors.textPrimary;
  const nameColor = isCurrentUser ? colors.primary : colors.textPrimary;
  const pctDisplay = formatReductionPct(entry.reduction_pct);
  const pctColor = reductionColor(entry.reduction_pct);
  const initial = entry.display_name ? entry.display_name.charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.row}>
      {/* Rank */}
      <Text style={[styles.rank, { color: rankColor }]}>{entry.rank}</Text>

      {/* Avatar */}
      {entry.avatar_url ? (
        <Image
          source={{ uri: entry.avatar_url }}
          style={styles.avatar}
          contentFit="cover"
        />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
      )}

      {/* Display name */}
      <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
        {entry.display_name ?? 'Unknown'}
      </Text>

      {/* Reduction % — only this value is visible to other users (SOCL-06) */}
      <Text style={[styles.pct, { color: pctColor }]}>{pctDisplay}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rank: {
    width: 28,
    textAlign: 'center',
    fontFamily: 'JetBrainsMono',
    fontSize: 15,
    fontWeight: '600',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    fontFamily: 'JetBrainsMono',
    fontSize: 14,
    color: colors.surface,
  },
  name: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.md,
    fontWeight: '400',
  },
  pct: {
    width: 64,
    textAlign: 'right',
    fontFamily: 'JetBrainsMono',
    fontSize: 14,
    fontWeight: '600',
  },
});
