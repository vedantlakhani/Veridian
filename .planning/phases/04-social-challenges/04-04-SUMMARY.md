---
phase: 04-social-challenges
plan: "04"
subsystem: achievements
tags: [achievements, badges, react-native-svg, reanimated3, tanstack-query]
dependency_graph:
  requires: [04-01, 04-02, hooks/useEmissionEntries, types/achievement, lib/emissions]
  provides: [hooks/useAchievements, components/social/AchievementBadge, components/social/AchievementToast]
  affects: [hooks/useEmissionEntries, app/(tabs)/profile.tsx]
tech_stack:
  added: []
  patterns:
    - "Plain async function (not hook) for mutation onSuccess callbacks (checkAndUnlockAchievements)"
    - "Reanimated 3 withTiming + withDelay for slide-in toast animation"
    - "react-native-svg Svg/Circle/G/Path for badge icons"
    - "queryClient.getQueryCache().subscribe for cross-component toast signaling"
    - "queryClient.setQueryData(['newly_earned_achievements']) for toast relay"
key_files:
  created:
    - hooks/useAchievements.ts
    - components/social/AchievementBadge.tsx
    - components/social/AchievementToast.tsx
  modified:
    - hooks/useEmissionEntries.ts
    - app/(tabs)/profile.tsx
    - __tests__/hooks/useAchievements.test.ts
decisions:
  - "checkAndUnlockAchievements is a plain async function, not a hook — safe to call inside mutation onSuccess callbacks without rules-of-hooks violation"
  - "Toast signaling uses queryClient.setQueryData(['newly_earned_achievements']) + getQueryCache().subscribe — avoids prop drilling or global state for cross-boundary achievement notifications"
  - "AchievementToast positioned absolutely inside the Achievements VCard — scoped to that section rather than full-screen overlay to avoid z-index conflicts with VBottomSheet"
  - "Streak logic uses getLocalDateString() for today comparison — consistent with lib/emissions date helpers, avoids UTC drift"
  - "TDD approach used for Task 1: failing tests first, then implementation to GREEN"
metrics:
  duration: "4 minutes"
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_created: 3
  files_modified: 3
---

# Phase 4 Plan 04: Achievement Badge System Summary

**One-liner:** Achievement badge detection with SVG circle badges (earned/locked), Reanimated 3 slide-in toast, and criteria evaluation for first_log, streak_days, reduction_pct, and total_entries.

## What Was Built

**hooks/useAchievements.ts**
- `useAchievements(userId)` — TanStack Query hook fetching all achievements + earned user_achievements joined with details
- `checkAndUnlockAchievements(userId)` — exported plain async function safe to call from mutation `onSuccess`; evaluates all unearned achievements, inserts earned ones into `user_achievements`, returns newly earned array
- `checkCriteria(achievement, userId)` — internal helper switching on all 4 criteria types: `first_log` (COUNT > 0), `streak_days` (consecutive days from daily_summaries), `reduction_pct` ((prior-current)/prior*100 >= value), `total_entries` (COUNT >= value)

**components/social/AchievementBadge.tsx**
- react-native-svg Svg/Circle/G/Path component rendering 56×56 circle badges
- Earned: Forest Green (#1B7A4A) circle with full-opacity icon
- Locked: textTertiary (#9CA3AF) circle with opacity-0.5 icon + lock overlay path
- `BADGE_ICONS` constant mapping all 4 `AchievementCriteriaType` values to SVG path strings
- Text label below badge (name, numberOfLines 1)

**components/social/AchievementToast.tsx**
- Reanimated 3 `useSharedValue` + `useAnimatedStyle` slide animation
- `translateY` starts at -100, animates to 0 in 300ms via `withTiming`, then `withDelay(2700, withTiming(-100, {duration:300}))` slides back up
- `setTimeout(onDismiss, 3000)` for React state cleanup
- Absolute positioned (top: 60, zIndex: 999), Forest Green background, trophy emoji + badge name

**hooks/useEmissionEntries.ts (updated)**
- `useCreateEntry.onSuccess` and `useUpdateEntry.onSuccess` both call `checkAndUnlockAchievements(variables.userId)` after invalidation
- On new badges: invalidates `['achievements']` query and sets `['newly_earned_achievements']` cache for Profile screen consumption

**app/(tabs)/profile.tsx (updated)**
- Imports `useAchievements`, `AchievementBadge`, `AchievementToast`, `Achievement` type
- `queryClient.getQueryCache().subscribe` effect watches for `['newly_earned_achievements']` cache updates → sets `toastBadge` state
- Achievements section: `VSkeleton` during load, horizontal `ScrollView` with one `AchievementBadge` per achievement (earned determined by `earned.some(e => e.achievement_id === a.id)`)
- `AchievementToast` rendered inside section when `toastBadge !== null`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 7604c79 | feat(04-04): implement useAchievements hook with all 4 criteria types |
| 2 | 6128838 | feat(04-04): AchievementBadge, AchievementToast, wired mutations, Profile badges |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dynamic import in test file caused Jest crash**
- **Found during:** Task 1 TDD GREEN phase
- **Issue:** Test used `await import('@/hooks/useAchievements')` inside test bodies, which triggered "A dynamic import callback was invoked without --experimental-vm-modules" error in Jest (CommonJS transform mode)
- **Fix:** Replaced dynamic imports with static top-level imports — the module was already available at test file scope
- **Files modified:** `__tests__/hooks/useAchievements.test.ts`
- **Commit:** 7604c79

## Self-Check: PASSED
