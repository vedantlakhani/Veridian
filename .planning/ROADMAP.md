# Roadmap: Veridian

**Created:** 2026-03-15
**Milestone:** v1.0 — Foundations to Launch
**Total Phases:** 5

---

## Phase 1: Foundation

**Goal:** Deployable Expo project with Supabase backend, full auth flow, and complete design system — every subsequent phase builds on this.

**Requirements covered:** FOUND-01 through FOUND-22

**Plans:** 5/5 plans complete

Plans:
- [x] 01-01-PLAN.md — Expo project scaffold, TypeScript strict, all dependencies, directory structure, Supabase singleton, Zustand auth store, root layout
- [x] 01-02-PLAN.md — Supabase schema: 13 migration files, RLS policies with (select auth.uid()), DEFRA 2025 emission_factors seed data
- [ ] 01-03-PLAN.md — Auth flow: email/password + Google + Apple Sign-In, auth screens (login, signup, forgot-password), session persistence
- [ ] 01-04-PLAN.md — Design system: lib/theme.ts tokens + all 11 V* components (VCard, VButton, VBadge, VInput, VProgressBar, VProgressRing, VMetricCard, VChip, VBottomSheet, VEmptyState, VSkeleton)
- [ ] 01-05-PLAN.md — TypeScript domain interfaces (all 13 tables), Jest infrastructure, all Wave 0 test stubs

**Success Criteria:**
- `npx expo start` runs without errors
- Auth flow works end-to-end in Expo Go
- All 11 components render in a component showcase screen
- Supabase tables exist with RLS verified via dashboard
- TypeScript compiles with zero errors in strict mode

---

## Phase 2: Core Tracking

**Goal:** Users can log food, transport, and energy emissions and see meaningful dashboard visualizations.

**Requirements covered:** TRACK-01 through TRACK-12

**Plans:** 4/5 plans executed

Plans:
- [ ] 02-01-PLAN.md — Wave 0 test stubs (emissions, chart, history hook), emissionStore, Log screen with CategorySelector + FoodForm + TransportForm + EnergyForm inside VBottomSheet
- [ ] 02-02-PLAN.md — lib/emissions.ts calculation engine (calcEmission, date utils, summary upsert), hooks/useEmissionEntries.ts CRUD hooks, Realtime publication migration
- [ ] 02-03-PLAN.md — hooks/useSummaries.ts (daily/weekly/monthly), Home dashboard with VProgressRing + VMetricCard + weekly breakdown + recent entries
- [ ] 02-04-PLAN.md — components/charts/EmissionBarChart.tsx (react-native-svg), Insights tab with history list + date filters + monthly trend
- [ ] 02-05-PLAN.md — Edit modal (app/entry/[id].tsx), swipe-to-delete in history, hooks/useEmissionRealtime.ts, Realtime mounted in root layout

**Success Criteria:**
- Can log a meal and see CO₂e value immediately
- Dashboard shows correct daily/weekly/monthly totals
- Chart renders without jank (60fps on device)
- Editing/deleting entries updates all views correctly
- Realtime: second device shows update within 2 seconds

---

## Phase 3: AI Engine

**Goal:** Claude API integrated server-side via Edge Functions, delivering personalized insights on the Home screen.

**Requirements covered:** AI-01 through AI-07

**Plans:**
1. Edge Function: `analyze-emissions` — Supabase Edge Function (Deno), Claude Sonnet integration, emission context injection, structured output
2. Edge Function: `generate-suggestions` — Claude Haiku integration, fast suggestion generation, personalization by emission profile
3. AI Insight card — Home screen card component, daily refresh via pg_cron, loading state, error boundary
4. Insight personalization — User emission history context, category-specific suggestions, quantified reduction actions

**Success Criteria:**
- AI insight appears on Home screen within 3 seconds of load
- Insight references user's actual recent emission data
- API key never appears in client bundle (verified via `npx expo export`)
- Edge Function cold start <500ms
- Haiku suggestions generate <1 second

---

## Phase 4: Social & Challenges

**Goal:** Users can create/join challenges, track leaderboards, and earn achievements — making reduction social and motivating.

**Requirements covered:** SOCL-01 through SOCL-06

**Plans:**
1. User profiles — Profile screen, display name + avatar upload, lifetime stats, edit profile
2. Challenges system — Create/join challenge flows, challenge data model, invite code generation
3. Leaderboard — Challenge participants sorted by reduction %, real-time updates via Supabase Realtime
4. Achievements — Badge system, milestone detection (first log, streaks, 10% reduction), achievement display

**Success Criteria:**
- Can create a challenge and share invite code
- Second user can join via invite code and appear on leaderboard
- Achievement badge awarded and visible after qualifying action
- Leaderboard updates in <2 seconds when participant logs entry

---

## Phase 5: Polish & Launch

**Goal:** App-store-ready build with onboarding, push notifications, performance targets met, and store assets prepared.

**Requirements covered:** PLSH-01 through PLSH-08

**Plans:**
1. Onboarding flow — 3-screen carousel with Reanimated 3 animations, skip option, persisted completion state
2. Push notifications — Expo Notifications setup, daily reminder scheduling, streak milestone notifications
3. Performance & offline — Cold start optimization, navigation transition polish, offline entry caching with sync
4. App Store assets — iOS screenshots (6.7", 6.1"), App Store description, privacy policy; Play Store equivalents
5. Launch readiness — EAS Build config, TestFlight/internal track submission, launch checklist

**Success Criteria:**
- Cold start <3s on iPhone 12 equivalent
- Navigation transitions <100ms (Reanimated 3)
- Entries logged offline sync when back online
- App passes App Store Review Guidelines checklist
- Push notification delivers within 30s of scheduled time

---

## Milestone Summary

| Phase | Status | Plans | Key Deliverable |
|-------|--------|-------|-----------------|
| 1 | 5/5 | Complete    | 2026-03-16 |
| 2 | 4/5 | In Progress|  |
| 3 | ○ | 4 | AI insights on home screen |
| 4 | ○ | 4 | Social challenges + achievements |
| 5 | ○ | 5 | App Store submission ready |

**Total plans:** 23

---
*Roadmap created: 2026-03-15*
*Last updated: 2026-03-16 — Phase 2 plans created*
