---
phase: 03-ai-engine
plan: 02
subsystem: api
tags: [tanstack-query, react-query, supabase, ai, cache, hooks, typescript]

# Dependency graph
requires:
  - phase: 03-ai-engine plan 01
    provides: generate-suggestions Edge Function, ai_insights table, AiInsight row shape
  - phase: 02-core-tracking
    provides: useWeeklySummary, useEmissionEntries hooks, emission data context
provides:
  - hooks/useAiInsight.ts — cache-first React Query hook for AI insight
  - AiInsight interface (id, user_id, content, suggestion, generated_at, expires_at)
  - EmissionContext interface (weeklyTotalKg, foodKg, transportKg, energyKg, topItems)
affects: [03-03-ui-card, home-screen ai card integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cache-first pattern: SELECT with gt('expires_at', now) before any remote call
    - staleTime 23h prevents redundant queryFn re-runs within a session (not authoritative TTL)
    - Guard on weeklyTotalKg === 0 avoids unnecessary Claude API calls for new users
    - FunctionsHttpError cast to access context.status for structured 401 handling
    - retry: 1 with retryDelay: 2000ms covers Edge Function cold-start 503 window

key-files:
  created:
    - hooks/useAiInsight.ts
  modified: []

key-decisions:
  - "Supabase SELECT is authoritative TTL check (not staleTime) — staleTime only avoids redundant reads within session after app restart React Query has no cache"
  - "Guard (weeklyTotalKg === 0) returns null silently — avoids Claude API call and quota consumption for new users with no emission data"
  - "FunctionsHttpError cast is safe — runtime property context.status exists but SupabaseClient types surface it as FunctionsError without exposing context"
  - "enabled: !!userId pattern consistent with all other hooks in the codebase"

patterns-established:
  - "Cache-first AI hook: SELECT cached row first, call Edge Function only on cache miss with data guard"

requirements-completed: [AI-04, AI-05, AI-06]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 03 Plan 02: useAiInsight Hook Summary

**Cache-first TanStack Query hook that checks ai_insights for a non-expired row before calling the generate-suggestions Edge Function, with a zero-emission guard preventing Claude API calls for new users**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-22T04:29:59Z
- **Completed:** 2026-03-22T04:31:24Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `hooks/useAiInsight.ts` with full cache-first flow: SELECT first, Edge Function only on cache miss
- Implemented Supabase-side TTL check using `.gt('expires_at', now)` as authoritative expiry (not React Query staleTime)
- Added zero-emission guard returning `null` without any network call when `weeklyTotalKg === 0`
- Exported `AiInsight` and `EmissionContext` TypeScript interfaces for use by the Home screen (Plan 03-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useAiInsight hook** - `6c32082` (feat)

## Files Created/Modified

- `hooks/useAiInsight.ts` — Cache-first React Query hook; exports `useAiInsight`, `AiInsight`, `EmissionContext`; queries `ai_insights` with `gt('expires_at', now)` before calling `generate-suggestions`; staleTime 23h, retry 1, retryDelay 2000ms

## Decisions Made

- Supabase SELECT is the authoritative TTL check — React Query staleTime (23h) only prevents redundant re-runs within a session. After app restart, React Query has no cache, so the SELECT with `gt('expires_at', now)` is what prevents stale data from being surfaced.
- Guard on `weeklyTotalKg === 0` returns `null` silently — avoids Claude API consumption and Edge Function cold-start latency for new users who have not logged any emissions yet.
- `FunctionsHttpError` cast used to access `context.status` for structured 401 detection — the SupabaseClient types surface the invoke error as `FunctionsError` which does not expose `context.status` directly, but the runtime object has it.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — `npx tsc --noEmit --skipLibCheck` produced zero errors for `hooks/useAiInsight.ts`. Pre-existing Deno-specific TypeScript errors in `supabase/functions/` (Deno `npm:` imports, `Deno` globals) are from Plan 03-01 and are expected — those files are compiled by Deno, not `tsc`.

## User Setup Required

None - no external service configuration required. Edge Function was already deployed in Plan 03-01.

## Next Phase Readiness

- `useAiInsight` is complete and ready for integration in the Home screen AI card (Plan 03-03)
- Home screen will call `useAiInsight(userId, context)` where `context` is built from `useWeeklySummary` + `useEmissionEntries`
- No blockers — hook interface matches the `AiInsight` row shape produced by `generate-suggestions`

## Self-Check: PASSED

- `hooks/useAiInsight.ts` — FOUND
- Commit `6c32082` — FOUND (feat(03-02): cache-first useAiInsight React Query hook)
- `npx tsc --noEmit --skipLibCheck` — zero errors in `useAiInsight.ts`

---
*Phase: 03-ai-engine*
*Completed: 2026-03-22*
