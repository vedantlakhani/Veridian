import { useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/authStore';
import { useProfile, useUpdateProfile, uploadAvatar } from '@/hooks/useProfile';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  VCard,
  VButton,
  VInput,
  VMetricCard,
  VBottomSheet,
  VSkeleton,
  VEmptyState,
} from '@/components/ui';
import { colors, spacing, typography, radii } from '@/lib/theme';

// ─── Profile Screen ────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const { data: profile, isLoading: profileLoading } = useProfile(userId);
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile();

  // All-time total from emission entries
  const { data: allEntries = [], isLoading: entriesLoading } = useEmissionEntries(userId);
  const lifetimeTotalKg = useMemo(
    () => allEntries.reduce((sum, e) => sum + e.kg_co2e_total, 0),
    [allEntries]
  );

  // Best week: lowest total_kg_co2e across all weekly_summaries
  const { data: bestWeekData, isLoading: bestWeekLoading } = useQuery({
    queryKey: ['best_week', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_summaries')
        .select('total_kg_co2e')
        .eq('user_id', userId!)
        .order('total_kg_co2e', { ascending: true })
        .limit(1);
      if (error) throw error;
      return data as { total_kg_co2e: number }[];
    },
    enabled: !!userId,
  });
  const bestWeekKg = bestWeekData?.[0]?.total_kg_co2e ?? null;

  // Streak: consecutive days from daily_summaries
  const { data: streakData, isLoading: streakLoading } = useQuery({
    queryKey: ['streak', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('date')
        .eq('user_id', userId!)
        .order('date', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as { date: string }[];
    },
    enabled: !!userId,
  });

  const currentStreak = useMemo(() => {
    if (!streakData || streakData.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const check = new Date(today);
    for (const row of streakData) {
      const d = new Date(row.date);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === check.getTime()) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [streakData]);

  // Edit sheet state
  const [editOpen, setEditOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const handleOpenEdit = () => {
    setDisplayName(profile?.display_name ?? '');
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!userId) return;
    updateProfile({ userId, displayName }, {
      onSuccess: () => setEditOpen(false),
    });
  };

  const handleAvatarTap = async () => {
    if (!userId) return;
    try {
      const newUrl = await uploadAvatar(userId);
      if (newUrl) {
        updateProfile({ userId, avatarUrl: newUrl });
      }
    } catch {
      // silently ignore upload errors — user can retry
    }
  };

  const statsLoading = profileLoading || entriesLoading || bestWeekLoading || streakLoading;

  // Derive display name initials for avatar fallback
  const initials = profile?.display_name
    ? profile.display_name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : (user?.email?.[0]?.toUpperCase() ?? '?');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleAvatarTap} activeOpacity={0.8}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.headerText}>
          {profileLoading ? (
            <VSkeleton width={140} height={20} />
          ) : (
            <Text style={styles.displayName}>
              {profile?.display_name ?? user?.email ?? 'Your Profile'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleOpenEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.editIcon}
        >
          <Text style={styles.editIconText}>✎</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats Row ── */}
      {statsLoading ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}><VSkeleton width="100%" height={80} /></View>
          <View style={styles.statCard}><VSkeleton width="100%" height={80} /></View>
          <View style={styles.statCard}><VSkeleton width="100%" height={80} /></View>
        </View>
      ) : (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <VMetricCard
              value={lifetimeTotalKg}
              unit="kg"
              label="Total"
            />
          </View>
          <View style={styles.statCard}>
            <VMetricCard
              value={bestWeekKg !== null ? bestWeekKg : '—'}
              unit={bestWeekKg !== null ? 'kg' : ''}
              label="Best Week"
            />
          </View>
          <View style={styles.statCard}>
            <VMetricCard
              value={currentStreak}
              unit="days"
              label="Streak"
            />
          </View>
        </View>
      )}

      {/* ── My Challenges Section ── */}
      <VCard elevation="sm" style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Challenges</Text>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.sectionAction}>+ New</Text>
          </TouchableOpacity>
        </View>
        <VEmptyState
          title="No challenges yet"
          body="Join or create a challenge"
        />
      </VCard>

      {/* ── Achievements Section ── */}
      <VCard elevation="sm" style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.placeholderText}>Badges coming soon</Text>
      </VCard>

      {/* ── Edit Profile Bottom Sheet ── */}
      <VBottomSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Profile"
      >
        <TouchableOpacity onPress={handleAvatarTap} activeOpacity={0.8} style={styles.sheetAvatarWrap}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.sheetAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.sheetAvatar, styles.avatarFallback]}>
              <Text style={styles.sheetAvatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </TouchableOpacity>

        <VInput
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your name"
        />

        <View style={styles.saveButton}>
          <VButton
            variant="primary"
            label={isSaving ? 'Saving…' : 'Save'}
            onPress={handleSave}
            disabled={isSaving}
          />
        </View>
      </VBottomSheet>
    </ScrollView>
  );
}

const AVATAR_SIZE = 64;
const SHEET_AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.surface,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  displayName: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  editIcon: {
    padding: spacing.xs,
  },
  editIconText: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
  },
  // Sections
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionAction: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  placeholderText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  // Edit sheet
  sheetAvatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sheetAvatar: {
    width: SHEET_AVATAR_SIZE,
    height: SHEET_AVATAR_SIZE,
    borderRadius: SHEET_AVATAR_SIZE / 2,
    marginBottom: spacing.sm,
  },
  sheetAvatarInitials: {
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.surface,
  },
  changePhotoText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  saveButton: {
    marginTop: spacing.md,
  },
  // Needed for borderRadius in avatarFallback inside sheet avatar
  sheetAvatarBorderRadius: {
    borderRadius: radii.full,
  },
});
