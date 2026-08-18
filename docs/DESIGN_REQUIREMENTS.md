# Veridian Design Requirements — "Clearing"

**Status:** Current direction. Supersedes "Understory" (dark, editorial, Fraunces serif) as of the July 2026 design reboot.
**Sources of record:** [`DESIGN_DIRECTION.md`](./DESIGN_DIRECTION.md) (spec), [`DESIGN_RESEARCH.md`](./DESIGN_RESEARCH.md) (evidence), [`lib/theme.ts`](../lib/theme.ts) (shipped tokens), [`components/illustrations/`](../components/illustrations/) (shipped glyph set).

This document consolidates all four into one reference. Every value below was copied from those files, not approximated. Where the shipped code and the written spec disagree, that is called out explicitly rather than silently resolved — see the "Known drift" boxes.

---

## 1. Design philosophy

> **A light, precise instrument that happens to measure carbon — calm enough to trust with your bank account, exact enough to argue with.**
> — `DESIGN_DIRECTION.md`

Veridian is not an "eco app." It is a data instrument, in the same category as Copilot Money, Flighty, and Whoop — apps that earn trust through craft and precision, where the subject matter (carbon, money, flights, sleep) is secondary to the feeling of a well-made tool. Carbon is what it measures; precision is what it sells.

The name **"Clearing"** is a deliberate tonal inverse of the superseded "Understory" direction: a clearing is where light reaches the forest floor — open, bright, exact, same world, opposite register.

---

## 2. Why this direction

### The persona-driven reasoning

Research (`DESIGN_RESEARCH.md`, Phase 1 sweep, July 2026) found that the audience a "typical" carbon-app aesthetic attracts — saturated green, leaf iconography, gamified streaks — is the audience *least* likely to ever pay. Klima's own App Store reviews show price resistance from people who had already downloaded a carbon app; the free, volunteer-run Earth Hero has the best engagement of any app studied; every consumer carbon app that tried to monetize climate identity directly either shut down (Miles, after 9 years and $20M raised) or pivoted to B2B (Greenly). Meanwhile the apps that *do* convert this kind of user — Copilot Money, Flighty, Whoop, Gentler Streak — sell craft and precision to people for whom the tracked domain is closer to a hobby than a moral cause. Flighty's own 1,400-user survey ranked **"good design" as the #1 requested feature** — the strongest available evidence that this audience pays for craft, not for feeling virtuous.

This produced the primary design target, **"The Quiet Optimizer"**: 30–45, senior IC or manager, household income $100K–250K+, already paying for Copilot Money or YNAB plus one of Whoop/Oura/Strava. They are motivated by mastery over personal data and the pleasure of a well-made app — not by "saving the planet," which is a secondary value they're glad the app happens to serve. They churn on a broken-trust moment (a miscategorized transaction, a wrong trip mode) far faster than on price, and they are actively repelled by anything that reads as a generic eco-app.

### What this explicitly rejects

- **Leaf icons and any decorative eco-iconography.**
- **Saturated mint / "eco green."** The primary accent is deliberately deep and low-chroma; bright mint is the single strongest "generic eco app" signal, and it reads as unserious to the primary persona.
- **Gamification** — badges, streaks, or confetti framed as a moral win. (Duolingo-style mechanics are a named repellent for Persona #1.)
- **Dark-mode-by-default.** The model (Copilot Money) is light-mode; light-first ships, dark is deferred as a separate, later-designed pass — never a naive inversion.
- **Serif display type.** Every app in the premium-personal-data category (Copilot, Flighty, Linear, Whoop) uses a neutral grotesque and spends its distinctiveness budget elsewhere.
- **Guilt copy, ever.** Numbers are stated, never editorialized negatively — over-budget is information, not an emergency.

### The superseded direction: "Understory"

Understory was a real, previously-shipped design iteration — not a hidden false start. It committed to dark surfaces, a moss-green accent, and **Fraunces** (a warm literary serif) for hero numbers. It failed on three counts, in increasing order of seriousness:

1. It wasn't actually the reference it thought it was — it was built to emulate Klima, which is itself light-mode, uses Overpass Black at −6% tracking, and a bright `#25CF7A`. Understory landed close to the opposite of its own model on every axis.
2. Serif was the wrong register — Fraunces reads editorial/literary (a magazine), not instrument.
3. Most importantly, it was designed for the wrong person: an idealized "climate-identity" user rather than the Quiet Optimizer who actually converts in adjacent categories.

---

## 3. Color tokens

Light-mode only for v1 (see §9, Open/deferred items). All values below are copied verbatim from `lib/theme.ts` and were cross-checked line-for-line against `DESIGN_DIRECTION.md` §Color tokens — **every hex value matches exactly between the two files; there is no color drift.**

### Neutrals

| Token | Value | Use |
|---|---|---|
| `canvas` | `#FCFCFD` | App background — near-white, barely cool |
| `surface` | `#FFFFFF` | Cards, sheets |
| `surfaceSunken` | `#F4F5F7` | Inset/grouped regions, input wells |
| `border` | `rgba(13,17,23,0.08)` | Hairlines |
| `borderStrong` | `rgba(13,17,23,0.14)` | Emphasized edges, focus rings |
| `ink` | `#0D1117` | Primary text — near-black, never pure `#000` |
| `inkSecondary` | `#5A6470` | Body, labels |
| `inkTertiary` | `#8B95A1` | Captions, metadata, disabled |

### Accents — two-tier (Klima's technique, kept)

| Token | Value | Use |
|---|---|---|
| `accent` | `#0F6B41` | Primary — deep evergreen. Considered, not cheerful. CTAs, active nav, selected states, the ring. |
| `accentSoft` | `rgba(15,107,65,0.08)` | Accent tint fills |
| `accentSecondary` | `#3D5A80` | Secondary/informational chips — "Edit"/"Compare"-class actions. Prevents everything reading as green. |
| `accentSecondarySoft` | `rgba(61,90,128,0.08)` | Secondary tint fills (code-only extension of the two-tier system; not itemized in `DESIGN_DIRECTION.md` but a direct, consistent application of it) |

The green is deliberately deep and low-chroma by design intent — bright mint is the single strongest "generic eco app" tell, and the primary persona reads it as unserious.

### Semantic / budget-state (kept separate from accent, per data-viz convention)

| Token | Value | Meaning |
|---|---|---|
| `calm` | `#0F6B41` | Under budget |
| `watch` | `#B47714` | Approaching budget |
| `over` | `#B0442F` | Over budget — clay, not alarm-red |
| `estimated` | `#8B95A1` | Low-confidence / estimated values — a muted neutral, deliberately never a confident color |

`over` is clay rather than red on purpose: the research is explicit that guilt and alarm are documented churn drivers, so an over-budget state is presented as information, not an emergency. `estimated` is deliberately desaturated for the same reason in reverse — an estimate must never read with the same visual confidence as a metered/sensor-verified value (false precision is a named churn driver in `NORTH_STAR.md` §5, referenced directly in the `lib/theme.ts` source comments).

### Category (charts, entry rows)

| Token | Value |
|---|---|
| `food` | `#B0442F` |
| `transport` | `#2C6E9B` |
| `energy` | `#B47714` |
| `shopping` | `#6B4E8C` |

Desaturated versions of the pre-Clearing category palette, adjusted to sit on a light ground.

### Tint / glow pairs (shipped, not itemized as a separate table in `DESIGN_DIRECTION.md` — these are the 8–16% alpha fills used behind icons and rows, not glows in the Understory sense)

| Token | Value |
|---|---|
| `foodGlow` | `rgba(176,68,47,0.08)` |
| `transportGlow` | `rgba(44,110,155,0.08)` |
| `energyGlow` | `rgba(180,119,20,0.08)` |
| `shoppingGlow` | `rgba(107,78,140,0.08)` |
| `glowCalm` | `rgba(15,107,65,0.08)` |
| `glowWatch` | `rgba(180,119,20,0.08)` |
| `glowOver` | `rgba(176,68,47,0.08)` |
| `successGlow` | `rgba(15,107,65,0.10)` |
| `warningGlow` | `rgba(180,119,20,0.10)` |
| `dangerGlow` | `rgba(176,68,47,0.10)` |
| `estimatedGlow` | `rgba(139,149,161,0.12)` |

### Status

| Token | Value |
|---|---|
| `success` | `#0F6B41` |
| `warning` | `#B47714` |
| `warningBg` | `rgba(180,119,20,0.10)` |
| `danger` | `#B0442F` |

### Gradient tokens

Not one family — three are progress-ring fills keyed to budget state, one is the primary CTA, three are category chart fills, and one is an ambient background wash. Grouped by actual use below rather than under a single "ring gradients" label.

| Token | Stops | Use |
|---|---|---|
| `gradients.ringCalm` | `#17864F` → `#0F6B41` | Progress ring — under budget |
| `gradients.ringWatch` | `#CE8B1C` → `#B47714` | Progress ring — approaching budget |
| `gradients.ringOver` | `#C55238` → `#B0442F` | Progress ring — over budget |
| `gradients.primaryCTA` | `#17864F` → `#0F6B41` → `#0B5934` | Primary CTA buttons |
| `gradients.food` | `#C55238` → `#B0442F` | Food-category chart fills |
| `gradients.transport` | `#3A80B0` → `#2C6E9B` | Transport-category chart fills |
| `gradients.energy` | `#CE8B1C` → `#B47714` | Energy-category chart fills |
| `gradients.aurora` | `#FCFCFD` → `#F4F5F7` → `#FCFCFD` | Ambient background wash |

Two further gradients exist in `lib/theme.ts` for UI chrome rather than data viz — `shimmer` (`transparent` → `rgba(13,17,23,0.04)` → `transparent`, a loading-skeleton sweep) and `cardSheen` (`rgba(255,255,255,0.6)` → `rgba(255,255,255,0)`, a card highlight) — omitted above because neither is category- or budget-state-driven, but noted here so this table isn't presented as the complete gradient set.

### Legacy alias layer (present in code, not part of the design spec)

`lib/theme.ts` retains a block of Understory-era key names (`background`, `primary`, `primaryDeep`, `primaryDim`, `primaryGlow`, `textPrimary`, `textSecondary`, `textTertiary`, `errorLight`, `foodBg`, `divider`, `mist`, etc.) retargeted to point at the Clearing values above, so the roughly 50 existing screens keep working without a synchronized rewrite. These are **migration aliases, not canonical tokens** — new work should consume the canonical names in the tables above (`canvas`, `ink`, `accent`, etc.), and per-screen migration off the legacy names is tracked as ongoing work in `DESIGN_DIRECTION.md`'s phase plan, not something this document treats as part of the design system itself.

---

## 4. Typography

**Face:** SF Pro (system default on iOS). This is a deliberate strategic choice, not a budget one — the distinctiveness budget is spent on spacing, tabular figures, and the illustration set instead of an exotic display face. `lib/theme.ts` encodes this literally: `fontFamilyDefault` and `fontFamilyDisplay` are both typed `undefined`, so every consumer falls through to the platform system font. No serif appears anywhere in the product.

If a face is ever licensed, `DESIGN_DIRECTION.md` names **Söhne** (~$300 for app licensing, the house face of the Copilot-class category) as the highest-leverage purchase — not needed for v1.

### The two non-negotiable rules

1. **Tabular figures everywhere.** `font-variant-numeric: tabular-nums` is applied to every number in the app without exception, so digits never shift width as values change. In code this is set once on `VText`'s base style (`components/ui/VText.tsx`), so it applies to all eight text variants unconditionally, not only the monospace ones.
2. **Display tracking runs −4% to −6% of font size**, adopted verbatim from Klima's ratio, on anything ≥28px. Body text sits at default (0) tracking — the contrast between tight display and normal body *is* the typographic system.

### Type scale, as specified in `DESIGN_DIRECTION.md`

| Role | Size (px) | Weight | Tracking |
|---|---|---|---|
| Hero numeral | 64–88 | 700 | −5% |
| Display | 32 | 700 | −4% |
| Title | 24 | 650 | −3% |
| Heading | 18 | 620 | −2% |
| Body | 16 | 400 | 0 |
| Label | 14 | 600 | 0 |
| Caption | 13 | 400 | 0 |
| Micro / eyebrow | 11 | 700 | +12%, uppercase |

### The shipped tokens, as they exist in `lib/theme.ts`

```
sizes:   { xs: 11, sm: 12, md: 14, lg: 16, xl: 22, xxl: 32, display: 56, mega: 72 }
weights: { regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' }
letterSpacing: { tight: -1.2, snug: -0.3, normal: 0, wide: 0.6, widest: 1.4 }   // fixed px, not %
lineHeights:   { tight: 1.2, normal: 1.5, relaxed: 1.75 }
```

And the concrete variants built from those tokens in `components/ui/VText.tsx`:

| `VText` variant | Size token | Resolved px | Weight | Letter-spacing token | Resolved px |
|---|---|---|---|---|---|
| `display` | `sizes.display` | 56 | `heavy` (800) | `tight` | −1.2 |
| `monoLg` | `sizes.xxl` | 32 | `bold` (700) | `snug` | −0.3 |
| `title` | `sizes.xl` | 22 | `bold` (700) | `snug` | −0.3 |
| `heading` | `sizes.lg` | 16 | `bold` (700) | `snug` | −0.3 |
| `body` | `sizes.md` | 14 | `regular` (400) | none | 0 |
| `mono` | `sizes.md` | 14 | `bold` (700) | none | 0 |
| `caption` | `sizes.sm` | 12 | `regular` (400) | none | 0 |
| `label` | `sizes.xs` | 11 | `bold` (700) | `widest` | +1.4 (uppercase) |

### Known drift: docs vs. shipped code

`DESIGN_DIRECTION.md` and `lib/theme.ts` were both read directly for this document, and they do **not** line up cleanly on typography. This is flagged rather than resolved, per instructions:

- **No size in the shipped scale falls in the documented 64–88px "Hero numeral" range.** The largest defined size token is `mega` (72px) — which sits inside that range — but it is **defined and unused**: a repo-wide search found no component that references `typography.sizes.mega`. The only hero-scale variant actually wired up (`VText`'s `display`) resolves to 56px, below the documented range, and uses weight `heavy` (800), not the documented 700.
- **Sizes for Title (24) and Heading (18) do not exist as tokens.** The nearest shipped sizes are 22 (`xl`) and 16 (`lg`) respectively — used by `VText`'s `title` and `heading` variants. Caption is similarly 12 in code (`sm`) against a documented 13.
- **The weights 650 and 620 (Title, Heading) do not exist anywhere in code** — `typography.weights` only defines the standard 400/500/600/700/800 steps. Both `title` and `heading` variants ship as `bold` (700).
- **Letter-spacing is implemented as five fixed pixel values, not as a percentage-of-size formula**, so the documented "−4% to −6% ratio, applied consistently across display sizes" does not hold arithmetically once you multiply out where each token is actually used:
  - `tight` (−1.2px) on the `display` variant at 56px = **−2.1%** — short of the documented −4% to −6% band for a display-scale number.
  - `snug` (−0.3px) on `title` (22px) = −1.4%; on `heading` (16px) = −1.9%; on `monoLg` (32px) = −0.9% — three different ratios sharing one fixed token, none matching the documented −2%/−3%/−4% rows they stand in for.
  - The one row that *does* land on-spec is `label`/eyebrow: `widest` (+1.4px) on 11px = **+12.7%**, matching the documented "+12%, uppercase" almost exactly.
- **`VText`'s `label` variant (11px, uppercase, wide tracking) is a naming collision with the spec's "Label" row.** By value it actually implements the doc's **Micro/eyebrow** row (11px/700/+12%/uppercase), not the doc's **Label** row (14px/600/0, no uppercase). There is currently no shipped `VText` variant matching the documented Label row (14px/600) as a distinct, non-monospace style — the closest is the `mono` variant, which shares the 14px size but is monospace/tabular by design, not a plain UI label.

None of this is presented as a bug to silently fix here — it is the actual, current state of the design system, useful precisely because a designer picking this up needs to know the doc's ratios are the *intended* rule and the token file is where implementation currently falls short of it.

---

## 5. Spacing, radii & elevation

Not itemized as a table in `DESIGN_DIRECTION.md`; this section is sourced entirely from `lib/theme.ts`, which is authoritative here.

### Spacing scale

| Token | Value (px) |
|---|---|
| `xxs` | 4 |
| `xs` | 6 |
| `sm` | 8 |
| `md` | 16 |
| `lg` | 24 |
| `xl` | 32 |
| `xxl` | 48 |
| `huge` | 64 |

### Radii scale

| Token | Value (px) |
|---|---|
| `xs` | 6 |
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 20 |
| `xxl` | 28 |
| `full` | 9999 |

### Elevation (shadow) tokens

All shadows use `shadowColor: '#0D1117'` (ink) rather than a colored glow — a soft neutral lift is the Clearing convention; colored glows were an Understory-on-dark device.

| Token | Offset (h) | Opacity | Radius | Elevation (Android) |
|---|---|---|---|---|
| `sm` | 1 | 0.06 | 3 | 1 |
| `md` | 2 | 0.08 | 8 | 2 |
| `lg` | 6 | 0.10 | 20 | 4 |
| `card` | 1 | 0.06 | 6 | 2 |
| `hero` | 4 | 0.08 | 16 | 3 |

Three category-tinted shadow variants exist for hero-treatment food/transport/energy surfaces (`glowFood` `#B0442F`, `glowTransport` `#2C6E9B`, `glowEnergy` `#B47714`, all opacity 0.10, radius 10, elevation 2) plus one accent-tinted variant (`glowPrimary`, `#0F6B41`, opacity 0.14, radius 14, elevation 3) — used sparingly, not as a default card treatment (see §8).

---

## 6. Motion principles

Grounded in Apple's *Designing Fluid Interfaces* principles, calibrated for "instrument," not "toy."

- **Respond on press-down, never on release** — `VPressable` implements this; regressions here are treated as bugs.
- **1:1 finger tracking** on every drag/swipe (entry rows, sheets, passport paging). Motion is never deferred to only play on gesture completion.
- **Springs for anything interruptible; timing curves only for one-shot reveals.**
- **Signature motion — numbers settle with high damping and minimal overshoot.**

  > Understory's bouncy count-up was the wrong register; an instrument doesn't bounce.
  > — `DESIGN_DIRECTION.md`

  Target per the spec: `damping: 30, stiffness: 220`. This is shipped exactly as specified — `lib/theme.ts`'s `motion.springBouncy` is `{ damping: 30, stiffness: 220 }`, with the source comment noting the previous Understory-era value it replaced was `damping: 14, stiffness: 220` (far less damped, far more bounce). This is one signature-motion token where the doc and the code agree precisely.

- **Reduced-motion is respected** — fade in place, no transforms.

### Full shipped motion token set (`lib/theme.ts`)

| Token | Value |
|---|---|
| `springSnappy` | `{ damping: 28, stiffness: 350 }` |
| `springGentle` | `{ damping: 18, stiffness: 160 }` |
| `springBouncy` (the signature "numbers settle" spring) | `{ damping: 30, stiffness: 220 }` |
| `timingFast` | 180ms |
| `timingBase` | 280ms |
| `timingSlow` | 600ms |
| `pressScale` | 0.97 |
| `staggerStep` | 50ms |

---

## 7. Iconography & illustration system

### The brief (`DESIGN_DIRECTION.md`)

A custom line-illustration set replaces every emoji in the product and carries the entire personality/warmth budget that would otherwise go to a display typeface or a mascot.

- **Single-weight black line art**, 1.75–2px stroke at a 24px artboard — "geometric but not sterile — drawn with a ruler, not a shaky hand." (Shipped default stroke weight is 1.8px, inside that range — see `components/illustrations/glyphs.tsx`.)
- Each glyph sits over **one flat, single-color shape** (`accentSoft`, or the relevant category tint), offset slightly so the shape reads as light falling behind the object, not as a container around it.
- Explicitly framed as Klima's device "executed with precision rather than wobble" — wobble is what would read as childish to the primary persona.
- Delivered as inline React Native SVG components, sized on a **24 / 48 / 96 artboard grid**, with stroke color driven by theme tokens — never a hardcoded hex — so the same glyph can be recolored per surface without touching the SVG.

### How the wrapper actually implements it (`components/illustrations/Illustration.tsx`)

- The background shape is sized to 86% of the requested artboard (`shapeSize = size * 0.86`) and offset by 7% of the artboard on both axes (`offset = size * 0.07`) — this is the literal "light falling behind" offset described in the brief.
- The glyph itself renders at 50% of the artboard (`glyphSize = size * 0.5`).
- Tint defaults per family: `transport.*` → `transportGlow`, `food.*` → `foodGlow`, `energy.*` → `energyGlow`, `shopping.*` → `shoppingGlow`; anything else (states, moments) defaults to `accentSoft`. Every default can be overridden per-instance via the `tint` prop.
- Glyph stroke defaults to `colors.ink`, again overridable, never hardcoded at the call site.

### The shipped glyph inventory (`components/illustrations/glyphs.tsx`)

24 glyphs exist today, organized into four families exactly as specified:

**Transport (4 modes)**
`transport.car` · `transport.bike` · `transport.walk` · `transport.transit`

**Food (5 diets)**
`food.omnivore` · `food.vegetarian` · `food.vegan` · `food.pescatarian` · `food.flexitarian`

**Home / energy (4 sources)**
`energy.grid` · `energy.solar` · `energy.gas` · `energy.wind`

**Shopping (3 tiers)**
`shopping.minimal` · `shopping.moderate` · `shopping.heavy`

**States (4)**
`state.emptyFeed` · `state.noConnection` · `state.allConfirmed` · `state.firstRun`

**Moments (4)**
`moment.passport` · `moment.recap` · `moment.bankLink` · `moment.receiptImport`

This matches the "Set required (v1)" list in `DESIGN_DIRECTION.md` exactly — transport (4), food (5), home/energy (4), shopping (3), plus the four states and four moments named there. No gap between spec and shipped set was found for illustration.

Construction notes from the source: every glyph is built from `Path`/`Circle`/`Rect`/`Polyline`/`Line` primitives with `strokeLinecap: 'round'`, `strokeLinejoin: 'round'`, and `fill: 'none'` as the shared default — small solid fills (wheel hubs, dots) are used only as a deliberate weight accent, never as a color statement, consistent with the "single-weight line art" brief.

---

## 8. What this design system explicitly is NOT

These are real, enforced constraints drawn from this project's actual practice — not generic design advice.

- **No accent rail on cards.** A colored strip down the edge of a card is a rejected pattern.
- **No card-inside-a-card.** Nesting elevated/bordered surfaces inside other elevated/bordered surfaces is rejected.
- **No emoji anywhere in the product.** The calculator screen was flagged in `DESIGN_DIRECTION.md` as, at the time of writing, "the single biggest remaining AI-coded tell" for still containing emoji — it is explicitly in scope for removal, not an accepted exception.
- **No offset-marketplace visual cues.** No "you're now carbon neutral" moment, no purchased-offset marketplace framing, no moral-closure UI. This is a direct design consequence of the anti-persona findings in `DESIGN_RESEARCH.md`: the "Offset Absolver" — someone who wants to buy a clean conscience for minimal engagement — is explicitly the business model Veridian is not building ("Reduction, not absolution," `NORTH_STAR.md` §9), and any UI cue that would attract that user (leaderboards, virtue badges, neutrality certificates) works against the trust positioning the rest of the product depends on.
- **No saturated mint / bright "eco green"** as a UI color, and no leaf iconography as decoration.
- **No serif display type, no gradient text, no purple.**
- **No badges, streaks, or confetti framed as a moral achievement.**
- **No guilt copy.** Numbers are stated, never editorialized negatively — an over-budget state is information, not an alarm (hence `over` being a clay tone, not red).
- **No bouncy/overshooting count-up motion** on hero numerals — see §6; an instrument doesn't bounce.
- **No hardcoded hex values or hardcoded stroke colors** in illustration components — every glyph and every surface color is theme-token-driven, checked mechanically via grep sweeps per `DESIGN_DIRECTION.md`'s agent/QA process.

---

## 9. Open / deferred items

- **Dark mode is explicitly deferred, not built.** `DESIGN_DIRECTION.md` states light-mode ships first and dark mode is "a later, separate pass — not a naive inversion." There is no dark palette in `lib/theme.ts` today; the entire token set above is light-only.
- **Photography has not been re-shot or re-graded for the light direction.** The existing `hero-*.jpg` asset set was originally selected/graded for the dark Understory treatment. Under Clearing, full-bleed photography is confined to emotionally-weighted moments only (Passport, Recap, onboarding) rather than everyday chrome — and the current hero photography set needs re-selection or re-grading to read correctly on a light ground; this has not yet happened.
- **The IA restructure (Today / Trends / You) and the confirm-queue-as-first-class-surface change are specified in `DESIGN_DIRECTION.md` but are a phased rollout** (see that document's Phase 0–5 execution plan) — this document describes the token/visual system, not the current build status of every screen against that plan.
- **The "hard outcome" hook remains unbuilt.** `NORTH_STAR.md` §9 lists the candidates — money saved via the swap engine, commute/expense export, EV/utility incentive matching, insurance partnerships — and that document's §11 names choosing one as an open decision needed before Sprint D pricing. This is the retention lever for `DESIGN_RESEARCH.md`'s Persona #2, "The Systems Optimizer" (that persona is defined in `DESIGN_RESEARCH.md`'s Personas section — `NORTH_STAR.md` itself never names personas). It is a product/retention risk, not a visual-system gap, but `DESIGN_DIRECTION.md` closes on exactly this point — "Out of scope for the visual rebuild, but it's the retention risk the research flagged most sharply" — so it is noted here for completeness rather than omitted.

---

*This document was assembled by reading `docs/DESIGN_DIRECTION.md`, `docs/DESIGN_RESEARCH.md`, `lib/theme.ts`, and `components/illustrations/` directly. Every hex code, size, and spacing value above is copied verbatim from one of those four sources; every place code and doc disagreed is called out under "Known drift" rather than silently reconciled.*
