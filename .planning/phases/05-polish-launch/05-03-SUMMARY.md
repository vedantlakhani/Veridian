---
phase: 05-polish-launch
plan: "03"
subsystem: notifications
tags: [push-notifications, expo-notifications, streak, daily-reminder, push-token]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [hooks/useNotifications.ts, streak-milestone-notifications, daily-reminder-scheduling, push-token-registration]
  affects: [hooks/useEmissionEntries.ts, app/_layout.tsx]
tech_stack:
  added: [expo-notifications]
  patterns: [AppState foreground listener, DAILY trigger scheduling, streak computeStreak local function]
key_files:
  created:
    - hooks/useNotifications.ts
  modified:
    - app.json
    - package.json
    - package-lock.json
    - hooks/useEmissionEntries.ts
    - app/_layout.tsx
decisions:
  - "Use separate daily_summaries streak query in useCreateEntry onSuccess rather than inspecting newBadges array — ensures notification fires regardless of whether achievement was already earned"
  - "Permission request embedded inside scheduleIfEnabled so useNotifications hook handles the full lifecycle including prompt"
  - "easConfig typed as { projectId?: string } | undefined to avoid TypeScript any violations"
metrics:
  duration: "12 minutes"
  completed: "2026-03-22"
  tasks_completed: 2
  files_modified: 5
---

# Phase 05 Plan 03: Push Notifications Summary

Push notification infrastructure implemented: daily reminder scheduling via expo-notifications DAILY trigger, streak milestone one-shot notifications piggybacked on useCreateEntry, Expo push token registration to Supabase push_tokens table, and useNotifications mounted in root layout replacing the Plan 02 TODO comment.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | useNotifications hook + expo-notifications install | 5985613 | hooks/useNotifications.ts, app.json, package.json |
| 2 | Wire streak notifications + mount hook + parallel font check | 063e52b | hooks/useEmissionEntries.ts, app/_layout.tsx |

## What Was Built

### hooks/useNotifications.ts (NEW)

Four exports:
- `scheduleDailyReminder(hour, minute)` — cancels all existing scheduled notifications, sets Android channel if needed, schedules DAILY trigger at given local time
- `notifyStreakMilestone(days)` — fires an immediate notification (trigger: null) celebrating a streak; checks permission first
- `registerPushToken(userId)` — gets Expo push token using `Constants.expoConfig.extra.eas.projectId` with `easConfig` fallback typed as `{ projectId?: string } | undefined`; upserts to push_tokens table with user_id conflict resolution
- `useNotifications(userId)` — React hook requesting permissions on mount, reading notification_preferences from Supabase, scheduling daily reminder if enabled, registering token; re-runs on AppState 'active'

### hooks/useEmissionEntries.ts (MODIFIED)

- Added `computeStreak(rows)` local function (unexported) computing consecutive-day streak from descending daily_summaries rows
- Added `notifyStreakMilestone` import from `@/hooks/useNotifications`
- In `useCreateEntry` onSuccess: after checkAndUnlockAchievements, queries daily_summaries for last 30 rows, computes streak, fires notifyStreakMilestone at milestones [3, 7, 30]

### app/_layout.tsx (MODIFIED)

- Replaced `// TODO: 05-03 — import useNotifications from '@/hooks/useNotifications'` with real import
- Added `useNotifications(user?.id)` call in AppNavigator alongside useEmissionRealtime
- Added PLSH-04 comment confirming font loading is parallel (in child layouts)

### app.json (MODIFIED)

- Added `"expo-notifications"` to the plugins array

## Verification Results

- `npx tsc --noEmit` — exit 0, zero errors
- `npx jest --testPathPatterns="onboarding|notification" --no-coverage` — 9/9 tests pass
- `grep "SchedulableTriggerInputTypes.DAILY" hooks/useNotifications.ts` — match found
- `grep "useNotifications" app/_layout.tsx` — shows import line + call line
- `grep "expo-notifications" app.json` — shows plugin entry
- `grep "notifyStreakMilestone" hooks/useEmissionEntries.ts` — 2 matches (import + call)

## Deviations from Plan

### Auto-selected implementation approach

**Task 2 — streak query in onSuccess rather than from newBadges**

- **Found during:** Task 2
- **Decision:** The plan offered two approaches: (a) extract streak_days achievements from newBadges returned by checkAndUnlockAchievements, or (b) run a separate daily_summaries query and compute streak independently. Approach (a) would miss notifications for already-earned badges (e.g. the 7-day badge was earned last week but today is again day 7). Approach (b) fires notifications correctly every time the streak hits a milestone. Selected (b) per plan's fallback guidance.
- **Files modified:** hooks/useEmissionEntries.ts

No architectural deviations. Plan executed as written.

## Requirements Fulfilled

- PLSH-02: Daily reminder scheduling with expo-notifications DAILY trigger
- PLSH-03: Streak milestone notifications at 3, 7, 30 days in useCreateEntry onSuccess
- PLSH-04: Font loading confirmed parallel with auth init (child layouts, no sequential await)
- PLSH-05: No custom transitions introduced; default Expo Router hardware-accelerated stack preserved

## Self-Check: PASSED

- [x] hooks/useNotifications.ts exists
- [x] hooks/useEmissionEntries.ts contains notifyStreakMilestone
- [x] app/_layout.tsx contains useNotifications import and call, no TODO
- [x] app.json contains expo-notifications plugin
- [x] Commits 5985613 and 063e52b exist in git log
