import { useState, useMemo, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Share, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useProfile, useUpdateProfile, uploadAvatar } from '@/hooks/useProfile';
import { useDailySummary } from '@/hooks/useSummaries';
import { useMyChallenges, useCreateChallenge, useJoinChallenge } from '@/hooks/useChallenges';
import { useAchievements } from '@/hooks/useAchievements';
import { useStreak } from '@/hooks/useStreak';
import { useMomentum } from '@/hooks/useMomentum';
import { useLinkedAccounts, useUnlinkAccount } from '@/hooks/useLinkedAccounts';
import { supabase } from '@/lib/supabase';
import AchievementBadge from '@/components/social/AchievementBadge';
import ChallengeCard from '@/components/social/ChallengeCard';
import type { Achievement } from '@/types/achievement';
import {
  VCard,
  VButton,
  VBadge,
  VInput,
  VMetricCard,
  VMomentumBand,
  VBottomSheet,
  VSkeleton,
  VEmptyState,
  VText,
  VIcon,
  VPressable,
  VToast,
} from '@/components/ui';
import {
  colors,
  spacing,
  typography,
  radii,
  gradients,
  budgetStateFor,
  budgetStateColors,
} from '@/lib/theme';
import { resolveDisplayName } from '@/lib/format';
import { DAILY_CARBON_BUDGET_KG } from '@/types/emission';
import type { Challenge } from '@/types/challenge';

// ─── The Grove — lifetime impact rendered as procedural tree silhouettes ─────
function Grove({ avoidedKg, width }: { avoidedKg: number; width: number }) {
  // One tree per ~50 kg avoided, always at least one sapling
  const treeCount = Math.min(Math.max(Math.floor(avoidedKg / 50) + 1, 1), 9);

  const trees = useMemo(() => {
    const out: { x: number; h: number; o: number }[] = [];
    for (let i = 0; i < treeCount; i++) {
      // Deterministic layout — stable between renders
      const t = (i * 0.618) % 1;
      out.push({
        x: 16 + t * (width - 48),
        h: 26 + ((i * 37) % 30),
        o: 0.35 + ((i * 23) % 40) / 100,
      });
    }
    return out.sort((a, b) => a.h - b.h);
  }, [treeCount, width]);

  return (
    <Svg width={width} height={72} style={groveStyles.svg}>
      {trees.map((t, i) => {
        const half = t.h * 0.38;
        return (
          <Path
            key={i}
            d={`M${t.x} ${70 - t.h}
               L${t.x - half} ${70 - t.h * 0.28}
               L${t.x - half * 0.4} ${70 - t.h * 0.28}
               L${t.x - half * 0.4} 70
               L${t.x + half * 0.4} 70
               L${t.x + half * 0.4} ${70 - t.h * 0.28}
               L${t.x + half} ${70 - t.h * 0.28} Z`}
            fill={colors.primaryDeep}
            opacity={t.o}
          />
        );
      })}
    </Svg>
  );
}

const groveStyles = StyleSheet.create({
  svg: { position: 'absolute', bottom: 0, left: 0 },
});

// ─── Profile Screen — the identity monument ───────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const userId = user?.id;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { data: profile, isLoading: profileLoading } = useProfile(userId);
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile();
  const { data: daily } = useDailySummary(userId);
  // Real consecutive-day streak — kept for the achievements shelf's progress
  // hints (criteria_type: 'streak_days'); the visible stat-row DISPLAY below
  // is the momentum band instead (NORTH_STAR.md §8 pattern 5).
  const { streak, isLoading: streakLoading } = useStreak(userId);
  const momentum = useMomentum(userId);

  // Linked bank accounts — Sprint D Stage 4 "money layer"
  const { data: linkedAccounts = [], isLoading: linkedAccountsLoading } = useLinkedAccounts(userId);
  const { mutate: unlinkAccount, isPending: isUnlinking } = useUnlinkAccount();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const handleUnlink = (id: string) => {
    setUnlinkingId(id);
    unlinkAccount(id, {
      onError: () => setErrorToast("Couldn't unlink that account — try again"),
      onSettled: () => setUnlinkingId(null),
    });
  };

  // Lifetime total — cheap aggregate over daily_summaries, not every entry
  const { data: lifetimeRows, isLoading: lifetimeLoading } = useQuery({
    queryKey: ['lifetime_total', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('total_kg_co2e')
        .eq('user_id', userId!);
      if (error) throw error;
      return data as { total_kg_co2e: number }[];
    },
    enabled: !!userId,
  });
  const lifetimeTotalKg = useMemo(
    () => (lifetimeRows ?? []).reduce((sum, r) => sum + r.total_kg_co2e, 0),
    [lifetimeRows],
  );

  // Impact ledger — kg you never emitted (weekly wins vs. baseline)
  const { data: weeklyRows } = useQuery({
    queryKey: ['impact_ledger', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_summaries')
        .select('total_kg_co2e')
        .eq('user_id', userId!);
      if (error) throw error;
      return data as { total_kg_co2e: number }[];
    },
    enabled: !!userId,
  });
  const avoidedKg = useMemo(() => {
    const baselineWeekly = profile?.baseline_kg ? profile.baseline_kg / 52 : null;
    if (!baselineWeekly || !weeklyRows) return 0;
    return weeklyRows.reduce(
      (sum, w) => sum + Math.max(0, baselineWeekly - w.total_kg_co2e),
      0,
    );
  }, [profile?.baseline_kg, weeklyRows]);

  // Best week: lowest total across weekly_summaries
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

  // ── Achievements ──
  const queryClient = useQueryClient();
  const { data: achievementsData, isLoading: achLoading } = useAchievements(userId);
  const [toastBadge, setToastBadge] = useState<Achievement | null>(null);
  const [justEarnedIds, setJustEarnedIds] = useState<Set<string>>(new Set());
  const [errorToast, setErrorToast] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryKey[0] === 'newly_earned_achievements') {
        const badges = event.query.state.data as Achievement[] | undefined;
        if (badges && badges.length > 0) {
          setToastBadge(badges[0]);
          setJustEarnedIds(new Set(badges.map((b) => b.id)));
          queryClient.setQueryData(['newly_earned_achievements'], []);
        }
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // ── Challenges ──
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
      },
    );
  };

  const handleJoin = () => {
    if (!userId) return;
    joinChallenge(
      { userId, inviteCode: inviteCodeInput },
      { onSuccess: handleCloseChallengeSheet },
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

  // ── Edit sheet ──
  const [editOpen, setEditOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');

  const handleOpenEdit = () => {
    setDisplayNameInput(profile?.display_name ?? '');
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!userId) return;
    updateProfile(
      { userId, displayName: displayNameInput },
      { onSuccess: () => setEditOpen(false) },
    );
  };

  const handleAvatarTap = async () => {
    if (!userId) return;
    try {
      const newUrl = await uploadAvatar(userId);
      if (newUrl) {
        updateProfile({ userId, avatarUrl: newUrl });
      }
    } catch {
      setErrorToast("Couldn't upload photo — try again");
    }
  };

  const statsLoading =
    profileLoading || lifetimeLoading || bestWeekLoading || streakLoading || momentum.isLoading;

  const displayName = resolveDisplayName(profile?.display_name, user?.email);

  const initials = useMemo(() => {
    const source = displayName && displayName !== 'You' ? displayName : (user?.email ?? '?');
    const parts = source.split(/[\s@]+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return parts
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }, [displayName, user?.email]);

  // Avatar ring color follows today's budget state — the app's mood
  const todayProgress = (daily?.total_kg_co2e ?? 0) / DAILY_CARBON_BUDGET_KG;
  const ringColor = budgetStateColors[budgetStateFor(todayProgress)].accent;

  const groveWidth = width;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── The Grove — hero panel ── */}
      <View style={[styles.heroPanel, { paddingTop: insets.top + spacing.md }]}>
        <LinearGradient
          colors={gradients.aurora}
          locations={[0, 0.5, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Grove avoidedKg={avoidedKg} width={groveWidth} />
        <LinearGradient
          colors={['transparent', colors.background]}
          locations={[0.6, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        <View style={styles.header}>
          <VPressable onPress={() => void handleAvatarTap()} haptic="light">
            <View style={[styles.avatarRing, { borderColor: ringColor }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <VText variant="heading" style={styles.avatarInitials}>
                    {initials}
                  </VText>
                </View>
              )}
            </View>
          </VPressable>

          <View style={styles.headerText}>
            {profileLoading ? (
              <VSkeleton width={140} height={20} />
            ) : (
              <>
                <VText variant="title" style={styles.displayName} numberOfLines={1}>
                  {displayName}
                </VText>
                {avoidedKg > 0 ? (
                  <View style={styles.avoidedRow}>
                    <VIcon name="tree" size={12} color={colors.primaryLight} strokeWidth={2} />
                    <VText variant="caption" style={styles.avoidedText}>
                      {avoidedKg.toFixed(0)} kg never emitted
                    </VText>
                  </View>
                ) : user?.email ? (
                  <VText variant="caption" style={styles.emailText} numberOfLines={1}>
                    {user.email}
                  </VText>
                ) : null}
              </>
            )}
          </View>

          <VPressable
            onPress={handleOpenEdit}
            hitSlop={8}
            haptic="light"
            style={styles.editIcon}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <VIcon name="edit" size={18} color={colors.textSecondary} />
          </VPressable>
        </View>
      </View>

      <View style={styles.body}>
        {/* ── Stats row ── */}
        {statsLoading ? (
          <View style={styles.statsRow}>
            <VSkeleton width="31%" height={92} borderRadius={radii.lg} />
            <VSkeleton width="31%" height={92} borderRadius={radii.lg} />
            <VSkeleton width="31%" height={92} borderRadius={radii.lg} />
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <VMetricCard
                value={lifetimeTotalKg}
                unit="kg"
                label="Lifetime"
                accentColor={colors.primary}
              />
            </View>
            <View style={styles.statCard}>
              <VMetricCard
                value={bestWeekKg !== null ? bestWeekKg : '—'}
                unit={bestWeekKg !== null ? 'kg' : ''}
                label="Best week"
                accentColor={colors.transport}
              />
            </View>
            <View style={styles.statCard}>
              <VMomentumBand score={momentum.score} band={momentum.band} variant="card" />
            </View>
          </View>
        )}

        {/* ── Achievements shelf ── */}
        <VCard elevation="sm" style={styles.section}>
          <View style={[styles.sectionTitleRow, { marginBottom: spacing.sm }]}>
            <View style={styles.sectionTitleAccent} />
            <VText variant="heading" style={styles.sectionTitle}>
              Achievements
            </VText>
          </View>
          {achLoading ? (
            <VSkeleton width="100%" height={80} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgeRow}
            >
              {(achievementsData?.achievements ?? []).map((a) => {
                const earned =
                  achievementsData?.earned.some((e) => e.achievement_id === a.id) ?? false;
                let progressHint: string | undefined;
                if (!earned && a.criteria_type === 'streak_days' && streak > 0) {
                  progressHint = `${Math.min(streak, a.criteria_value)} of ${a.criteria_value} days`;
                }
                return (
                  <AchievementBadge
                    key={a.id}
                    achievement={a}
                    earned={earned}
                    justEarned={justEarnedIds.has(a.id)}
                    progressHint={progressHint}
                  />
                );
              })}
              {(achievementsData?.achievements ?? []).length === 0 && (
                <VText variant="caption" style={styles.placeholderText}>
                  No achievements yet
                </VText>
              )}
            </ScrollView>
          )}
        </VCard>

        {/* ── Challenges ── */}
        <VCard elevation="sm" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleAccent} />
              <VText variant="heading" style={styles.sectionTitle}>
                Challenges
              </VText>
            </View>
            <VPressable
              onPress={() => setSheetMode('select')}
              hitSlop={8}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="New challenge"
            >
              <View style={styles.newChallengeRow}>
                <VIcon name="plus" size={13} color={colors.primaryLight} strokeWidth={2.25} />
                <VText variant="caption" style={styles.sectionAction}>
                  New
                </VText>
              </View>
            </VPressable>
          </View>

          {challengesLoading ? (
            <>
              <VSkeleton width="100%" height={72} borderRadius={radii.sm} style={styles.skeletonRow} />
              <VSkeleton width="100%" height={72} borderRadius={radii.sm} style={styles.skeletonRow} />
            </>
          ) : participantRows.length === 0 ? (
            <VEmptyState
              title="No challenges yet"
              body="Race a friend to a smaller footprint"
              ctaLabel="Get started"
              onCta={() => setSheetMode('select')}
              icon={<VIcon name="trophy" size={36} color={colors.textTertiary} />}
            />
          ) : (
            participantRows.map((cp) => (
              <ChallengeCard
                key={cp.id}
                challenge={cp.challenges as Challenge}
                onPress={() => router.push(`/challenge/${cp.challenge_id}`)}
              />
            ))
          )}
        </VCard>

        {/* ── Linked accounts — Sprint D Stage 4 "money layer" ── */}
        <VCard elevation="sm" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleAccent} />
              <VText variant="heading" style={styles.sectionTitle}>
                Linked accounts
              </VText>
            </View>
            <VPressable
              onPress={() => router.push('/link-bank')}
              hitSlop={8}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="Link a bank account"
            >
              <View style={styles.newChallengeRow}>
                <VIcon name="plus" size={13} color={colors.primaryLight} strokeWidth={2.25} />
                <VText variant="caption" style={styles.sectionAction}>
                  Add
                </VText>
              </View>
            </VPressable>
          </View>

          {linkedAccountsLoading ? (
            <VSkeleton width="100%" height={56} borderRadius={radii.sm} />
          ) : linkedAccounts.length === 0 ? (
            <VEmptyState
              title="No banks linked yet"
              body="Connect a card to see shopping, food, and fuel appear automatically"
              ctaLabel="Connect a bank"
              onCta={() => router.push('/link-bank')}
              icon={<VIcon name="lock" size={36} color={colors.textTertiary} />}
            />
          ) : (
            linkedAccounts.map((item) => (
              <View key={item.id} style={styles.linkedAccountRow}>
                <View style={{ flex: 1 }}>
                  <VText variant="body" style={styles.linkedAccountName} numberOfLines={1}>
                    {item.institution_name ?? 'Linked bank'}
                  </VText>
                  <View style={styles.linkedAccountMetaRow}>
                    <VBadge
                      label={item.status}
                      variant={item.status === 'active' ? 'success' : 'warning'}
                      size="sm"
                    />
                    <VText variant="caption" style={styles.linkedAccountDate}>
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </VText>
                  </View>
                </View>
                <VButton
                  variant="ghost"
                  size="sm"
                  label="Unlink"
                  loading={isUnlinking && unlinkingId === item.id}
                  onPress={() => handleUnlink(item.id)}
                />
              </View>
            ))
          )}
        </VCard>

        {/* ── Carbon Passport — Sprint E Stage A4, the shareable artifact ── */}
        <VPressable
          onPress={() => router.push('/passport')}
          haptic="light"
          style={styles.importRow}
          accessibilityRole="button"
          accessibilityLabel="Open your Carbon Passport"
        >
          <View style={styles.importIconWrap}>
            <VIcon name="sparkle" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <VText variant="body" style={styles.linkedAccountName}>
              Your Carbon Passport
            </VText>
            <VText variant="caption" style={styles.linkedAccountDate}>
              This month and this year, beautifully told
            </VText>
          </View>
          <VIcon name="chevron-right" size={18} color={colors.textTertiary} />
        </VPressable>

        {/* ── Import receipts — Sprint E Stage R3 ── */}
        <VPressable
          onPress={() => router.push('/import')}
          haptic="light"
          style={styles.importRow}
          accessibilityRole="button"
          accessibilityLabel="Import receipts"
        >
          <View style={styles.importIconWrap}>
            <VIcon name="share" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <VText variant="body" style={styles.linkedAccountName}>
              Import receipts
            </VText>
            <VText variant="caption" style={styles.linkedAccountDate}>
              Share a receipt or backfill Amazon/DoorDash orders
            </VText>
          </View>
          <VIcon name="chevron-right" size={18} color={colors.textTertiary} />
        </VPressable>

        {/* ── Sign out — quiet, this page is about pride ── */}
        <VPressable style={styles.signOutRow} onPress={() => void signOut()} haptic="light">
          <VText variant="caption" style={styles.signOutText}>
            Sign out
          </VText>
        </VPressable>
      </View>

      {/* ── Edit Profile sheet ── */}
      <VBottomSheet isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        <VPressable onPress={() => void handleAvatarTap()} haptic="light" style={styles.sheetAvatarWrap}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.sheetAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.sheetAvatar, styles.avatarFallback]}>
              <VText variant="title" style={styles.avatarInitials}>
                {initials}
              </VText>
            </View>
          )}
          <VText variant="caption" style={styles.changePhotoText}>
            Tap to change photo
          </VText>
        </VPressable>

        <VInput
          label="Display Name"
          value={displayNameInput}
          onChangeText={setDisplayNameInput}
          placeholder="Enter your name"
        />

        <View style={styles.saveButton}>
          <VButton
            variant="primary"
            label="Save"
            loading={isSaving}
            onPress={handleSave}
            fullWidth
          />
        </View>
      </VBottomSheet>

      {/* ── Challenge sheet ── */}
      <VBottomSheet
        isOpen={isChallengeSheetOpen}
        onClose={handleCloseChallengeSheet}
        title={
          sheetMode === 'create'
            ? 'New Challenge'
            : sheetMode === 'join'
              ? 'Join Challenge'
              : sheetMode === 'created'
                ? 'Challenge Created'
                : 'Challenges'
        }
      >
        {/* Back arrow between modes */}
        {(sheetMode === 'create' || sheetMode === 'join') && (
          <VPressable
            onPress={() => setSheetMode('select')}
            haptic="light"
            hitSlop={8}
            style={styles.sheetBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <VIcon name="chevron-left" size={16} color={colors.textSecondary} />
            <VText variant="caption">Back</VText>
          </VPressable>
        )}

        {sheetMode === 'select' && (
          <View style={styles.selectMode}>
            <VButton variant="primary" label="Create Challenge" fullWidth onPress={() => setSheetMode('create')} />
            <View style={styles.sheetButtonGap} />
            <VButton variant="secondary" label="Join with Code" fullWidth onPress={() => setSheetMode('join')} />
          </View>
        )}

        {sheetMode === 'create' && (
          <View style={styles.formStack}>
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
                label="Create"
                fullWidth
                loading={isCreating}
                onPress={handleCreate}
                disabled={!challengeTitle.trim()}
              />
            </View>
          </View>
        )}

        {sheetMode === 'join' && (
          <View style={styles.formStack}>
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
                label="Join"
                fullWidth
                loading={isJoining}
                onPress={handleJoin}
                disabled={inviteCodeInput.length < 8}
              />
            </View>
          </View>
        )}

        {sheetMode === 'created' && createdChallenge && (
          <View style={styles.createdMode}>
            {/* The invite ticket — a shareable moment */}
            <View style={styles.ticketBorder}>
              <LinearGradient
                colors={['rgba(27,107,66,0.12)', 'rgba(27,107,66,0.04)', 'rgba(27,107,66,0.10)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.ticket}>
                <VText variant="label" style={styles.inviteCodeLabel}>
                  Invite code
                </VText>
                <VText variant="mono" style={styles.inviteCode}>
                  {createdChallenge.invite_code}
                </VText>
                <VText variant="caption" style={styles.ticketHint}>
                  Friends enter this code to join your challenge
                </VText>
              </View>
            </View>
            <View style={styles.inviteActions}>
              <VButton variant="primary" label="Copy Code" fullWidth onPress={() => void handleCopyCode()} />
              <View style={styles.sheetButtonGap} />
              <VButton variant="secondary" label="Share" icon="share" fullWidth onPress={() => void handleShareCode()} />
            </View>
          </View>
        )}
      </VBottomSheet>

      {/* ── Toasts ── */}
      {toastBadge && (
        <VToast
          message={`Badge unlocked: ${toastBadge.name}`}
          icon={<VIcon name="trophy" size={18} color={colors.primaryLight} />}
          tone="success"
          onDismiss={() => setToastBadge(null)}
        />
      )}
      {errorToast && (
        <VToast
          message={errorToast}
          icon={<VIcon name="close" size={16} color={colors.danger} strokeWidth={2} />}
          tone="error"
          onDismiss={() => setErrorToast(null)}
        />
      )}
    </ScrollView>
  );
}

const AVATAR_SIZE = 72;
const SHEET_AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  heroPanel: {
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  avatarRing: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.primaryLight,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  displayName: {
    fontSize: 20,
  },
  avoidedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  avoidedText: {
    color: colors.primaryLight,
    fontWeight: '600',
    fontSize: typography.sizes.xs,
  },
  emailText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  editIcon: {
    padding: spacing.xs,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitleAccent: {
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: colors.primaryLight,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
  },
  newChallengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sectionAction: {
    fontWeight: '600',
    color: colors.primaryLight,
  },
  placeholderText: {
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
  linkedAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  linkedAccountName: {
    fontWeight: '600',
  },
  linkedAccountMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 3,
  },
  linkedAccountDate: {
    color: colors.textTertiary,
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  importIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primaryGlowSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  changePhotoText: {
    fontSize: typography.sizes.xs,
  },
  saveButton: {
    marginTop: spacing.md,
  },
  formStack: {
    gap: spacing.md,
  },
  signOutRow: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.textTertiary,
    fontWeight: '500',
  },
  selectMode: {
    paddingTop: spacing.sm,
  },
  sheetBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  sheetButtonGap: {
    height: spacing.sm,
  },
  createdMode: {
    paddingTop: spacing.sm,
  },
  ticketBorder: {
    borderRadius: radii.lg,
    padding: 1,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  ticket: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg - 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  inviteCodeLabel: {
    marginBottom: spacing.sm,
  },
  inviteCode: {
    fontSize: 32,
    letterSpacing: 8,
    color: colors.primaryLight,
  },
  ticketHint: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  inviteActions: {
    width: '100%',
  },
});
