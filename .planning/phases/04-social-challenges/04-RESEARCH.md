# Phase 4: Social & Challenges - Research

**Researched:** 2026-03-22
**Domain:** Supabase Realtime / Storage, Expo image picker / share / clipboard, achievement detection, SVG badge icons, RLS policy expansion
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Profile screen layout**
- Stats-first layout: lifetime carbon stats lead the screen, challenges and achievements are secondary sections below
- Top stats: 3 VMetricCards — total kg CO₂e logged (all-time), best week kg, current streak days. JetBrains Mono for all numbers.
- Edit profile via VBottomSheet — tap edit icon → sheet slides up with display name field and avatar picker. Consistent with Log tab sheet pattern.
- Below stats: 'My Challenges' section card with active challenges list and '+' button
- Below challenges: 'Achievements' section card with horizontal scroll row of badge circles

**Challenge navigation**
- Challenge list lives in 'My Challenges' section on Profile tab — no new tab added to nav bar
- Tapping a challenge navigates to `app/challenge/[id].tsx` via Expo Router push — full-screen leaderboard with back button, deep-linkable
- '+' button on 'My Challenges' section opens VBottomSheet with two options: 'Create challenge' and 'Join with code' — two separate forms within the same sheet
- After creating: show the 8-char invite code large and readable, with a 'Copy' button (clipboard) and 'Share' button (iOS share sheet / Android share intent)

**Achievement badge style**
- Horizontal scroll row of badge circles — earned = full color with custom SVG icon, locked = grayscale with lock overlay
- Custom SVG icons for each badge type (not emoji, not SF Symbols)
- When a badge is earned for the first time: toast notification slides in ('🏆 Badge unlocked: [Name]'), dismisses after 3s, non-blocking
- Achievement detection runs after each emission entry is created/updated

**Leaderboard data & privacy**
- Per participant shows: rank number, avatar, display name, reduction % from baseline only — no raw kg numbers visible to others (respects SOCL-06 privacy requirement)
- New participants without any entries during challenge period show at the bottom with '--' reduction % (not hidden, not 0%)
- Leaderboard uses Supabase Realtime subscription on `challenge_participants` table — updates in <2s as required by ROADMAP success criteria. Same pattern as `useEmissionRealtime`.

### Claude's Discretion
- Exact avatar upload implementation (Supabase Storage bucket configuration, image picker library)
- Loading skeleton design for leaderboard rows
- Challenge form validation error styling
- Exact VBottomSheet snap points for create/join forms

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SOCL-01 | User has a profile with display name, avatar, and lifetime carbon stats | profiles table exists, needs Storage bucket + image picker for avatar upload; lifetime stats computed from emission_entries |
| SOCL-02 | User can create a challenge with name, duration, and target reduction percentage | challenges table exists with full RLS; invite_code auto-generated via `upper(substr(md5(random()::text), 1, 8))`; needs expo-clipboard + expo-sharing for post-create code share |
| SOCL-03 | User can join an existing challenge via invite code | challenge_participants table exists; join = INSERT after SELECT by invite_code; baseline_kg must be set from weekly_summaries at join time |
| SOCL-04 | Challenge leaderboard shows participants ranked by emission reduction | challenge_participants has rank/baseline_kg/current_kg columns; leaderboard query joins profiles; Realtime subscription pattern from useEmissionRealtime ready to replicate; profiles SELECT RLS needs widening for participant visibility |
| SOCL-05 | User earns achievement badges for first log, 7-day streak, 10% reduction, etc. | achievements table seeded with 6 badges; user_achievements table exists; detection runs in useCreateEntry/useUpdateEntry onSuccess; icon field currently stores emoji — CONTEXT.md mandates custom SVG, so icon field serves as badge type identifier for SVG component lookup |
| SOCL-06 | User can view friends' challenges (not individual emission data — privacy) | challenge_participants SELECT policy is already open to all authenticated users; leaderboard shows reduction % only, not raw kg — privacy satisfied at query/display level |
</phase_requirements>

---

## Summary

Phase 4 builds entirely on an existing DB foundation. All 4 social tables (`profiles`, `challenges`, `challenge_participants`, `user_achievements`) plus the `achievements` seed table were created in Phase 1 migrations. The Supabase Realtime subscription pattern is established and proven in `useEmissionRealtime.ts` — the leaderboard hook is a direct structural copy filtered to `challenge_participants`. The React Query mutation/invalidation pattern from `useEmissionEntries.ts` provides the exact hook-in point for achievement detection.

Three new npm packages are required and not yet installed: `expo-image-picker` (camera roll access for avatar selection), `expo-clipboard` (copy invite code), and `expo-sharing` (iOS share sheet / Android intent for invite code). Avatar upload uses the Supabase Storage JS SDK — no extra package needed beyond those three. One critical RLS gap exists: the `profiles` table only allows users to SELECT their own row, but the leaderboard needs to join profiles for all challenge participants. This requires a new RLS policy before leaderboard queries can succeed.

The `baseline_kg` field on `challenge_participants` is nullable and must be populated at join time by reading the user's most recent `weekly_summaries` row. Achievement detection runs client-side in mutation `onSuccess` callbacks — the criteria types (`first_log`, `streak_days`, `reduction_pct`, `total_entries`) map to queryable Supabase data. The `icon` field in the `achievements` table currently stores emoji strings but will serve as a `criteria_type` identifier for a SVG icon lookup map at display time, since CONTEXT.md mandates custom SVG badges.

**Primary recommendation:** Plan in 4 waves — (1) Profile screen + avatar upload, (2) Challenges create/join, (3) Leaderboard with Realtime, (4) Achievements + toast. New migrations needed for: Realtime publication addition for `challenge_participants`, Storage bucket creation, and the profiles SELECT policy expansion.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.99.1 (installed) | DB queries, Realtime, Storage uploads | Already the project data layer |
| `react-native-reanimated` | ~4.1.1 (installed) | Toast slide-in animation, sheet animations | Project mandate — Animated API banned |
| `react-native-svg` | 15.12.1 (installed) | Custom SVG achievement badge icons | Already used for charts |
| `expo-image` | ~3.0.11 (installed) | Display avatar images with caching | Already installed, faster than Image |
| `expo-file-system` | 19.0.21 (installed) | Read picked image as base64/blob for Storage upload | Already installed |

### New Packages Required
| Library | Install Command | Purpose | Notes |
|---------|----------------|---------|-------|
| `expo-image-picker` | `npx expo install expo-image-picker` | Camera roll / photo library access for avatar selection | Not installed — required for SOCL-01 |
| `expo-clipboard` | `npx expo install expo-clipboard` | Copy invite code to clipboard | Not installed — required for SOCL-02 |
| `expo-sharing` | `npx expo install expo-sharing` | iOS share sheet + Android intent for invite code | Not installed — required for SOCL-02 |

**Installation:**
```bash
npx expo install expo-image-picker expo-clipboard expo-sharing
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-image-picker` | `react-native-image-picker` | expo-image-picker integrates with Expo permissions system; preferred for Expo SDK 54 |
| `expo-sharing` | `react-native-share` | expo-sharing is lighter, no extra native setup; sufficient for text/invite code sharing |
| Client-side achievement detection | Supabase DB triggers | Client-side is simpler, already works in mutation onSuccess; DB triggers require Edge Function or PG function complexity |

---

## Architecture Patterns

### Recommended Project Structure
```
app/
├── (tabs)/
│   └── profile.tsx              # Replace stub — full Profile screen
└── challenge/
    └── [id].tsx                 # New — leaderboard/detail deep-link route

hooks/
├── useProfile.ts                # SELECT + UPDATE profiles (display_name, avatar_url)
├── useChallenges.ts             # My challenges list, create, join by invite code
├── useLeaderboard.ts            # Participants joined with profiles for [id] screen
├── useChallengeRealtime.ts      # Supabase Realtime on challenge_participants — replicate useEmissionRealtime.ts
└── useAchievements.ts           # All achievements + user_achievements, unlock mutation

components/
├── social/
│   ├── LeaderboardRow.tsx        # rank | avatar | display_name | reduction_pct
│   ├── ChallengeCard.tsx         # VCard with challenge title, dates, participant count
│   ├── AchievementBadge.tsx      # SVG circle — earned (color) vs locked (grayscale + lock)
│   └── AchievementToast.tsx      # Reanimated 3 slide-in toast, auto-dismiss 3s
└── ui/                           # No new V* base components needed

supabase/migrations/
├── 20260322000014_realtime_challenge_participants.sql  # ADD TABLE to publication
├── 20260322000015_storage_avatars_bucket.sql           # Supabase Storage bucket
└── 20260322000016_profiles_rls_challenge_read.sql      # SELECT policy for leaderboard joins
```

### Pattern 1: Supabase Realtime for Leaderboard (direct replication of useEmissionRealtime)
**What:** Subscribe to `postgres_changes` on `challenge_participants` filtered by `challenge_id`, invalidate TanStack Query cache on any change.
**When to use:** Mount in `app/challenge/[id].tsx` — challenge-scoped, not global. Mount inside component so it cleans up when user navigates away.

```typescript
// Source: replication of hooks/useEmissionRealtime.ts — verified pattern
export function useChallengeRealtime(challengeId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!challengeId) return;

    const channel = supabase
      .channel(`challenge_participants:${challengeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_participants',
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard', challengeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, queryClient]);
}
```

### Pattern 2: Avatar Upload via Supabase Storage
**What:** Pick image with expo-image-picker → read file as base64 via expo-file-system → upload to `avatars` bucket → get public URL → UPDATE profiles.avatar_url.
**When to use:** Edit Profile sheet, save button handler.

```typescript
// Source: Supabase JS SDK Storage upload pattern (verified against Supabase docs)
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

async function uploadAvatar(userId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],      // Square crop for avatar
    quality: 0.7,        // Reduce file size
  });

  if (result.canceled || !result.assets[0]) return null;

  const uri = result.assets[0].uri;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const filePath = `${userId}/avatar.jpg`;
  const contentType = 'image/jpeg';
  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, decode(base64), { contentType, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return data.publicUrl;
}
// Note: decode = atob or base64-arraybuffer decode — use Uint8Array from base64 string
// Supabase Storage accepts ArrayBuffer or Blob; use Buffer.from(base64, 'base64') in RN
```

**Storage bucket config needed (migration):**
```sql
-- Supabase Storage bucket — avatars, public read for leaderboard display
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- RLS: users can upload/update only their own folder (userId/avatar.jpg)
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Public read on avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
```

### Pattern 3: Invite Code Copy + Share
**What:** After challenge creation, display 8-char code with two action buttons.
**When to use:** Post-create success state within VBottomSheet.

```typescript
// Source: expo-clipboard and expo-sharing official APIs
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';

// Copy to clipboard
await Clipboard.setStringAsync(inviteCode);

// Share sheet (iOS share sheet / Android intent)
const isAvailable = await Sharing.isAvailableAsync();
if (isAvailable) {
  await Sharing.shareAsync(
    // expo-sharing requires a file URI; for plain text use a temp file approach
    // OR use React Native's built-in Share API which handles text directly
  );
}
```

**PITFALL:** `expo-sharing` is designed for files, not plain text strings. For text sharing, use React Native's built-in `Share` API instead — it calls the native iOS share sheet and Android intent directly with text content.

```typescript
// Source: React Native Share API (built-in, no install needed)
import { Share } from 'react-native';

await Share.share({
  message: `Join my Veridian carbon challenge! Use code: ${inviteCode}`,
  title: 'Veridian Challenge Invite',
});
```

### Pattern 4: Achievement Detection in Mutation onSuccess
**What:** After emit entry create/update, check criteria client-side and INSERT into `user_achievements` if criteria met and badge not already earned.
**When to use:** In `useCreateEntry` and `useUpdateEntry` mutation `onSuccess` callbacks.

```typescript
// Source: pattern derived from useEmissionEntries.ts onSuccess structure
async function checkAndUnlockAchievements(userId: string) {
  // 1. Fetch all achievements the user has NOT yet earned
  const { data: allAchievements } = await supabase.from('achievements').select('*');
  const { data: earned } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const earnedIds = new Set(earned?.map(e => e.achievement_id) ?? []);
  const unearned = allAchievements?.filter(a => !earnedIds.has(a.id)) ?? [];

  const newlyEarned: Achievement[] = [];

  for (const achievement of unearned) {
    const met = await checkCriteria(achievement, userId);
    if (met) {
      await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_id: achievement.id,
      });
      newlyEarned.push(achievement);
    }
  }

  return newlyEarned; // caller shows toast for each
}
```

**Criteria evaluation map:**
| criteria_type | Data source | Query |
|---------------|-------------|-------|
| `first_log` | emission_entries COUNT | `count > 0` after first insert |
| `streak_days` | daily_summaries | COUNT consecutive days up to today |
| `reduction_pct` | weekly_summaries | compare current week to prior week |
| `total_entries` | emission_entries COUNT | COUNT >= criteria_value |

### Pattern 5: Custom SVG Achievement Badge
**What:** React Native SVG component rendering a circle badge. Earned = full color + themed icon path. Locked = grayscale filter + lock icon overlay.
**When to use:** In `AchievementBadge.tsx` — receives `achievement` object and `earned: boolean`.

```typescript
// Source: react-native-svg 15.x installed; pattern consistent with VProgressRing usage
import Svg, { Circle, G, Path } from 'react-native-svg';

// Badge icon paths keyed by criteria_type (not by emoji icon field value)
const BADGE_ICONS: Record<AchievementCriteriaType, string> = {
  first_log: '...svg path data...',
  streak_days: '...svg path data...',
  reduction_pct: '...svg path data...',
  total_entries: '...svg path data...',
};

// Earned: render with colors.primary fill + icon
// Locked: render with colors.textTertiary fill + lock path overlay
```

**Key insight:** The `icon` field in `achievements` table stores emoji strings (seeded as '🌱', '🔥', etc.). Do NOT use these for rendering. Use `criteria_type` as the SVG lookup key — it's the discriminator for badge type, and multiple achievements share a criteria_type (e.g., streak_days has 3-day, 7-day, 30-day). For distinct SVG per badge, use `achievement.name` as lookup key or `criteria_type + criteria_value` composite key.

### Pattern 6: Baseline kg on Challenge Join
**What:** When a user joins a challenge, populate `baseline_kg` immediately from their most recent `weekly_summaries` row.
**When to use:** In the JOIN mutation before INSERT into `challenge_participants`.

```typescript
// Source: pattern derived from existing weekly_summaries query in useSummaries.ts
async function getBaselineKg(userId: string): Promise<number> {
  const { data } = await supabase
    .from('weekly_summaries')
    .select('total_kg_co2e')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1)
    .single();

  return data?.total_kg_co2e ?? 0; // 0 for brand-new users with no history
}
```

**Note:** Users with no weekly summary data get `baseline_kg = 0`. The leaderboard should show '--' reduction % for these users rather than dividing by zero — handle in `LeaderboardEntry` computation: `baseline_kg === 0 ? null : ((baseline_kg - current_kg) / baseline_kg) * 100`.

### Anti-Patterns to Avoid
- **Reading profiles for leaderboard without RLS fix:** The current profiles SELECT policy uses `USING ((select auth.uid()) = id)` — a JOIN from `challenge_participants` to `profiles` for other users' rows will silently return null. Add the participant-visible policy BEFORE building the leaderboard query.
- **Using `expo-sharing` for plain text:** It requires a file URI. Use React Native's built-in `Share` API for text invite codes.
- **Subscribing to `challenge_participants` without enabling Realtime publication:** The current `20260315000013_enable_realtime.sql` only adds `emission_entries`. A new migration must `ALTER PUBLICATION supabase_realtime ADD TABLE challenge_participants`.
- **Mounting useChallengeRealtime in root layout:** Unlike `useEmissionRealtime`, the challenge subscription is scoped to a specific challenge. Mount inside `app/challenge/[id].tsx` so it subscribes/unsubscribes as the user navigates to/from the leaderboard screen.
- **Direct upload of `uri` string to Supabase Storage:** Storage SDK needs an ArrayBuffer or Blob — read file as base64 via expo-file-system, then convert with `Uint8Array.from(atob(base64), c => c.charCodeAt(0))` or equivalent.
- **Achievement detection on every render:** Run only in mutation `onSuccess` callbacks (create/update entry), never in query hooks. This avoids duplicate unlock attempts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image picking from camera roll | Custom file browser | `expo-image-picker` | Handles iOS photo library permissions, Android storage, cropping |
| Clipboard write | Pasteboard native module | `expo-clipboard` | Cross-platform; handles UIPasteboard (iOS) and ClipboardManager (Android) |
| Share sheet / intent | Native module bridge | `React Native Share` (built-in) | Already in RN; handles iOS UIActivityViewController and Android ACTION_SEND |
| Realtime subscription management | Custom WebSocket | Supabase Realtime channel | Already used — adds dedup, reconnect, filter push-down |
| Image caching for avatars | Manual AsyncStorage cache | `expo-image` (already installed) | Memory + disk cache, blurhash placeholder support |
| Avatar storage file path construction | UUID + timestamp naming | `${userId}/avatar.jpg` with `upsert: true` | Overwrites old avatar automatically; public URL is stable |

---

## Common Pitfalls

### Pitfall 1: Profiles RLS Blocks Leaderboard Join
**What goes wrong:** `challenge_participants` joined with `profiles` returns null for all non-self profile rows. The leaderboard renders empty display names and null avatars.
**Why it happens:** The profiles SELECT policy is `USING ((select auth.uid()) = id)` — row-level, so only the authenticated user's own profile row is visible.
**How to avoid:** Add a second SELECT policy before writing any leaderboard query: `USING (id IN (SELECT user_id FROM challenge_participants WHERE challenge_id IN (SELECT challenge_id FROM challenge_participants WHERE user_id = (select auth.uid()))))` — allows a user to see profiles of people who share a challenge with them.
**Warning signs:** Leaderboard query returns rows but `profiles` fields are all null/undefined.

### Pitfall 2: challenge_participants Not Added to Realtime Publication
**What goes wrong:** `useChallengeRealtime` subscribes and gets no events — leaderboard never auto-updates.
**Why it happens:** Supabase Realtime only broadcasts tables explicitly added via `ALTER PUBLICATION supabase_realtime ADD TABLE tablename`. The existing migration only adds `emission_entries`.
**How to avoid:** New migration `20260322000014_realtime_challenge_participants.sql` containing `ALTER PUBLICATION supabase_realtime ADD TABLE challenge_participants;` must be applied before the Realtime hook is tested.
**Warning signs:** Realtime channel subscribes successfully (no error), but no events arrive when `challenge_participants` rows change.

### Pitfall 3: Supabase Storage Upload with Wrong Data Type
**What goes wrong:** Upload fails with "Invalid value for 'body'" or avatar never appears.
**Why it happens:** The Supabase Storage JS client `.upload()` method in RN environment requires an ArrayBuffer or Uint8Array — not a file URI string, not a base64 string directly.
**How to avoid:** Use `expo-file-system` to read the file as base64, then convert:
```typescript
const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
await supabase.storage.from('avatars').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
```
**Warning signs:** Upload returns error or empty response with no network error visible.

### Pitfall 4: Division by Zero in Reduction % Calculation
**What goes wrong:** App crashes or shows `Infinity%` for users whose `baseline_kg` is 0 (new users with no emission history).
**Why it happens:** `(baseline - current) / baseline * 100` → divide by zero when baseline is 0.
**How to avoid:** In leaderboard computation: `const reductionPct = participant.baseline_kg === 0 ? null : ((participant.baseline_kg - (participant.current_kg ?? 0)) / participant.baseline_kg) * 100`. Render `null` as '--' in the UI (per CONTEXT.md decision).
**Warning signs:** Leaderboard row shows `NaN%` or `Infinity%`.

### Pitfall 5: Achievement Detection Race Condition on Duplicate Unlock
**What goes wrong:** Same achievement is inserted twice if two entries are created quickly, violating `UNIQUE (user_id, achievement_id)` constraint and causing a thrown Supabase error.
**Why it happens:** Both `onSuccess` handlers fire concurrently, both check earned status before either has inserted.
**How to avoid:** The `UNIQUE` constraint in the DB is the safety net — catch the constraint violation error (code `23505`) and silently ignore it. Alternatively, use `.upsert()` with `ignoreDuplicates: true` for `user_achievements` inserts.
**Warning signs:** Console shows `duplicate key value violates unique constraint "user_achievements_user_id_achievement_id_key"`.

### Pitfall 6: Toast Shown for Every App Load, Not Just First Unlock
**What goes wrong:** Toast fires every time the user opens the app and achievement data is fetched.
**Why it happens:** Toast trigger is wired to the query result (achievements list) rather than the mutation response (the moment of unlock).
**How to avoid:** Toast must be triggered exclusively from the `checkAndUnlockAchievements` function's return value inside mutation `onSuccess`. Never trigger from `useAchievements` query result.
**Warning signs:** Toast appears on every screen navigation or app open.

---

## Code Examples

### Realtime Channel Setup (Challenge-Scoped)
```typescript
// Source: structural replication of hooks/useEmissionRealtime.ts
const channel = supabase
  .channel(`challenge_participants:${challengeId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'challenge_participants',
    filter: `challenge_id=eq.${challengeId}`,
  }, () => {
    queryClient.invalidateQueries({ queryKey: ['leaderboard', challengeId] });
  })
  .subscribe();
// Cleanup: return () => { supabase.removeChannel(channel); };
```

### Leaderboard Query with Profile Join
```typescript
// Source: Supabase JS v2 select with foreign table join
const { data } = await supabase
  .from('challenge_participants')
  .select('*, profiles(display_name, avatar_url)')
  .eq('challenge_id', challengeId)
  .order('rank', { ascending: true, nullsFirst: false });
// Returns ChallengeParticipantWithProfile[] — type already defined in types/challenge.ts
```

### Join Challenge by Invite Code
```typescript
// Source: derived from existing Supabase query patterns in project
const { data: challenge, error } = await supabase
  .from('challenges')
  .select('id, start_date, end_date')
  .eq('invite_code', inviteCode.toUpperCase().trim())
  .single();

if (error || !challenge) throw new Error('Invalid invite code');

const baselineKg = await getBaselineKg(userId);

await supabase.from('challenge_participants').insert({
  challenge_id: challenge.id,
  user_id: userId,
  baseline_kg: baselineKg,
  current_kg: baselineKg, // starts equal to baseline
});
```

### Invite Code RLS Gap (profiles SELECT expansion needed)
```sql
-- Source: analysis of existing 20260315000000_create_profiles.sql
-- Existing: USING ((select auth.uid()) = id) -- self only
-- NEW policy needed:
CREATE POLICY "Challenge participants can view co-participant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT cp.user_id FROM challenge_participants cp
      WHERE cp.challenge_id IN (
        SELECT cp2.challenge_id FROM challenge_participants cp2
        WHERE cp2.user_id = (select auth.uid())
      )
    )
  );
```

### React Native Share for Invite Code
```typescript
// Source: React Native built-in Share API — no install needed
import { Share } from 'react-native';

const result = await Share.share({
  message: `Join my Veridian carbon challenge!\nInvite code: ${inviteCode}\n\nDownload Veridian to start tracking your carbon footprint.`,
});
// result.action: 'sharedAction' | 'dismissedAction'
```

### Achievement Streak Detection
```typescript
// Source: derived from daily_summaries table pattern established in Phase 2
async function checkStreakDays(userId: string, targetDays: number): Promise<boolean> {
  // Get last N days of daily_summaries where total_kg_co2e > 0
  const { data } = await supabase
    .from('daily_summaries')
    .select('date, total_kg_co2e')
    .eq('user_id', userId)
    .gt('total_kg_co2e', 0)
    .order('date', { ascending: false })
    .limit(targetDays);

  if (!data || data.length < targetDays) return false;

  // Verify days are consecutive
  for (let i = 0; i < targetDays - 1; i++) {
    const current = new Date(data[i].date);
    const next = new Date(data[i + 1].date);
    const diff = (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
    if (diff !== 1) return false;
  }
  return true;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Emoji icons in achievements seed | SVG icon components keyed by badge type | Phase 4 design decision | `icon` DB field is legacy — use `criteria_type`/`name` for SVG lookup |
| `expo-sharing` for text content | React Native built-in `Share` API | Always true — expo-sharing is file-based | Avoid installing expo-sharing at all; RN Share handles text invite codes |

**Deprecated/outdated:**
- Achievement `icon` field (emoji strings): The DB has emoji-based icon values seeded. These are irrelevant for Phase 4 — render SVG icons based on achievement name/criteria_type lookup instead. The field can be ignored at display time.

---

## Open Questions

1. **Storage bucket — SQL migration vs Supabase dashboard**
   - What we know: Supabase Storage buckets can be created via SQL INSERT into `storage.buckets` table
   - What's unclear: Whether the local Supabase instance (supabase/config.toml) needs a `storage` section configured
   - Recommendation: Use SQL migration for bucket creation (consistent with project's migration-first approach); verify `supabase/config.toml` has storage enabled (it is default in Supabase CLI projects)

2. **current_kg update strategy for leaderboard ranking**
   - What we know: `challenge_participants.current_kg` must reflect the user's total emissions during the challenge period to compute reduction %
   - What's unclear: Whether `current_kg` should be updated by client (in emission entry mutation onSuccess) or by a DB trigger/function
   - Recommendation: Update `current_kg` client-side in the achievement detection flow after each emission entry mutation — query `emission_entries` SUM for the challenge date range and UPDATE `challenge_participants`. Keeps pattern consistent with existing client-side summary computation.

3. **Base64 upload compatibility in RN Hermes**
   - What we know: `Uint8Array.from(atob(base64), c => c.charCodeAt(0))` works in web/Node; RN with Hermes has `atob` available since RN 0.70+
   - What's unclear: Whether there are edge cases with large images in the RN 0.81.5 + Hermes environment
   - Recommendation: Use `Buffer.from(base64, 'base64')` if `atob` is unavailable; alternatively use the `base64-arraybuffer` npm package as a fallback (lightweight, no native deps)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | jest-expo@54.0.17 + jest@30.3.0 |
| Config file | `jest.config.js` at project root |
| Quick run command | `npx jest --testPathPattern="social\|challenge\|achievement\|profile" --passWithNoTests` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SOCL-01 | useProfile returns profile data for authenticated user | unit | `npx jest __tests__/hooks/useProfile.test.ts -t "returns profile"` | ❌ Wave 0 |
| SOCL-01 | updateProfile mutation updates display_name and avatar_url | unit | `npx jest __tests__/hooks/useProfile.test.ts -t "updates profile"` | ❌ Wave 0 |
| SOCL-02 | useCreateChallenge inserts row and returns invite_code | unit | `npx jest __tests__/hooks/useChallenges.test.ts -t "creates challenge"` | ❌ Wave 0 |
| SOCL-03 | useJoinChallenge resolves challenge by invite_code and inserts participant | unit | `npx jest __tests__/hooks/useChallenges.test.ts -t "joins challenge"` | ❌ Wave 0 |
| SOCL-03 | useJoinChallenge throws on invalid invite code | unit | `npx jest __tests__/hooks/useChallenges.test.ts -t "invalid code"` | ❌ Wave 0 |
| SOCL-04 | useLeaderboard returns entries sorted by reduction_pct desc | unit | `npx jest __tests__/hooks/useLeaderboard.test.ts` | ❌ Wave 0 |
| SOCL-04 | LeaderboardEntry with baseline_kg = 0 shows null reduction_pct | unit | `npx jest __tests__/hooks/useLeaderboard.test.ts -t "zero baseline"` | ❌ Wave 0 |
| SOCL-05 | checkAndUnlockAchievements detects first_log criterion | unit | `npx jest __tests__/lib/achievements.test.ts -t "first_log"` | ❌ Wave 0 |
| SOCL-05 | checkAndUnlockAchievements ignores already-earned badges | unit | `npx jest __tests__/lib/achievements.test.ts -t "skip earned"` | ❌ Wave 0 |
| SOCL-06 | Leaderboard does not expose raw kg values in returned data | unit | `npx jest __tests__/hooks/useLeaderboard.test.ts -t "no raw kg"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="social\|challenge\|achievement\|profile" --passWithNoTests`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/hooks/useProfile.test.ts` — covers SOCL-01
- [ ] `__tests__/hooks/useChallenges.test.ts` — covers SOCL-02, SOCL-03
- [ ] `__tests__/hooks/useLeaderboard.test.ts` — covers SOCL-04, SOCL-06
- [ ] `__tests__/lib/achievements.test.ts` — covers SOCL-05

---

## DB Changes Required (New Migrations)

All 4 social tables already exist. Three new migrations are needed:

### Migration 1: Realtime publication for challenge_participants
```sql
-- 20260322000014_realtime_challenge_participants.sql
ALTER PUBLICATION supabase_realtime ADD TABLE challenge_participants;
```

### Migration 2: Supabase Storage avatars bucket
```sql
-- 20260322000015_storage_avatars_bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Public read on avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
```

### Migration 3: Profiles SELECT policy expansion for leaderboard
```sql
-- 20260322000016_profiles_rls_challenge_read.sql
CREATE POLICY "Challenge participants can view co-participant profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    id = (select auth.uid())
    OR
    id IN (
      SELECT cp.user_id FROM challenge_participants cp
      WHERE cp.challenge_id IN (
        SELECT cp2.challenge_id FROM challenge_participants cp2
        WHERE cp2.user_id = (select auth.uid())
      )
    )
  );
-- Note: keep existing "Users can view own profile" policy or merge with this one
-- If keeping both: both apply (OR semantics across policies)
```

---

## Sources

### Primary (HIGH confidence)
- `hooks/useEmissionRealtime.ts` — Realtime subscription pattern (direct read, verified)
- `hooks/useEmissionEntries.ts` — mutation pattern with onSuccess (direct read, verified)
- `supabase/migrations/20260315000005_create_challenges.sql` — challenges schema (direct read)
- `supabase/migrations/20260315000006_create_challenge_participants.sql` — participants schema + RLS (direct read)
- `supabase/migrations/20260315000007_create_achievements.sql` — achievements seed data (direct read)
- `supabase/migrations/20260315000000_create_profiles.sql` — profiles RLS gap identified (direct read)
- `supabase/migrations/20260315000013_enable_realtime.sql` — Realtime publication scope (direct read)
- `types/challenge.ts`, `types/achievement.ts`, `types/user.ts` — TypeScript types (direct read)
- `package.json` — installed packages confirmed (direct read)
- `components/ui/VBottomSheet.tsx` — sheet pattern (direct read)
- `app/_layout.tsx` — Realtime mount pattern (direct read)

### Secondary (MEDIUM confidence)
- React Native `Share` API for text sharing — standard RN built-in, project already uses RN 0.81.5
- Supabase Storage upload with Uint8Array — standard Supabase JS v2 pattern, consistent with SDK docs
- `expo-image-picker` MediaTypeOptions.Images + allowsEditing + aspect crop — standard Expo SDK 54 usage

### Tertiary (LOW confidence)
- `atob` availability in Hermes RN 0.81.5 — likely works but not directly verified in this project's test environment; fallback with `base64-arraybuffer` package recommended

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against package.json; new packages are official Expo SDK 54 modules
- Architecture: HIGH — patterns directly derived from existing verified code in the project
- DB schema: HIGH — all migrations read directly; RLS gaps identified from actual policy text
- Pitfalls: HIGH — derived from actual code analysis (RLS policy text, Realtime migration scope)
- Avatar upload: MEDIUM — Supabase Storage + expo-file-system pattern is standard but not yet exercised in this project

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable stack; Supabase Storage APIs are stable)
