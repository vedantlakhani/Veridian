# Veridian — Design System and Tech Stack

---

## 1. Design Philosophy

The aesthetic reference is Apple Health meets Headspace: calm, premium, data-rich, and warm. The app should feel like a wellness tool, not an environmental audit. Every screen is designed to surface progress rather than failure.

The dark theme is hardcoded (no light mode toggle). Background is deep near-black, not pure black. Cards sit one step lighter. The primary green is forest-derived, not neon. Numeric data is always monospaced.

**Key principle:** The ring closes. Progress is the dominant visual metaphor, not the raw CO2 number.

---

## 2. Color System

All colors are defined as tokens in `lib/theme.ts` and referenced by name. No component ever hardcodes a hex value.

| Token | Hex | Usage |
|---|---|---|
| background | #191C1C | App background, always |
| surface | #1E2120 | Cards, bottom sheets, inputs |
| primary | #006036 | CTAs, active nav, progress fills |
| primaryContainer | #1B7A4A | Hover states, selected states |
| primaryLight | #80D9A0 | Progress ring track, subtle highlights |
| textPrimary | #FFFFFF | Headings, primary labels |
| textSecondary | #B0B8B4 | Subtitles, hints, secondary values |
| success | #4ADE80 | On track status, positive delta |
| warning | #F59E0B | Near limit, streaks |
| error | #EF4444 | Over budget, deletion actions |
| food | #22C55E | Food category accent |
| transport | #3B82F6 | Transport category accent |
| energy | #F59E0B | Energy category accent |
| border | rgba(255,255,255,0.08) | Hairline borders only |
| divider | rgba(255,255,255,0.05) | Section separators |

**The No-Line Rule:** Sections are separated by background color shifts, not 1px borders. Borders are used only for interactive elements (inputs, selected cards).

---

## 3. Typography

Two fonts only. No exceptions.

**JetBrains Mono (Bold 700)** — all numeric data: CO2 values, percentages, streak counts, timestamps. Sizes range from 11sp (small labels) to 40sp (hero metric inside ring).

**Inter (system default fallback)** — all text: headings, body, labels, buttons.

**Scale:**
| Name | Size | Weight | Usage |
|---|---|---|---|
| xs | 11sp | 400/600 | Metadata, units, timestamps |
| sm | 13sp | 400/600 | Secondary labels, entry subtitles |
| md | 15sp | 400/600 | Body text, card content |
| lg | 17sp | 700 | Section headings |
| xl | 20sp | 700 | Screen sub-headings |
| xxl | 24sp | 700 | Screen titles |

Hero ring percentage: 36sp JetBrains Mono Bold.
Status label below ring: 22sp JetBrains Mono Bold.

---

## 4. Spacing

4px grid. All spacing values are multiples of 4.

| Token | Value |
|---|---|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| xxl | 24px |
| xxxl | 32px |

Screen horizontal padding: 16px (spacing.lg) consistently. No screen uses edge-to-edge content.

---

## 5. Elevation and Shadows

Three levels only.

| Level | Shadow |
|---|---|
| sm | 0 1px 4px rgba(0,0,0,0.20) |
| md | 0 2px 8px rgba(0,0,0,0.28) |
| lg | 0 4px 16px rgba(0,0,0,0.35) |

No heavy drop shadows. Depth is created by background-to-surface color shift (surface is #1E2120 on background #191C1C).

---

## 6. Border Radius

| Context | Radius |
|---|---|
| Cards | 12px |
| Buttons | 12px |
| Input fields | 10px |
| Chips / pills / badges | 999px (full) |
| Bottom sheets | 24px top corners |
| Activity card accent bar | 0px (flush) |

---

## 7. Component Library

All components live in `components/ui/`. No third-party UI libraries (no NativeBase, no React Native Paper, no UI Kitten).

### VCard
Surface container. Props: `elevation` (sm/md/lg), `style`. Background is always `colors.surface`. No borders by default.

### VButton
Primary and secondary variants. Primary: `colors.primary` background, white text. Secondary: `colors.surface` background, `colors.primary` text. Both: 12px radius, 20px horizontal padding, 48px minimum height. Scale to 0.96 on press (Reanimated withSpring). Light haptic on every press.

### VBadge
Category pill. Variants: food (green), transport (blue), energy (amber). Pill shape, 12px horizontal padding, 6px vertical. Shows category label.

### VInput
Labeled text input. Label above field. Background `colors.surface`, 10px radius, 1px border `colors.border`. Focus state increases border opacity. Always passes accessibilityLabel.

### VProgressBar
Horizontal progress bar. Props: `value` (0-1), `color`, `height` (default 6px). Rounded caps. Track background is `colors.background`.

### VProgressRing
SVG circular ring. Props: `progress` (0-1), `size`, `strokeWidth`, `color`. Uses react-native-svg. Renders on a -90deg rotation so progress starts from 12 o'clock. Track ring at 18% opacity of primary color.

### VMetricCard
Single metric display. Large JetBrains Mono number, unit label below. Used in stats rows.

### VChip
Selectable filter chip. Active state: `colors.primary` background, white text. Inactive: `colors.surface` background, `colors.textSecondary` text. Pill shape.

### VBottomSheet
Modal bottom sheet. 24px top radius. Dark scrim behind. Drag-to-dismiss. Props: `isOpen`, `onClose`, `title`, `children`. Built with react-native-gesture-handler pan gesture.

### VEmptyState
Centered empty state with title and body text. No illustration, just typography. Used when lists have zero items.

### VSkeleton
Shimmer loading placeholder. Props: `width`, `height`, `style`. Animated shimmer using Reanimated. Used for ALL initial load states — no spinners.

### VAiInsightCard
AI-generated weekly insight. Shows a single sentence recommendation from the Claude API. Displays a subtle violet accent. Skeleton while loading, graceful error state.

---

## 8. Screen-by-Screen UI Breakdown

### Onboarding Carousel
3 slides with icon, headline, and body copy. Dark background. Dot progress indicator at bottom. "Get Started" button on final slide. Slide transition: horizontal translate with spring easing.

### Carbon Calculator
Full-screen question flow. Category label (uppercase, colored) + progress dots at top. Question text centered in large bold type. Option cards below: emoji icon + label + CO2 hint per option. Selected card: primary-tinted background + green border + checkmark. Fixed footer showing animated CO2 counter (AnimatedTextInput pattern for cross-platform Reanimated compatibility). Slide animation between questions (translateX).

Results screen: annual estimate in large JetBrains Mono, comparison chips (Global avg / Paris target), category breakdown list, CTA button.

### Home (Dashboard)
- **Hero** (380px height): Full-bleed nature photo (rotates daily from 5 curated images). Tri-stop dark gradient scrim for legibility. SVG budget ring (168px, 10px stroke) centered on photo. Ring color: green (under 50%), amber (50-100%), red (over 100%). Percentage in 36sp JetBrains Mono inside ring. Greeting text ("Vedant, you are") top-left in SafeAreaView. Status label below ring in 22sp JetBrains Mono. Today's kg subtitle.
- **Data card**: Three columns (today kg / week kg / kg remaining). Horizontal progress bars for Food, Transport, Energy weekly totals.
- **AI insight card**
- **Recent entries** (last 5)

### Log Activity
- Header: "Log Activity" + today's total pill (right)
- Filter chips: All / Food / Transport / Energy
- Activity card feed grouped by subcategory. Each card: 4px colored left-accent bar + item name + unit + CO2 rate (right-aligned JetBrains Mono).
- Bottom sheet on card tap: CO2 preview (large colored number, updates live), quick-pick quantity buttons, custom input, log button with computed kg.
- Today's logged entries below the feed.

### Insights
- Filter chips: Today / This Week / This Month
- Bar chart (category breakdown) for selected period
- Monthly summary card with trend delta
- Full entry list with swipe-to-delete

### Profile
- Avatar (circular) + display name + edit icon
- Stats row: total kg / current streak / entry count
- Achievements grid (badges)
- Challenges section
- Sign out button (red bordered)

---

## 9. Animation Rules

All animations use React Native Reanimated 3. The native Animated API is never used.

**Breathe Effect** (form reveal in bottom sheets): scale 0.95 to 1.0 via `withSpring(1, { damping: 18, stiffness: 180 })` + opacity 0 to 1 via `withTiming(1, { duration: 250 })`. 80ms delay before animation starts.

**Button press**: `withSpring(0.96)` on pressIn, `withSpring(1)` on pressOut.

**Progress ring**: SVG `strokeDashoffset` drives the arc. No Reanimated needed for static renders; animated on value change via `withTiming`.

**Slide transitions** (calculator): `translateX` between -screenWidth and 0, `withTiming(200ms, Easing.out(Easing.ease))`.

**Skeleton shimmer**: `withRepeat(withTiming(...), -1, true)` on a translateX value driving a gradient overlay.

---

## 10. Tech Stack

### Mobile

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native via Expo SDK 52 | Cross-platform iOS/Android, managed workflow |
| Router | Expo Router v4 | File-based routing, route groups, Stack.Protected guards |
| Language | TypeScript strict mode | No `any`, types defined before features |
| Animations | Reanimated 3 | Native thread, required for 60fps on all interactions |
| Gestures | react-native-gesture-handler | Swipe-to-delete, drag-to-dismiss bottom sheets |
| State (server) | TanStack React Query v5 | Query/mutation cache, offline queue, skeleton loading |
| State (client) | Zustand v5 | Auth session, onboarding state, offline queue |
| Images | expo-image | Better caching than RN Image |
| Linear gradient | expo-linear-gradient | Hero photo overlays |
| SVG | react-native-svg | Budget ring component |
| Safe area | react-native-safe-area-context | All screens use useSafeAreaInsets |
| Haptics | expo-haptics | Every pressable triggers light haptic |
| Notifications | expo-notifications | Streak milestones, weekly summary |
| Image picker | expo-image-picker | Avatar upload |
| Clipboard | expo-clipboard | Share challenge links |

### Backend

| Layer | Choice | Reason |
|---|---|---|
| Database | Supabase PostgreSQL | Hosted, RLS, real-time subscriptions |
| Auth | Supabase Auth | Email/password + Google OAuth |
| File storage | Supabase Storage | Avatar images (avatars bucket) |
| Real-time | Supabase Realtime | Challenge leaderboard live updates |
| AI calls | Supabase Edge Functions (Deno) | Anthropic API key never touches client |
| AI model (reasoning) | claude-sonnet-4-6 | Weekly insights, recommendations |
| AI model (low latency) | claude-haiku-4-5 | Daily suggestions |

### Database Schema (Current)

**profiles** — id (uuid, FK auth.users), display_name, avatar_url, baseline_kg (numeric), created_at

**emission_factors** — id, category (food/transport/energy), subcategory, item, unit, kg_co2e, source (DEFRA 2025), year

**emission_entries** — id, user_id, factor_id (FK), quantity, kg_co2e_total, logged_at, created_at

**daily_summaries** — id, user_id, date, total_kg, food_kg, transport_kg, energy_kg

**weekly_summaries** — id, user_id, week_start, total_kg, food_kg, transport_kg, energy_kg

**challenges** — id, creator_id, name, description, target_kg, start_date, end_date, created_at

**challenge_participants** — challenge_id, user_id, total_kg, joined_at

**achievements** — id, key (unique string), name, description, icon_name, threshold

**user_achievements** — id, user_id, achievement_id, earned_at

**ai_insights** — id, user_id, content, suggestion, generated_at, expires_at

**notification_preferences** — user_id, daily_reminder_enabled, reminder_time, streak_notifications

**push_tokens** — id, user_id, token, platform (ios/android)

### Security Rules

- RLS enabled on every table. Policies always use `auth.uid()`, never a client-passed user ID.
- Anthropic API key stored as a Supabase Edge Function secret only.
- All AI calls go through Edge Functions, never directly from the client.
- Service role key never shipped in client bundle.

### Project File Structure

```
app/
  (auth)/          login, signup, forgot-password
  (onboarding)/    carousel + carbon calculator
  (tabs)/          index (home), log, insights, profile
  carbon-calculator.tsx   standalone post-auth calculator route
  entry/[id].tsx          edit existing log entry
  challenge/[id].tsx      challenge detail + leaderboard
  _layout.tsx             root Stack with Protected guards

components/
  ui/              VCard, VButton, VBadge, VInput, VProgressBar,
                   VProgressRing, VMetricCard, VChip, VBottomSheet,
                   VEmptyState, VSkeleton, VAiInsightCard
  charts/          EmissionBarChart
  log/             FoodForm, TransportForm, EnergyForm
  social/          AchievementBadge, AchievementToast, ChallengeCard

hooks/
  useProfile.ts
  useEmissionEntries.ts
  useAllEmissionFactors.ts
  useEmissionFactors.ts
  useSummaries.ts
  useBaseline.ts
  useAchievements.ts
  useChallenges.ts
  useAiInsight.ts
  useEmissionRealtime.ts
  useOfflineQueue.ts
  useNotifications.ts

stores/
  authStore.ts
  useOnboardingStore.ts    (includes pendingBaselineKg for post-signup save)

lib/
  supabase.ts
  theme.ts                 all color/typography/spacing tokens
  emissions.ts             calcEmission(), getLocalDateString(), upsertSummaries
  queryClient.ts

types/
  user.ts                  UserProfile interface
  emission.ts              EmissionFactor, EmissionEntry, EmissionCategory
  achievement.ts
  challenge.ts

supabase/
  migrations/              18 numbered SQL files
  functions/               Edge Functions (Deno)
```

---

## 11. Emission Data

Source: DEFRA 2025 (UK Department for Energy, Food and Rural Affairs). Widely cited in academic carbon accounting literature. Stored in the `emission_factors` table, never hardcoded.

Categories and representative items:

**Food:** Beef, lamb, pork, chicken, fish (salmon, cod, tuna), dairy (milk, cheese, butter), eggs, vegetables, legumes, rice, bread, processed foods.

**Transport:** Petrol car (small/medium/large), diesel car, EV (UK grid), domestic flight, short-haul flight, long-haul flight, Eurostar, domestic rail, bus, motorbike, taxi.

**Energy:** UK electricity (grid average), gas (home heating per kWh), oil heating, wood burning.

Unit examples: kg of food, km of travel, kWh of energy.

---

## 12. What to Build First (If Replicating)

1. Supabase project + the 6 core tables (profiles, emission_factors, emission_entries, daily_summaries, weekly_summaries, push_tokens)
2. Seed emission_factors with DEFRA 2025 data
3. Auth flow (signup, login, email confirm)
4. Carbon calculator onboarding (8 questions, animated counter, saves baseline_kg)
5. Home screen with SVG ring + data card
6. Log screen with factor card feed + 2-tap bottom sheet
7. Gamification: streaks, achievements
8. AI insight card via Edge Function

That sequence gives a usable, differentiated app with a clear value prop at each step.
