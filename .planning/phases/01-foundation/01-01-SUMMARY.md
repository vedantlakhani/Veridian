---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [expo, expo-router, supabase, react-native, typescript, zustand, tanstack-query, reanimated, gesture-handler]

# Dependency graph
requires: []
provides:
  - Expo SDK 54 project skeleton with expo-router v4
  - TypeScript strict mode with @/* path aliases
  - Supabase client singleton with expo-sqlite localStorage session persistence
  - Zustand auth store with session/isLoading/signOut/initialize
  - Root layout with GestureHandlerRootView + QueryClientProvider + Stack.Protected auth guard
  - Full route structure: (tabs)/index/log/insights/profile + (auth)/login/signup/forgot-password
  - Empty directories for components/ui, types, supabase/migrations, assets/fonts
affects: [01-02, 01-03, 01-04, 01-05, all-subsequent-phases]

# Tech tracking
tech-stack:
  added:
    - expo@~54.0.33
    - expo-router@v4
    - "@supabase/supabase-js@^2.99.1"
    - expo-sqlite@~16.0.10 (localStorage polyfill for Supabase session)
    - react-native-reanimated@~3.16.7
    - react-native-gesture-handler@~2.28.0
    - "@tanstack/react-query@^5.90.21"
    - zustand@^5.0.12
    - react-native-url-polyfill
    - expo-apple-authentication
    - "@react-native-google-signin/google-signin"
    - react-native-svg
    - expo-font
    - expo-splash-screen
  patterns:
    - Stack.Protected declarative auth guard (Expo Router v4 pattern)
    - Zustand store with async initialize() + onAuthStateChange subscription
    - expo-sqlite localStorage polyfill as first import in supabase.ts
    - Platform.OS guard for web-safe localStorage access
    - GestureHandlerRootView at app root (required for Reanimated gesture components)

key-files:
  created:
    - lib/supabase.ts
    - lib/queryClient.ts
    - stores/authStore.ts
    - app/_layout.tsx
    - app/(auth)/_layout.tsx
    - app/(auth)/login.tsx
    - app/(auth)/signup.tsx
    - app/(auth)/forgot-password.tsx
    - app/(tabs)/_layout.tsx
    - app/(tabs)/index.tsx
    - app/(tabs)/log.tsx
    - app/(tabs)/insights.tsx
    - app/(tabs)/profile.tsx
    - app/+not-found.tsx
  modified:
    - package.json
    - tsconfig.json
    - babel.config.js
    - app.json
    - .gitignore
    - .env.example
    - components/hello-wave.tsx
    - components/parallax-scroll-view.tsx

key-decisions:
  - "Used Expo SDK 54 (latest stable, RN 0.81) instead of SDK 52 - create-expo-app@latest creates SDK 54 by default in 2026; pinned reanimated@~3.16.7 explicitly"
  - "Added Platform.OS web guard around localStorage usage in supabase.ts to fix web static rendering (SSR) crash during expo export"
  - "Kept template components (hello-wave, parallax-scroll-view) but fixed their TypeScript/Reanimated errors rather than deleting them"

patterns-established:
  - "Pattern 1: supabase.ts - expo-sqlite/localStorage/install MUST be first import, followed by react-native-url-polyfill/auto"
  - "Pattern 2: authStore.ts - call initialize() in root layout useEffect; store handles both getSession and onAuthStateChange"
  - "Pattern 3: _layout.tsx - GestureHandlerRootView wraps everything; Stack.Protected(!!session) for tabs, Stack.Protected(!session) for auth"

requirements-completed: [FOUND-01]

# Metrics
duration: 7min
completed: 2026-03-15
---

# Phase 01 Plan 01: Expo Scaffold and Foundation Summary

**Expo SDK 54 project skeleton with expo-router v4, Supabase client using expo-sqlite localStorage polyfill, Zustand auth store, and Stack.Protected route guard — npx tsc and expo export --platform all pass clean**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-15T06:42:06Z
- **Completed:** 2026-03-15T06:49:14Z
- **Tasks:** 2
- **Files modified:** 22

## Accomplishments

- Expo SDK 54 project scaffold with all required dependencies installed at compatible versions
- TypeScript strict mode configured with `@/*` path aliases; `npx tsc --noEmit` exits 0
- Supabase client singleton with expo-sqlite localStorage session persistence and AppState auto-refresh
- Zustand auth store exposing session, isLoading, signOut, and initialize with onAuthStateChange subscription
- Root layout with GestureHandlerRootView + QueryClientProvider + dual Stack.Protected guards for authenticated/unauthenticated routes
- All 9 route files exist: 4 tabs + 3 auth screens + root layout + not-found
- `npx expo export --platform all` succeeds for iOS, Android, and Web (no bundle errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Expo project, install all dependencies, configure TypeScript** - `4fb448c` (feat)
2. **Task 2: Create directory structure, Supabase client, auth store, and root layout** - `c26828e` (feat)

**Plan metadata:** (committed after SUMMARY.md creation)

## Files Created/Modified

- `lib/supabase.ts` - Supabase singleton with expo-sqlite localStorage polyfill, AppState refresh, web-safe platform guard
- `lib/queryClient.ts` - TanStack QueryClient with 5-minute staleTime and 2 retries
- `stores/authStore.ts` - Zustand auth store: session/user/isLoading, initialize(), signOut(), onAuthStateChange
- `app/_layout.tsx` - Root layout: GestureHandlerRootView + QueryClientProvider + Stack.Protected dual guard
- `app/(auth)/_layout.tsx` - Auth stack layout with login/signup/forgot-password screens
- `app/(auth)/login.tsx` - Login placeholder screen
- `app/(auth)/signup.tsx` - Signup placeholder screen
- `app/(auth)/forgot-password.tsx` - Forgot password placeholder screen
- `app/(tabs)/_layout.tsx` - Tab navigator with 4 tabs (Home/Log/Insights/Profile) using Veridian green palette
- `app/(tabs)/index.tsx` - Home placeholder screen
- `app/(tabs)/log.tsx` - Log placeholder screen
- `app/(tabs)/insights.tsx` - Insights placeholder screen
- `app/(tabs)/profile.tsx` - Profile placeholder screen
- `app/+not-found.tsx` - 404 screen
- `package.json` - All dependencies added
- `tsconfig.json` - strict mode + baseUrl + @/* paths + expo-types includes
- `babel.config.js` - babel-preset-expo only (no manual reanimated plugin)
- `app.json` - name/slug/scheme=veridian, typedRoutes, usesAppleSignIn, bundle IDs
- `.env.example` - EXPO_PUBLIC_* variable shapes
- `.gitignore` - Added .env entry
- `components/hello-wave.tsx` - Fixed: CSS animation props -> Reanimated 3 worklet
- `components/parallax-scroll-view.tsx` - Fixed: useScrollOffset -> useScrollViewOffset

## Decisions Made

- Used Expo SDK 54 (RN 0.81, latest stable in 2026) rather than SDK 52. The `create-expo-app@latest` creates SDK 54 by default; pinned `react-native-reanimated@~3.16.7` explicitly per plan spec.
- Added `Platform.OS !== 'web'` guard around localStorage usage in `lib/supabase.ts`. The expo-sqlite polyfill is native-only; web static rendering (SSR) crashed with "localStorage is not defined" without this guard. The fix allows `npx expo export --platform all` to pass.
- Kept template boilerplate components (hello-wave, parallax-scroll-view) but corrected their TypeScript errors to keep `tsc --noEmit` passing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed web static rendering crash in lib/supabase.ts**
- **Found during:** Task 2 (verification — `npx expo export --platform all`)
- **Issue:** `localStorage is not defined` error during Expo web SSG rendering. The expo-sqlite localStorage polyfill sets `global.localStorage` only in the React Native runtime. The Node.js static renderer does not execute the polyfill, causing createClient to crash on `storage: localStorage`.
- **Fix:** Added `Platform.OS !== 'web'` check and `typeof localStorage !== 'undefined'` guard before passing localStorage as storage. Wrapped AppState.addEventListener in the same platform check.
- **Files modified:** lib/supabase.ts
- **Verification:** `npx expo export --platform all` completed with iOS (1341 modules), Android (1386 modules), and Web (1170 modules) bundles all succeeding.
- **Committed in:** c26828e (Task 2 commit)

**2. [Rule 1 - Bug] Fixed Reanimated 3 type errors in template components**
- **Found during:** Task 2 (verification — `npx tsc --noEmit`)
- **Issue:** Template `hello-wave.tsx` used CSS animation properties (`animationName`, `animationIterationCount`, `animationDuration`) which are not valid Reanimated 3 `TextStyle` properties. Template `parallax-scroll-view.tsx` imported `useScrollOffset` which was renamed to `useScrollViewOffset` in Reanimated 3.x.
- **Fix:** Rewrote hello-wave to use proper Reanimated 3 worklet (`useSharedValue` + `withRepeat` + `withSequence`). Changed `useScrollOffset` to `useScrollViewOffset` in parallax-scroll-view.
- **Files modified:** components/hello-wave.tsx, components/parallax-scroll-view.tsx
- **Verification:** `npx tsc --noEmit` exits 0 with zero errors.
- **Committed in:** c26828e (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2x Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for correctness. The web export fix is required by the plan's verification step. The template component fixes were needed to pass the TypeScript strict check required by acceptance criteria. No scope creep.

## Issues Encountered

- `create-expo-app@latest` refused to scaffold in the non-empty project directory (`.planning/` and `.claude/` present). Workaround: scaffolded into `/tmp/veridian-temp`, then `rsync`'d files over excluding node_modules and .git, then ran `npm install` in the project root.
- Copied `node_modules` via `cp -r` initially failed (module resolution broke). Fixed by deleting and running `npm install` fresh.

## User Setup Required

None - no external service configuration required for this plan. Real Supabase credentials will be needed when wiring up auth (Plan 03) — add to `.env` file (already gitignored).

## Next Phase Readiness

- Runnable Expo skeleton is in place; `npx expo start` will launch without errors
- TypeScript strict mode configured; all subsequent plans must maintain zero tsc errors
- Supabase client and auth store are wired — Plans 02 (database schema) and 03 (auth UI) can build directly on these
- Stack.Protected guard is in place — when real Supabase session is returned, routing will work automatically
- All placeholder screens and empty directories ready for Plans 02-05 to fill in

## Self-Check: PASSED

All key files verified present on disk. Both task commits (4fb448c, c26828e) verified in git history.

---
*Phase: 01-foundation*
*Completed: 2026-03-15*
