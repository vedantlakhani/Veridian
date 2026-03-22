---
phase: 04-social-challenges
plan: 01
subsystem: social-profile
tags: [supabase, migrations, storage, rls, react-query, expo-image-picker, profile, wave-0-tests]
dependency_graph:
  requires: []
  provides:
    - avatars-storage-bucket
    - challenge-participants-realtime
    - profiles-challenge-read-rls
    - useProfile-hook
    - useUpdateProfile-hook
    - uploadAvatar-utility
    - profile-screen
    - wave-0-test-stubs
  affects:
    - hooks/useChallenges.ts (Plan 04-02)
    - hooks/useLeaderboard.ts (Plan 04-02)
    - app/(tabs)/challenges.tsx (Plan 04-02)
tech_stack:
  added:
    - expo-image-picker@~17.0.10
    - expo-clipboard@~8.0.8
    - expo-file-system/legacy (EncodingType, readAsStringAsync)
  patterns:
    - TanStack Query useQuery/useMutation for profiles table
    - Supabase Storage upload with base64→Uint8Array conversion
    - Wave 0 test stub pattern (it.todo, no impl assertions)
key_files:
  created:
    - supabase/migrations/20260322000014_realtime_challenge_participants.sql
    - supabase/migrations/20260322000015_storage_avatars_bucket.sql
    - supabase/migrations/20260322000016_profiles_rls_challenge_read.sql
    - hooks/useProfile.ts
    - __tests__/hooks/useProfile.test.ts
    - __tests__/hooks/useChallenges.test.ts
    - __tests__/hooks/useLeaderboard.test.ts
    - __tests__/hooks/useChallengeRealtime.test.ts
    - __tests__/hooks/useAchievements.test.ts
  modified:
    - app/(tabs)/profile.tsx (replaced stub with full screen)
    - package.json (expo-image-picker, expo-clipboard)
    - supabase/config.toml (db major_version updated to 17)
decisions:
  - Used expo-file-system/legacy import path for EncodingType and readAsStringAsync — new expo-file-system v18 restructured exports; EncodingType lives in legacy subpath
  - supabase migration repair used to mark Phase 1-3 migrations as applied before pushing Phase 4 migrations — remote DB had schema but no migration history entry
  - Profile stats row uses 3 independent queries (emission_entries all-time sum, weekly_summaries min for best week, daily_summaries for streak) — avoids new aggregation columns
  - Wave 0 stubs use minimal describe/it.todo pattern (no beforeAll import guard) — hook already exists so no guard needed for useProfile; other 4 follow same minimal pattern for consistency
metrics:
  duration: ~7min
  completed: 2026-03-22
  tasks_completed: 3
  files_created_or_modified: 12
---

# Phase 4 Plan 01: DB Foundation, Profile Screen, Wave 0 Test Stubs Summary

**One-liner:** Supabase avatars Storage bucket, challenge_participants Realtime publication, profiles leaderboard RLS, useProfile/useUpdateProfile/uploadAvatar hooks, stats-first Profile screen with edit VBottomSheet, and 5 Wave 0 test stub files enabling Plans 02-04.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | DB migrations — Realtime, Storage, RLS | 4d68e3d | 3 migration SQL files |
| 2 | Wave 0 test stubs + hooks/useProfile.ts | 488b66e | 5 test stubs, hooks/useProfile.ts |
| 3 | Profile screen — stats, challenges, edit sheet | 184b11d | app/(tabs)/profile.tsx (379 lines) |

## What Was Built

### Task 1: Three DB Migrations
- **20260322000014**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants` — enables useChallengeRealtime events in Plan 02-03
- **20260322000015**: `avatars` Storage bucket (public=true) with INSERT/UPDATE/SELECT RLS — user can only write to their own `{userId}/` folder; public read for leaderboard avatar display
- **20260322000016**: `profiles_challenge_read` policy — authenticated users can read profiles of fellow challenge participants via subquery; always allows own row

All three applied to remote Supabase via `supabase db push` after repairing migration history.

### Task 2: hooks/useProfile.ts + Wave 0 Stubs
- `useProfile(userId)`: useQuery hitting `profiles` table, returns `UserProfile | null`, enabled: !!userId, handles PGRST116 gracefully for new users
- `useUpdateProfile()`: useMutation updating `display_name` and/or `avatar_url`, invalidates `['profile', userId]` on success
- `uploadAvatar(userId)`: non-hook async utility — ImagePicker -> base64 -> Uint8Array -> avatars Storage bucket upsert -> returns publicUrl
- 5 Wave 0 stub files: all compile, 14 todo tests, jest exits 0

### Task 3: Profile Screen (379 lines)
- Stats-first layout: Avatar header with initials fallback, display name, edit icon
- Stats row: 3 VMetricCards (lifetime total kg, best week kg, streak days) — each backed by independent TanStack Query hook
- My Challenges section: VEmptyState placeholder (ChallengeCard built in Plan 02)
- Achievements section: Text placeholder (AchievementBadge built in Plan 04)
- Edit VBottomSheet: VInput for display name + tappable avatar circle → `uploadAvatar` → `updateProfile`; save button shows loading state while `isPending`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] expo-file-system EncodingType import path**
- **Found during:** Task 2 TypeScript check
- **Issue:** `import * as FileSystem from 'expo-file-system'` caused `TS2339: Property 'EncodingType' does not exist` — expo-file-system v18 restructured exports; `EncodingType` moved to legacy subpath
- **Fix:** Changed import to `import * as FileSystem from 'expo-file-system/legacy'`
- **Files modified:** `hooks/useProfile.ts`
- **Commit:** 184b11d (included in Task 3 commit)

**2. [Rule 3 - Blocking] Supabase migration history repair**
- **Found during:** Task 1 db push
- **Issue:** `supabase db push` tried to re-apply all migrations (Phase 1-3) that were already in the remote DB but not in migration history table — resulted in `relation "profiles" already exists` error
- **Fix:** `supabase migration repair --status applied` for all 13 Phase 1-3 migration timestamps, then `db push` applied only the 3 new migrations cleanly
- **Files modified:** None (remote DB state fix only)

## Self-Check: PASSED

All 10 files confirmed present on disk. All 3 task commits found in git history.
