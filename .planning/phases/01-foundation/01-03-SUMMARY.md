---
phase: 01-foundation
plan: 03
subsystem: auth
tags: [supabase, expo-router, zustand, react-native, google-signin, apple-signin]

# Dependency graph
requires:
  - phase: 01-01
    provides: Expo scaffold, supabase.ts client, authStore stub, app/(auth)/ route stubs

provides:
  - Extended Zustand authStore with signInWithEmail, signUpWithEmail, resetPassword, signInWithGoogle, signInWithApple
  - Production login screen with email/password, Google, and Apple (iOS-only) sign-in
  - Production signup screen with validation (min 8 chars, password match) and email confirmation success state
  - Production forgot-password screen with sent confirmation state
  - authError state field surfaced inline in all auth screens

affects: [02-features, 03-ai, any phase requiring authenticated session]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GoogleSignin try/require pattern for graceful Expo Go degradation"
    - "Apple Sign-In dynamic import with ERR_REQUEST_CANCELED silent dismiss"
    - "Apple first-sign-in name persistence via profiles.upsert before navigation"
    - "authError inline display pattern — errorBox View below form, cleared on input change"
    - "Platform.OS === 'ios' gate for Apple Sign-In button in screen and store"

key-files:
  created: []
  modified:
    - stores/authStore.ts
    - app/(auth)/login.tsx
    - app/(auth)/signup.tsx
    - app/(auth)/forgot-password.tsx

key-decisions:
  - "GoogleSignin loaded via require() in try/catch so Expo Go doesn't crash; null check before use sets human-readable authError"
  - "Apple Sign-In uses dynamic import (expo-apple-authentication) to avoid static link on Android"
  - "Apple name/email persisted to profiles table immediately after signInWithIdToken — Apple only provides this on first sign-in"
  - "Used raw hex design token values (not lib/theme.ts import) since Plan 04 runs in parallel"
  - "Password reset redirectTo set to veridian://reset-password deep link for post-reset navigation"

patterns-established:
  - "Pattern 1: authError cleared on any input change (onChangeText calls setAuthError(null))"
  - "Pattern 2: loading boolean local to screen component, not in store — store only tracks authError"
  - "Pattern 3: success states (signup confirmed, reset sent) rendered as full-screen replacement, not modal"

requirements-completed: [FOUND-04, FOUND-05, FOUND-06, FOUND-07]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 1 Plan 3: Auth Screens Summary

**Email/password + Google + Apple Sign-In with Zustand authStore, inline error display, and iOS-gated Apple button replacing all Plan 01 auth screen stubs**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-16T03:52:38Z
- **Completed:** 2026-03-16T03:55:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended authStore with full auth action suite: signInWithEmail, signUpWithEmail, resetPassword, signInWithGoogle (Expo Go graceful degradation), signInWithApple (iOS-only + first-sign-in name persistence)
- Replaced all three Plan 01 placeholder screens with production-ready UI: login, signup, forgot-password
- All screens surface authError inline below the form with a styled errorBox (not console-only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend authStore with email/password and social auth actions** - `21dbb73` (feat)
2. **Task 2: Implement login, signup, and forgot-password screens** - `fc4ae1d` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `stores/authStore.ts` - Extended with signInWithEmail, signUpWithEmail, resetPassword, signInWithGoogle, signInWithApple, authError state
- `app/(auth)/login.tsx` - Full login UI with email/password, Google button, iOS-only Apple button, error display
- `app/(auth)/signup.tsx` - Signup with validation (min 8 chars, password match), email confirmation success state
- `app/(auth)/forgot-password.tsx` - Password reset form with sent confirmation success state and back navigation

## Decisions Made
- GoogleSignin loaded via `require()` inside `try/catch` so Expo Go doesn't crash on missing native module; sets human-readable authError message when null
- Apple Sign-In uses dynamic `import('expo-apple-authentication')` to avoid static native link on Android builds
- Apple user name/email persisted to `profiles` table immediately post-signInWithIdToken — Apple only exposes these on first sign-in
- Raw hex design tokens used throughout (`#1B7A4A`, `#F8FAF9`, etc.) rather than importing from `lib/theme.ts` (Plan 04 runs in parallel)
- TypeScript strict null on `GoogleSignin.configure` required `!` non-null assertion — added inline after the require assignment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript TS18047 strict null error on GoogleSignin.configure**
- **Found during:** Task 1 (authStore implementation)
- **Issue:** TypeScript reported `'GoogleSignin' is possibly 'null'` on the `.configure()` call inside the try block, even though the assignment just occurred
- **Fix:** Added `!` non-null assertion: `GoogleSignin!.configure(...)` to satisfy TypeScript strict mode
- **Files modified:** stores/authStore.ts
- **Verification:** `npx tsc --noEmit` exits 0 after fix
- **Committed in:** `21dbb73` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript strict null)
**Impact on plan:** Fix was necessary for TypeScript strict mode compliance. No scope creep.

## Issues Encountered
None beyond the TypeScript strict null deviation above, which was resolved inline.

## User Setup Required
None - no external service configuration required for this plan. Google and Apple Sign-In require EAS Build configuration (native modules), but that is outside this plan's scope.

## Next Phase Readiness
- Auth screens complete and wired to Supabase via authStore
- Session persistence handled by Plan 01 supabase.ts (expo-sqlite polyfill) — verified not regressed
- Plan 04 (design tokens) can migrate raw hex values to lib/theme.ts imports without breaking behavior
- Phase 2 features can assume useAuthStore().session is available for protected routes

---
*Phase: 01-foundation*
*Completed: 2026-03-16*

## Self-Check: PASSED

- stores/authStore.ts: FOUND
- app/(auth)/login.tsx: FOUND
- app/(auth)/signup.tsx: FOUND
- app/(auth)/forgot-password.tsx: FOUND
- 01-03-SUMMARY.md: FOUND
- Commit 21dbb73 (Task 1): FOUND
- Commit fc4ae1d (Task 2): FOUND
- `npx tsc --noEmit`: PASS
