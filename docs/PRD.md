# Veridian — Product Requirements Document

*Canonical as of August 2026. This document replaces the root-level `VERIDIAN_PRD.md`, which described the product's original vision (a gamified logger — streaks, badges, leaderboards, a Klima-style aesthetic, Green Points redeemable at partner brands). That vision was superseded by a strategic pivot in July 2026, recorded in `docs/NORTH_STAR.md`. Section 10 of this document explains why, with dates and evidence. Do not read `VERIDIAN_PRD.md` as current — it is retained only as a historical artifact of where the product started.*

*Sources for everything below: `docs/NORTH_STAR.md`, `docs/DESIGN_RESEARCH.md`, `docs/DESIGN_DIRECTION.md`, `docs/USER_JOURNEY.md`, `docs/SNAP_A_PLATE_SPEC.md`, `docs/SPRINT_D_SPEC.md`, `docs/SPRINT_E_SPEC.md`, `VERIDIAN_PRD.md` (root, superseded), and `git log`. Claims are cited to their source document; where something is undecided, it is stated as undecided rather than resolved.*

---

## 1. What Veridian is

Veridian is a personal carbon-footprint tracking app for iOS (primary) and Android, built in React Native / Expo with a Supabase backend.

**The current thesis, in one sentence** (`NORTH_STAR.md` §1): *Veridian stops being a logger and becomes an autopilot: it writes your carbon story automatically from signals your life already emits — movement, money, receipts — and your only job is an occasional one-tap confirmation.*

This is a direct reversal of the app's original premise. The original PRD's core loop was manual logging framed as a game — "closing the ring," streaks, badges, challenges. The current thesis holds that manual logging is itself the failure mode: *"The manual log is the gate. The gate goes. Nobody opens an app to type 'drove 12 km.'"* (`NORTH_STAR.md` §1). Section 10 below covers how and why this changed.

---

## 2. Problem statement

**The consumer carbon-tracking category has a proven graveyard, and the failure modes are now understood well enough to design around them** (`NORTH_STAR.md` §2, `DESIGN_RESEARCH.md` Part B):

- **Miles** — nine years of working passive GPS/motion detection, $20M raised, shut down May 2025. Average user earned $1–5/year in rewards. Passive tracking rewarded with soft points has a ceiling.
- **Greenly** — a bank-linked consumer carbon tracker with 20+ bank integrations and 100k users, abandoned by its own founders for B2B within roughly 8 months. Founder, on record: it "was all free and hard to monetize… wasn't a scalable business." The tech worked; free-plus-offset-cut monetization didn't. Greenly is now a $52M Series B company selling the same technology to businesses instead of consumers.
- **Aspiration** — a climate fintech that faced a DOJ/CFTC investigation and bankruptcy after claiming roughly 35 million trees planted against roughly 12 million actually planted. Any business model that terminates in "buy an offset" inherits the credibility collapse now documented for offsets generally: 2024 Nature Communications findings put 87–94% of many offset types at high risk of not delivering real reductions.
- **Root** (telematics insurance, profitable 2024→2026), by contrast, shows that passive tracking endures *when tied to a hard outcome the user already values* — a lesson Veridian has not yet acted on (see §8, Open Question 1).

Academic consensus cited in `NORTH_STAR.md` §2 adds a second failure mode: carbon apps churn on guilt, false precision, and "single-action bias" — one visible climate action discharging the user's felt obligation to do more. Fear/shame messaging backfires into eco-paralysis unless paired with a concrete, doable next step.

**The gap Veridian is built to occupy** (`NORTH_STAR.md` §2): no surviving consumer carbon app combines passive multi-signal detection (movement + money + receipts), a trustworthy auto-detect-and-correct loop (Copilot Money's mechanic, never applied to carbon), and a shareable growth artifact (Flighty's Digital Passport pattern, never applied to carbon) — behind a subscription that is never an offset cut.

---

## 3. Target users

Four personas, all defined in `DESIGN_RESEARCH.md`. This PRD does not redefine them — see that document for full detail. Persona research ran in July 2026 alongside a verified teardown of Klima's actual (not assumed) design system, plus a review of who actually pays for consumer subscriptions in adjacent categories.

### Persona #1 — "The Quiet Optimizer" (primary design target)

30–45, senior IC or manager (engineer, PM, physician, attorney, consultant), household income $100K–250K+. Already pays for Copilot Money or YNAB, plus one of Whoop/Oura/Strava — *"the behavioral tell: they already pay for at least one quiet autopilot app in an adjacent domain"* (`DESIGN_RESEARCH.md`). Motivated by mastery over personal data and the aesthetic pleasure of a well-crafted app — not by "saving the planet"; climate is a secondary value they're glad the app serves, not why they open it.

They churn on a broken-trust moment (a miscategorized transaction, a wrong trip mode) far faster than on price, and are actively repelled by leaf icons, saturated green, gamified badges, and moralizing copy.

### Persona #2 — "The Systems Optimizer" (secondary, roadmap)

28–50, engineer or tech-adjacent, often EV + home solar, runs a personal budgeting spreadsheet. Motivated by optimization as a hobby and by **money**, not virtue — *"the persona for whom the 'hard outcome' hook (utility/insurance/expense integration) would be the feature"* (`DESIGN_RESEARCH.md`). Churns if that hook never ships and the app stays pure-awareness — explicitly named as "the exact failure mode that killed Miles despite good tech." This persona is the one this PRD's biggest open question (§8, Q1) is about.

### Persona #3 — "The Committed Reducer" (amplifier, not revenue base)

22–35, values-driven, climate-identity-forward — the Earth Hero power user. Least spare income, highest guilt-fatigue, highest skepticism toward numbers that look like greenwashing; will fact-check estimates fastest and churn hardest on a trust violation. Valuable for word-of-mouth, not the paying core.

### Anti-persona — "The Offset Absolver"

Wants to pay for a clean conscience with minimal engagement; expects the app to make them "net zero" via purchased offsets; treats the fee as a modern indulgence. `DESIGN_RESEARCH.md` names this explicitly as **Klima's and Wren's actual target user and business model**, and `NORTH_STAR.md` §9 already rejects designing for it ("Reduction, not absolution"). Design cues that would attract this persona — "you're now carbon neutral!" moments, an offset marketplace, moral-closure framing — are treated as anti-goals because they would undermine the trust positioning the rest of the product depends on.

### The central tension this creates

`DESIGN_RESEARCH.md` Part B states it plainly: *"Climate-motivated and pays-for-subscriptions are two different populations."* Climate anxiety peaks in Gen Z (~71% "extremely worried" per the cited surveys) — younger, pre-HENRY, with the least spare income for a new recurring line item. Subscription payers in every adjacent category (Copilot, Flighty, Whoop, Gentler Streak) skew 25–45 with household income above $100K. The natural experiment bears this out: Earth Hero, free and volunteer-run, has the best engagement of any app studied (120k+ users, 4.9★/392 reviews); every app that tried to monetize climate identity directly either died or pivoted to B2B. **Veridian's viable market is the narrow intersection of Persona #1 and #2, not the union of all three personas.**

---

## 4. Product thesis and architecture

`NORTH_STAR.md` §3 frames the product as three signal layers feeding one confirmation loop. Every emission enters the ledger as an estimate carrying provenance and confidence, and gets refined — the user is an editor, never a data-entry clerk.

- **L1 — Movement** (sensors): transport, roughly a third of a personal footprint. Retroactive-first on iOS via `CMMotionActivityManager` (up to 7 days of OS-logged activity, pulled on app open, zero battery cost, no location permission) plus HealthKit distances and CLVisit endpoints for routing-based distance estimates. On Android, the Activity Recognition Transition API, deliberately without requesting background location in v1 (`NORTH_STAR.md` §4).
- **L2 — Money** (bank link): shopping, food, and fuel spend the sensors can't see. Plaid for aggregation; the EPA USEEIO Supply Chain GHG Emission Factors dataset (free, public domain, kg CO₂e per dollar by sector) for the carbon math, cross-validated against Connect Earth's free tier during development (`NORTH_STAR.md` §5).
- **L3 — Receipts**: upgrades L2's coarse spend estimates to line-item precision via a per-user forwarding address and a share-extension channel, both feeding Haiku vision for parsing. Each parsed receipt *supersedes* its matching transaction estimate — a visible accuracy-upgrade moment (`NORTH_STAR.md` §6).

**The loop is the product** (`NORTH_STAR.md` §3): high-confidence events commit silently; ambiguous ones queue into a single once-a-day review moment ("3 things to confirm — 10 seconds") with top-2 alternative chips. Every correction trains a per-user prior, so the app gets quieter every week — Copilot Money's exact mechanic, ported to carbon.

**Design bar**: two Apple Design Award winners as the explicit reference spines — Flighty (2023, Interaction; passive data as a live, always-visible story) and Gentler Streak (2024, Social Impact; non-judgmental, progress-vs-yourself). `NORTH_STAR.md` §2 corrects the project's own earlier lore: Klima was a 2021 ADA *finalist*, not a winner.

---

## 5. Design direction: "Clearing"

The current visual direction, specified in full in `DESIGN_DIRECTION.md`, is **light-mode**, modeled on Copilot Money rather than on Klima. One sentence from that document: *"A light, precise instrument that happens to measure carbon — calm enough to trust with your bank account, exact enough to argue with."*

This direction itself is the product of a rejected predecessor, which is worth recording as evidence of process, not just as trivia:

- **"Understory"** (shipped July 23, 2026) committed to dark surfaces, a moss-green accent, and Fraunces — a warm literary serif — for hero numbers. `DESIGN_DIRECTION.md` names three problems with it, in increasing severity: (1) it wasn't actually built to match its own reference (Klima is light-mode with Overpass Black at −6% tracking); (2) a literary serif is the wrong kind of character for a data-precision category — every comparable app (Copilot, Flighty, Linear, Whoop) uses a neutral grotesque; (3) *it was designed for the wrong person* — its tone was calibrated for Persona #3 (the Committed Reducer), the segment `DESIGN_RESEARCH.md` identifies as least likely to subscribe.
- **"Clearing"** (specified August 7, 2026; the full rebuild — all five phases of `DESIGN_DIRECTION.md`'s execution plan — shipped August 18, 2026, commit `bb7988d`) reverses each of those: near-white neutrals (`canvas #FCFCFD`), a deliberately deep, low-chroma evergreen accent (`#0F6B41` — "considered, not cheerful," chosen because bright mint is *"the single strongest 'generic eco app' signal"* and Persona #1 reads it as unserious), SF Pro system type with tabular figures on every number, and Klima's *techniques* (the number-as-hero, two-tier accent system, −6% display tracking, navy-black-never-pure-black text) retained even though Klima's *positioning* is rejected.

Clearing also collapses the IA from four tabs to three — **Today / Trends / You** — demoting the Log tab to a `+` affordance, on the reasoning that *"a 'Log' tab is a standing admission that the autopilot didn't work"* (`DESIGN_DIRECTION.md` § Information architecture). This is now shipped: `app/(tabs)/_layout.tsx` and `docs/USER_JOURNEY.md` §1 confirm the three-tab structure is live in the current codebase, not aspirational.

With the rebuild complete, `app.json`'s `userInterfaceStyle` has been flipped from `dark` (Understory's setting) to `light` (Clearing's) — the app now ships light-only by default. Dark mode as a *second, user-selectable* mode is explicitly deferred — *"a later designed pass, not a naive inversion"* — and is an open item (§8).

---

## 6. Current scope — what's shipped

Verified against `docs/USER_JOURNEY.md` (rewritten August 2026 from the live route table in `app/`) and the sprint specs.

### Shipped and live

- **Three-tab IA**: Today (`app/(tabs)/index.tsx`), Trends (`app/(tabs)/trends.tsx`), You (`app/(tabs)/profile.tsx`). Manual logging survives as a modal (`app/log.tsx`) reached via a `+` affordance, not a tab.
- **Onboarding + baseline calculator**: 3-slide carousel, 8-question calculator, results screen. Baseline hand-off across the signup wall is verified working correctly (`USER_JOURNEY.md` §2).
- **Sensor-based autopilot (Sprint A–C, shipped July 10–12, 2026)**: provenance-tagged ledger (`source`, `confidence`, `status` on `emission_entries`), a durable `detected_trips` table, a single trip state machine, the offline queue wired into the write path, iOS retroactive motion history, Android Activity Recognition parity, the daily confirm-queue surface, momentum bands, Weekly Recap.
- **Money layer (Sprint D, shipped July 18, 2026)**: Plaid Link bank-connect flow (`app/link-bank.tsx`) with trust-first copy ("we never see your credentials," visible unlink), the MCC→NAICS→USEEIO factor engine (`lib/spendFactors.ts`), a new `shopping` emission-factor category, spend-based entries with visible estimate labeling.
- **Receipts layer (Sprint E Half 1, shipped July 18, 2026)**: forwarding-address and share-extension ingestion, Haiku-based line-item parsing, the supersede-a-transaction-estimate mechanic, Amazon/DoorDash backfill import.
- **Carbon Passport (Sprint E Stage A4, shipped July 18, 2026)**: the monthly/annual shareable growth artifact modeled on Flighty's Digital Passport, reachable today from a single row on the You tab.
- **Clearing visual rebuild (shipped August 18, 2026, commit `bb7988d`)**: `lib/theme.ts` rewritten to Clearing's light-mode token system (canvas/ink/accent/calm-watch-over) with tabular figures wired globally; `app.json`'s `userInterfaceStyle` flipped from `dark` to `light`; a new `components/illustrations/` line-art set (`Illustration.tsx`, `glyphs.tsx`) replacing emoji everywhere, including the onboarding calculator and push-notification copy; the systemic `VCard` accent-rail-on-card pattern (a leftover Understory device the commit notes was "invisible to lint/grep since it rendered as a positioned View, not a border property") removed across the app; Passport's on-card text colors, `profile.tsx`'s gradient-banner artifact, and leftover dark-mode photo scrims all fixed for the light-ground token flip; unused `components/hello-wave.tsx` deleted.
- **Manual-logging UX overhaul (same commit, root-caused via a deep research and testing pass)**: the Shopping category's chip padding/truncation bug in `app/log.tsx`, fixed via the shared `VChip`; raw NAICS codes (e.g. `"442110"`) leaking as factor-picker group headers in both `app/log.tsx` and `app/entry/[id].tsx`, resolved via the new `lib/naicsGroups.ts`; the absence of any carbon-literacy comparison copy anywhere in the app, addressed by the new `lib/impactCopy.ts` (e.g. "About a 6 km drive," "14% below the global average"); Shopping's spend-based logging reframed honestly ("How much did you spend?", currency-formatted quick-picks, an estimate disclaimer, a "~" prefix matching the feed's existing estimated-value convention); gamification toned down on the You tab (smaller/muted achievement badges, a gentler unlock toast with plain-checkmark iconography instead of a trophy, de-emphasized Challenges CTA).
- **Real bugs found and fixed via first-hand device testing** (per `git log` and `NORTH_STAR.md`): a `VCountUp`/New-Architecture animation freeze where `animatedProps` into a `TextInput` were silently dropped (July 11); motion permission never actually being requested for returning users (July 11); a calculator infinite loop traced to a stale React Query cache and a baseline race condition (May 8); an Insights (now Trends) filter-chip that visually toggled state but never actually filtered the underlying chart or entry list (fixed per commit `4517909`).

### Deferred / not yet built

- **Ambient presence (Sprint E Half 2)**: Live Activities, Dynamic Island, home-screen widgets. Gated on a paid Apple Developer account decision (§8, Q4) — App Group entitlements are unavailable on a free personal team.
- **Watch complication**: explicitly deferred to "Phase C" in `NORTH_STAR.md` §8, after the iPhone autopilot is validated.
- **Dark mode**: deferred as a separate, deliberately-designed pass, not a naive inversion of Clearing's light tokens (`DESIGN_DIRECTION.md`).
- **Snap-a-Plate**: a fully written proposal (`docs/SNAP_A_PLATE_SPEC.md`, August 2026) to replace manual food logging with a camera-based flow, reusing the `receipt-parse` edge-function harness against a new food-identification prompt and a DEFRA-factor resolver. **This is a proposal awaiting product-owner sign-off. No implementation has started.** It carries five open questions of its own (persistent vs. conditional camera affordance; whether low-confidence guesses should be suppressed or always shown; one ledger entry per plate vs. one per ingredient; whether the photo is discarded or retained; what accuracy bar an eval must clear before shipping) and proposes gating the build behind a 100-photo Haiku-vs-Sonnet accuracy eval before any UI work begins.
- **Non-US launch geography, Plaid production-tier access, the paid Apple Developer account decision**: all open, see §8.

---

## 7. Success metrics

The original PRD's metrics (D7/D30/D90 retention at 40%/20%/10%, average log events per active user, median streak length, challenge-participation rate) were built around a manual-logging, gamification-driven core loop that the pivot retired. They are recorded here for continuity but are not the current measurement plan, because the mechanic they measured (frequent manual logging as the sign of a healthy user) is the opposite of what the autopilot is supposed to produce — a healthy autopilot user logs *less*, not more.

**No replacement metrics framework has been formally written down yet in the source documents reviewed for this PRD.** What can be stated with evidence:

- `NORTH_STAR.md` §3 sets an implicit engagement bar by analogy: Copilot Money users report that manual categorization work "nearly disappears" after 2–3 weeks of the confirm-and-correct loop; the equivalent bar for Veridian is a shrinking daily confirm-queue size per user over their first month, not a rising log count.
- `NORTH_STAR.md` §9 and §11 make clear that the subscription is the business-model bet, sold on "effortless awareness," and that monetization strategy is not finalized pending the hard-outcome decision (§8, Q2) — so a committed revenue target (pricing, conversion rate) is explicitly not yet set.
- `SPRINT_D_SPEC.md` and `SPRINT_E_SPEC.md` each define sprint-level exit criteria (e.g., Sprint D: "a user links a card, transactions flow in within a session, each becomes an emission entry... the shopping category finally has live data") rather than product-level success metrics — these are engineering completion gates, not the metrics framework this section would otherwise report.

**This is a gap worth naming rather than papering over**: the product has a clear thesis and a clear design bar but does not yet have a written activation/retention/monetization metrics definition consistent with the autopilot model. Recommend this be the next document written once the hard-outcome decision (§8, Q2) lands, since the two are coupled — a metrics framework written before that decision would likely measure the wrong thing for Persona #2.

---

## 8. Open questions and decisions (need Vedant's call)

Carried directly from `NORTH_STAR.md` §11, with the persona and design consequences layered in from `DESIGN_RESEARCH.md`, `DESIGN_DIRECTION.md`, and `USER_JOURNEY.md` §4. None of these are resolved in this document; the source documents are consistent in warning against inferring an answer from what the codebase happens to contain.

**Q1 — Launch geography.** The money layer is US-first by data availability (Plaid coverage + free EPA USEEIO factors). India would need Setu/Account-Aggregator FIU onboarding (a real regulatory lift) plus an EXIOBASE license; EU would need TrueLayer/Tink plus EXIOBASE. `NORTH_STAR.md`'s recommendation is US-first, sensors-only elsewhere at launch — but this is a recommendation, not a decision.

**Q2 — The "hard outcome" hook.** This is the single most consequential open item across all four source documents. `NORTH_STAR.md` §9 states it as the core lesson from Root's profitability versus Miles' shutdown: *"passive tracking endures only when tied to a hard outcome the user already values."* Four unselected candidates are named: money saved via the swap engine (Top Moves already computes kg-based rankings, not money — `USER_JOURNEY.md` §4 is explicit that this is *not* evidence the money-hook has been chosen), commute/expense export, EV/utility incentive matching, insurance partnerships. `DESIGN_RESEARCH.md` ties this directly to Persona #2's retention: *"Churns if the hard-outcome hook never ships and the app stays pure-awareness — the exact failure mode that killed Miles despite good tech."* Needs a positioning decision before Sprint D-era pricing is finalized. **Unresolved.**

**Q3 — Plaid production-tier access.** Requires a human-initiated sales conversation (applying for the startup/limited-production tier); `NORTH_STAR.md` recommended timing this around Sprint C so it would be ready for Sprint D. Current status of that outreach is not confirmed in any source document reviewed.

**Q4 — Paid Apple Developer account.** Live Activities, widgets, and certain HealthKit entitlements are unavailable on a free personal team. This decision gates Sprint E's ambient layer (`SPRINT_E_SPEC.md` Half 2) and TestFlight beta distribution generally. **Undecided.**

**Q5 — Snap-a-Plate approval.** A complete spec exists (`docs/SNAP_A_PLATE_SPEC.md`) but explicitly carries the status "proposal, awaiting product-owner approval. No implementation has started." Five sub-decisions are itemized in that document's own §7 and are not re-litigated here.

**Q6 — Dark mode.** Deferred by design decision, not by oversight — `DESIGN_DIRECTION.md` is explicit that it will be "a later designed pass, not a naive inversion" of Clearing's light tokens. No date attached.

**Q7 — A number of design-risk items flagged but not decided in `USER_JOURNEY.md`** (its own §7 summary table enumerates 18, several already fixed in this session). The ones still open and most load-bearing: onboarding still sells manual logging, streaks, and a leaderboard in its three slides — directly contradicting the autopilot thesis in the user's first sixty seconds; the daily budget ring is measured against a global constant (`DAILY_CARBON_BUDGET_KG = 22`) rather than the user's own calculated baseline; two visually divergent confirm-queue UIs exist over the same underlying data (Today's sheet vs. `log.tsx`'s list); a "Streak" metric survives on Trends despite `NORTH_STAR.md` §8 and `DESIGN_DIRECTION.md` both banning breakable streaks outright; and the Passport — the product's designated growth artifact — is reachable from exactly one place in the app, three navigation levels deep, rather than from Today's weekly summary as `DESIGN_DIRECTION.md`'s IA section specifies.

---

## 9. Risks

From `NORTH_STAR.md` §12, retained because they remain live:

| Risk | Mitigation as currently planned |
|---|---|
| iOS 26 background-relaunch regressions | Retroactive-first architecture doesn't depend on background execution; a weekly app-open suffices |
| Play Store background-location review | Not requested in v1; a precedented declaration path (MileIQ/Everlance) exists if needed later |
| Spend-estimate accuracy disappointment (a documented churn cause in this category) | Explicit uncertainty labeling; receipts visibly upgrade coarse estimates; the confirm loop keeps the user in control |
| Bank-link hesitancy | Sensors-only mode is fully useful on its own; the money layer is an upgrade, never a gate |
| Battery complaints | No continuous GPS anywhere in v1 — OS-precomputed signals only |
| Consumer carbon monetization graveyard (Greenly, Miles, et al.) | Subscription for intelligence, not offsets; pursue the hard-outcome hook (§8 Q2, still unresolved); keep burn small |

Additional risk surfaced in `USER_JOURNEY.md` that is not yet in `NORTH_STAR.md`'s table: the onboarding carousel currently markets the retired vision (manual logging "in seconds," a mock leaderboard, "climb the leaderboard and earn achievement badges") to the exact persona (`#1`, the paying core) that `DESIGN_RESEARCH.md` identifies as repelled by all three. This is flagged as a design risk, not yet fixed.

---

## 10. How we got here — the pivot history

This section exists because the evolution is itself evidence of the product thinking behind the current direction, not just a changelog. Dates are taken from `git log` on this repository.

1. **March 15, 2026 — project start.** Foundation phase: Expo scaffold, Supabase schema, 13 migrations, DEFRA 2025 emission factors seeded, the initial design system.
2. **March 15 – March 22, 2026 — the original vision built out.** Manual-logging core loop (calculator, Home ring, Log tab as a browsable factor-card feed, Insights), gamification (streaks, achievements, challenges, leaderboards), and a weekly AI insight card via Claude edge functions. This is the product `VERIDIAN_PRD.md` describes: freemium at ~$4.99/mo, a Phase 5 "Green Points" rewards marketplace redeemable at partner brands, B2B2C scope-3 reporting as a later phase. Klima was the explicit design and retention benchmark (`VERIDIAN_PRD.md` §7: "Klima peaked at ~4M downloads with D30 retention driven primarily by social/challenge layer").
3. **A roughly five-week gap (March 22 – April 3, 2026).**
4. **April 3 – May 8, 2026 — first taste pass and early bug-fixing.** A Stitch-inspired activity-card redesign of the Log screen; a calculator infinite-loop bug traced to a stale React Query cache plus a baseline-save race condition, fixed; background motion detection for transport trips added; a founder-taste "premium UI overhaul across all screens" (May 8).
5. **July 2 – July 11, 2026 — early autopilot signals, and real device-testing bugs surfaced.** A light-mode redesign plus the first version of "Top Moves" (ranked impact suggestions). Then, in quick succession on July 11: a `VCountUp` animation freeze on the New Architecture (`animatedProps` written into a `TextInput` were being silently dropped), motion permission never actually being requested for returning users, and mode-aware feed icon and ring-computation fixes — the kind of defects that only surface from testing on a real device rather than a simulator.
6. **July 10, 2026 — the strategic pivot begins.** `NORTH_STAR.md` is authored, synthesizing a six-track research sweep (device sensors, transaction APIs, receipt ingestion, competitor autopsies, design-award analysis, a full codebase audit) into the autopilot thesis. Sprint A ships the same day (provenance ledger, trip state machine, durable writes) as the foundation the rest of the pivot depends on.
7. **July 11–12, 2026 — Sprints B and C.** Retroactive iOS motion history and signal fusion (Sprint B), then Android parity, Weekly Recap, momentum bands, and an anti-guilt copy sweep (Sprint C).
8. **July 18, 2026 — Sprints D and E ship in one day.** The money layer (Plaid + the EPA USEEIO factor engine), the receipts layer (forwarding address, share extension, Haiku parsing, the supersede mechanic), and the Carbon Passport growth artifact all land.
9. **July 23, 2026 — the "Understory" visual redesign ships.** Dark, editorial, Fraunces serif, moss-green accent — explicitly built to emulate Klima's aesthetic.
10. **August 7, 2026 — "Clearing" supersedes Understory.** A research-driven reversal: `DESIGN_RESEARCH.md`'s persona and competitor-monetization findings showed that Klima's aesthetic is calibrated for Persona #3 (the Committed Reducer), the segment least likely to ever subscribe, while the segment that actually converts in adjacent categories (Copilot Money's, Flighty's) responds to a light, precise, low-chroma instrument aesthetic. `DESIGN_DIRECTION.md` is authored the same day.
11. **August 18, 2026 — the Clearing rebuild ships complete, alongside a manual-logging UX overhaul (commit `bb7988d`).** All five phases of `DESIGN_DIRECTION.md`'s execution plan land in one commit: `lib/theme.ts` rewritten to Clearing's token system, `app.json`'s `userInterfaceStyle` flipped from `dark` to `light`, emoji replaced app-wide with a new illustration set, and the Understory-era `VCard` accent-rail pattern and remaining dark-surface artifacts (Passport text colors, `profile.tsx`'s gradient banner) removed. Alongside it, a UX and copy pass fixes the Shopping category's spend-based-factor confusion, the raw-NAICS-code group headers, the category-chip padding/truncation bug, and adds carbon-literacy comparison copy where none existed before; gamification is also toned down on the You tab. `docs/USER_JOURNEY.md` is rewritten the same commit to match, and `docs/SNAP_A_PLATE_SPEC.md` is authored as a proposal — no implementation started.

**What this history is evidence of.** The pivot was not a single aesthetic preference — it followed a verified competitor teardown (real numbers on Miles, Greenly, Aspiration, Root), a corrected fact-check of the project's own prior assumptions (Klima was never an ADA winner), and two successive design-direction documents where the second was written specifically to correct a persona-targeting error identified by research in the first. The bug list in steps 4–5 above (a stale-cache infinite loop, a silently-dropped native animation, a permission that was never actually requested, a filter control that didn't filter) is included deliberately: these were found and fixed through first-hand device testing, not assumed away, which is the same standard the current specs (`SPRINT_D_SPEC.md`, `SPRINT_E_SPEC.md`, `SNAP_A_PLATE_SPEC.md`) hold new work to.

---

## 11. Document ownership

This PRD is maintained as the single current source of truth for product scope and direction. `NORTH_STAR.md` remains the canonical strategy document (thesis, roadmap, open decisions in full detail); `DESIGN_RESEARCH.md` and `DESIGN_DIRECTION.md` remain canonical for persona and visual-system detail; `USER_JOURNEY.md` remains canonical for verified screen-by-screen behavior. This document synthesizes all of them for a reader who needs the current state of the product in one place, and should be updated whenever any of its sources materially changes — particularly when §8's open questions get resolved.
