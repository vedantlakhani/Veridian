# Veridian Design Research — Phase 1 Findings

*Two parallel research sweeps run July 2026 during the design reboot: (a) Klima's actual verified design system, (b) who actually pays for consumer carbon apps. Both fed the tone decision recorded in `DESIGN_DIRECTION.md`.*

---

## Part A — Klima's real design system (verified from live CSS + first-party assets)

Previous assumptions about Klima were partly wrong. These figures were pulled from klima.com's rendered CSS and from screenshots on Klima's own asset CDN — not from memory or inference.

### Typography

**Typeface: Overpass** — open-source, available free on Google Fonts. Designed by Delve Withrington et al., commissioned by Red Hat, derived from US highway signage (Highway Gothic). Not a bespoke or commercial commission.

| Element | Spec |
|---|---|
| Hero H1 | 64px, weight **900**, letter-spacing **−3.84px** (≈ −6%), line-height 100% |
| Section H2 | 54px, weight 900, letter-spacing −3.24px (same −6% ratio) |
| Buttons | 14px, weight 700 |
| Body | Lighter weight, mid-gray, normal tracking — deliberate contrast against the black display type |

The −6% tracking ratio is applied consistently across display sizes. It is a rule, not a one-off.

Headlines mix two colors within a single line for emphasis (green run + navy run in the same `<h1>`).

### Color

| Role | Hex |
|---|---|
| Primary green | `#25CF7A` |
| Secondary green | `#46E997` |
| Pale green (muted state) | `#91E6BC` |
| Primary text (navy-black, **never pure black**) | `#282E38` |
| Blue — secondary actions | `#2980FF` |
| Error | `#E74C3C` |
| Light section bg | `#F2F2F4` / `#F8F8F8` |
| Near-black (footer) | `#1A1818` |

**Two-tier accent system:** green is reserved for primary/high-emphasis (CTAs, selected radio states, chart fills, active nav). Blue is used for secondary/low-emphasis chips ("Edit", "Compare"). Green is used confidently as *text* color, not only as fills.

### Mode

Klima is **mixed**, not simply light or dark:
- **Light** for dashboards, lists, quiz cards — white/pale-mint grounds, white rounded cards, navy text.
- **Full-bleed dark photography** for emotionally-weighted moments (offset confirmation, project detail, referral/community). Functionally dark-mode achieved *via photography*, not dark UI chrome.

### Signature patterns

- **The number is the hero.** Every product screen anchors on one very large bold numeral ("23.98", "120%", "25"), typically white-on-photo or black-on-white, tight tracking.
- **Circular progress ring** — green stroke, double-arc when exceeding 100%. The closest thing to a signature graphic device.
- Generous whitespace and large corner radii (~24–28px) on card/list screens; **zero** whitespace on full-bleed photo screens, where short line breaks alone create negative space.
- Radio options: emoji + label + green-ring radio, hairline dividers.
- Bottom bar pattern: gray-text tertiary / green pill primary / gray-text skip, with "2 of 9" pagination.

### Illustration system — noted discrepancy

The research agent reported it could not verify Klima's hand-drawn line-illustration system anywhere in the current app build or CDN. **This finding is incomplete.** The illustrations were directly observed on klima.com's marketing site during this session, in the "Your holistic climate action strategy" section: black line art (plant-in-hand, bicycle, raised fist) with flat mint-green shapes behind, one per pillar (Offset / Reduce / Multiply). The agent searched the app asset CDN rather than the marketing page.

What the agent *did* verify as organic/hand-drawn in Klima's assets: a large decorative wobbly-line background SVG (`#EFEFEF`, 3px stroke, ambient texture), a small green hand-sketched doodle/pointer, real leaf photography composited around headline text, and an unidentified italic script face used once for "*with Klima.*" in a 2021-era App Store screenshot.

### Wren (acquired Klima) — different system

Wren did **not** continue Klima's system. Wren uses **Inter** + **Signika** (generic modern product stack), a much broader and more playful palette (multiple greens, orange, pink, purple, pastel section grounds `#EAF7E8` / `#EFE9FD`), and a fully-rendered cartoon bird mascot. Its calculator reads as conventional SaaS — left icon-nav, center content, right sidebar. Notably, Wren's question icons *are* spot illustrations on soft pastel blob backgrounds, i.e. closer to the "icon-on-color-blob" pattern than Klima's own product screens.

---

## Part B — Who actually pays for consumer carbon apps

### The graveyard

| App | Outcome |
|---|---|
| **Miles** | 9 years of working passive GPS/motion detection, $20M raised. **Shut down May 2025.** Average user earned $1–5/year in rewards. |
| **Greenly** (consumer) | Bank-linked consumer tracker. Founder on record: it "was all free and hard to monetize… wasn't a scalable business." Abandoned consumers in ~8 months. Now a **$52M Series B B2B** company — same tech, different buyer. |
| **Klima** | Live, but $13–26/mo scaled to footprint. Own App Store reviews show price resistance *from people who already downloaded a carbon app*. |
| **Wren** | Live, apparently small. Only public subscriber figure is ~1,000 (2019). No later scale figure exists. |
| **Commons (Joro)** | $13.9M raised (Sequoia, Arrive). ~30 employees, $3.7M revenue (2023) — thin relative to funding. 350k Instagram followers ≠ paying users. |
| **Earth Hero** | **Free, volunteer-run.** 120k+ users, 4.9★ / 392 reviews — the *best* engagement of any app studied. Charges nothing. |
| **Aspiration** | Climate fintech. DOJ/CFTC investigation, bankruptcy, guilty plea over claiming ~35M trees planted against ~12M actual. |

### Why they churn (academic)

- **Green self-identity effect** — people who already see themselves as green respond *worse* to feedback nudges; they believe they're already doing enough.
- **Single-action bias** — one visible climate action discharges the felt obligation to do more. Directly corrosive to a daily-review habit product.
- **Offset credibility collapse** — 2024 *Nature Communications*: 87% of offsets bought by the largest corporate purchasers carry high risk of not delivering real reductions.

### Who *does* pay (adjacent categories)

| App | Price | Buyer |
|---|---|---|
| **Copilot Money** | $13/mo | "Young professionals in growth phases," $75k+, multi-institution banking. 1M+ downloads, ~71k stable WAU, 4.8★, Apple Editor's Choice. |
| **Flighty** | $49/yr | Frequent flyers. ~$500K/month revenue on a 3-person team. Their own survey of 1,400 users ranked **"good design" as the #1 requested feature**. |
| **Whoop** | $199–359/yr | 25–44 (~60% of base), >70% household income >$100K. ~20% of ARR is actually B2B. |
| **Oura** | $349+ hw + sub | 5.5M rings sold, only **2M** paying subscribers — most hardware buyers don't retain a subscription. |
| **Strava** | sub | 180M registered, **~2% premium penetration.** The sobering ceiling case. |
| **Gentler Streak** | sub | 5,000 → 50,000+ subscribers, $1M revenue / $400K profit in 2 years, tiny team. 2024 ADA winner. |

### The central tension

**Climate-motivated and pays-for-subscriptions are two different populations.**

- Climate anxiety peaks in Gen Z (~71% "extremely worried") — younger, pre-HENRY, least spare income for a recurring line item.
- Subscription payers in every adjacent category skew **25–45, >$100K household income**.
- "Willingness to pay a sustainability premium" surveys (77% of Gen Z) measure a *one-time markup on a purchase already being made* — categorically different from a permanent new $10/mo line item competing with Netflix, Spotify, Whoop and Copilot.
- Natural experiment: the free values-driven app (Earth Hero) has the best engagement; the paid ones show price friction or stalled growth.

**Veridian's viable market is the narrow intersection, not the union.**

---

## Personas

### #1 — "The Quiet Optimizer" (primary design target)

- 30–45. Senior IC or manager — engineer, PM, physician, attorney, consultant. Household income $100K–250K+.
- **Already pays for** Copilot Money or YNAB, plus one of Whoop/Oura/Strava. The behavioral tell: they already pay for at least one *quiet autopilot* app in an adjacent domain.
- **Motivated by** mastery over personal data, the aesthetic pleasure of a well-crafted app, effortless self-knowledge. **Not** "saving the planet" — climate is a secondary ambient value they're glad the app serves, not why they open it.
- **Churns on** a broken-trust moment (miscategorized transaction, wrong trip mode) far more than on price; any copy that moralizes; any UI that reads as generic eco-app — leaf icons, saturated green, cutesy illustration.
- **Repelled by** Duolingo-style gamification, badges framed as moral wins, "save the Earth" palettes, offset-absolution framing.

### #2 — "The Systems Optimizer" (secondary, roadmap)

- 28–50, engineer/tech-adjacent, often EV + home solar, runs a budgeting spreadsheet.
- Motivated by optimization as a hobby and by **money**, not virtue. This is the persona for whom the "hard outcome" hook (utility/insurance/expense integration) would be *the* feature.
- **Churns if** the hard-outcome hook never ships and the app stays pure-awareness — the exact failure mode that killed Miles despite good tech.
- Tolerates and wants more data density than #1. Candidate for an eventual expert mode.

### #3 — "The Committed Reducer" (amplifier, not revenue base)

- 22–35, values-driven, climate-identity-forward. This is the Earth Hero power user.
- Least spare income, highest guilt-fatigue, highest skepticism toward numbers that look like greenwashing. Will fact-check estimates fastest and churn hardest on a trust violation.
- Valuable for word-of-mouth. Not the paying core.

### Anti-persona — "The Offset Absolver"

Wants to pay for a clean conscience with minimal engagement; expects the app to make them "net zero" via purchased offsets; treats the fee as a modern indulgence. **This is Klima's and Wren's actual target user and business model** — and NORTH_STAR §9 already rejects it ("Reduction, not absolution"). Design cues that would attract them — "you're now carbon neutral!" moments, an offset marketplace, moral-closure framing — would undermine the trust positioning the rest of the product depends on.

Secondary anti-personas: the **performative activist** wanting public leaderboards and virtue badges (contradicts the quiet, non-judgmental ethos), and the **bank-link refusenik** (real but a minority; sensors-only is already a complete experience).

---

## What this means for the design

1. **Klima is the wrong aesthetic model for the paying user**, even though it was the original benchmark. Its look is calibrated for Persona #3 — the segment least likely to subscribe. Klima's own reviews prove the price resistance.
2. **The right model is Copilot Money / Flighty** — the apps that already converted Persona #1, in the exact product shape Veridian is building (passive capture + confirm loop + subscription).
3. Flighty's user survey ranking **"good design" as the #1 requested feature** is the strongest available evidence that this audience pays *for* craft.
4. Klima's *techniques* remain worth stealing even if its positioning isn't: the number-as-hero, the two-tier accent system, the −6% display tracking, navy-black instead of pure black, and full-bleed photography reserved for emotional moments.
