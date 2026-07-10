# Veridian North Star — The Carbon Autopilot

*Direction document · July 2026 · Synthesized from a 6-track verified research sweep (device sensors, transaction APIs, receipt ingestion, competitor autopsies, design-award analysis, full codebase audit) plus first-hand code review.*

---

## 1. The one-sentence direction

**Veridian stops being a logger and becomes an autopilot: it writes your carbon story automatically from signals your life already emits — movement, money, receipts — and your only job is an occasional one-tap confirmation.**

The manual log is the gate. The gate goes. Nobody opens an app to type "drove 12 km." The winning apps in every adjacent category (Flighty for flights, Copilot for money, Apple Watch for workouts) proved the same law: **the user never enters data; the user corrects and enjoys data.**

---

## 2. Why this exact gap is ours to own (verified, July 2026)

The competitor teardown found that **no surviving consumer carbon app combines all four** of the things that work:

| Ingredient | Who proved it | Status |
|---|---|---|
| GPS/motion transport auto-detection | Miles (9 yrs, shut down May 2025), Capture (stagnant) | Each did **one** signal only |
| Bank-transaction carbon estimates | Commons/Joro (alive, sub-viral: ~36 employees, "tens of thousands" of users after 6 yrs, $13.9M raised) | Spend only, no sensors |
| Trustworthy auto-detect + 1-tap-correct loop | Copilot Money (finance, not carbon) | Never applied to carbon |
| Shareable beautiful artifact as the growth loop | Flighty's Digital Passport (top-3 growth driver per founder) | Never applied to carbon |

And the graveyard teaches the constraints:

- **Greenly** — bank-linked consumer carbon tracker, 20+ bank integrations, 100k users — was abandoned by its own founders for B2B within 8 months because *"it was all free and hard to monetize… wasn't a scalable business."* Lesson: the tech worked; **free + offset-cut monetization didn't**.
- **Miles** — flawless passive mode-detection at scale for 9 years — died anyway. Lesson: passive tracking rewarded with soft points has a ceiling; **Root (telematics insurance, profitable 2024→2026) shows passive tracking endures only when tied to a hard outcome the user already values**.
- **Academic consensus** (AIGA, Atmos, multiple peer-reviewed studies): carbon apps churn on guilt, false precision, and "single action bias." Fear/shame messaging **backfires into eco-paralysis** unless paired with a concrete, doable next step.
- **Offsets are a melting foundation**: 2024 Nature Communications/Science findings that 87–94% of many offset types are low-quality. Any business model that terminates in "buy an offset" inherits that credibility collapse. (Klima, Wren, Commons all do.)

**Positioning statement:** *Veridian is the only carbon app that tracks itself.* Multi-signal autopilot + Copilot-grade correction loop + Flighty-grade shareable story + subscription for the intelligence layer (never an offset cut).

> ⚠️ Fact-check correction to our own lore: **Klima did NOT win an Apple Design Award** — it was a 2021 **finalist** (Social Impact). The actual ADA winners to emulate are **Flighty** (2023, Interaction) and **Gentler Streak** (2024, Social Impact). Our design bar just got more specific, and better.

---

## 3. The product thesis: three signal layers + one loop

Every emission enters the ledger as an **estimate with provenance and confidence**, and gets refined. The user is an editor, never a data-entry clerk.

```
SIGNALS                    INFERENCE                 LEDGER                    LOOP
─────────                  ─────────                 ──────                    ────
L1 Movement  ──┐           trip segmentation         emission_entries          auto-commit (high conf)
  (sensors)    │           mode classification       + source                  1-tap confirm (mid conf)
L2 Money     ──┼──▶        MCC→NAICS→kgCO₂e/$   ──▶  + confidence        ──▶   daily batched review
  (bank link)  │           merchant enrichment       + status                  corrections → personal
L3 Receipts  ──┘           LLM line-item parse       + trip/txn linkage        priors (your commute,
  (fwd/share)              product→factor map        detected_trips table      your grocer) → quieter
```

- **L1 Movement** covers transport (~⅓ of a personal footprint). Zero manual input, near-zero battery (see §4).
- **L2 Money** covers shopping/food/fuel — the things sensors can't see, including the Uber/Amazon blind spot at the *spend* level. Connect once, flows forever.
- **L3 Receipts** upgrades L2's coarse estimates to line-item precision opportunistically (forwarded emails, share-sheet, one-time exports). Each receipt *supersedes* the matching L2 transaction estimate — visible accuracy improvement the user can feel.

**The loop is the product.** Copilot Money's exact mechanic, ported to carbon: high-confidence events commit silently; ambiguous ones queue into a **single once-a-day review moment** ("3 things to confirm — 10 seconds") with top-2 alternative chips; every correction trains a per-user prior (your 8am corridor = commute by car; your Friday transaction at that merchant = groceries) so the app gets quieter every week. Copilot users report manual work "nearly disappears" after 2–3 weeks. Ours must too.

---

## 4. Signal layer 1 — Movement (the wedge, and the v1)

### The verdict from research: retroactive-first, platform-asymmetric, no continuous GPS

Naive continuous GPS polling burns 10–14%/hour of battery vs 1.5–5%/hour for motion-gated approaches (2026 real-device benchmarks). We don't need it. The OS already did the work:

**iOS (primary platform, dev-build):**
- **CMMotionActivityManager.queryActivityStarting(from:to:)** — the killer API. On every app open, retroactively pull up to **7 days** of walk/run/cycle/automotive segments (with confidence + timestamps) that the M-series coprocessor logged **with zero app code running and zero battery cost**. Needs only `NSMotionUsageDescription`. No location permission. No background modes. *This single API fixes our worst bug — "nothing logs unless you open the app" — because opening the app once a week is now enough.*
- **HealthKit** `DistanceWalkingRunning` / `DistanceCycling` — real distances for 3 of 4 modes, retroactive, free, zero battery.
- **CLVisit monitoring** (needs Always location) — place arrival/departure endpoints. For automotive segments, estimate distance by **routing between the two visit endpoints** instead of GPS breadcrumbs.
- Keep the existing background-location task as a *supplementary* breadcrumb source (it already ships), but nothing depends on it anymore.
- Engineering: one small custom Expo native module (config plugin + ~150–400 lines Swift per API). No library exposes these today; expo-sensors only wraps the pedometer. 2–4 days each, very tractable on our dev-build workflow.

**Android (policy-first):**
- **Activity Recognition Transition API** — push-based ENTER/EXIT events for STILL/WALKING/RUNNING/ON_BICYCLE/IN_VEHICLE, survives process death, needs only the `ACTIVITY_RECOGNITION` permission which is **not** gated by Play's background-location review. Register it in v1.
- **Do NOT request `ACCESS_BACKGROUND_LOCATION` in v1.** The April 2026 Play policy update tightened continuous-location review. Verified nuance: MileIQ/Everlance prove approval is achievable *when trip detection is declared as core functionality* — so this is a door we can open later with a proper declaration, not a wall. But v1 doesn't need the fight: car-trip distance ships as a notification-driven one-tap confirm ("Looks like you drove — confirm and we'll estimate distance from your endpoints").
- **Health Connect** as an enrichment layer for users with Samsung Health/Fitbit (note: Google Fit APIs sunset end of 2026).

**Classification:** replace the single avg-speed threshold (today: <7 discard, 7–28 cycling, ≥28 car — a bus IS a car to us right now) with **OS activity type × speed profile × HealthKit/Health Connect reconciliation + per-user priors**, each verdict carrying a confidence score. Published research puts simple random-forest/threshold fusion at 93–95% across walk/bike/car/bus/train — plenty for v1 with the confirm loop as backstop. GTFS transit matching: explicitly deferred, unnecessary complexity.

**Walking gets reinstated** (today it's discarded!) — zero-carbon modes are the celebration engine, per the existing cycling pattern.

**Buy-vs-build note:** Transistorsoft's react-native-background-geolocation ($399 one-time, Expo config plugin, implements exactly this motion-gated architecture) is the right *buy* if/when we later want continuous cross-platform GPS routes. Free to prototype in DEBUG builds. Not needed for v1.

---

## 5. Signal layer 2 — Money

**Aggregator: Plaid** (US/UK/EU coverage, RN SDK, the exact stack Commons validated; pricing is sales-gated — first ~200 production calls free, apply for startup tier). **Teller** ($1.50/account-ish, transparent, free 100-connection dev tier, US-only) is the fallback if Plaid's process stalls. Skip MX/TrueLayer/Tink (minimums), skip Apple FinanceKit (entitlement restricted to Finance-category budgeting apps — we don't qualify).

**Carbon math: DIY, don't buy.** The **EPA USEEIO "Supply Chain GHG Emission Factors"** dataset is free, public domain, kg CO₂e per dollar by commodity/sector, with a **"with margins" (retail purchaser-price) variant built for exactly this**. Build the one-time crosswalk: Plaid category/MCC → NAICS → factor. This is precisely how Joro/Carbon Insights bootstrapped. Zero per-call cost, no vendor lock-in.
- Cross-validate during development against **Connect Earth's free 1,000 calls/month** self-serve tier (and Climatiq's non-commercial tier). Upgrade to Climatiq Data Pro (€250/mo) only if the accuracy delta ever matters commercially.
- Non-US expansion needs an EXIOBASE commercial license (negotiated, not public) or DEFRA's free UK factors — a later decision.

**Trust is the feature.** The bank-connect screen is the highest-leverage conversion surface in the app: "we never see your credentials," visible unlink-anytime, plain-language why. Every spend-based number is **labeled as an estimate with disclosed uncertainty** — false precision is a documented churn driver, and Aspiration's DOJ investigation for overstated impact claims is the cautionary tale for overclaiming anything.

**Schema note:** the `emission_factors` catalog gains a **`shopping` category** (it doesn't exist today) plus spend-based factor rows (unit = USD, source = USEEIO).

---

## 6. Signal layer 3 — Receipts

**Skip the Gmail API entirely.** Restricted scopes mean an annual CASA assessment ($540–$1,800/yr on the new self-serve Tier 2 path — far better than the legacy $15k–75k, but still a recurring audit + multi-week Google review + a "read your entire inbox" consent screen). Not a v1 trade for a small team.

Ship two provider-agnostic channels instead:
1. **Forwarding address** — `receipts@veridian.app` (per-user alias) behind a Mailgun/SendGrid/Postmark inbound-parse webhook. One-time forwarding rule works for Gmail, Outlook, **and Apple Mail/iCloud (which has no API at all)** — so this covers *more* users than Gmail OAuth would. The Expensify/Fyle pattern, well-trodden.
2. **Share extension** — `expo-share-intent` config plugin (works with our dev-build, no eject): share an order confirmation or screenshot from Mail/Photos straight into Veridian.

Both feed **Haiku vision** for line-item extraction (~$0.003–0.005/receipt, ~97% field accuracy on clean images), mapped to USEEIO/DEFRA factors. Each parsed receipt supersedes its matching Plaid transaction estimate — the visible "accuracy upgrade" moment.

**Backfill:** Amazon Privacy Center "Request My Data" zip and DoorDash's native order export as one-time import flows. Uber has no consumer export — email/share ingestion only.

---

## 7. The ledger — data model (prerequisite for everything)

From the codebase audit, in order:

1. **Provenance migration (additive, zero-risk):** `emission_entries` gains nullable `source` (`manual | sensor | transaction | receipt`), `confidence` (0–1), `status` (`pending | auto_confirmed | user_confirmed | dismissed`), `trip_id`, `metadata` JSONB. Manual flow untouched.
2. **`detected_trips` table (server-side):** id, times, distance, mode, confidence, classification features, status, RLS. Today trips live only in a 48-hour client ring buffer — they must become durable server objects a smarter classifier can re-read and re-verdict.
3. **One trip state machine.** Today `useAutoLog` (silent write) and the Log screen's confirm card race each other over the same `pendingTrips` via independent React effects and AsyncStorage flags. Collapse into a single status-column-driven machine: `pending → auto_confirmed | needs_confirmation → confirmed | dismissed`.
4. **Wire the offline queue.** `useOfflineQueue` is built, tested, mounted — and never called. Auto-log failures are currently swallowed. Route all entry writes through it.
5. **Tests for the highest-stakes path.** locationTask/useMotionDetection/useAutoLog have zero test coverage today; the new pipeline gets tested from day one.

**Keep as-is (genuinely strong):** the V* design system + theme tokens (~20 primitives, 42 consumers, well-tested), the emissions/summary engine (already provenance-agnostic), achievements/challenges/leaderboard/Top Moves (all read from entries regardless of origin — they inherit autopilot for free), React Query + Realtime architecture.

---

## 8. The experience — design bar and system

Two ADA-winner spines: **Flighty** (passive data as a live, always-visible story) and **Gentler Streak** (non-judgmental, progress-vs-yourself). Twelve named patterns from the design track, sequenced:

**Phase A — pure RN/Reanimated, no native risk (the retention core):**
1. **Today, Auto-Written** — the Log tab dies; in its place a reverse-chron feed of auto-detected cards: "8:12 AM · Drove 4.2 km to work · +0.9 kg". Plain language, never jargon. Manual add survives only as a small + escape hatch.
2. **The Footprint Ring** — hero gauge vs *your own* adaptive band (under / in-band / over as guidance, not verdict). SVG + Reanimated `useAnimatedProps` + `withSpring`.
3. **1-Tap Confirm Cards** — the Photos-"is this you?" flow. One primary Yes + top-2 alternate chips. Batched into one daily review.
4. **Anti-Guilt Palette & Copy** — warm neutrals, saturated accent reserved for *encouragement*, never red-as-shame; every "over band" fact pairs with one concrete doable swap (research: guilt without efficacy = churn).
5. **Momentum, Not Streaks** — rolling 7-day band that decays gently; no breakable chains, ever.
6. **Silent-by-Default** — the app earns each interruption; Apple-Journal-style privacy framing in onboarding ("your location history stays on your phone").
7. **Restrained Motion & Haptics** — feedback, never decoration; shared helper module.
8. **Empty States as Invitations** — first-run previews the shape of the feed; the first detected trip visibly fills the ring (the aha moment).

**Phase B — the ambient layer (native targets via @bacons/apple-targets; note Software Mansion's expo-live-activity was archived June 2026):**
9. **Weekly Recap** — Screen-Time-meets-Wrapped paged story; final page is a screenshot-shareable card. (Actually pure RN — can ship in Phase A if time allows.)
10. **Trip Live Activity + Dynamic Island** — live distance + accruing CO₂ during a detected trip. Flighty's signature move, applied to carbon.
11. **Home-Screen Widgets** — today's ring (small), 7-day trend (medium); shares App Group plumbing with the Live Activity.

**Phase C — deferred:** 12. Watch complication (native SwiftUI, heaviest lift — after iPhone autopilot is validated).

**The growth artifact:** a monthly/annual **Carbon Passport** (Flighty's Digital Passport pattern) — an automatically-generated, beautiful, shareable story of your movement and footprint. Per Flighty's founder, this class of artifact was a top-3 organic growth driver. This replaces guilt dashboards as the thing users show other people.

*(Housekeeping: the repo is on Reanimated **4.1** + worklets now — the "Reanimated only, never RN Animated" rule stands; v4 APIs are a superset of v3's.)*

---

## 9. Business model

- **Flat subscription for the intelligence layer** (Copilot Money's model: $13/mo there; we'll price later). What's paid: the autopilot itself — multi-signal fusion, receipts parsing, recaps, widgets. Sold on *effortless awareness*, not planet-guilt.
- **Never an offset transaction cut.** Offset credibility is actively eroding; don't build revenue on it. Reduction, not absolution.
- **Find the hard outcome** (Root's lesson: passive tracking endures when tied to money/time the user already values). Candidates to explore post-v1: money saved via the swap engine (Top Moves already computes this), commute/expense export, EV/utility incentive matching, insurance partnerships. This is the open strategic question — see §11.

---

## 10. Roadmap — five sprints

**Sprint A — The Ledger (foundation).** Provenance migration + `detected_trips` + `shopping` category + single trip state machine + wire offline queue + reinstate walking + tests for the detection path. *Exit: every entry knows where it came from and what state it's in.*

**Sprint B — True Autopilot, iOS.** CoreMotion history module (7-day retroactive backfill) + HealthKit distances + CLVisit endpoints + routing-based car distance + confidence-scored classifier + Today feed, Ring, Confirm Cards (design Phase A core). *Exit: a user who opens the app twice a week has a complete, mostly-auto-confirmed transport ledger and never types a trip.*

**Sprint C — Android parity + the feel.** Activity Recognition Transition API module + notification one-tap confirm + Health Connect enrichment + anti-guilt palette/copy sweep + momentum + empty states + Weekly Recap. *Exit: both platforms autopilot transport; the app feels like Gentler Streak, not a dashboard.*

**Sprint D — Money.** Plaid Link (trust-first connect screen) + MCC→NAICS→USEEIO engine + spend entries with uncertainty labeling + receipts-supersede-transactions dedup logic groundwork + cross-validation vs Connect Earth. *Exit: shopping/food/fuel appear automatically; Uber/Amazon exist in the ledger at spend level.*

**Sprint E — Receipts + Ambient + Share.** Forwarding address + share extension + Haiku parsing + Amazon/DoorDash backfill imports + Live Activity + widgets + Carbon Passport v1. *Exit: the full three-layer autopilot, ambient on the lock screen, with a shareable artifact.*

---

## 11. Open decisions (need Vedant's call)

1. **Launch geography.** The money layer is US-first by data availability (Plaid + free EPA factors). India needs Setu/Account-Aggregator FIU onboarding (real regulatory lift) + EXIOBASE licensing; EU needs TrueLayer/Tink + EXIOBASE. Recommendation: **US-first**, sensors-only elsewhere at launch.
2. **The hard outcome** to anchor monetization (§9). Needs a positioning decision before Sprint D pricing.
3. **Plaid sales conversation** — needs a human to start it (apply for startup/limited-production tier) around Sprint C so it's ready for D.
4. **Apple Developer account** — Live Activities/widgets/HealthKit on a free team have entitlement limits; the paid account decision gates Sprint E's ambient layer (and TestFlight beta distribution generally).

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| iOS 26 background-relaunch regressions (reported on dev forums) | Retroactive-first architecture doesn't depend on background execution; weekly app-open suffices |
| Play Store background-location review | Not requested in v1; precedented declaration path (MileIQ/Everlance) exists if needed later |
| Spend-estimate accuracy disappointment (documented churn cause) | Explicit uncertainty labeling; receipts visibly upgrade estimates; confirm loop keeps user in control |
| Bank-link hesitancy | Sensors-only mode is fully useful; money layer is an upgrade, never a gate |
| Battery complaints | No continuous GPS anywhere in v1; OS-precomputed signals only |
| Consumer carbon monetization graveyard (Greenly et al.) | Subscription for intelligence, not offsets; pursue hard-outcome hook; keep burn small |

---

*Corrections log (from adversarial fact-check): Klima = 2021 ADA finalist, not winner. Copilot Money = 2024 ADA finalist, not winner. Miles' bike multiplier was 5x (not 10x). EPA USEEIO sector counts vary by dataset version — pin the version when building the crosswalk. Google Fit APIs sunset end of 2026 (use Health Connect). expo-live-activity (Software Mansion) archived June 2026 (use @bacons/apple-targets).*
