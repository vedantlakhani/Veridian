---
phase: 04-social-challenges
plan: "02"
subsystem: social
tags: [challenges, hooks, react-query, supabase, clipboard, share]
dependency_graph:
  requires: [04-01]
  provides: [useChallenges, ChallengeCard, challenge-create-join-flow]
  affects: [app/(tabs)/profile.tsx]
tech_stack:
  added: [expo-clipboard]
  patterns: [useMutation-with-onSuccess-invalidate, invite-code-display-JetBrainsMono, VBottomSheet-multi-mode]
key_files:
  created:
    - hooks/useChallenges.ts
    - components/social/ChallengeCard.tsx
  modified:
    - app/(tabs)/profile.tsx
decisions:
  - "Used router.push cast as any for /challenge/[id] — route file does not exist yet, will be created in plan 04-03; cast scoped to single call site"
  - "VSkeleton requires width prop — added width=100% to skeleton rows in challenge section (auto-fixed Rule 1)"
  - "SheetMode state machine (none/select/create/join/created) avoids multiple boolean flags and makes transitions explicit"
metrics:
  duration: ~5min
  completed: "2026-03-22"
  tasks_completed: 2
  files_changed: 3
---

# Phase 4 Plan 02: Challenge Create & Join Flow Summary

**One-liner:** useChallenges hooks (create/join/list) + ChallengeCard + Profile screen with VBottomSheet invite code sharing via expo-clipboard and RN Share API.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | hooks/useChallenges.ts — create, join, list hooks | ebae7f8 | hooks/useChallenges.ts |
| 2 | ChallengeCard + Profile screen challenge section | 0a786d9 | components/social/ChallengeCard.tsx, app/(tabs)/profile.tsx |

## What Was Built

**hooks/useChallenges.ts** exports three hooks:
- `useMyChallenges(userId)` — queries `challenge_participants` with nested `challenges`, returns `(ChallengeParticipant & { challenges: Challenge })[]`
- `useCreateChallenge()` — inserts challenge (invite_code DB-generated via `upper(substr(md5(...),1,8))`), auto-adds creator as participant, captures `baseline_kg` from most recent `weekly_summaries` row
- `useJoinChallenge()` — looks up challenge by invite_code (uppercase), captures baseline_kg, inserts participant row; throws human-readable error on not-found
- `getBaselineKg()` internal helper queries `weekly_summaries` ordered by `week_start DESC LIMIT 1`

**components/social/ChallengeCard.tsx** — TouchableOpacity-wrapped VCard showing challenge title (bold), date range in "MMM D – MMM D" format, target reduction VBadge (success variant), and chevron. Props: `{ challenge: Challenge; onPress: () => void }`.

**app/(tabs)/profile.tsx** — My Challenges section wired with:
- `sheetMode` state machine: `none → select → create/join → created`
- Create form: title, duration (days), target reduction (%) inputs; calls `createChallenge` mutation
- Created state: invite code at `fontSize: 32`, `fontFamily: 'JetBrainsMono'`, `letterSpacing: 8`, color primary; Copy button via `Clipboard.setStringAsync`, Share button via `Share.share`
- Join form: 8-char invite code input with `autoCapitalize="characters"` and `maxLength={8}`; disabled until full code entered
- Loading: 2x `VSkeleton width="100%" height={56}` rows
- Empty: `VEmptyState` with CTA button opening the sheet

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] VSkeleton missing required width prop**
- **Found during:** Task 2 TypeScript check
- **Issue:** VSkeleton requires `width: number | \`${number}%\`` prop; plan spec omitted it
- **Fix:** Added `width="100%"` to both skeleton rows in challenge loading state
- **Files modified:** app/(tabs)/profile.tsx
- **Commit:** 0a786d9

**2. [Rule 1 - Bug] expo-router typed route mismatch for /challenge/[id]**
- **Found during:** Task 2 TypeScript check
- **Issue:** `/challenge/${id}` is not a known Expo Router route (detail screen not yet created)
- **Fix:** Added `as any` cast on the single router.push call site — preserves runtime behavior, defers full type safety until plan 04-03 creates the route file
- **Files modified:** app/(tabs)/profile.tsx
- **Commit:** 0a786d9

## Verification Results

- `hooks/useChallenges.ts` exports `useMyChallenges`, `useCreateChallenge`, `useJoinChallenge`: PASS
- `hooks/useChallenges.ts` contains `challenge_participants` and `weekly_summaries`: PASS
- `components/social/ChallengeCard.tsx` exports default `ChallengeCard` with `onPress`: PASS
- `app/(tabs)/profile.tsx` contains `useCreateChallenge`, `useJoinChallenge`, `Clipboard.setStringAsync`, `Share.share`, `fontSize: 32`, `JetBrainsMono`: PASS
- `npx tsc --noEmit` 0 errors in plan files (only pre-existing Deno edge function errors): PASS
- `npx jest --testPathPattern="useChallenges" --no-coverage` exits 0: PASS

## Self-Check: PASSED
