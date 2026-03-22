---
phase: 05-polish-launch
plan: 04
subsystem: offline-queue
tags: [offline, sqlite, netinfo, reanimated, ui]
dependency_graph:
  requires: [05-01]
  provides: [offline-entry-queue, vofflinebanner]
  affects: [app/_layout.tsx, hooks, components/ui]
tech_stack:
  added:
    - "@react-native-community/netinfo (expo install — SDK 54 compatible)"
  patterns:
    - "expo-sqlite v16: openDatabaseAsync + execAsync/runAsync/getAllAsync/getFirstAsync"
    - "module-level dbPromise singleton to open DB at most once per process"
    - "mutateRef pattern to keep NetInfo listener stable without re-subscribing"
    - "Reanimated 3 withTiming in useEffect (not render body) for correct animation"
    - "hooks-before-early-return pattern in VOfflineBanner"
key_files:
  created:
    - hooks/useOfflineQueue.ts
    - components/ui/VOfflineBanner.tsx
  modified:
    - components/ui/index.ts
    - app/_layout.tsx
    - package.json (netinfo added)
decisions:
  - "Used useEffect to trigger withTiming animations in VOfflineBanner instead of assigning in render body — avoids Reanimated 3 worklet boundary issues and correctly fires on isOffline changes"
  - "Moved all hooks (useSharedValue, useAnimatedStyle, useSafeAreaInsets) before the early-return null guard in VOfflineBanner to respect React hooks rules"
  - "Kept translateY as a separate useSharedValue rather than inline in useAnimatedStyle withTiming — prevents re-creating animated style object on every render"
metrics:
  duration_seconds: 140
  completed_date: "2026-03-22"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 3
---

# Phase 05 Plan 04: Offline Entry Queue Summary

**One-liner:** SQLite v16 offline entry queue with NetInfo flush-on-reconnect and Reanimated 3 VOfflineBanner auto-dismiss animation.

## What Was Built

### hooks/useOfflineQueue.ts (NEW)

Four exports:

- `enqueueEntry(payload: CreateEntryInput)` — inserts one entry into the `offline_queue` SQLite table with a `crypto.randomUUID()` primary key and `Date.now()` timestamp.
- `flushQueue(mutate)` — reads all un-synced rows (WHERE `synced_at IS NULL`), calls `mutate` for each, marks `synced_at` on success; failed rows are left for the next reconnect attempt.
- `getPendingCount()` — COUNT query returning the number of un-synced rows.
- `useOfflineQueue(mutate)` — React hook that initialises the DB on mount via a module-level singleton promise, registers a `NetInfo.addEventListener` listener that calls `flushQueue` + invalidates `ENTRY_KEYS.all` in React Query when both `isConnected` and `isInternetReachable` are true.

SQLite v16 API used throughout: `openDatabaseAsync`, `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`. No deprecated `createTableAsync` or `transaction()` callback style.

### components/ui/VOfflineBanner.tsx (NEW)

- Forest Green (`#1B7A4A`) fixed-position banner positioned below the safe-area top inset.
- `useNetInfo()` drives `isOffline = netInfo.isConnected === false`.
- Returns `null` when `netInfo.isConnected === null` (initial/unknown state) — no flicker on cold start.
- Reanimated 3 `withTiming` (duration 300 ms) in a `useEffect` animates both `opacity` (0↔1) and `translateY` (−40↔0) when connectivity changes.
- `pointerEvents="none"` — the banner never captures touches.

### components/ui/index.ts (MODIFIED)

Added: `export { VOfflineBanner } from './VOfflineBanner';`

### app/_layout.tsx (MODIFIED)

- Imported `useOfflineQueue`, `useCreateEntry`, `VOfflineBanner`.
- `AppNavigator`: calls `const { mutateAsync } = useCreateEntry()` then `useOfflineQueue(mutateAsync)` — both inside `QueryClientProvider` so `useQueryClient()` resolves correctly.
- `<VOfflineBanner />` mounted inside `QueryClientProvider` alongside `<AppNavigator />`, before it in JSX so it renders above the navigator on Android elevation stack.

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (0 errors) |
| `npx jest --testPathPatterns="useOfflineQueue"` | PASS (4/4 tests) |
| `grep -c openDatabaseAsync hooks/useOfflineQueue.ts` | 1 |
| `grep -c "CREATE TABLE IF NOT EXISTS"` | 1 |
| `grep createTableAsync hooks/useOfflineQueue.ts` | empty (correct) |
| `grep -c VOfflineBanner components/ui/index.ts` | 1 |
| `grep -c VOfflineBanner app/_layout.tsx` | 2 (import + JSX) |
| `grep -c useOfflineQueue app/_layout.tsx` | 2 (import + call) |
| `grep "backgroundColor.*1B7A4A" VOfflineBanner.tsx` | match found |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved withTiming calls from render body to useEffect in VOfflineBanner**

- **Found during:** Task 2 implementation review
- **Issue:** Plan's code sample assigned `opacity.value = withTiming(...)` directly in the component render body. In Reanimated 3, shared value mutations during render can trigger worklet boundary warnings and cause stale closure issues; the correct pattern is to drive animations from `useEffect`.
- **Fix:** Added `useEffect(() => { opacity.value = withTiming(...); translateY.value = withTiming(...); }, [isOffline, opacity, translateY])` — consistent with the VSkeleton pattern.
- **Files modified:** `components/ui/VOfflineBanner.tsx`

**2. [Rule 1 - Bug] Moved all hooks before early return null in VOfflineBanner**

- **Found during:** Task 2 implementation
- **Issue:** Plan's code had `if (netInfo.isConnected === null) return null;` before `useSharedValue` and `useAnimatedStyle` calls — violating React hooks rules (hooks must not be called after conditional returns).
- **Fix:** Called all hooks (`useNetInfo`, `useSafeAreaInsets`, `useSharedValue` x2, `useEffect`, `useAnimatedStyle`) unconditionally at the top of the function, then placed the `if (netInfo.isConnected === null) return null` guard after them all.
- **Files modified:** `components/ui/VOfflineBanner.tsx`

**3. [Rule 2 - Missing] Separated translateY into its own useSharedValue**

- **Found during:** Task 2 — plan used `withTiming` inline in `useAnimatedStyle` for `translateY`
- **Issue:** Computing `withTiming` directly inside `useAnimatedStyle` creates a new animation on every render cycle rather than being driven reactively by `isOffline` state changes.
- **Fix:** Explicit `translateY = useSharedValue(-40)` with the same `useEffect` driving both values.
- **Files modified:** `components/ui/VOfflineBanner.tsx`

## Self-Check: PASSED

- `hooks/useOfflineQueue.ts` — FOUND
- `components/ui/VOfflineBanner.tsx` — FOUND
- `components/ui/index.ts` — contains VOfflineBanner export
- `app/_layout.tsx` — contains VOfflineBanner + useOfflineQueue
- Commit `5248105` — FOUND (Task 1)
- Commit `d8aaaab` — FOUND (Task 2)
