---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-16T03:58:20.326Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 5
  completed_plans: 4
---

# Veridian — Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Every user understands their true carbon impact and receives one actionable step to reduce it today.
**Current focus:** Phase 1 — Foundation

## Current Phase

**Phase 1: Foundation**
- Status: In Progress
- Current Plan: 5 of 5
- Goal: Deployable Expo project with Supabase backend, full auth flow, and complete design system

## Progress

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 1     | ◑      | 5     | 80%      |
| 2     | ○      | 5     | 0%       |
| 3     | ○      | 4     | 0%       |
| 4     | ○      | 4     | 0%       |
| 5     | ○      | 5     | 0%       |

## Completed Plans

- **01-01**: Expo project scaffold with TypeScript strict, Expo Router v4, Supabase client, tab navigator structure
- **01-02**: Supabase PostgreSQL schema — 13 migration files, (select auth.uid()) RLS, DEFRA 2025 emission_factors seed (73 rows)
- **01-03**: Email/password + Google + Apple Sign-In with Zustand authStore, inline error display, iOS-gated Apple button, production auth screens
- **01-04**: 11 V* UI components with Reanimated 3 animations, react-native-svg progress ring, pan-gesture bottom sheet, JetBrainsMono metric cards, and barrel export

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

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01    | 01   | ~10min   | 3     | 15    |
| 01    | 02   | 4min     | 2     | 15    |
| 01    | 03   | 3min     | 2     | 4     |
| 01    | 04   | ~10min   | 2     | 13    |

## Next Action

Execute Plan 01-05: TypeScript domain interfaces (types/ directory)

---
*Last session: 2026-03-16*
*Stopped at: Completed 01-04-PLAN.md*
