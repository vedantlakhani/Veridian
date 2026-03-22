---
phase: 05-polish-launch
plan: 02
subsystem: onboarding
tags: [onboarding, carousel, reanimated, async-storage, zustand, navigation]
dependency_graph:
  requires: [05-01]
  provides: [onboarding-store, onboarding-carousel, root-layout-gate]
  affects: [app/_layout.tsx, stores/, app/(onboarding)/]
tech_stack:
  added: ["@react-native-async-storage/async-storage@^1.x"]
  patterns:
    - "Reanimated 4.x Animated.FlatList with useAnimatedScrollHandler"
    - "Extrapolation.CLAMP dot indicators via useAnimatedStyle + interpolate"
    - "Zustand store with AsyncStorage persistence (initialize/complete pattern)"
    - "Stack.Protected guard for first-launch onboarding gate"
    - "Parallel splash-screen blocking: auth init + onboarding AsyncStorage check"
key_files:
  created:
    - stores/useOnboardingStore.ts
    - app/(onboarding)/_layout.tsx
    - app/(onboarding)/index.tsx
  modified:
    - app/_layout.tsx
    - package.json
    - package-lock.json
decisions:
  - "Used Extrapolation.CLAMP (not Extrapolate.CLAMP) — Reanimated 4.x API"
  - "expo-notifications wrapped in dynamic try/catch import — installed in 05-03, not this plan"
  - "router.replace('/(auth)/login') used instead of '/(auth)' — typed route requires concrete path"
  - "Named exports initialize/complete added to store for test compatibility"
  - "VAiInsightCard decorative: static AiInsight mock using content/suggestion (real type fields)"
metrics:
  duration: "~12 minutes"
  completed: "2026-03-22"
  tasks: 2
  files: 6
---

# Phase 5 Plan 02: Onboarding Carousel Summary

**One-liner:** 3-screen Reanimated 4.x paginated onboarding carousel with AsyncStorage first-launch gate, Zustand store, and root layout parallel init blocking the splash screen.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useOnboardingStore + package install | f84a804 | stores/useOnboardingStore.ts, package.json |
| 2 | Carousel screens + root layout integration | f82b3d6 | app/(onboarding)/_layout.tsx, app/(onboarding)/index.tsx, app/_layout.tsx |

## What Was Built

### stores/useOnboardingStore.ts
Zustand store persisting onboarding completion status to AsyncStorage key `@veridian/onboarding_complete`. Exports `useOnboardingStore` hook plus named `initialize` and `complete` helpers for non-hook usage in tests. Default state: `onboardingComplete: false`, `isChecked: false`. The `initialize()` action reads AsyncStorage and always sets `isChecked: true`; `complete()` writes to AsyncStorage and sets `onboardingComplete: true`.

### app/(onboarding)/_layout.tsx
Minimal Stack layout with `headerShown: false` for the onboarding route group.

### app/(onboarding)/index.tsx
Full 3-screen paginated onboarding carousel (148 lines of component code, 260+ total):
- **Reanimated 4.x:** `Animated.FlatList` horizontal with `pagingEnabled`, `useAnimatedScrollHandler` drives `scrollX` shared value. Three `DotIndicator` sub-components each use `useAnimatedStyle` + `interpolate` + `Extrapolation.CLAMP` for width (8→24→8 px) and opacity (0.3→1→0.3) animations.
- **Screen 1 ("Track your impact"):** Decorative `VProgressRing` with `progress={0.65}` and `size={120}`.
- **Screen 2 ("AI-powered insights"):** Decorative `VAiInsightCard` with static `AiInsight` mock (uses correct `content` field, not `summary`).
- **Screen 3 ("Challenge friends"):** Two plain `View/Text` mock leaderboard rows, "Allow notifications" `VButton` (secondary) with dynamic `expo-notifications` import in try/catch, "Get Started" `VButton` (primary).
- **Skip button:** Absolute positioned top-right, calls `complete()` then `router.replace('/(auth)/login')`.

### app/_layout.tsx (updated)
- Added `useOnboardingStore` import.
- `AppNavigator`: destructures `onboardingComplete`; `<Stack.Protected guard={!onboardingComplete}><Stack.Screen name="(onboarding)" /></Stack.Protected>` is now the FIRST child of `<Stack>` (before tabs and auth guards).
- `RootLayout`: fires `initialize()` and `initOnboarding()` in parallel inside a single `useEffect`. Splash screen hides only when `!isLoading && isChecked`. Null guard is `if (isLoading || !isChecked)`.
- Added TODO comment for 05-03 `useNotifications` hook import.

## Verification Results

```
npx tsc --noEmit        → exit 0 (zero errors)
npx jest --testPathPatterns="useOnboarding" --no-coverage → 6/6 passed
```

Acceptance criteria:
- `Stack.Protected.*onboarding` in app/_layout.tsx: 1 occurrence (PASS)
- `Extrapolation.CLAMP` in carousel: 2 occurrences (PASS)
- `pagingEnabled` in carousel: 1 occurrence (PASS)
- `complete()` called on Skip and Get Started: 2 occurrences (PASS)
- `isChecked` in _layout.tsx: 4 occurrences (splash hide, null guard, destructure, useEffect dep) (PASS)
- Both onboarding files present in `app/(onboarding)/` (PASS)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Named exports for test compatibility**
- **Found during:** Task 1 (reading the existing `__tests__/hooks/useOnboarding.test.ts` stub)
- **Issue:** Test checks `mod.initialize` and `mod.complete` as direct module exports; the store only exported `useOnboardingStore`
- **Fix:** Added `export const initialize` and `export const complete` as named proxies via `useOnboardingStore.getState()`
- **Files modified:** stores/useOnboardingStore.ts
- **Commit:** f84a804

**2. [Rule 3 - Blocking] Animated default import**
- **Found during:** Task 2, TypeScript check
- **Issue:** `Animated` is a default export from react-native-reanimated, not a named export. Plan snippet used named import syntax.
- **Fix:** Changed to `import Animated, { useSharedValue, ... } from 'react-native-reanimated'`
- **Files modified:** app/(onboarding)/index.tsx
- **Commit:** f82b3d6

**3. [Rule 3 - Blocking] Typed route path**
- **Found during:** Task 2, TypeScript check
- **Issue:** `router.replace('/(auth)')` fails typed routes — expo-router requires a concrete file path
- **Fix:** Changed to `router.replace('/(auth)/login')`
- **Files modified:** app/(onboarding)/index.tsx
- **Commit:** f82b3d6

**4. [Rule 2 - Missing functionality] expo-notifications try/catch**
- **Found during:** Task 2 planning
- **Issue:** `expo-notifications` not installed until plan 05-03; static import would crash
- **Fix:** Used dynamic `import('expo-notifications')` inside async IIFE wrapped in try/catch. Added TODO comment referencing 05-03.
- **Files modified:** app/(onboarding)/index.tsx
- **Commit:** f82b3d6

**5. [Rule 1 - Bug] VAiInsightCard static mock uses `content` not `summary`**
- **Found during:** Task 2, reading VAiInsightCard and AiInsight type
- **Issue:** Plan snippet mentioned `{ summary: ..., suggestion: ... }` but the real `AiInsight` type uses `content` (not `summary`); using `summary` would trigger TS error
- **Fix:** Used `content` field in mock object to match the actual type
- **Files modified:** app/(onboarding)/index.tsx
- **Commit:** f82b3d6

## Self-Check: PASSED

All files present: stores/useOnboardingStore.ts, app/(onboarding)/_layout.tsx, app/(onboarding)/index.tsx, app/_layout.tsx, 05-02-SUMMARY.md.

Commits verified: f84a804 (Task 1), f82b3d6 (Task 2).
