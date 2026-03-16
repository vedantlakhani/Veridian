---
phase: "02-core-tracking"
plan: "02"
subsystem: "data-layer"
tags: [emissions, tanstack-query, supabase-realtime, tdd, calculation-engine]
dependency_graph:
  requires: [01-05]
  provides: [lib/emissions.ts, hooks/useEmissionEntries.ts, supabase/migrations/20260315000013_enable_realtime.sql]
  affects: [02-03, 02-04, 02-05]
tech_stack:
  added: []
  patterns: [TanStack Query v5 object-only mutation, upsert-on-conflict, recompute-from-all-entries]
key_files:
  created:
    - lib/emissions.ts
    - hooks/useEmissionEntries.ts
    - supabase/migrations/20260315000013_enable_realtime.sql
  modified:
    - app/(tabs)/log.tsx
    - components/ui/VSkeleton.tsx
decisions:
  - "Split lib/emissions.ts into pure functions (top) + async Supabase helpers (bottom) — testable without mocking Supabase at import time"
  - "upsertDailySummary recomputes from all entries (not delta) to prevent summary drift on edit/delete"
  - "upsertWeeklySummary uses toLocaleDateString('en-CA') for week end calculation, not toISOString()"
  - "VSkeleton extended with optional style prop (Rule 1 auto-fix) to unblock TypeScript strict in FoodForm/TransportForm/EnergyForm"
metrics:
  duration: "~6min"
  completed: "2026-03-16"
  tasks: 2
  files: 5
---

# Phase 02 Plan 02: Emission Calculation Engine + CRUD Hooks Summary

**One-liner:** DEFRA 2025 emission calculation engine (lib/emissions.ts) with TanStack Query CRUD hooks (hooks/useEmissionEntries.ts) and Supabase Realtime publication migration.

## Tasks Completed

| Task | Type | Description | Commit |
|------|------|-------------|--------|
| 1 | TDD | lib/emissions.ts — pure calculation engine (RED → GREEN) | 2b884d6 |
| 2 | auto | hooks/useEmissionEntries.ts + Realtime migration + log.tsx wiring | 2a8b731 |

## What Was Built

### lib/emissions.ts
Pure calculation functions with Supabase async helpers below:

- `calcEmission(factorKgCo2e, quantity)` — DEFRA 2025 formula: quantity × factor rate
- `getLocalDateString(date?)` — local-timezone "YYYY-MM-DD" using `toLocaleDateString('en-CA')` (NOT toISOString which causes UTC drift)
- `getISOWeekStart(date)` — ISO Monday boundary; correctly handles Sunday (day 0 → -6 adjustment)
- `computeDailyCategoryTotals(entries)` — aggregate by category, always recomputes from scratch
- `buildDailySummaryPayload` + `buildWeeklySummaryPayload` — upsert payload builders
- `upsertDailySummary(userId, date)` — fetches all entries for date, recomputes, upserts with `onConflict: 'user_id,date'`
- `upsertWeeklySummary(userId, weekStart)` — same pattern for weekly_summaries, `onConflict: 'user_id,week_start'`

### hooks/useEmissionEntries.ts
TanStack Query v5 CRUD hooks:

- `useEmissionEntries(userId, dateFrom?, dateTo?)` — read hook with `enabled: !!userId` guard
- `useCreateEntry()` — insert + recompute today's daily/weekly summaries
- `useUpdateEntry()` — update + recompute affected-date summaries (not necessarily today)
- `useDeleteEntry()` — delete + recompute affected-date summaries

All mutations use `calcEmission(factor.kg_co2e, quantity)` — never hardcoded values.

### supabase/migrations/20260315000013_enable_realtime.sql
`ALTER PUBLICATION supabase_realtime ADD TABLE emission_entries` — required for TRACK-12 Realtime subscriptions.

### app/(tabs)/log.tsx
Wired to `useCreateEntry` with `user.id` from `useAuthStore`, real mutation call, and `isPending` state passed to form components.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added style prop to VSkeleton**
- **Found during:** Task 2 TypeScript check
- **Issue:** `VSkeleton` component did not accept a `style` prop, but `FoodForm.tsx`, `TransportForm.tsx`, and `EnergyForm.tsx` (untracked pre-existing files) were passing `style={{ marginBottom: spacing.sm }}` — causing 4 TypeScript errors blocking `npx tsc --noEmit`
- **Fix:** Added `style?: StyleProp<ViewStyle>` to `VSkeletonProps` interface and spread into `Animated.View` style array
- **Files modified:** `components/ui/VSkeleton.tsx`
- **Commit:** 2b884d6 (included in Task 1 commit)

## Verification Results

1. `npx jest __tests__/lib/emissions.test.ts --no-coverage` — 8 passed, 4 todo (all non-todo GREEN)
2. `npx tsc --noEmit` — zero errors
3. No `toISOString()` used for date strings in lib/emissions.ts (only in updated_at fields and comments)
4. `onConflict: 'user_id,date'` and `onConflict: 'user_id,week_start'` both present in lib/emissions.ts
5. `ALTER PUBLICATION supabase_realtime ADD TABLE emission_entries` confirmed in migration file

## Self-Check: PASSED

- [x] `/Users/vedantlakhani/Desktop/Veridian/lib/emissions.ts` — exists
- [x] `/Users/vedantlakhani/Desktop/Veridian/hooks/useEmissionEntries.ts` — exists
- [x] `/Users/vedantlakhani/Desktop/Veridian/supabase/migrations/20260315000013_enable_realtime.sql` — exists
- [x] Commit 2b884d6 — `feat(02-02): implement lib/emissions.ts`
- [x] Commit 2a8b731 — `feat(02-02): hooks/useEmissionEntries.ts + Realtime migration + log.tsx wiring`
