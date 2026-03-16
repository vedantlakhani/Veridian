# Veridian — Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Every user understands their true carbon impact and receives one actionable step to reduce it today.
**Current focus:** Phase 1 — Foundation

## Current Phase

**Phase 1: Foundation**
- Status: In Progress
- Current Plan: 3 of 5
- Goal: Deployable Expo project with Supabase backend, full auth flow, and complete design system

## Progress

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 1     | ◑      | 5     | 40%      |
| 2     | ○      | 5     | 0%       |
| 3     | ○      | 4     | 0%       |
| 4     | ○      | 4     | 0%       |
| 5     | ○      | 5     | 0%       |

## Completed Plans

- **01-01**: Expo project scaffold with TypeScript strict, Expo Router v4, Supabase client, tab navigator structure
- **01-02**: Supabase PostgreSQL schema — 13 migration files, (select auth.uid()) RLS, DEFRA 2025 emission_factors seed (73 rows)

## Decisions

- Used (select auth.uid()) not bare auth.uid() in all RLS policies for per-statement UID caching (95% speedup)
- achievements seeded inline in migration 00007; emission_factors seeded in seed.sql
- audit_log INSERT restricted to service role only (triggers write to it)
- challenges.invite_code: upper(substr(md5(random()::text), 1, 8)) for 8-char uppercase code
- notification_preferences.user_id is UNIQUE (one row per user)

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01    | 01   | ~10min   | 3     | 15    |
| 01    | 02   | 4min     | 2     | 15    |

## Next Action

Execute Plan 01-03: Supabase Auth (email/password, Google OAuth, Apple Sign-In)

---
*Last session: 2026-03-16*
*Stopped at: Completed 01-02-PLAN.md*
