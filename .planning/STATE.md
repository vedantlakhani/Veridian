---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-16T15:52:58.158Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 10
  completed_plans: 6
---

# Veridian — Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Every user understands their true carbon impact and receives one actionable step to reduce it today.
**Current focus:** Phase 2 — Core Tracking

## Current Phase

**Phase 2: Core Tracking**
- Status: In Progress
- Current Plan: 1 of 5
- Goal: Emission logging, calculation engine, history view, summary bar chart, and weekly challenge

## Progress

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 1     | ●      | 5     | 100%     |
| 2     | ◐      | 5     | 20%      |
| 3     | ○      | 4     | 0%       |
| 4     | ○      | 4     | 0%       |
| 5     | ○      | 5     | 0%       |

## Completed Plans

- **01-01**: Expo project scaffold with TypeScript strict, Expo Router v4, Supabase client, tab navigator structure
- **01-02**: Supabase PostgreSQL schema — 13 migration files, (select auth.uid()) RLS, DEFRA 2025 emission_factors seed (73 rows)
- **01-03**: Email/password + Google + Apple Sign-In with Zustand authStore, inline error display, iOS-gated Apple button, production auth screens
- **01-04**: 11 V* UI components with Reanimated 3 animations, react-native-svg progress ring, pan-gesture bottom sheet, JetBrainsMono metric cards, and barrel export
- **01-05**: TypeScript domain interfaces for all 13 Supabase tables, jest-expo@54 test infrastructure, 17 Wave 0 test stubs (44 tests passing)
- **02-01**: Zustand emissionStore, Wave 0 test stubs (emissions/EmissionBarChart/useEmissionEntries), CategorySelector + FoodForm/TransportForm/EnergyForm sub-forms inside VBottomSheet, useEmissionFactors hook with staleTime: Infinity

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

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01    | 01   | ~10min   | 3     | 15    |
| 01    | 02   | 4min     | 2     | 15    |
| 01    | 03   | 3min     | 2     | 4     |
| 01    | 04   | ~10min   | 2     | 13    |
| 01    | 05   | 9min     | 2     | 25    |
| 02    | 01   | 3min     | 2     | 11    |

## Next Action

Phase 2 Plan 01 complete. Execute Phase 2 Plan 02: Emission Calculation Engine

---
*Last session: 2026-03-16*
*Stopped at: Completed 02-01-PLAN.md*
