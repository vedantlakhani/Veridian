---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-22T20:41:00.000Z"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 22
  completed_plans: 21
---

# Veridian — Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Every user understands their true carbon impact and receives one actionable step to reduce it today.
**Current focus:** Phase 4 — Social & Challenges

## Current Phase

**Phase 4: Social & Challenges**
- Status: Complete ●
- Current Plan: 4 of 4 (COMPLETE)
- Goal: Profile screen, challenges flow, leaderboard, achievements

## Progress

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 1     | ●      | 5     | 100%     |
| 2     | ●      | 5     | 100%     |
| 3     | ●      | 4     | 100%     |
| 4     | ●      | 4     | 100%     |
| 5     | ◑      | 5     | 60%      |

## Completed Plans

- **01-01**: Expo project scaffold with TypeScript strict, Expo Router v4, Supabase client, tab navigator structure
- **01-02**: Supabase PostgreSQL schema — 13 migration files, (select auth.uid()) RLS, DEFRA 2025 emission_factors seed (73 rows)
- **01-03**: Email/password + Google + Apple Sign-In with Zustand authStore, inline error display, iOS-gated Apple button, production auth screens
- **01-04**: 11 V* UI components with Reanimated 3 animations, react-native-svg progress ring, pan-gesture bottom sheet, JetBrainsMono metric cards, and barrel export
- **01-05**: TypeScript domain interfaces for all 13 Supabase tables, jest-expo@54 test infrastructure, 17 Wave 0 test stubs (44 tests passing)
- **02-01**: Zustand emissionStore, Wave 0 test stubs (emissions/EmissionBarChart/useEmissionEntries), CategorySelector + FoodForm/TransportForm/EnergyForm sub-forms inside VBottomSheet, useEmissionFactors hook with staleTime: Infinity
- **02-02**: DEFRA 2025 emission calculation engine (calcEmission, getLocalDateString, getISOWeekStart, computeDailyCategoryTotals, upsertDailySummary, upsertWeeklySummary), TanStack Query CRUD hooks (useEmissionEntries, useCreateEntry, useUpdateEntry, useDeleteEntry), Realtime migration, log.tsx wired to real mutation
- **02-03**: TanStack Query hooks (useDailySummary, useWeeklySummary, useMonthlyTotals) and full Home dashboard with VProgressRing, VMetricCard, weekly category breakdown, recent entries list, VSkeleton loading states, VEmptyState
- **02-04**: EmissionBarChart react-native-svg bar chart (Rect/G/Line/SvgText, overflow="visible" Android fix), Insights screen with date filter chips (today/week/month), weekly breakdown chart, monthly trend comparison, and date-filtered history list
- **02-05**: Edit entry modal (app/entry/[id].tsx) pre-fills quantity with useUpdateEntry on save; swipe-to-delete in insights (Reanimated 3 Gesture.Pan, runOnJS); useEmissionRealtime hook (postgres_changes filtered by user_id) mounted in root layout
- **03-01**: Two Deno Edge Functions (analyze-emissions using Sonnet 4.5, generate-suggestions using Haiku 4.5) calling Claude API server-side; two-client auth pattern; shared CORS module
- **03-02**: Cache-first useAiInsight TanStack Query hook — SELECT ai_insights with gt('expires_at', now) before Edge Function call; zero-emission guard; staleTime 23h; retry 1 with 2s delay
- **03-03**: VAiInsightCard component with skeleton/null/content states; Home screen wired with emissionContext from weekly+entries, AI card inserted between Today Metric Card and This Week section
- **04-01**: Supabase avatars Storage bucket, challenge_participants Realtime, profiles leaderboard RLS, useProfile/useUpdateProfile/uploadAvatar hooks, stats-first Profile screen, 5 Wave 0 test stubs
- **04-02**: Challenge create/join flow with SheetMode state machine, useChallenges hooks (useMyChallenges/useCreateChallenge/useJoinChallenge), ChallengeCard component, invite code copy/share
- **04-03**: useLeaderboard hook with _computeReductionPct and _sortLeaderboard, useChallengeRealtime Realtime subscription, LeaderboardRow component, challenge detail screen
- **04-04**: Achievement badge system — useAchievements hook with all 4 criteria types, AchievementBadge SVG component (earned/locked states), AchievementToast Reanimated 3 slide-in, achievement detection wired into useEmissionEntries mutations, Profile screen badge row

## Decisions

- Used (select auth.uid()) not bare auth.uid() in all RLS policies for per-statement UID caching (95% speedup)
- achievements seeded inline in migration 00007; emission_factors seeded in seed.sql
- audit_log INSERT restricted to service role only (triggers write to it)
- challenges.invite_code: upper(substr(md5(random()::text), 1, 8)) for 8-char uppercase code
- notification_preferences.user_id is UNIQUE (one row per user)
- [Phase 01-foundation]: Used Expo SDK 54 (RN 0.81) with reanimated@~3.16.7 pinned explicitly; create-expo-app@latest creates SDK 54 in 2026
- [Phase 01-foundation]: Added Platform.OS web guard in supabase.ts localStorage — expo-sqlite polyfill is native-only; guard required for expo export --platform all web SSR to pass
- [Phase 01]: GoogleSignin loaded via require() try/catch for graceful Expo Go degradation; null guard sets human-readable authError
- [Phase 01]: Apple Sign-In uses dynamic import(expo-apple-authentication) to avoid static native link on Android
- [Phase 01]: Apple user name persisted to profiles table immediately post-signInWithIdToken — Apple only provides on first sign-in
- [Phase 01]: Raw hex design tokens used in auth screens (not lib/theme.ts) since Plan 04 design system runs in parallel
- [Phase 01-04]: ReactNode imported from 'react' not 'react-native' — react-native does not export ReactNode type
- [Phase 01-04]: VProgressRing uses useAnimatedProps (not useAnimatedStyle) for SVG stroke-dashoffset prop
- [Phase 01-04]: runOnJS imported at file top level in VBottomSheet worklet callbacks
- [Phase 01-05]: Used manual reanimated mock (not /mock entrypoint) — reanimated 3.16+ /mock loads worklet source requiring __reanimatedLoggerConfig global
- [Phase 01-05]: jest-expo@54 pinned to match expo@54 SDK — @55 installs by default and is incompatible with expo@54 winter module structure
- [Phase 01-05]: Expo winter lazy globals pre-triggered in jest.setup.js to prevent teardown ReferenceError (installGlobal lazy property accessed after Jest module registry closes)
- [Phase 02-01]: emissionStore setCategory clears selectedFactor and quantity — prevents stale cross-category state leaking into submit
- [Phase 02-01]: quantity kept as string in emissionStore for TextInput binding — parseFloat only at submit time
- [Phase 02-01]: staleTime: Infinity for emission_factors in useEmissionFactors — DEFRA seed data is immutable; avoids redundant Supabase fetches
- [Phase 02-01]: Wave 0 test stub pattern: beforeAll async import with try/catch; individual tests guard with if (!fn) return — compile without source module
- [Phase 02]: Split lib/emissions.ts: pure functions on top, async Supabase helpers below for testability without mocking at import time
- [Phase 02]: upsertDailySummary recomputes from all entries (not delta) to prevent summary drift on edit/delete
- [Phase 02]: VEmptyState uses body prop not subtitle — plan template was wrong; auto-fixed to match actual component API
- [Phase 02-04]: overflow='visible' on Svg spread as any — SvgProps type doesn't expose overflow but react-native-svg supports it at runtime for Android clip fix
- [Phase 03-01]: OPTIONS preflight handled before auth — ensures CORS works even for unauthenticated pre-flight browser requests
- [Phase 03-01]: user_id sourced from verified JWT (getUser), never from request body — prevents privilege escalation
- [Phase 03-01]: Two-client pattern: userClient (anon key for JWT verification) + supabaseAdmin (service role for DB writes)
- [Phase 03-01]: Markdown fence regex strips Claude formatting variance before JSON.parse in both Edge Functions
- [Phase 03-02]: Supabase SELECT is authoritative TTL check (not staleTime) — after app restart React Query has no cache; SELECT with gt('expires_at', now) prevents stale data
- [Phase 03-02]: Guard (weeklyTotalKg === 0) returns null silently — avoids Claude API call for new users with no emission data
- [Phase 03-02]: FunctionsHttpError cast used to access context.status for 401 detection — SupabaseClient types surface as FunctionsError without exposing context
- [Phase 03]: VAiInsightCard returns null (not error UI) on error or missing insight — clean degradation, no screen disruption
- [Phase 03]: emissionContext set to null until both weekly and recentEntries loaded — prevents premature Claude API call for partial data
- [Phase 03]: AI insight card has independent loading state from main screen — insightLoading separate from isLoading/weeklyLoading
- [Phase 04-01]: Used expo-file-system/legacy import for EncodingType — v18 restructured exports; legacy subpath preserves readAsStringAsync + EncodingType
- [Phase 04-01]: supabase migration repair used to mark Phase 1-3 as applied before Phase 4 db push — remote DB had schema but no migration history
- [Phase 04-01]: Profile stats use 3 independent TanStack Query hooks (all-time entries sum, weekly_summaries min, daily_summaries streak) — avoids new aggregation columns
- [Phase 04-02]: SheetMode state machine (none/select/create/join/created) avoids multiple boolean flags for VBottomSheet challenge flow
- [Phase 04-02]: router.push cast as any for /challenge/[id] — route file deferred to plan 04-03
- [Phase 04-04]: checkAndUnlockAchievements is plain async function (not hook) for safe mutation onSuccess calling
- [Phase 04-04]: Toast signaling uses queryClient.setQueryData + getQueryCache().subscribe for cross-component achievement notifications without prop drilling
- [Phase 04-03]: _computeReductionPct and _sortLeaderboard exported with _ prefix for unit testing without mocking Supabase
- [Phase 04-03]: useChallengeRealtime mounted in challenge screen (not root layout) — subscription scoped to leaderboard screen lifetime
- [Phase 04-03]: SOCL-06 privacy enforced at component level — LeaderboardRow.tsx contains no baseline_kg or current_kg references; reduction_pct is the only performance metric visible
- [Phase 05-01]: Used ts-ignore on dynamic import lines in Wave 0 stubs — TS2307 expected for modules not yet created
- [Phase 05-01]: Excluded supabase/functions from tsconfig.json — Deno Edge Functions use npm: specifiers incompatible with standard tsc; pre-existing errors
- [Phase 05-polish-launch]: Onboarding carousel: Reanimated 4.x Extrapolation.CLAMP, AsyncStorage '@veridian/onboarding_complete' key, Stack.Protected guard as first child of root Stack
- [Phase 05-polish-launch]: useOfflineQueue: module-level dbPromise singleton for expo-sqlite v16; withTiming in useEffect not render body for Reanimated 3 correctness; hooks-before-early-return in VOfflineBanner
- [Phase 05-03]: Streak notifications use separate daily_summaries query (not newBadges from checkAndUnlockAchievements) — ensures notification fires regardless of whether achievement badge was already earned
- [Phase 05-03]: easConfig typed as { projectId?: string } | undefined for TypeScript strict mode (no any)

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01    | 01   | ~10min   | 3     | 15    |
| 01    | 02   | 4min     | 2     | 15    |
| 01    | 03   | 3min     | 2     | 4     |
| 01    | 04   | ~10min   | 2     | 13    |
| 01    | 05   | 9min     | 2     | 25    |
| 02    | 01   | 3min     | 2     | 11    |
| 02    | 02   | 6min     | 2     | 5     |
| 02    | 03   | 4min     | 2     | 2     |
| 02    | 04   | 5min     | 2     | 4     |
| 03    | 01   | 6min     | 3     | 3     |
| 03    | 02   | 2min     | 1     | 1     |
| 03    | 03   | 4min     | 2     | 3     |
| 04    | 01   | 7min     | 3     | 12    |
| 04    | 02   | 5min     | 2     | 3     |
| 04    | 03   | 5min     | 2     | 6     |
| 04    | 04   | 4min     | 2     | 6     |
| Phase 05 P01 | 5min | 2 tasks | 4 files |
| Phase 05-polish-launch P02 | 12 | 2 tasks | 6 files |
| Phase 05-polish-launch P04 | 140 | 2 tasks | 5 files |
| 05 | 03 | 12min | 2 | 5 |

## Next Action

Phase 5 in progress (3/5 plans complete). Next: 05-04 — App Store metadata and assets.

---
*Last session: 2026-03-22*
*Stopped at: Completed 05-03-PLAN.md*
