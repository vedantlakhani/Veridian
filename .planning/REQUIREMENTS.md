# Requirements: Veridian

**Defined:** 2026-03-15
**Core Value:** Every user understands their true carbon impact and receives one actionable step to reduce it today.

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Expo project scaffolded with TypeScript strict mode, Expo Router v4, and correct directory structure per Playbook Section 6
- [x] **FOUND-02**: Supabase PostgreSQL schema with all 13 tables created via migrations
- [x] **FOUND-03**: Row-Level Security (RLS) policies applied to every table using `auth.uid()`
- [x] **FOUND-04**: Supabase Auth configured with email/password provider
- [x] **FOUND-05**: Supabase Auth configured with Google OAuth provider
- [x] **FOUND-06**: Supabase Auth configured with Apple Sign-In provider
- [x] **FOUND-07**: Auth session persists across app restarts via Supabase session storage
- [x] **FOUND-08**: `lib/theme.ts` exports all color tokens, typography scale, spacing (4px grid), and shadow definitions
- [x] **FOUND-09**: `components/ui/VCard` — surface container with elevation variants
- [x] **FOUND-10**: `components/ui/VButton` — primary, secondary, ghost, destructive variants
- [x] **FOUND-11**: `components/ui/VBadge` — colored label with category variants
- [x] **FOUND-12**: `components/ui/VInput` — text input with label, error state, and icon slot
- [x] **FOUND-13**: `components/ui/VProgressBar` — animated horizontal progress with Reanimated 3
- [x] **FOUND-14**: `components/ui/VProgressRing` — animated circular progress with Reanimated 3
- [x] **FOUND-15**: `components/ui/VMetricCard` — carbon number display with JetBrains Mono
- [x] **FOUND-16**: `components/ui/VChip` — selectable filter/tag chip
- [x] **FOUND-17**: `components/ui/VBottomSheet` — Reanimated 3 gesture-driven bottom sheet
- [x] **FOUND-18**: `components/ui/VEmptyState` — illustration + CTA for empty list states
- [x] **FOUND-19**: `components/ui/VSkeleton` — Reanimated 3 shimmer loading placeholder
- [x] **FOUND-20**: TypeScript interfaces in `types/` for all domain models (User, EmissionEntry, EmissionFactor, Challenge, etc.)
- [x] **FOUND-21**: Bottom tab navigator with Home, Log, Insights, Profile tabs
- [x] **FOUND-22**: `emission_factors` table seeded with DEFRA 2025 GHG Conversion Factors

### Core Tracking

- [x] **TRACK-01**: User can log a food emission entry by selecting category, item, and quantity
- [x] **TRACK-02**: User can log a transport emission entry (car, public transit, flight, cycling) with distance
- [x] **TRACK-03**: User can log a home energy emission entry (electricity kWh, gas m³, heating)
- [x] **TRACK-04**: Emission calculation uses `emission_factors` table values (never hardcoded)
- [x] **TRACK-05**: User can view today's total carbon footprint on the Home screen
- [x] **TRACK-06**: User can view weekly carbon breakdown by category (food/transport/energy)
- [x] **TRACK-07**: User can view monthly carbon totals with trend comparison
- [x] **TRACK-08**: User can view emission history list with date filtering
- [x] **TRACK-09**: Bar chart showing daily/weekly emission breakdown (React Native SVG or Victory Native)
- [ ] **TRACK-10**: User can edit a logged emission entry
- [ ] **TRACK-11**: User can delete a logged emission entry
- [ ] **TRACK-12**: Emission entries sync via Supabase Realtime across devices

### AI Engine

- [x] **AI-01**: All Claude API calls are made via Supabase Edge Functions — zero direct client calls
- [x] **AI-02**: `analyze-emissions` Edge Function uses `claude-sonnet-4-5-20250929` for complex analysis
- [x] **AI-03**: `generate-suggestions` Edge Function uses `claude-haiku-4-5-20251001` for fast suggestions
- [x] **AI-04**: Home screen shows AI-generated insight card based on recent emissions (updated daily)
- [x] **AI-05**: Insight card includes one specific, quantified reduction action
- [x] **AI-06**: AI suggestions are personalized to user's emission profile (not generic)
- [x] **AI-07**: API key stored in Edge Function secrets, never in client bundle or environment

### Social & Challenges

- [x] **SOCL-01**: User has a profile with display name, avatar, and lifetime carbon stats
- [x] **SOCL-02**: User can create a challenge with name, duration, and target reduction percentage
- [x] **SOCL-03**: User can join an existing challenge via invite code
- [ ] **SOCL-04**: Challenge leaderboard shows participants ranked by emission reduction
- [ ] **SOCL-05**: User earns achievement badges for first log, 7-day streak, 10% reduction, etc.
- [ ] **SOCL-06**: User can view friends' challenges (not individual emission data — privacy)

### Polish & Launch

- [ ] **PLSH-01**: Onboarding flow: 3-screen carousel explaining core value, then signup/login
- [ ] **PLSH-02**: Expo push notifications configured for daily logging reminders
- [ ] **PLSH-03**: Notification for streak milestone (3-day, 7-day, 30-day)
- [ ] **PLSH-04**: App cold start time <3 seconds on mid-range device
- [ ] **PLSH-05**: Navigation transitions <100ms (Reanimated 3 driven)
- [ ] **PLSH-06**: App Store metadata: screenshots, description, privacy policy URL
- [ ] **PLSH-07**: Play Store metadata: screenshots, description, privacy policy URL
- [ ] **PLSH-08**: Offline-capable: log entries cached locally, synced when online

## v2 Requirements

### Advanced Analytics

- **ANLX-01**: Year-over-year carbon comparison
- **ANLX-02**: Carbon budget goal setting with projected trajectory
- **ANLX-03**: Per-item emission breakdown drill-down

### Third-Party Integrations

- **INT-01**: Utility company API integration for automatic energy reading
- **INT-02**: Flight booking API for automatic flight logging

### Monetization

- **MON-01**: Premium tier with advanced AI insights
- **MON-02**: Carbon offset purchasing via verified registries

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web app | Mobile-first strategy; web requires separate design/infra |
| Carbon offsetting | Requires financial/legal compliance; v2 |
| Third-party OAuth (Uber, Airbnb, utilities) | Requires individual API agreements; complex integration |
| Real-time multiplayer challenges | Async-first sufficient for v1; complexity/cost |
| Custom ML models | Claude API sufficient; own models = massive infrastructure |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| FOUND-07 | Phase 1 | Complete |
| FOUND-08 | Phase 1 | Complete |
| FOUND-09 | Phase 1 | Complete |
| FOUND-10 | Phase 1 | Complete |
| FOUND-11 | Phase 1 | Complete |
| FOUND-12 | Phase 1 | Complete |
| FOUND-13 | Phase 1 | Complete |
| FOUND-14 | Phase 1 | Complete |
| FOUND-15 | Phase 1 | Complete |
| FOUND-16 | Phase 1 | Complete |
| FOUND-17 | Phase 1 | Complete |
| FOUND-18 | Phase 1 | Complete |
| FOUND-19 | Phase 1 | Complete |
| FOUND-20 | Phase 1 | Complete |
| FOUND-21 | Phase 1 | Complete |
| FOUND-22 | Phase 1 | Pending |
| TRACK-01 | Phase 2 | Complete |
| TRACK-02 | Phase 2 | Complete |
| TRACK-03 | Phase 2 | Complete |
| TRACK-04 | Phase 2 | Complete |
| TRACK-05 | Phase 2 | Complete |
| TRACK-06 | Phase 2 | Complete |
| TRACK-07 | Phase 2 | Complete |
| TRACK-08 | Phase 2 | Complete |
| TRACK-09 | Phase 2 | Complete |
| TRACK-10 | Phase 2 | Pending |
| TRACK-11 | Phase 2 | Pending |
| TRACK-12 | Phase 2 | Pending |
| AI-01 | Phase 3 | Complete |
| AI-02 | Phase 3 | Complete |
| AI-03 | Phase 3 | Complete |
| AI-04 | Phase 3 | Complete |
| AI-05 | Phase 3 | Complete |
| AI-06 | Phase 3 | Complete |
| AI-07 | Phase 3 | Complete |
| SOCL-01 | Phase 4 | Complete |
| SOCL-02 | Phase 4 | Complete |
| SOCL-03 | Phase 4 | Complete |
| SOCL-04 | Phase 4 | Pending |
| SOCL-05 | Phase 4 | Pending |
| SOCL-06 | Phase 4 | Pending |
| PLSH-01 | Phase 5 | Pending |
| PLSH-02 | Phase 5 | Pending |
| PLSH-03 | Phase 5 | Pending |
| PLSH-04 | Phase 5 | Pending |
| PLSH-05 | Phase 5 | Pending |
| PLSH-06 | Phase 5 | Pending |
| PLSH-07 | Phase 5 | Pending |
| PLSH-08 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after initial definition*
