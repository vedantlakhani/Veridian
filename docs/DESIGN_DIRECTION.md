# Veridian Design Direction: "Understory"

Named, bold aesthetic direction for the Sprint F redesign. Written by Fable directly — this is the creative-judgment layer that sub-agents execute against, not a delegated decision.

## Why a redesign, and why now

Every screen currently uses the system default font, a flat off-white background (`#F5F7F3`), and a single forest-green accent on white cards. It reads as "wellness-app template" — competent, but generic. `Info.plist` even declares `UIUserInterfaceStyle: Dark` while every color token in `lib/theme.ts` is light-mode: the app doesn't fully believe in its own aesthetic yet. Benchmarked against Klima's warm editorial illustration, Flighty's dark kinetic data readouts, and Gentler Streak's soft-but-serious pastel-on-dark calm — Veridian currently has none of the three.

## The direction: Understory

**Understory** (n.) — the layer of a forest beneath the canopy, where the quiet, low-light work of an ecosystem actually happens. It's the layer you don't see from above but that the whole forest depends on.

This is exactly Veridian's actual mechanic: the carbon autopilot works in the background — sensors, bank sync, receipts — while the user just lives their life above it. The design should feel like looking down into that quiet layer: dark, textured, alive, slightly mysterious, never sterile.

**One sentence:** *A dark, editorial, forest-floor interface where data feels like it's growing rather than being reported.*

### What Understory is NOT (the anti-slop list, cross-checked against Impeccable's detector rules)
- No purple/violet gradients, no cyan-on-dark glow, no gradient text on headings.
- No rounded-square icon tile floating above every card header.
- No Inter/Roboto/system-default anywhere in a headline. No border + border-radius clashing combos.
- No flat off-white "SaaS dashboard" background. No cards nested in cards.
- No literal potted-plant/leaf iconography as decoration — the forest reference lives in *tone and palette*, not in cartoon leaves.

## Color system (dark-first — matches the already-declared `Dark` interface style)

| Token | Value | Use |
|---|---|---|
| `background` | `#0E1512` (near-black, warm-green undertone — "soil") | App background |
| `surface` | `#161F1A` | Cards |
| `surfaceElevated` | `#1E2B23` | Sheets, modals |
| `border` | `rgba(255,255,255,0.06)` | Hairlines |
| `primary` (moss) | `#5FA876` | Accent, CTAs — brighter than current `#1B6B42` so it reads on dark |
| `primaryGlow` | `rgba(95,168,118,0.16)` | Ambient glow behind hero numbers |
| `accentAmber` (lichen light) | `#E0B15C` | Warmth counterpoint — "watch" states, warm highlights, avoids the all-green monotone |
| `textPrimary` | `#F2F0E8` (parchment, not pure white) | Headlines |
| `textSecondary` | `#9BA89E` | Body |
| `textTertiary` | `#5E6B62` | Captions |
| category colors | keep current hues but lift luminance ~15% for dark-bg contrast | Food/Transport/Energy/Shopping |

Retain the existing `budgetStateColors` semantic mapping (calm/watch/over) — just re-tune each color's lightness for the dark surface.

## Typography: a real pairing, not a system fallback

- **Display/headline face:** `Fraunces` (variable, via `@expo-google-fonts/fraunces`) — a warm, slightly irregular serif with real personality, at a large optical size for hero numbers (footprint totals, streaks) so it never looks like body-text stretched up. This is the single highest-leverage typographic move: nothing says "template" faster than a system sans-serif headline, and nothing says "someone designed this" faster than a serif with taste at large sizes.
- **Body/UI face:** keep system default (San Francisco) for body text and controls — legibility and platform-native feel matter more there than personality. This mirrors Flighty's approach (distinctive numerals, native everything else).
- **Data face:** `Menlo`/tabular-lining numerals for every kg/CO₂ figure, unchanged from today — the vetted animation-vocabulary reference flags tabular numbers as essential for any ticking/changing metric.
- Increase `letterSpacing.tight` on Fraunces headlines to `-1.2` (currently `-0.8`) — tighter tracking is what makes large serif type feel deliberate rather than default.

## Motion: apply the Apple "Designing Fluid Interfaces" principles (from the vetted `emilkowalski/skills` "apple-design" reference)

- Respond on press-down, not release, everywhere (`VPressable` already does this — audit for regressions).
- Every drag/swipe (entry rows, passport paging, bottom sheets) must track the finger 1:1 during the gesture, not just animate on release.
- Springs over fixed-duration easing for anything the user can interrupt (bottom sheets, card expand/collapse) — `motion.springGentle`/`springBouncy` already exist in `theme.ts`, just apply them more places.
- One signature "hero" motion for the whole app: when the footprint number updates, it should **count up with a subtle overshoot** (spring, not tween) and a brief `primaryGlow` pulse behind it — this becomes Veridian's version of Flighty's kinetic countdown numbers.

## Atmosphere

- A very subtle, static (not animated — cheap on battery, respects `prefers-reduced-motion` equivalents) noise/grain texture overlay at ~3% opacity on `background` — this is what makes a near-black background feel like "soil" rather than "OLED battery-saving default."
- Card elevation via a soft glow in `primaryGlow`, not a drop shadow — shadows read as light-mode UI conventions ported to dark and look wrong.

## Rollout scope for tonight

Given the Fable access window, prioritize in this order (highest perceptual impact first):
1. `lib/theme.ts` — the token rewrite (unlocks everything downstream).
2. Home tab (`app/(tabs)/index.tsx`) + `VMetricCard`/`VProgressRing` — the first thing every user sees every day.
3. `app/passport.tsx` (Carbon Passport) — already the most "shareable" screen, highest leverage for the Understory identity to shine.
4. `app/recap.tsx` (Weekly Recap) + Insights tab.
5. Onboarding + auth screens — first impression, but lower daily-use frequency than #2–4.
6. Remaining modals (`link-bank`, `import`, `carbon-calculator`, `entry/[id]`, `challenge/[id]`).

See `docs/USER_JOURNEY.md` for the full branching map this rollout order is derived from.
