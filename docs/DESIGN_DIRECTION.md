# Veridian Design Direction: "Clearing"

*Supersedes the previous "Understory" direction (dark, editorial, Fraunces serif). Written July 2026 after the Phase 1 research sweep recorded in [`DESIGN_RESEARCH.md`](DESIGN_RESEARCH.md).*

---

## Why Understory was wrong

Understory committed to dark surfaces, a moss-green accent, and Fraunces — a warm literary serif — for hero numbers. Three problems, in increasing order of seriousness:

1. **It wasn't the reference.** It was built to replicate Klima. Klima is light, uses Overpass Black at −6% tracking, and a bright `#25CF7A`. Understory was close to the opposite on every axis.
2. **Serif was the wrong kind of character.** Fraunces reads editorial/literary — a magazine. Every app in the premium-personal-data category (Copilot, Flighty, Linear, Whoop) uses a neutral grotesque and spends its distinctiveness elsewhere.
3. **It was designed for the wrong person.** This is the real problem, and the research is what surfaced it.

## Who this is for

**Primary: "The Quiet Optimizer."** 30–45, senior IC or manager, household income $100K–250K+. Already pays for Copilot Money or YNAB, plus one of Whoop/Oura/Strava. Motivated by mastery over personal data and the pleasure of a well-made app — *not* by saving the planet. Climate is a secondary value they're glad the app serves; it isn't why they open it.

They churn on a broken-trust moment (a miscategorized transaction, a wrong trip mode) far faster than on price. They are actively repelled by leaf icons, saturated green, gamified badges, and any copy that moralizes.

The uncomfortable finding driving this: the audience Klima's aesthetic attracts is the audience least likely to subscribe. Klima's own reviews show price resistance from people who had already downloaded a carbon app. Earth Hero — free, volunteer-run — has the best engagement of any app studied. Every consumer carbon app that tried to monetize climate identity directly either died or pivoted to B2B. The apps that convert (Copilot, Flighty, Whoop, Gentler Streak) sell craft and precision to people for whom the domain is a hobby, not a moral obligation.

Full evidence in `DESIGN_RESEARCH.md`. Secondary and anti-personas are documented there.

## The direction: Clearing

**A clearing** is where light reaches the forest floor — the tonal inverse of Understory, and the same world. Open, bright, exact.

**One sentence:** *A light, precise instrument that happens to measure carbon — calm enough to trust with your bank account, exact enough to argue with.*

The model is **Copilot Money**, not Klima. Copilot is light-mode, targets exactly this persona, and is the app Veridian's core mechanic is explicitly copied from in `NORTH_STAR.md`. That convergence is the strongest signal we have.

### What Clearing is NOT

- No saturated mint or "eco green." No leaf iconography as decoration.
- No emoji anywhere in the product. (Currently in the calculator — the single biggest remaining AI-coded tell.)
- No serif display type. No gradient text. No purple.
- No badges, streaks, or confetti framed as moral achievement.
- No card-inside-a-card. No accent rail on rounded cards.
- No guilt copy. Ever. Numbers are stated, never editorialized negatively.

### What we still steal from Klima

Its techniques are good even though its positioning isn't:
- **The number is the hero** — one very large numeral anchors every screen.
- **Two-tier accent** — one color for primary/high-emphasis, a second for secondary chips. Prevents the monotone-green problem.
- **Tight display tracking** — Klima runs −6% of font size on display type. We adopt the ratio.
- **Navy-black, never pure black** for text.
- **Full-bleed photography reserved for emotional moments only** — not as everyday chrome.

---

## Color tokens

Light-mode only for v1. Dark mode is a later, separate pass — not a naive inversion.

### Neutrals

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#FCFCFD` | App background — near-white, barely cool |
| `surface` | `#FFFFFF` | Cards, sheets |
| `surfaceSunken` | `#F4F5F7` | Inset/grouped regions, input wells |
| `border` | `rgba(13,17,23,0.08)` | Hairlines |
| `borderStrong` | `rgba(13,17,23,0.14)` | Emphasized edges, focus rings |
| `ink` | `#0D1117` | Primary text — near-black, never `#000` |
| `inkSecondary` | `#5A6470` | Body, labels |
| `inkTertiary` | `#8B95A1` | Captions, metadata, disabled |

### Accents (two-tier, per Klima's technique)

| Token | Hex | Use |
|---|---|---|
| `accent` | `#0F6B41` | Primary — deep evergreen. Considered, not cheerful. CTAs, active nav, selected states, the ring. |
| `accentSoft` | `rgba(15,107,65,0.08)` | Accent tint fills |
| `accentSecondary` | `#3D5A80` | Secondary/informational chips, "Edit"/"Compare"-class actions. Prevents everything being green. |

The green is deliberately deep and low-chroma. Bright mint is the single strongest "generic eco app" signal and Persona #1 reads it as unserious.

### Semantic (separate from accent, per data-viz convention)

| Token | Hex | Meaning |
|---|---|---|
| `calm` | `#0F6B41` | Under budget |
| `watch` | `#B47714` | Approaching budget |
| `over` | `#B0442F` | Over budget — clay, not alarm-red |
| `estimated` | `#8B95A1` | Low-confidence/estimated values — a muted neutral, never a confident color |

`over` is clay rather than red on purpose: the research is explicit that guilt and alarm are documented churn drivers. Over-budget is information, not an emergency.

### Category (for charts and entry rows)

Lift from the current set, desaturated for a light ground: food `#B0442F`, transport `#2C6E9B`, energy `#B47714`, shopping `#6B4E8C`.

---

## Typography

**Primary: SF Pro** (system). Free, native, and what Copilot and Apple's own apps use.

This is a deliberate strategic choice, not a budget one. What makes Copilot and Flighty feel expensive is not an exotic typeface — it's immaculate spacing, tabular figures everywhere, and restraint. Spending the distinctiveness budget on a display face is the amateur move; spend it on the illustration set and the motion instead.

- **Tabular figures (`font-variant-numeric: tabular-nums`) on every number in the app**, without exception. Digits must never shift as values change. This is non-negotiable and is 80% of why data apps feel precise.
- **Display tracking: −4% to −6%** of font size on anything ≥28px. Adopt Klima's ratio.
- Body text sits at default tracking. The contrast between tight display and normal body *is* the typographic system.

**If one face is ever licensed**, the highest-leverage purchase is **Söhne** (~$300 for app licensing) — it's the house face of the Copilot-class category. Not needed for v1.

### Scale

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Hero numeral | 64–88 | 700 | −5% |
| Display | 32 | 700 | −4% |
| Title | 24 | 650 | −3% |
| Heading | 18 | 620 | −2% |
| Body | 16 | 400 | 0 |
| Label | 14 | 600 | 0 |
| Caption | 13 | 400 | 0 |
| Micro/eyebrow | 11 | 700 | +12%, uppercase |

---

## Illustration

A **custom line-illustration set** replaces every emoji and carries the personality budget.

**Brief:** single-weight black line art (1.75–2px at 24px artboard), geometric but not sterile — drawn with a ruler, not a shaky hand. Each illustration sits over a single flat `accentSoft` or category-tinted shape, offset slightly so the shape reads as light falling behind the object rather than a container around it.

This is Klima's device executed with precision rather than wobble — the wobble is what would read as childish to Persona #1.

**Set required (v1):**
- Categories: transport (4 modes), food (5 diets), home/energy (4 sources), shopping (3 tiers)
- States: empty feed, no connection, all-confirmed, first-run
- Moments: passport, recap, bank-link, receipt import

Delivered as inline React Native SVG components in `components/illustrations/`, sized on a 24/48/96 artboard grid, stroke color driven by theme tokens so they're never hardcoded.

---

## Motion

Grounded in Apple's *Designing Fluid Interfaces* principles, calibrated for "instrument," not "toy."

- **Respond on press-down**, never on release. `VPressable` already does this — audit for regressions.
- **1:1 finger tracking** on every drag/swipe (entry rows, sheets, passport paging). Never animate only on gesture completion.
- **Springs for anything interruptible**, timing curves only for one-shot reveals.
- **Signature motion:** numbers settle with *high damping and minimal overshoot* — they arrive quickly and stop. Understory's bouncy count-up was the wrong register; an instrument doesn't bounce. Target: `damping: 30, stiffness: 220`.
- Respect reduced-motion: fade in place, no transforms.

---

## Information architecture

Locked as in scope: IA is on the table. The current four tabs contradict the product thesis.

**Current:** Home · Log · Insights · Profile

**Problem:** a "Log" tab is a standing admission that the autopilot didn't work. The product's entire claim is that it tracks itself. Meanwhile the daily confirm loop — the actual product moment, the thing copied from Copilot — has no home in the IA at all.

**Proposed:** three tabs.

| Tab | Contains |
|---|---|
| **Today** | The ring · the confirm queue (when non-empty) · today's entries · this week's teaser |
| **Trends** | Day/week/month · composition · records · entry history |
| **You** | Connections (bank, sensors) · Passport · settings · challenges |

Changes:
- **Log is demoted** from a tab to a `+` affordance on Today. Manual entry remains fully available; it stops being presented as a primary mode of use.
- **The confirm queue is promoted** to the top of Today whenever it has items — "3 things to confirm · 10 seconds." This is the screen's most important state and currently doesn't exist as a first-class surface.
- **Passport moves under You**, reachable from Today's weekly summary. It's a periodic artifact, not a daily destination.

---

## Execution plan

### Phase order (each phase must fully land before the next)

| Phase | Scope | Why this order |
|---|---|---|
| **0 — Foundation** | `lib/theme.ts` rewrite to Clearing tokens · tabular figures wired globally · illustration set built | Everything downstream depends on it. Nothing else can start. |
| **1 — Today** | Home rebuilt, incl. the new confirm-queue surface · `VMetricCard`, `VProgressRing` | Highest-traffic screen; the daily judgment of the app |
| **2 — IA + Trends** | Tab restructure to 3 · Insights → Trends · Log demoted to `+` | Structural; touches routing |
| **3 — Story screens** | Passport · Recap | Where warmth and photography are permitted |
| **4 — Entry points** | Onboarding · auth · calculator (emoji removal) | First impression, lower daily frequency |
| **5 — Remainder** | link-bank · import · entry detail · challenge · offline · 404 | Consistency sweep |

### Agent structure

As specified: Opus orchestrates, delegates to Sonnet, Sonnet delegates mechanical work to Haiku. **No agent reviews its own output.**

- **Opus (orchestrator)** — direction, spec interpretation, final accept/reject on every screen. Does not implement.
- **Sonnet (builder)** — one agent per screen. Implements against this spec.
- **Sonnet (critic panel)** — three *independent* agents per screen, each with a distinct lens, none of which built it:
  1. **Craft** — does it match the token spec exactly? Any hardcoded values? Spacing rhythm? Type scale adherence?
  2. **Interaction** — press states, gesture tracking, motion register, transitions, loading and error states.
  3. **Accessibility & edges** — contrast ratios, touch target sizes, empty/overflow/long-string states, reduced-motion, screen reader labels.
- **Haiku (sweeps)** — mechanical passes: grep for hardcoded hex, find orphaned styles, verify imports, check for remaining emoji.

**Gate per screen:** build → 3 critics → fixes → on-device screenshot → Opus sign-off. A screen is not done until it has been seen running on the simulator.

### Verification baseline

`npx tsc --noEmit` clean and `npx jest --ci` at 44 suites / 415 tests must hold at every phase boundary. Any test asserting an old Understory token value gets updated to the new value — but a *behavioral* test failing means something actually broke.

---

## Open questions carried forward

1. **Dark mode** — deferred entirely. Light-first ships; dark is a later designed pass, not an inversion.
2. **Photography** — the current `hero-*.jpg` set was chosen for a dark treatment. Under Clearing, photography is confined to Passport/Recap/onboarding and will need re-selection or re-grading for a light ground.
3. **The "hard outcome" hook** (`NORTH_STAR` §11) remains unbuilt. Persona #2 churns without it. Out of scope for the visual rebuild, but it's the retention risk the research flagged most sharply.
