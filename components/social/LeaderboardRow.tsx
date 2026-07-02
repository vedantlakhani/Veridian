import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, typography, radii } from '@/lib/theme';
import type { LeaderboardEntry } from '@/types/challenge';

// ─── Props ────────────────────────────────────────────────────────────────────
interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Positive = reduction (show as -X.X%), negative = increase (+X.X%).
 * Privacy (SOCL-06): only reduction % is shown — no raw kg values.
 */
function formatReductionPct(pct: number): string {
  if (pct >= 0) return `-${Math.abs(pct).toFixed(1)}%`;
  return `+${Math.abs(pct).toFixed(1)}%`;
}

function reductionColor(pct: number): string {
  return pct >= 0 ? colors.primaryLight : colors.danger;
}

/** Deterministic avatar hue from a user id — stable across sessions */
function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 38%)`;
}

const MEDALS: Record<number, { bg: string; fg: string; label: string }> = {
  1: { bg: 'rgba(255,215,110,0.18)', fg: '#FFD76E', label: '1' },
  2: { bg: 'rgba(200,205,215,0.16)', fg: '#C8CDD7', label: '2' },
  3: { bg: 'rgba(222,148,90,0.16)', fg: '#DE945A', label: '3' },
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  const pctDisplay = formatReductionPct(entry.reduction_pct);
  const pctColor = reductionColor(entry.reduction_pct);
  const initial = entry.display_name ? entry.display_name.charAt(0).toUpperCase() : '?';
  const medal = MEDALS[entry.rank];
  const avatarBg = avatarColorFor(entry.user_id ?? entry.display_name ?? '?');

  return (
    <View style={[styles.row, isCurrentUser && styles.rowCurrent]}>
      {isCurrentUser && <View style={styles.currentAccent} />}

      {/* Rank — gold / silver / bronze medal chips for the podium */}
      {medal ? (
        <View style={[styles.medal, { backgroundColor: medal.bg }]}>
          <Text style={[styles.medalText, { color: medal.fg }]}>{medal.label}</Text>
        </View>
      ) : (
        <Text style={[styles.rank, isCurrentUser && { color: colors.primaryLight }]}>
          {entry.rank}
        </Text>
      )}

      {/* Avatar */}
      {entry.avatar_url ? (
        <Image source={{ uri: entry.avatar_url }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
      )}

      {/* Display name */}
      <Text
        style={[styles.name, isCurrentUser && styles.nameCurrent]}
        numberOfLines={1}
      >
        {entry.display_name ?? 'Unknown'}
        {isCurrentUser ? '  ·  You' : ''}
      </Text>

      {/* Reduction % — the only value visible to other users (SOCL-06) */}
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
    overflow: 'hidden',
  },
  rowCurrent: {
    backgroundColor: colors.primaryGlowSoft,
  },
  currentAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primaryLight,
  },
  rank: {
    width: 28,
    textAlign: 'center',
    fontFamily: typography.fontFamilyMono,
    fontVariant: ['tabular-nums'],
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  medal: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 13,
    fontWeight: '700',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  name: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.md,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  nameCurrent: {
    fontWeight: '600',
    color: colors.primaryLight,
  },
  pct: {
    width: 64,
    textAlign: 'right',
    fontFamily: typography.fontFamilyMono,
    fontVariant: ['tabular-nums'],
    fontSize: 14,
    fontWeight: '600',
  },
});
