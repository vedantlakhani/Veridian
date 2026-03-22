---
phase: 04-social-challenges
plan: "03"
subsystem: social-leaderboard
tags: [leaderboard, realtime, hooks, privacy, challenge]
dependency_graph:
  requires:
    - 04-01  # profiles RLS policy for JOIN, challenge_participants Realtime enabled
    - 04-02  # challenge creation/join flow
  provides:
    - leaderboard-screen   # app/challenge/[id].tsx deep-linkable screen
    - useLeaderboard       # TanStack Query hook returning sorted LeaderboardEntry[]
    - useChallengeRealtime # Realtime subscription hook for live updates
  affects:
    - profile-screen       # challenge cards on Profile navigate to this screen
tech_stack:
  added: []
  patterns:
    - Realtime subscription scoped to screen (not root layout)
    - _computeReductionPct / _sortLeaderboard exported for unit testing
    - Privacy enforcement: LeaderboardEntry exposes only reduction_pct, rank, display_name, avatar_url
key_files:
  created:
    - hooks/useLeaderboard.ts
    - hooks/useChallengeRealtime.ts
    - components/social/LeaderboardRow.tsx
    - app/challenge/[id].tsx
  modified:
    - __tests__/hooks/useLeaderboard.test.ts
    - __tests__/hooks/useChallengeRealtime.test.ts
decisions:
  - _computeReductionPct and _sortLeaderboard exported with _ prefix for unit testing without mocking Supabase
  - useChallengeRealtime mounted in challenge screen (not root layout) — subscription scoped to leaderboard screen lifetime
  - LeaderboardEntry.reduction_pct is number (not nullable) per type definition; 0 used as fallback for participants with no baseline data; shown as -0.0%
  - SOCL-06 privacy enforced at component level — LeaderboardRow.tsx contains no baseline_kg or current_kg references
metrics:
  duration: ~5min
  completed: "2026-03-22"
  tasks_completed: 2
  files_changed: 6
---

# Phase 4 Plan 3: Leaderboard Screen and Realtime Subscription Summary

Live-updating challenge leaderboard with reduction_pct rankings using Supabase Realtime postgres_changes and privacy-safe participant display.

## What Was Built

**hooks/useLeaderboard.ts**
- `useLeaderboard(challengeId)`: TanStack Query hook that fetches `challenge_participants` joined with `profiles(display_name, avatar_url)` via RLS-enabled JOIN, computes reduction_pct for each participant using `_computeReductionPct`, sorts by DESC reduction with null entries last using `_sortLeaderboard`, and returns `LeaderboardEntry[]` with 1-based rank assignment
- `useChallengeDetail(challengeId)`: separate query for challenge metadata (title, dates, target_reduction_pct) used for the screen header
- `_computeReductionPct` and `_sortLeaderboard` exported for unit testing without Supabase mocking

**hooks/useChallengeRealtime.ts**
- Direct structural port of `useEmissionRealtime.ts` pattern
- Subscribes to `challenge_participants:${challengeId}` channel on mount
- Invalidates `['leaderboard', challengeId]` query key on any INSERT/UPDATE/DELETE
- Calls `supabase.removeChannel(channel)` on unmount — no subscription leaks
- Early return guard: `if (!challengeId) return`

**components/social/LeaderboardRow.tsx**
- Props: `{ entry: LeaderboardEntry; isCurrentUser: boolean }`
- Layout: rank (28px, JetBrainsMono) | avatar (32px circle, expo-image or initials fallback) | display_name (flex: 1) | reduction_pct (64px, right-aligned, JetBrainsMono)
- `isCurrentUser` highlights rank and name in `colors.primary`
- Privacy: no `baseline_kg` or `current_kg` references — only reduction % shown (SOCL-06)
- Reduction % formatted as `-X.X%` for reductions, `+X.X%` for increases
- Row separator with `StyleSheet.hairlineWidth` border

**app/challenge/[id].tsx**
- Deep-linkable screen using `useLocalSearchParams<{ id: string }>()`
- Challenge header `VCard`: title, date range, target reduction `VBadge`, participant count
- Leaderboard section: 5x `VSkeleton` rows while loading; `VEmptyState` for empty challenges; `LeaderboardRow` list when populated
- `useChallengeRealtime(id)` mounted on screen mount — subscription scoped to this screen, auto-cleaned up on navigation
- `Stack.Screen` header title updates once challenge data loads

## Test Results

10 tests passing across 2 test suites (4 todo stubs remain for future integration tests):
- `computeReductionPct`: null baseline, zero baseline, correct %, zero change, null current, negative (increase)
- `sortLeaderboard`: DESC sort, null entries last, empty array
- `useChallengeRealtime`: named function export verified

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] LeaderboardEntry.reduction_pct type mismatch**
- **Found during:** Task 2
- **Issue:** `LeaderboardEntry.reduction_pct` is typed as `number` (not `number | null`) in `types/challenge.ts`, but `_computeReductionPct` returns `number | null`. The UI component initially used `baseline_kg` to detect no-data state (violating SOCL-06 acceptance criteria).
- **Fix:** Use `0` as fallback in `useLeaderboard` hook when `reduction_pct` is null (type compliant). Removed `baseline_kg` reference from `LeaderboardRow.tsx`. Privacy maintained: no raw kg exposed in UI.
- **Files modified:** `hooks/useLeaderboard.ts`, `components/social/LeaderboardRow.tsx`
- **Commit:** d1a00e5

## Self-Check: PASSED
