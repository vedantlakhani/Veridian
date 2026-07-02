# Veridian — Product Requirements Document

## 1. Product Vision

Veridian is a personal carbon footprint tracking app for iOS and Android. The core problem it solves is one most existing tools ignore: showing users their carbon number and stopping there. Apps like the original Klima gave you a score, maybe a comparison to a global average, and then nothing. No clear next step, no personalisation, no reason to return.

Veridian starts with how a person actually lives — their commute, diet, home energy setup — and gives them a ranked, specific list of changes that would move the needle for their lifestyle. The goal is to remove the guilt loop that drives churn in every existing carbon app and replace it with a progress loop: close the ring today, beat your streak, invite a friend to a challenge.

The emotional north star is "contribution without guilt." Users should feel like they are doing something that connects to a larger goal, not like they are being judged.

---

## 2. Target Users

**Primary:** Environmentally conscious 25-40 year olds in urban markets who are curious about their footprint but find existing tools either too complex, too preachy, or too shallow to keep using.

**Secondary:** Employers looking for a lightweight employee sustainability tool to meet scope 3 reporting requirements (B2B2C expansion, Phase 3+).

**Signals a user is a fit:**
- Has downloaded a carbon or sustainability app before
- Uses Apple Fitness or Google Fit
- Has a commute they make decisions about
- Shops at brands that market sustainability

---

## 3. Core Problem

**Three reasons existing carbon apps fail:**

1. **One-time experience.** The onboarding questionnaire gives a footprint number and the user never has a reason to come back.
2. **Generic advice.** "Eat less meat" is not useful if the user is already mostly vegetarian. The advice is not ranked by impact or personalised.
3. **Guilt as the main emotion.** Every interaction reinforces how bad the user is, not how much progress they are making.

**What Veridian does differently:**
- Starts with a baseline (8-question onboarding) and immediately shows what the two or three highest-impact changes would be for that specific user.
- Daily logging is designed to feel like closing Apple Fitness rings, not filling in a form.
- Progress is the primary metric shown, not the raw CO2 number.
- AI reasoning layer adapts recommendations as the user's logged behaviour changes.

---

## 4. Feature Scope

### 4.1 Onboarding and Baseline Calculator

An 8-question wizard covering transport, diet, home energy, and shopping. Each answer updates a live CO2 counter (animated) so the user sees their estimate building in real time. At the end, they see their annual estimate in metric tons, a comparison to the global average (4.7t) and the Paris target (2.5t), and a category breakdown.

The result (baseline_kg) is saved to their profile. This becomes the personalisation anchor for all AI recommendations.

**Questions:**
1. Primary transport mode (walk/cycle, transit, petrol car, EV, frequent flights)
2. Weekly travel distance
3. Diet type (vegan, vegetarian, flexitarian, omnivore, meat every meal)
4. Beef/lamb frequency
5. Home heating type (heat pump, gas, oil, electric storage)
6. Home size
7. Clothing shopping frequency
8. Electronics purchase frequency

The calculator is shown before signup (during onboarding) and also gated per account for new users on existing devices.

### 4.2 Home Dashboard

The hero element is a full-bleed nature photo with an SVG budget ring overlaid at the centre. The ring shows what percentage of the daily carbon budget has been used, colour-coded green/amber/red. Inside the ring is the percentage in JetBrains Mono. Below the ring is a personalised status label ("you are #on track", "#near limit", "#over budget") and today's total in kg.

Below the hero is a scrollable data card showing:
- Today's kg / This week's kg / kg remaining today
- Horizontal progress bars for Food, Transport, Energy (weekly totals)
- An AI-generated insight card (one sentence, refreshes weekly)
- Recent log entries

### 4.3 Activity Logging

The Log tab shows all emission factors as a browsable card feed, grouped by subcategory, with a coloured left-accent bar indicating category. Filter chips at the top (All, Food, Transport, Energy) narrow the list.

Tapping any card opens a bottom sheet with:
- A live CO2 preview (large number, updates as quantity changes)
- Quick-pick quantity buttons (0.5, 1, 2, 5) and a custom input
- A log button that shows the computed impact: "Log 0.42 kg"

Today's logged entries appear at the bottom of the same scroll view. This keeps logging to two taps maximum.

**Emission data source:** DEFRA 2025 emission factors, stored in a Supabase table, never hardcoded. Categories: food (beef, lamb, chicken, fish, dairy, vegetables, etc.), transport (car by fuel type, flights, rail, bus), energy (electricity by grid region, gas, oil).

### 4.4 Insights

A dedicated screen showing:
- Filter chips: Today, This Week, This Month
- Bar chart breaking down CO2 by category for the selected period
- Monthly summary card with trend vs. previous month
- Full entry list with swipe-to-delete and tap-to-edit

The chart and entry list both respond to the filter chip selection.

### 4.5 Profile

- Avatar and display name
- Lifetime stats (total kg logged, streak, entry count)
- Achievements grid (badge-based, unlocked by milestones)
- Challenges section (create a challenge, invite friends, join existing)
- Edit profile bottom sheet
- Sign out

### 4.6 Gamification (Built)

- **Streaks:** Consecutive days with at least one entry logged. Milestone notifications at 3, 7, and 30 days.
- **Achievements:** Badge system with specific unlock conditions (first log, 7-day streak, under budget for a week, etc.)
- **Challenges:** Users can create a custom challenge with a name, duration, and CO2 target. Friends can be invited by sharing a link. Leaderboard within each challenge.
- **Achievement toasts:** Appear on the profile screen when a new badge is unlocked.

### 4.7 AI Insight Layer (Built, Expanding)

One AI-generated insight per week shown on the home dashboard. Generated by Claude via a Supabase Edge Function using the user's weekly emission breakdown. Gives one specific, actionable observation (not generic advice). Example: "Your transport emissions are 3x your food emissions this week. A single round trip by rail instead of car would save 4.2 kg."

Future: ranked change recommendations using the baseline + recent behaviour delta.

### 4.8 Planned Features (Not Yet Built)

**Phase 3 — Transport Intelligence**
- Apple HealthKit / Google Fit integration for passive movement detection
- Route planner: enter origin and destination, app shows all route options with CO2 per mode
- CO2 saved by choosing a lower-emission option

**Phase 4 — Social Expansion**
- Team challenges (group of friends or colleagues)
- Public leaderboard
- Weekly summary notification with progress vs. previous week

**Phase 5 — Rewards and Brand Partnerships**
- Green Points earned by logging and hitting goals
- Points redeemable against partner brands (sustainability-focused retailers, food brands)
- Verified brand directory with transparency data (materials, supply chain)
- B2B2C: employer-distributed version for scope 3 employee reporting

---

## 5. User Flows

### New User Flow
1. App opens to onboarding carousel (3 slides: Track Your Impact, Earn While You Reduce, Join Your Community)
2. Tap "Get Started" to reach the carbon calculator
3. Answer 8 questions, see live CO2 counter update
4. Results screen: annual estimate, category breakdown, comparison chips
5. Tap "Save my footprint — Sign Up"
6. Email/password signup (or Google OAuth)
7. Email confirmation
8. On first login, pending baseline is auto-saved to profile
9. Arrive at Home dashboard with ring showing 0% used

### Returning User Flow (Daily)
1. Open app, see Home with ring and today's status
2. Tap Log tab, see activity card feed
3. Tap an activity, enter quantity, tap Log
4. Ring updates on Home

### Per-Account Gate (New Account, Existing Device)
- Device has already completed onboarding (AsyncStorage flag)
- User creates a new account
- On login, tabs layout detects baseline_kg is null
- Redirects to /carbon-calculator (standalone authenticated route)
- User completes calculator, saved directly to profile
- Arrives at Home

---

## 6. Business Model

**Phase 1 (Current): Free, no monetisation**
Build user base, validate core loop, collect feedback.

**Phase 2: B2C Freemium**
- Free: manual logging, daily ring, basic insights, challenges
- Premium (~$4.99/mo): AI recommendations, weekly summaries, route planner, advanced insights

**Phase 3: B2B2C**
- Employer dashboard for scope 3 reporting
- Per-seat pricing, company-branded version
- Reduces user acquisition cost significantly

**Phase 4: Brand Marketplace**
- Brands pay for placement in the rewards directory
- Verified sustainability criteria required for listing
- Revenue share on redemptions

---

## 7. Success Metrics

**Activation:** % of users who complete onboarding AND log at least one entry within 24 hours

**Retention:** Day 7, Day 30, Day 90 retention rates (target: 40% / 20% / 10% at launch)

**Engagement:** Average log events per active user per week

**Streak health:** Median streak length across active users

**Challenge participation:** % of users who join or create at least one challenge

**Baseline for comparison:** Klima peaked at ~4M downloads with D30 retention driven primarily by social/challenge layer.

---

## 8. Roadmap

| Phase | Scope | Status |
|---|---|---|
| Foundation | Auth, DB schema, design system, 11 base components | Complete |
| Core Loop | Onboarding calculator, Dashboard, Log, Insights, Profile, Gamification | Complete |
| AI Layer | Weekly insight card, recommendation engine via Edge Functions | Partial |
| Transport | HealthKit integration, route planner | Not started |
| Social | Team challenges, leaderboard, weekly summary push | Partial (challenges built) |
| Rewards | Green Points, brand marketplace | Not started |
| B2B2C | Employer dashboard, scope 3 reporting | Not started |

**Current target:** TestFlight internal beta Q3 2026.
