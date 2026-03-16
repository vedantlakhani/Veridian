# Veridian

## What This Is

Veridian is a premium mobile carbon footprint tracking app for iOS and Android. It empowers individuals to understand, measure, and meaningfully reduce their personal carbon emissions across food, transport, and energy — with AI-powered insights delivered through a calm, beautiful interface inspired by Apple Health and Headspace.

## Core Value

Every user understands their true carbon impact and receives one actionable step to reduce it today.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

**Foundation**
- [ ] Expo project scaffolded with TypeScript strict mode, Expo Router v4, and full file structure
- [ ] Supabase schema with 13 tables and RLS policies on every table using auth.uid()
- [ ] Authentication: email/password, Google Sign-In, Apple Sign-In
- [ ] Design system: 4px grid, Forest Green (#1B7A4A) primary, 11 base components
- [ ] TypeScript interfaces for all domain models

**Core Tracking**
- [ ] Food emission logging with DEFRA 2025 GHG factors from Supabase table
- [ ] Transport emission logging (car, public transit, flights, cycling)
- [ ] Home energy emission logging (electricity, gas, heating)
- [ ] Daily/weekly/monthly dashboard with carbon totals
- [ ] Emission history with chart visualizations (React Native SVG + Victory Native)

**AI Engine**
- [ ] All Claude API calls via Supabase Edge Functions (never direct from client)
- [ ] AI-powered emission insights using claude-sonnet-4-5-20250929
- [ ] Fast personalized suggestions using claude-haiku-4-5-20251001
- [ ] Personalized reduction action recommendations

**Social & Challenges**
- [ ] User profiles with carbon stats
- [ ] Group challenges with leaderboards
- [ ] Achievement badges for reduction milestones

**Polish & Launch**
- [ ] Expo push notifications for daily reminders and streaks
- [ ] Onboarding flow (3-screen carousel)
- [ ] App Store and Play Store assets
- [ ] Performance: <3s cold start, <100ms navigation transitions

### Out of Scope

- Carbon offsetting / purchasing — monetization v2
- Third-party integrations (Uber, Airbnb, utility APIs) — requires OAuth agreements
- Web app — mobile-first, web later
- Android-only features — cross-platform parity required
- Real-time multiplayer challenges — async-first for v1

## Context

- **Full Spec:** Veridian PRD v2.0 + Antigravity Playbook — 13-table data model, all screens documented, agent configurations defined
- **Carbon Data:** DEFRA 2025 GHG Conversion Factors (primary), EPA eGRID, IPCC AR6, EXIOBASE — all stored in Supabase `emission_factors` table, never hardcoded
- **AI Security:** API keys in Edge Function secrets only, all AI calls server-side
- **Design Identity:** Calm, premium, data-forward — JetBrains Mono for all numeric data, Inter for all text
- **Animation Rule:** React Native Reanimated 3 ONLY — never the RN Animated API (runs on UI thread, not JS thread)
- **No custom UI libraries** — build all components from scratch per design system

## Constraints

- **Tech Stack:** Expo SDK 52+, Expo Router v4, Supabase (PostgreSQL 15 + Auth + Realtime + Edge Functions), React Native Reanimated 3, TanStack React Query v5, Zustand v5
- **TypeScript:** Strict mode — no `any`, no `@ts-ignore`
- **Security:** RLS on every Supabase table, no API keys in client bundle
- **Carbon Data:** Must use DEFRA 2025 as primary source, factors must be updateable without app release (stored in DB)
- **Animation:** Reanimated 3 only — the RN Animated API is banned
- **Charts:** React Native SVG 15.x for custom, Victory Native 41.x for complex charts

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Edge Functions for all AI calls | Security — API keys never in client bundle | — Pending |
| Reanimated 3 over RN Animated API | Performance — runs on UI thread, not JS thread | — Pending |
| All emission factors in DB table | Updateable without app release | — Pending |
| Expo Router v4 file-based routing | Modern RN routing standard, deep link support | — Pending |
| No third-party UI libraries | Full design system control, no bloat | — Pending |

---
*Last updated: 2026-03-15 after initial project definition*
