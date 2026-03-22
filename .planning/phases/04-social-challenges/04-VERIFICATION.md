---
phase: 04-social-challenges
verified: 2026-03-22T00:00:00Z
status: passed
score: 18/18 must-haves verified
re_verification: false
human_verification:
  - test: "Create challenge flow end-to-end"
    expected: "User enters title/duration/target, taps Create, invite code appears at 32px JetBrains Mono with Copy and Share buttons functional"
    why_human: "Requires live Supabase connection and UI interaction to confirm invite_code is DB-generated and displayed correctly"
  - test: "Join challenge via invite code"
    expected: "User enters 8-char code, taps Join, appears in My Challenges list; baseline_kg captured from most recent weekly_summaries row"
    why_human: "Requires two-device or two-user test to confirm end-to-end invite code flow and baseline capture"
  - test: "Live leaderboard Realtime update"
    expected: "When participant logs a new entry, leaderboard ranking on challenge screen updates within 2 seconds without manual refresh"
    why_human: "Requires Supabase Realtime connection and concurrent session to verify sub-2-second update"
  - test: "Achievement toast slide-in animation"
    expected: "After first emission entry, 'Badge unlocked: First Log' toast slides in from top, stays 3 seconds, then slides back up"
    why_human: "Reanimated 3 animation requires runtime execution on device/simulator to verify visual behavior"
  - test: "Avatar upload and display on profile"
    expected: "Tapping avatar on edit sheet opens image picker, selecting photo uploads to avatars bucket, new avatar URL appears in profile header"
    why_human: "Requires expo-image-picker permission flow and live Supabase Storage to verify upload and URL retrieval"
  - test: "Privacy enforcement on leaderboard"
    expected: "Other users' raw emission kg values are never visible — only reduction %, rank, avatar, display name shown"
    why_human: "Requires checking rendered output with real multi-user data to confirm no raw kg leakage through UI"
---

# Phase 4: Social Challenges Verification Report

**Phase Goal:** Users can create/join challenges, track leaderboards, and earn achievements — making reduction social and motivating.
**Verified:** 2026-03-22
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees stats-first Profile screen with 3 VMetricCards | ✓ VERIFIED | `app/(tabs)/profile.tsx` line 284-299: three `VMetricCard` renders (lifetime total, best week, streak); file is 665 lines (well above 80 min) |
| 2 | User can tap edit icon to open VBottomSheet with display name + avatar | ✓ VERIFIED | `VBottomSheet` rendered at line 375; edit sheet contains `VInput` for display name and tappable avatar circle calling `uploadAvatar` |
| 3 | Saving display name persists to Supabase profiles table | ✓ VERIFIED | `useUpdateProfile()` in `hooks/useProfile.ts` (line 51): `useMutation` running UPDATE on `profiles` table; called from profile edit sheet on Save |
| 4 | Avatar upload stores to avatars bucket at {userId}/avatar.jpg | ✓ VERIFIED | `uploadAvatar` in `hooks/useProfile.ts` (line 83): `supabase.storage.from('avatars')` upsert to `${userId}/avatar.jpg` with base64→Uint8Array conversion |
| 5 | User can create a challenge — invite code displayed 32px JetBrains Mono with Copy and Share | ✓ VERIFIED | `hooks/useChallenges.ts`: insert to `challenges` + `.select('*').single()` retrieves DB-generated invite_code; `profile.tsx` line 656-657: `fontSize: 32`, `fontFamily: 'JetBrainsMono'`; line 182: `Clipboard.setStringAsync`; line 188: `Share.share` |
| 6 | User can join challenge via invite code with baseline_kg from weekly_summaries | ✓ VERIFIED | `useJoinChallenge` in `hooks/useChallenges.ts` (line 105): looks up by `invite_code.toUpperCase()`, calls internal `getBaselineKg` querying `weekly_summaries` (line 27), inserts into `challenge_participants` |
| 7 | My Challenges section shows ChallengeCard list | ✓ VERIFIED | `components/social/ChallengeCard.tsx` (78 lines): `TouchableOpacity`-wrapped VCard with title, date range, target reduction badge; wired in `profile.tsx` line 335-338 |
| 8 | Leaderboard shows participants ranked by reduction_pct DESC, null entries last | ✓ VERIFIED | `hooks/useLeaderboard.ts`: `_sortLeaderboard` (line 27-35) sorts DESC with null fallback to bottom; returns `LeaderboardEntry[]` with 1-based rank; `app/challenge/[id].tsx` renders `LeaderboardRow` list |
| 9 | Leaderboard updates via Supabase Realtime subscription | ✓ VERIFIED | `hooks/useChallengeRealtime.ts` (44 lines): subscribes to `challenge_participants:${challengeId}` channel, invalidates `['leaderboard', challengeId]` on change, `supabase.removeChannel(channel)` on unmount; mounted in `app/challenge/[id].tsx` line 25 |
| 10 | Only reduction % visible to other users — no raw kg (SOCL-06) | ✓ VERIFIED | `components/social/LeaderboardRow.tsx`: zero references to `baseline_kg` or `current_kg`; `app/challenge/[id].tsx`: zero references to raw kg in template |
| 11 | User earns 'First Log' badge after first emission entry | ✓ VERIFIED | `hooks/useAchievements.ts` (line 48): `first_log` case counts `emission_entries`; `hooks/useEmissionEntries.ts` (line 110): `checkAndUnlockAchievements(variables.userId)` called in `useCreateEntry.onSuccess` |
| 12 | Streak badges at 3/7/30 days (streak_days criteria) | ✓ VERIFIED | `hooks/useAchievements.ts` (line 57): `streak_days` case queries `daily_summaries` and computes consecutive days |
| 13 | 10% Reduction badge when current week down 10%+ from prior week | ✓ VERIFIED | `hooks/useAchievements.ts` (line 85): `reduction_pct` case queries last 2 `weekly_summaries` rows, computes (prior-current)/prior*100 |
| 14 | Badge toast slides in from top, shows name, dismisses after 3 seconds | ✓ VERIFIED | `components/social/AchievementToast.tsx`: `useSharedValue(-100)` → `withTiming(0, {duration:300})` → `withDelay(2700, withTiming(-100))` + `setTimeout(onDismiss, 3000)` |
| 15 | Profile Achievements section shows earned badges (color) and locked (grayscale) | ✓ VERIFIED | `components/social/AchievementBadge.tsx`: `earned ? colors.primary : colors.textTertiary` for circle fill; `profile.tsx` line 354-359: horizontal ScrollView mapping all achievements with `earned=achievementsData?.earned.some(...)` |
| 16 | Tapping challenge card navigates to leaderboard screen | ✓ VERIFIED | `profile.tsx` line 337: `router.push('/challenge/${cp.challenge_id}')` in ChallengeCard onPress; `app/challenge/[id].tsx` exists with `useLocalSearchParams<{id:string}>()` |
| 17 | All Wave 0 test stubs compile with 0 failures | ✓ VERIFIED | 5 test files in `__tests__/hooks/`: all contain `it.todo` stubs; `useLeaderboard.test.ts` additionally has 10 passing assertions for `_computeReductionPct` and `_sortLeaderboard` |
| 18 | 3 DB migrations exist with correct SQL | ✓ VERIFIED | All 3 files present in `supabase/migrations/`: `20260322000014` (ALTER PUBLICATION), `20260322000015` (INSERT INTO storage.buckets + 3 RLS policies), `20260322000016` (profiles_challenge_read policy) |

**Score:** 18/18 truths verified

---

## Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Key Evidence |
|----------|-----------|--------------|--------|--------------|
| `supabase/migrations/20260322000014_realtime_challenge_participants.sql` | — | present | ✓ VERIFIED | `ALTER PUBLICATION supabase_realtime ADD TABLE` |
| `supabase/migrations/20260322000015_storage_avatars_bucket.sql` | — | present | ✓ VERIFIED | `INSERT INTO storage.buckets` + 3 RLS policies |
| `supabase/migrations/20260322000016_profiles_rls_challenge_read.sql` | — | present | ✓ VERIFIED | `CREATE POLICY profiles_challenge_read` |
| `hooks/useProfile.ts` | — | 115 | ✓ VERIFIED | Exports `useProfile`, `useUpdateProfile`, `uploadAvatar` |
| `hooks/useChallenges.ts` | — | 142 | ✓ VERIFIED | Exports `useMyChallenges`, `useCreateChallenge`, `useJoinChallenge` |
| `hooks/useLeaderboard.ts` | — | 111 | ✓ VERIFIED | Exports `useLeaderboard`, `useChallengeDetail`, `_computeReductionPct`, `_sortLeaderboard` |
| `hooks/useChallengeRealtime.ts` | — | 44 | ✓ VERIFIED | Exports `useChallengeRealtime`; Realtime subscription + cleanup |
| `hooks/useAchievements.ts` | — | 158 | ✓ VERIFIED | Exports `useAchievements`, `checkAndUnlockAchievements`; all 4 criteria types |
| `components/social/ChallengeCard.tsx` | 30 | 78 | ✓ VERIFIED | `export default function ChallengeCard(` with `onPress` prop |
| `components/social/LeaderboardRow.tsx` | 30 | 114 | ✓ VERIFIED | `export default function LeaderboardRow(` with `isCurrentUser` and `reduction_pct` |
| `components/social/AchievementBadge.tsx` | 40 | 77 | ✓ VERIFIED | `react-native-svg` Svg/Circle/Path; `BADGE_ICONS` constant; `earned` prop |
| `components/social/AchievementToast.tsx` | 30 | 78 | ✓ VERIFIED | Reanimated 3 `useSharedValue`, `withTiming`, `withDelay` |
| `app/challenge/[id].tsx` | 60 | 163 | ✓ VERIFIED | `useLocalSearchParams`, `useChallengeRealtime`, `useLeaderboard` all imported and called |
| `app/(tabs)/profile.tsx` | 80 | 665 | ✓ VERIFIED | Full implementation: no stub text; all social hooks wired |
| `__tests__/hooks/useProfile.test.ts` | — | present | ✓ VERIFIED | Contains `it.todo` stubs |
| `__tests__/hooks/useChallenges.test.ts` | — | present | ✓ VERIFIED | Contains `it.todo` stubs |
| `__tests__/hooks/useLeaderboard.test.ts` | — | present | ✓ VERIFIED | Contains `it.todo` stubs + 10 passing assertions |
| `__tests__/hooks/useChallengeRealtime.test.ts` | — | present | ✓ VERIFIED | Contains `it.todo` stubs |
| `__tests__/hooks/useAchievements.test.ts` | — | present | ✓ VERIFIED | Contains `it.todo` stubs + real assertions for `checkAndUnlockAchievements` |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `app/(tabs)/profile.tsx` | `hooks/useProfile.ts` | `useProfile(user.id)` | ✓ WIRED | `profile.tsx` line 14: import; line 42: `useProfile(userId)` called |
| `hooks/useProfile.ts` (uploadAvatar) | avatars Storage bucket | `supabase.storage.from('avatars').upload(...)` | ✓ WIRED | `useProfile.ts` line 101-111: `supabase.storage.from('avatars')` upload + getPublicUrl |
| `supabase/migrations/20260322000016` | profiles SELECT policy | `CREATE POLICY profiles_challenge_read` | ✓ WIRED | Migration file contains `profiles_challenge_read`; `useLeaderboard.ts` comment (line 45) acknowledges dependency |
| `app/(tabs)/profile.tsx` | `hooks/useChallenges.ts` | `useCreateChallenge\|useJoinChallenge\|useMyChallenges` | ✓ WIRED | `profile.tsx` line 16: import; lines 124-125: both mutations called |
| `hooks/useChallenges.ts` (useJoinChallenge) | `challenge_participants` table | `supabase.from('challenge_participants').insert` | ✓ WIRED | `useChallenges.ts` line 125: `.from('challenge_participants').insert(...)` |
| `hooks/useChallenges.ts` (useCreateChallenge) | `challenges` table | `supabase.from('challenges').insert` | ✓ WIRED | `useChallenges.ts` line 69: `.from('challenges').insert(...)` + `.select('*').single()` returns invite_code |
| `app/challenge/[id].tsx` | `hooks/useChallengeRealtime.ts` | `useChallengeRealtime(challengeId)` | ✓ WIRED | `[id].tsx` line 6: import; line 25: `useChallengeRealtime(id)` called |
| `app/challenge/[id].tsx` | `hooks/useLeaderboard.ts` | `useLeaderboard(challengeId)` | ✓ WIRED | `[id].tsx` line 5: import; line 28: `useLeaderboard(id)` called |
| `hooks/useChallengeRealtime.ts` | supabase_realtime challenge_participants | `supabase.channel().on('postgres_changes')` | ✓ WIRED | `useChallengeRealtime.ts` line 23: `channel('challenge_participants:...')` + line 29: `table: 'challenge_participants'` |
| `hooks/useLeaderboard.ts` | profiles via RLS | `supabase.from('challenge_participants').select('*, profiles(display_name, avatar_url)')` | ✓ WIRED | `useLeaderboard.ts` line 57: exact select pattern confirmed |
| `hooks/useEmissionEntries.ts` | `hooks/useAchievements.ts` | `checkAndUnlockAchievements` in onSuccess | ✓ WIRED | `useEmissionEntries.ts` line 10: import; lines 110 + 153: called in both `useCreateEntry` and `useUpdateEntry` onSuccess |
| `components/social/AchievementToast.tsx` | Reanimated 3 | `useSharedValue + useAnimatedStyle` | ✓ WIRED | `AchievementToast.tsx` lines 4-7: imports `useSharedValue`, `withTiming`, `withDelay`, `useAnimatedStyle` |
| `app/(tabs)/profile.tsx` | `hooks/useAchievements.ts` | `useAchievements(user.id)` | ✓ WIRED | `profile.tsx` line 17: import; line 106: `useAchievements(userId)` called |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SOCL-01 | 04-01 | User has a profile with display name, avatar, and lifetime carbon stats | ✓ SATISFIED | `app/(tabs)/profile.tsx` (665 lines): display name, avatar (with initials fallback), 3 VMetricCards for stats; `hooks/useProfile.ts` for data |
| SOCL-02 | 04-02 | User can create a challenge with name, duration, and target reduction % | ✓ SATISFIED | `hooks/useChallenges.ts` `useCreateChallenge`: inserts challenge row, gets DB-generated invite_code; `profile.tsx`: create form with 3 inputs, invite code displayed at 32px JetBrains Mono |
| SOCL-03 | 04-02 | User can join an existing challenge via invite code | ✓ SATISFIED | `hooks/useChallenges.ts` `useJoinChallenge`: looks up by invite_code (uppercase), captures baseline_kg from weekly_summaries, inserts participant row; join form in profile.tsx |
| SOCL-04 | 04-03 | Challenge leaderboard shows participants ranked by emission reduction | ✓ SATISFIED | `hooks/useLeaderboard.ts`: sorts by `reduction_pct` DESC; `app/challenge/[id].tsx`: renders `LeaderboardRow` list with rank \| avatar \| name \| reduction% |
| SOCL-05 | 04-04 | User earns achievement badges for first log, 7-day streak, 10% reduction, etc. | ✓ SATISFIED | `hooks/useAchievements.ts`: all 4 criteria types; triggered from `useEmissionEntries.ts` mutation onSuccess; `AchievementBadge` + `AchievementToast` in Profile screen |
| SOCL-06 | 04-03 | User can view friends' challenges (not individual emission data — privacy) | ✓ SATISFIED | `LeaderboardRow.tsx`: zero references to `baseline_kg` or `current_kg`; `[id].tsx`: no raw kg rendered; `LeaderboardEntry` type exposes only `reduction_pct`, `rank`, `display_name`, `avatar_url` |

**Orphaned requirements:** None — all 6 SOCL IDs claimed by plans and verified in code.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/(tabs)/profile.tsx` | 337 | `router.push(... as any)` | ℹ️ Info | TypeScript `as any` cast for `/challenge/[id]` route — needed because typed routes are resolved at compile time; route file now exists so this could be removed |
| `app/(tabs)/profile.tsx` | 362 | `"No achievements yet"` text | ℹ️ Info | Valid empty state when `achievementsData?.achievements` is empty (no DB seed); not a stub — renders badges when achievements exist |

No blocker or warning anti-patterns found. Both items are informational.

---

## Human Verification Required

### 1. Create Challenge End-to-End Flow

**Test:** Open Profile tab, tap '+' on My Challenges, tap "Create Challenge", enter a title / 30 days / 10%, tap Create
**Expected:** Invite code (8 uppercase chars) appears in 32px JetBrains Mono with "Copy Code" and "Share" buttons both functional
**Why human:** Requires live Supabase connection; DB-generated invite_code can only be confirmed by observing the rendered UI value matches what was inserted

### 2. Join Challenge via Invite Code

**Test:** From a second account (or second session), open the join sheet, enter the invite code from test 1, tap Join
**Expected:** Challenge appears in My Challenges list on the joining user's profile; their baseline_kg is captured from their most recent weekly_summaries row
**Why human:** Multi-user flow requiring two sessions; baseline_kg capture only verifiable with real data

### 3. Live Leaderboard Realtime Update

**Test:** Open the leaderboard screen on two devices; have one participant log a new emission entry
**Expected:** Leaderboard ranking on the second device updates within 2 seconds without manual refresh
**Why human:** Requires active Supabase Realtime WebSocket connection and concurrent sessions to measure latency

### 4. Achievement Toast Animation

**Test:** Log the very first emission entry for a fresh user account
**Expected:** "Badge unlocked: First Log" toast slides in from top, remains visible for ~3 seconds, then slides back up smoothly
**Why human:** Reanimated 3 animation behavior requires device/simulator runtime execution; cannot verify visual timing from source code alone

### 5. Avatar Upload Flow

**Test:** Tap the avatar circle in the Edit Profile sheet, select a photo from the library
**Expected:** Photo uploads to Supabase avatars bucket, avatar_url updates in the profile header within a few seconds
**Why human:** Requires expo-image-picker permission prompt and live Supabase Storage write; network latency and permission UX not verifiable statically

### 6. Privacy — No Raw Kg Leakage

**Test:** As user B, open user A's challenge leaderboard; inspect every visible data point
**Expected:** Only see: rank number, avatar/initials, display name, reduction % (e.g. "-12.3%") — never any kg values
**Why human:** Requires real multi-user data to confirm the `profiles_challenge_read` RLS policy correctly returns data and no kg leakage occurs through any computed or nested fields

---

## Summary

All 18 automated must-haves are verified against the actual codebase. Every SOCL requirement (SOCL-01 through SOCL-06) is satisfied with substantive implementation — no stubs, no orphaned artifacts, no broken key links.

**Phase 4 goal status: ACHIEVED.** The social layer is fully wired:
- Profile screen with stats, edit flow, and avatar upload (SOCL-01)
- Challenge create/join with invite code sharing (SOCL-02, SOCL-03)
- Live-updating leaderboard showing only reduction % (SOCL-04, SOCL-06)
- Achievement badge system with Reanimated 3 toast (SOCL-05)

6 human verification tests are flagged for runtime confirmation of animation behavior, Realtime latency, and multi-user flows.

---

_Verified: 2026-03-22_
_Verifier: Claude (gsd-verifier)_
