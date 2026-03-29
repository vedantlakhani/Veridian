# Phase 6 Context — Design Elevation & Carbon Calculator

**Created:** 2026-03-28
**Status:** Ready for research and planning

---

## Area 1: Dark Mode Skin Strategy

### Decisions

**Onboarding flow:** The existing Phase 5 three-screen carousel is KEPT. The new carbon calculator comes AFTER the carousel — user taps "Get Started" on the final carousel screen and enters the calculator questionnaire.

**Dark mode approach:** Hardcoded always-dark. Veridian is a dark app, full stop. No system-aware light/dark toggle. No `useColorScheme` conditional logic. No second token set to maintain.

**Token structure:** Replace the existing token values in `lib/theme.ts` in-place. All 20+ screens pick up the dark theme automatically with zero conditional logic anywhere. The current `background: '#F8FAF9'` and `textPrimary: '#111827'` etc. get overwritten with the dark values from Stitch.

**Dark token values (from Veridian Stitch design system):**
- `background: '#191C1C'` (near-black)
- `surface: '#1E2120'` (card background)
- `primary: '#006036'` (Forest Green)
- `primaryContainer: '#1B7A4A'` (lighter green for elevated surfaces)
- `secondary: '#006492'` (ocean blue)
- `textPrimary: '#FFFFFF'`
- `textSecondary: '#B0B8B4'`
- `border: 'transparent'` — no borders, depth via background shifts only

**Hardcoded hex migration:** 06-01 performs a project-wide sweep of all hardcoded hex values (auth screens especially used raw hex in Phase 1). Everything migrated to theme tokens before any visual redesign begins. This ensures no screen is visually broken at any point.

---

## Area 2: Carbon Calculator Flow

### Decisions

**Categories (4):** Transport · Food · Home · Shopping

**Question count:** 8–10 questions total. Each question is a visual tap card (no text fields). ~2–3 questions per category. Presented one per screen or grouped naturally. Climate Hero pacing is the reference.

**Question format:** Visual option cards — icon + label + CO₂ hint. User taps one card per question. No free-text inputs in the calculator flow.

**Live CO₂ counter:** Persistent footer counter on every question screen. Bold animated number (JetBrains Mono) at the bottom. Animates upward as each answer is submitted using `withTiming`/`withSpring` from Reanimated 3. Counter is always visible — constant feedback loop.

**Auth/results placement:** Calculator completes → **Results screen shown first** (full breakdown by category, annual tonne CO₂e number, comparison to global average) → then signup prompt: "Save your footprint and start reducing." The result IS the conversion hook.

**Post-signup:** After account creation, the calculated footprint is saved to the user's profile as their `baseline_kg` in the `profiles` table. Subsequent dashboard tracking is relative to this baseline.

---

## Area 3: Hero Visual Treatment

### Decisions

**Home hero:** Full-bleed nature photography behind the hero metric. 5–8 curated photos (forests, oceans, mountains) bundled locally in `assets/images/` via `require()`. No network dependency, instant render. Overlay: semi-transparent dark gradient (bottom to top) so text is always readable over any photo.

**Metric display:** Klima-style — 72–96sp JetBrains Mono Bold, centered, fills top third of screen. The number IS the hero. Unit label (`kg CO₂e`) in smaller text below. Category breakdown chips / weekly summary section below that.

**All other screen backgrounds:** Pure `#191C1C` near-black. No texture, no grain, no gradient vignette. Clean and fast.

**Component depth:** No border lines. Depth communicated entirely through background shifts: `surface (#1E2120)` cards float on `background (#191C1C)`. Elevated surfaces (modals, bottom sheets) use `#252B29`.

---

## Area 4: Screen-by-Screen Priority

### Decisions

**Execution order:** Base dark pass on ALL screens first (06-01), then hero-level polish on priority screens (06-03, 06-04, 06-05). No screen is left visually broken mid-phase. After 06-01, everything is dark and readable. Subsequent plans add the Klima-quality treatment on top.

**Hero screens (full redesign — custom layouts, photography, micro-interactions):**
1. Home dashboard — full-bleed photo, massive metric, redesigned layout
2. Carbon calculator onboarding — visual tap cards, animated footer counter, results screen
3. Log entry screen — dark card treatment + Breathe Effect transitions on form reveal
4. Insights / history screen — dark chart redesign, richer filter chips, monthly trend elevation

**Base dark skin only (token swap + cleanup, no layout changes):**
- Auth screens (login, signup, forgot-password)
- Existing Phase 5 onboarding carousel — token-swap only, not redesigned
- Profile screen
- Challenges list screen
- Challenge detail / leaderboard screen
- Achievement section in Profile

---

## Code Context

**Files that drive Phase 6:**
- `lib/theme.ts` — token values replaced in-place; this is the single source of truth for all dark tokens
- `app/(tabs)/index.tsx` — Home screen, receives hero redesign in 06-03
- `app/(tabs)/log.tsx` — Log screen, receives hero redesign in 06-04
- `app/(tabs)/insights.tsx` — Insights screen, hero redesign in 06-04
- `app/(tabs)/profile.tsx` — Profile, base dark skin in 06-05
- `app/(auth)/` — Auth screens, hex sweep in 06-01
- `components/onboarding/` — Existing carousel, token-swap in 06-01
- `app/onboarding/calculator.tsx` — NEW file in 06-02 (carbon calculator flow)
- `assets/images/` — New nature photography assets added in 06-03

**Existing components to dark-skin (no API changes):**
- All 11 V* components in `components/ui/` — background/surface/text color props driven by theme tokens; after token swap they automatically go dark
- `components/charts/EmissionBarChart.tsx` — bar colors and axis text need explicit dark-token wiring

**New component needed:**
- `app/onboarding/calculator.tsx` — multi-step calculator with QuestionCard sub-component, footer counter, results screen, signup CTA

---

## Deferred Ideas (out of Phase 6 scope)

- System-aware light/dark toggle (user preference switch in Settings)
- Animated gradient mesh as alternative to photography on lower-end devices
- Full hero redesign for Challenges/Profile (could be Phase 7)
- Challenges ChallengeCard with nature imagery
- Photography rotation / seasonal photo sets
