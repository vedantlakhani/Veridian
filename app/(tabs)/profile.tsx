import { useState, useMemo, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useProfile, useUpdateProfile, uploadAvatar } from '@/hooks/useProfile';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useMyChallenges, useCreateChallenge, useJoinChallenge } from '@/hooks/useChallenges';
import { useAchievements } from '@/hooks/useAchievements';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AchievementBadge from '@/components/social/AchievementBadge';
import AchievementToast from '@/components/social/AchievementToast';
import type { Achievement } from '@/types/achievement';
import {
  VCard,
  VButton,
  VInput,
  VMetricCard,
  VBottomSheet,
  VSkeleton,
  VEmptyState,
} from '@/components/ui';
import ChallengeCard from '@/components/social/ChallengeCard';
import { colors, spacing, typography, radii } from '@/lib/theme';
import type { Challenge } from '@/types/challenge';

// ─── Profile Screen ────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
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

  // ── Achievements ──
  const queryClient = useQueryClient();
  const { data: achievementsData, isLoading: achLoading } = useAchievements(userId);
  const [toastBadge, setToastBadge] = useState<Achievement | null>(null);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryKey[0] === 'newly_earned_achievements') {
        const badges = event.query.state.data as Achievement[] | undefined;
        if (badges && badges.length > 0) {
          setToastBadge(badges[0]);
          queryClient.setQueryData(['newly_earned_achievements'], []);
        }
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // ── My Challenges state ──
  const { data: participantRows = [], isLoading: challengesLoading } = useMyChallenges(userId);
  const { mutate: createChallenge, isPending: isCreating } = useCreateChallenge();
  const { mutate: joinChallenge, isPending: isJoining } = useJoinChallenge();

  type SheetMode = 'none' | 'select' | 'create' | 'join' | 'created';
  const [sheetMode, setSheetMode] = useState<SheetMode>('none');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [targetPct, setTargetPct] = useState('10');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [createdChallenge, setCreatedChallenge] = useState<Challenge | null>(null);

  const isChallengeSheetOpen = sheetMode !== 'none';

  const handleOpenChallengeSheet = () => {
    setSheetMode('select');
  };

  const handleCloseChallengeSheet = () => {
    setSheetMode('none');
    setCreatedChallenge(null);
    setChallengeTitle('');
    setDurationDays('30');
    setTargetPct('10');
    setInviteCodeInput('');
  };

  const handleCreate = () => {
    if (!userId) return;
    createChallenge(
      {
        userId,
        title: challengeTitle,
        durationDays: parseInt(durationDays, 10) || 30,
        targetReductionPct: parseFloat(targetPct) || 10,
      },
      {
        onSuccess: (result) => {
          setCreatedChallenge(result);
          setSheetMode('created');
        },
      }
    );
  };

  const handleJoin = () => {
    if (!userId) return;
    joinChallenge(
      { userId, inviteCode: inviteCodeInput },
      {
        onSuccess: () => {
          handleCloseChallengeSheet();
        },
      }
    );
  };

  const handleCopyCode = async () => {
    if (createdChallenge) {
      await Clipboard.setStringAsync(createdChallenge.invite_code);
    }
  };

  const handleShareCode = async () => {
    if (createdChallenge) {
      await Share.share({
        message: `Join my Veridian carbon challenge! Use code: ${createdChallenge.invite_code}`,
      });
    }
  };

  // ── Edit sheet state ──
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
          <TouchableOpacity
            onPress={handleOpenChallengeSheet}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.sectionAction}>+ New</Text>
          </TouchableOpacity>
        </View>

        {challengesLoading ? (
          <>
            <VSkeleton width="100%" height={56} borderRadius={8} style={styles.skeletonRow} />
            <VSkeleton width="100%" height={56} borderRadius={8} style={styles.skeletonRow} />
          </>
        ) : participantRows.length === 0 ? (
          <VEmptyState
            title="No challenges yet"
            body="Join or create a challenge"
            ctaLabel="Get started"
            onCta={handleOpenChallengeSheet}
          />
        ) : (
          participantRows.map((cp) => (
            <ChallengeCard
              key={cp.id}
              challenge={cp.challenges as Challenge}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push(`/challenge/${cp.challenge_id}` as any)}
            />
          ))
        )}
      </VCard>

      {/* ── Achievements Section ── */}
      <VCard elevation="sm" style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        {achLoading ? (
          <VSkeleton width="100%" height={80} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgeRow}
          >
            {(achievementsData?.achievements ?? []).map((a) => (
              <AchievementBadge
                key={a.id}
                achievement={a}
                earned={achievementsData?.earned.some((e) => e.achievement_id === a.id) ?? false}
              />
            ))}
            {(achievementsData?.achievements ?? []).length === 0 && (
              <Text style={styles.placeholderText}>No achievements yet</Text>
            )}
          </ScrollView>
        )}
        {toastBadge && (
          <AchievementToast
            achievementName={toastBadge.name}
            onDismiss={() => setToastBadge(null)}
          />
        )}
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

      {/* ── Challenge Bottom Sheet ── */}
      <VBottomSheet
        isOpen={isChallengeSheetOpen}
        onClose={handleCloseChallengeSheet}
        title={
          sheetMode === 'create' ? 'New Challenge' :
          sheetMode === 'join' ? 'Join Challenge' :
          sheetMode === 'created' ? 'Challenge Created!' :
          'Challenges'
        }
        snapPoints={[520]}
      >
        {sheetMode === 'select' && (
          <View style={styles.selectMode}>
            <VButton
              variant="primary"
              label="Create Challenge"
              onPress={() => setSheetMode('create')}
            />
            <View style={styles.sheetButtonGap} />
            <VButton
              variant="secondary"
              label="Join with Code"
              onPress={() => setSheetMode('join')}
            />
          </View>
        )}

        {sheetMode === 'create' && (
          <View>
            <VInput
              label="Challenge Title"
              value={challengeTitle}
              onChangeText={setChallengeTitle}
              placeholder="e.g. Reduce by summer"
            />
            <VInput
              label="Duration (days)"
              value={durationDays}
              onChangeText={setDurationDays}
              placeholder="30"
              keyboardType="number-pad"
            />
            <VInput
              label="Target Reduction (%)"
              value={targetPct}
              onChangeText={setTargetPct}
              placeholder="10"
              keyboardType="decimal-pad"
            />
            <View style={styles.saveButton}>
              <VButton
                variant="primary"
                label={isCreating ? 'Creating…' : 'Create'}
                onPress={handleCreate}
                disabled={isCreating || !challengeTitle.trim()}
              />
            </View>
          </View>
        )}

        {sheetMode === 'join' && (
          <View>
            <VInput
              label="Invite Code"
              value={inviteCodeInput}
              onChangeText={(t) => setInviteCodeInput(t.toUpperCase())}
              placeholder="XXXXXXXX"
              autoCapitalize="characters"
              maxLength={8}
            />
            <View style={styles.saveButton}>
              <VButton
                variant="primary"
                label={isJoining ? 'Joining…' : 'Join'}
                onPress={handleJoin}
                disabled={isJoining || inviteCodeInput.length < 8}
              />
            </View>
          </View>
        )}

        {sheetMode === 'created' && createdChallenge && (
          <View style={styles.createdMode}>
            <Text style={styles.inviteCodeLabel}>Your Invite Code</Text>
            <Text style={styles.inviteCode}>
              {createdChallenge.invite_code}
            </Text>
            <View style={styles.inviteActions}>
              <VButton
                variant="primary"
                label="Copy Code"
                onPress={handleCopyCode}
              />
              <View style={styles.sheetButtonGap} />
              <VButton
                variant="secondary"
                label="Share"
                onPress={handleShareCode}
              />
            </View>
          </View>
        )}
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
  badgeRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  skeletonRow: {
    marginBottom: spacing.sm,
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
  // Challenge sheet
  selectMode: {
    paddingTop: spacing.sm,
  },
  sheetButtonGap: {
    height: spacing.sm,
  },
  createdMode: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  inviteCodeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inviteCode: {
    fontSize: 32,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 8,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  inviteActions: {
    width: '100%',
  },
});
