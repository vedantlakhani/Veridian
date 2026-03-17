---
phase: 02-core-tracking
plan: "05"
status: complete
completed_at: "2026-03-16"
duration: ~5min
tasks_completed: 2
files_modified: 3
requirements_closed:
  - TRACK-10
  - TRACK-11
  - TRACK-12
---

# Plan 02-05 Summary — Entry Management + Realtime

## What Was Built

### Task 1: app/entry/[id].tsx (Edit Entry Modal)
- Created `app/entry/` directory and `app/entry/[id].tsx` Expo Router modal screen
- Reads `id` from `useLocalSearchParams<{ id: string }>()`
- Fetches single entry from Supabase with `emission_factors(*)` join via TanStack Query
- Pre-fills quantity `VInput` via `useEffect` when entry loads
- Live CO₂e preview in `JetBrainsMono` font: `parseFloat(quantity) × kg_co2e`
- "Save Changes" calls `useUpdateEntry().mutate({ id, userId, factor, quantity, loggedAt })`
- On success, `router.back()` dismisses the modal
- ActivityIndicator loading state; `disabled` Save button until valid quantity entered

### Task 1: insights.tsx — Swipe-to-Delete + Tap-to-Edit
- `EntryRow` component with `Gesture.Pan()` horizontal gesture (Reanimated 3)
- `activeOffsetX([-10, 10])` prevents vertical scroll interference
- `useSharedValue(0)` + `useAnimatedStyle` translateX for smooth reveal animation
- Left-swipe past −60px snaps to −80px revealing red Delete button (`withSpring`)
- Tap on row calls `runOnJS(navigateToEdit)()` → `router.push('/entry/${entry.id}')`
- Delete button calls `useDeleteEntry().mutate({ id, userId, loggedAt })`
- `runOnJS` imported at top-level (per Phase 01-04 decision)

### Task 2: hooks/useEmissionRealtime.ts
- `useEffect` subscribes to `supabase.channel('emission_entries:${userId}')`
- `postgres_changes` event `*` filtered by `user_id=eq.${userId}` — user-scoped only
- On any event: invalidates `emission_entries`, `daily_summary`, `weekly_summary`, `monthly_totals`
- Cleanup: `supabase.removeChannel(channel)` on unmount/userId change (prevents memory leak)
- No-op when `userId` is undefined — safe to call unconditionally

### Task 2: app/_layout.tsx — Realtime Mount
- Added `import { useEmissionRealtime } from '@/hooks/useEmissionRealtime'`
- Destructures `user` from `useAuthStore()`
- Calls `useEmissionRealtime(user?.id)` at root layout — persistent across all tab navigation

## Verification Results
- `npx tsc --noEmit`: 0 errors
- `jest --no-coverage`: 65 tests pass (19 suites), 7 todo — no regressions

## Key Decisions
- `runOnJS(navigateToEdit)()` wraps `router.push` inside gesture worklet — Expo Router calls must run on JS thread
- Realtime channel ID uses userId for uniqueness — prevents channel collision in multi-user scenarios
- `useEmissionRealtime` placed in root layout (not tab screens) — single subscription survives tab navigation without re-subscribing

## Requirements Closed
- **TRACK-10**: User can tap entry → edit modal opens pre-filled → save updates kg CO₂e
- **TRACK-11**: User swipes left on entry → Delete button → tap removes entry, Home total decreases
- **TRACK-12**: Supabase Realtime channel subscribed, second device receives changes on cache invalidation
