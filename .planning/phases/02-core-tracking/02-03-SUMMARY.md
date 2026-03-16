---
phase: 02-core-tracking
plan: "03"
subsystem: home-dashboard
tags: [tanstack-query, hooks, home-screen, progress-ring, summary-data]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [home-dashboard, summary-hooks]
  affects: [app/(tabs)/index.tsx]
tech_stack:
  added: []
  patterns: [tanstack-query-hooks, maybeSingle-null-safe, progress-ring-with-children]
key_files:
  created:
    - hooks/useSummaries.ts
  modified:
    - app/(tabs)/index.tsx
decisions:
  - VEmptyState uses `body` prop not `subtitle` — plan template was wrong; auto-fixed to match actual component API
  - VSkeleton width type is `number | \`${number}%\`` — used type assertion `'100%' as \`${number}%\`` for full-width skeletons to satisfy TypeScript
  - Pre-existing EmissionBarChart.tsx TypeScript error (SVG overflow prop) is out of scope and not introduced by this plan
metrics:
  duration: ~4min
  completed: 2026-03-16
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 2 Plan 03: Home Dashboard + Summary Hooks Summary

TanStack Query hooks for daily/weekly/monthly summaries and a complete Home dashboard with animated VProgressRing, VMetricCard, weekly category breakdown, and skeleton/empty states connected to live Supabase data.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | hooks/useSummaries.ts — daily, weekly, monthly query hooks | 3bac4d1 | hooks/useSummaries.ts |
| 2 | app/(tabs)/index.tsx — Home dashboard screen | 9ac1d83 | app/(tabs)/index.tsx |

## What Was Built

### hooks/useSummaries.ts
Three TanStack Query hooks for summary data:
- `useDailySummary(userId)` — queries `daily_summaries` for today's row using `.maybeSingle()` (null-safe, no error when no entries)
- `useWeeklySummary(userId)` — queries `weekly_summaries` for current ISO week (Monday) using `.maybeSingle()`
- `useMonthlyTotals(userId, month?)` — aggregates `daily_summaries` for current and previous month to compute trend percentage

All three hooks guard with `enabled: !!userId` to prevent RLS failures when user is unauthenticated.

### app/(tabs)/index.tsx
Full Home dashboard replacing the stub:
- `VProgressRing` (size=160, strokeWidth=12) with `progress = Math.min(todayTotal / DAILY_CARBON_BUDGET_KG, 1)` — clamped to [0,1]
- Dynamic ring color: green (<=7 kg target), orange (<=15 kg), red (>15 kg / over budget)
- `VMetricCard` showing today's total with percentage of daily budget as sublabel
- Weekly breakdown row with food/transport/energy kg values and category dot indicators
- Recent entries list (up to 5) with `VBadge` category tag and JetBrainsMono kg values
- `VSkeleton` loading states for all sections (progress ring, metric card, weekly breakdown, entries)
- `VEmptyState` for when no entries have been logged yet

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] VEmptyState `body` prop used instead of plan's `subtitle`**
- **Found during:** Task 2, reading VEmptyState.tsx
- **Issue:** Plan template used `subtitle` prop which does not exist on VEmptyState. The actual API has `title` and `body`.
- **Fix:** Used `body="Tap the Log tab to record your first entry"` instead
- **Files modified:** app/(tabs)/index.tsx
- **Commit:** 9ac1d83

**2. [Rule 2 - Missing Critical] VSkeleton `width` type assertion for percentage strings**
- **Found during:** Task 2, reading VSkeleton.tsx
- **Issue:** `VSkeleton.width` is typed as `number | \`${number}%\`` not `string`. Plain `"100%"` works at runtime but needed type assertion to satisfy TypeScript strict mode.
- **Fix:** Used `width={'100%' as \`${number}%\`}` for all full-width skeleton instances
- **Files modified:** app/(tabs)/index.tsx
- **Commit:** 9ac1d83

## Verification Results

- TypeScript: 1 pre-existing error in `EmissionBarChart.tsx` (SVG `overflow` prop — not introduced by this plan; confirmed by stash test)
- Jest: 58/58 tests pass, 7 todos remain (pre-existing wave 0 stubs)
- `enabled: !!userId` confirmed 3x in useSummaries.ts (one per hook)
- `maybeSingle()` confirmed 2x in useSummaries.ts (daily + weekly)

## Self-Check: PASSED
