---
phase: 05-polish-launch
plan: 01
subsystem: testing
tags: [wave-0-stubs, test-infrastructure, onboarding, notifications, offline-queue]
dependency_graph:
  requires: []
  provides: [PLSH-01-stub, PLSH-02-stub, PLSH-03-stub, PLSH-08-stub]
  affects: [05-02, 05-03, 05-04]
tech_stack:
  added: []
  patterns: [beforeAll-try-catch-guard, ts-ignore-dynamic-import]
key_files:
  created:
    - __tests__/hooks/useOnboarding.test.ts
    - __tests__/hooks/useNotifications.test.ts
    - __tests__/hooks/useOfflineQueue.test.ts
  modified:
    - tsconfig.json
decisions:
  - "Used // @ts-ignore on dynamic import lines — TS2307 is expected for Wave 0 stubs referencing modules that don't exist yet"
  - "Excluded supabase/functions from tsconfig.json — Deno Edge Functions use npm: specifiers and Deno globals that standard tsc cannot resolve; pre-existing errors not caused by this plan"
metrics:
  duration: ~5min
  completed: "2026-03-22"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 5 Plan 01: Wave 0 Test Stubs Summary

**One-liner:** Three beforeAll/try-catch/guard Wave 0 stubs covering PLSH-01 (onboarding store), PLSH-02/03 (notifications), and PLSH-08 (offline queue) — all 13 tests pass with source modules absent.

## What Was Done

Created 3 Wave 0 test stub files for Phase 5 using the established `beforeAll/try-catch/guard` pattern. Each stub dynamically imports its source module inside `beforeAll` with try/catch — if the source doesn't exist yet, `mod` stays `undefined` and every test guards with `if (!mod) return`, causing graceful skips rather than failures.

This follows the pattern established in Phase 02-01 (documented in STATE.md decisions).

## Files Created

| File | Source Module | Tests | Requirement |
|------|--------------|-------|-------------|
| `__tests__/hooks/useOnboarding.test.ts` | `@/stores/useOnboardingStore` | 6 | PLSH-01 |
| `__tests__/hooks/useNotifications.test.ts` | `@/hooks/useNotifications` | 3 | PLSH-02, PLSH-03 |
| `__tests__/hooks/useOfflineQueue.test.ts` | `@/hooks/useOfflineQueue` | 4 | PLSH-08 |

## Test Results

```
Test Suites: 3 passed, 3 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        0.4s
```

TypeScript: `npx tsc --noEmit` exits 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed static AsyncStorage import from useOnboarding stub**
- **Found during:** Task 1 verification
- **Issue:** Initial version imported `@react-native-async-storage/async-storage` at module level; package is not installed, causing Jest to fail with "Cannot find module"
- **Fix:** Removed static import; stub tests only verify export shapes, not AsyncStorage behavior (consistent with plan guidance: "Do NOT mock at module level")
- **Files modified:** `__tests__/hooks/useOnboarding.test.ts`
- **Commit:** 102a4ea

**2. [Rule 2 - Missing Critical] Added // @ts-ignore on dynamic import lines**
- **Found during:** TypeScript verification
- **Issue:** TypeScript emits TS2307 for dynamic imports referencing modules that don't exist yet, which is expected for Wave 0 stubs but prevents `tsc --noEmit` from exiting 0
- **Fix:** Added `// @ts-ignore` comment above each `await import(...)` line in all 3 stubs
- **Files modified:** All 3 stub files
- **Commit:** 102a4ea

**3. [Rule 3 - Blocking] Excluded supabase/functions from tsconfig.json**
- **Found during:** TypeScript verification
- **Issue:** `supabase/functions/` Deno Edge Functions use `npm:` import specifiers and `Deno` globals — pre-existing TS2307/TS2304 errors (17 total) blocked `tsc --noEmit` from exiting 0. These errors pre-dated this plan.
- **Fix:** Added `"exclude": ["supabase/functions"]` to `tsconfig.json`; Deno functions have their own Deno runtime type checking and don't require inclusion in the React Native tsconfig
- **Files modified:** `tsconfig.json`
- **Commit:** 102a4ea

## Self-Check: PASSED

Files exist:
- FOUND: `__tests__/hooks/useOnboarding.test.ts`
- FOUND: `__tests__/hooks/useNotifications.test.ts`
- FOUND: `__tests__/hooks/useOfflineQueue.test.ts`

Commit: 102a4ea — verified via `git log --oneline -1`
