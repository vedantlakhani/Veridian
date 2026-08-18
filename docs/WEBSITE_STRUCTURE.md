# Veridian — Website Content Outline

*Status: draft copy for review. This is a content plan, not a build — no HTML, no visual design decisions are made here. Every claim below is sourced from the actual repo: `docs/NORTH_STAR.md`, `docs/DESIGN_RESEARCH.md`, `docs/DESIGN_DIRECTION.md`, the root `VERIDIAN_PRD.md`, and `git log`. Sources are noted inline in brackets so you can verify anything before it goes live. Ten sections, in the required order, plus a Build Notes section at the end for whoever implements this.*

---

## Summary

Veridian is a carbon-tracking app I've been building since mid-March 2026 — about five months now. It started as a fairly conventional idea: a Klima-style app where you log your commute and your diet, watch a ring fill up, and earn streaks and badges for consistency. That app got built. All of it — onboarding calculator, dashboard, manual logging, achievements, challenges, leaderboards, AI-generated weekly insights — shipped and worked.

Then I did the thing most people building a portfolio project skip: I kept researching after the thing was "done," and the research kept telling me the original idea had a hole in it. Two rounds of that research, four months apart, each forced a real reversal — not a tweak, a reversal — in what I was building. The product today is a different thesis than the one I started with: not a logger you feed, but an autopilot that writes your carbon story from signals your phone and bank already have, with you as an editor who taps to confirm rather than a clerk who types entries.

This page is the honest version of that five months — what I believed at first, what the evidence changed my mind about, and what's still genuinely unresolved.

---

## Problem

Every consumer carbon app has the same three failures, and I built into all three before I saw them clearly [`VERIDIAN_PRD.md` §3]:

1. **It's a one-time experience.** You answer eight onboarding questions, get a number, and there's no reason to open the app again tomorrow.
2. **The advice is generic.** "Eat less meat" means nothing to someone who's already mostly vegetarian. Nothing is ranked by actual impact for that specific person.
3. **Guilt is the primary emotion.** Every screen quietly tells you how bad you're doing instead of how much progress you're making.

I designed my way around all three in the first version — that was the whole PRD. What I hadn't yet confronted was a deeper structural problem underneath: **the manual log itself is the failure.** Nobody opens an app to type "drove 12 km." The apps that actually win in adjacent categories — Flighty for flights, Copilot Money for spending, Apple Watch for workouts — share one law: the user never enters data, they correct and enjoy data that already showed up [`NORTH_STAR.md` §1]. A carbon app that asks you to log manually is competing with your own forgetfulness every single day, and forgetfulness wins.

---

## Target User

I built the first version for a vague "environmentally conscious 25–40 year old in an urban market" [`VERIDIAN_PRD.md` §2]. Research this summer replaced that with three real, differentiated personas, plus a persona I deliberately do not build for [`DESIGN_RESEARCH.md`]:

**The Quiet Optimizer (primary).** 30–45, senior IC or manager — engineer, PM, physician, attorney. Household income $100K–250K+. Already pays for Copilot Money or YNAB, plus one of Whoop/Oura/Strava — the behavioral tell is that they already pay for at least one *quiet autopilot* app in an adjacent domain. They're motivated by mastery over their own data and the pleasure of a well-made tool, not by "saving the planet" — climate is a value the app happens to serve, not the reason they open it. They churn on a broken-trust moment (a miscategorized transaction, a wrong trip mode) far faster than on price, and they are actively repelled by leaf icons, saturated green, gamified badges, and copy that moralizes.

**The Systems Optimizer (secondary).** 28–50, engineer or tech-adjacent, often has an EV or home solar, runs a personal budgeting spreadsheet for fun. Motivated by optimization and by money, not virtue — this is the person the still-unbuilt "hard outcome" hook (see Risks) is actually for.

**The Committed Reducer (amplifier, not revenue base).** 22–35, climate-identity-forward, highest guilt fatigue, fastest to fact-check a number and hardest to win back after a trust violation. Valuable for word of mouth. Not who pays.

**The Offset Absolver (anti-persona).** Wants to pay for a clean conscience with minimal engagement — expects the app to declare them "carbon neutral" via purchased offsets. This is explicitly who I am *not* designing for, because it's also, not coincidentally, Klima's actual target user (see Insight).

---

## Competitors

I didn't do a casual "here are some other carbon apps" pass. I ran an actual graveyard audit, because the failure pattern across this category is consistent enough to be a law [`NORTH_STAR.md` §2, `DESIGN_RESEARCH.md` Part B]:

- **Miles** — nine years of genuinely good passive GPS/motion detection, $20M raised. Shut down May 2025. The average user earned $1–5 a year in rewards. The tech worked; the incentive didn't.
- **Greenly (consumer)** — bank-linked tracker, 20+ bank integrations, 100,000 users. Abandoned in about eight months. The founder, on record: it "was all free and hard to monetize... wasn't a scalable business." Same company now runs a $52M Series B B2B arm on the same tech, different buyer.
- **Aspiration** — climate fintech that claimed roughly 35 million trees planted against roughly 12 million actually planted. DOJ/CFTC investigation, bankruptcy, guilty plea. The cautionary tale for overclaiming impact.
- **Commons (Joro)** — $13.9M raised, ~30 employees, $3.7M revenue in 2023. 350,000 Instagram followers is not the same population as paying users.
- **Earth Hero** — free, volunteer-run, 120,000+ users, 4.9 stars across 392 reviews — the best engagement of any app in the category. Charges nothing.
- **Klima** — the app I originally benchmarked against. Live, $13–26/month scaled to footprint, and its own App Store reviews show price resistance from people who had *already downloaded a carbon app*. (Correction I made to my own earlier assumption: Klima was a 2021 Apple Design Award *finalist*, not a winner.)

Against that graveyard, the apps that actually convert paying subscribers in adjacent categories: **Copilot Money** ($13/mo, 1M+ downloads, ~71K stable weekly actives, Apple Editor's Choice), **Flighty** ($49/yr, roughly $500K/month revenue on a three-person team — their own 1,400-user survey ranked "good design" the #1 requested feature), **Whoop** ($199–359/yr), **Oura** (5.5M rings sold, only 2M paying subscribers), **Strava** (180M registered users, ~2% premium penetration — the sobering ceiling case), and **Gentler Streak** (5,000 to 50,000+ subscribers, $1M revenue / $400K profit in two years, a tiny team, 2024 ADA winner).

---

## Insight

The single finding that changed the project: **climate-motivated and pays-for-subscriptions are two different populations, and the overlap is a narrow intersection, not their union** [`DESIGN_RESEARCH.md` Part B].

Climate anxiety peaks in Gen Z — around 71% report being "extremely worried" — but that's also the demographic with the least spare income for a new recurring line item. Subscription payers in every adjacent category (Copilot, Flighty, Whoop) skew 25–45 with household income above $100K. And the "willingness to pay a sustainability premium" surveys everyone cites (77% of Gen Z, in most of them) measure a one-time markup on a purchase already happening — a completely different decision than adding a permanent $10/month line item competing with Netflix, Spotify, Whoop, and Copilot for the same wallet. The natural experiment is right there in the graveyard: the free, values-driven app (Earth Hero) has the best engagement of anything studied; the paid ones show price friction or stalled growth.

The second insight, from the same research pass, is what actually killed the dark "Understory" design (see Challenges & Trade-offs): **the aesthetic that attracts climate-identity users is the aesthetic that repels the users who'd actually pay.** Klima's saturated green and gamified badges are calibrated for the Committed Reducer — precisely the segment least likely to subscribe. The apps that already converted the Quiet Optimizer — Copilot, Flighty — are light, quiet, and precise, and sell craft, not conscience.

---

## Solution

Veridian's mechanic today is three signal layers feeding one confirm loop, instead of one manual form [`NORTH_STAR.md` §3–§6]:

- **Movement** — iOS's `CMMotionActivityManager` pulls up to seven days of walk/run/cycle/drive segments the phone's coprocessor already logged, at effectively zero battery cost and with no location permission needed. Android uses the Activity Recognition Transition API. Neither platform runs continuous GPS.
- **Money** — a linked bank account (Plaid), run through the EPA's free public USEEIO emission-factor dataset, so spend on groceries, fuel, and shopping shows up automatically, labeled honestly as an estimate.
- **Receipts** — a forwarding address and a share-sheet extension let a forwarded receipt upgrade a coarse spend-based estimate to line-item precision, parsed by Claude Haiku vision.

Every entry carries a source, a confidence score, and a status. High-confidence events commit silently; ambiguous ones queue into one batched daily review — "3 things to confirm, 10 seconds" — the exact mechanic Copilot Money uses for transactions, ported to carbon. Corrections train a per-user prior, so the app gets quieter every week instead of noisier.

Visually, the product ships under a direction I call **Clearing** — light, precise, low-chroma deep evergreen instead of eco-green, tabular figures on every number, a custom line-illustration set instead of emoji, and full-bleed photography reserved only for emotional moments (the Passport, the weekly Recap), never as everyday chrome [`DESIGN_DIRECTION.md`]. The growth artifact is a **Carbon Passport** — a monthly, automatically generated, shareable story of your footprint, modeled on Flighty's Digital Passport, which its founder cites as one of Flighty's top-three organic growth drivers.

---

## Distribution

I'll be direct about where this actually is: pre-launch, no public users, no App Store listing yet. What I do have is real — I've been running the app on my own phone and putting it in front of a small number of real people, watching them use it rather than asking them what they think they'd use.

That informal testing is what drove this week's UX pass, not a survey or a focus group. Watching someone squint at a shopping category header showing a raw six-digit code, or hesitate on a number with no sense of whether it was big or small, told me more in ten minutes than a questionnaire would have. That's the honest state of distribution right now: small, informal, and directly connected to what got fixed. TestFlight is the next real step, gated on an Apple Developer account decision I haven't made yet [`NORTH_STAR.md` §11].

---

## Adapting to User Feedback

This week's testing surfaced four concrete problems, and I want to show the actual fix for each rather than just claim I "iterate fast":

**Raw NAICS codes as section headers.** The Shopping category's emission factors are seeded from EPA sector data, which comes labeled with codes like `443142`. Nobody testing the app knew what that meant, so they skipped the section entirely. Fix: `lib/naicsGroups.ts`, a hand-built mapping of all 69 seeded NAICS codes across shopping, food, energy, and transport into 12 human-readable groups — "Home, Electronics & Hardware," "Groceries & Dining," and so on — verified against the seed migration for full coverage.

**Zero carbon literacy anywhere in the app.** The app would show "0.9 kg CO2e" with no sense of whether that's a lot. Fix: `lib/impactCopy.ts`, a small pure-function library that turns a raw number into one plain-language anchor — "About a 6 km drive," "14% below the global average" — wired into the log sheet and onboarding results. Tested in isolation (`__tests__/lib/impactCopy.test.ts`) so the phrasing logic never silently drifts.

**Shopping's confusing mental model.** Every other category logs a physical quantity — kilometers driven, kilograms of beef. Shopping is spend-based by necessity (that's how EPA sector factors work), but the UI didn't say so, so people tried to log "one shirt" and got confused by a dollar-amount prompt. Fix: reframed honestly — "How much did you spend?", currency-formatted quick-pick amounts, an explicit estimate disclaimer, and a "~" prefix matching the estimated-value convention already used elsewhere in the feed.

**Chips that wrapped, clipped, or truncated.** A cosmetic bug, but the kind that reads as unfinished to exactly the persona (the Quiet Optimizer) who churns on a broken-trust moment. Fixed at the component level in the shared `VChip`, not patched per-screen.

All four shipped the same day I found them, verified against the full test suite before commit (46/46 Jest suites, `tsc --noEmit` clean).

---

## Challenges & Trade-offs

**A real eight-week silence.** Between May 8, when I shipped a "premium UI overhaul" I was reasonably happy with, and July 2, when I came back and gutted the light-mode decision, there's a gap in the commit log with nothing in it. That's not a curated timeline — that's what actually happened. I don't think a gap like that is evidence against the project; it's evidence that I didn't force a decision I wasn't sure of just to keep a streak going, and that when I came back, I was honest enough with myself to redo work rather than defend it.

**Two full design-direction reversals, not tweaks.** In July I built out a complete dark visual direction — "Understory": dark surfaces, a moss-green accent, a literary serif for hero numbers — all the way through a portfolio screenshot set. Fifteen days later, a research pass (`DESIGN_RESEARCH.md`) told me plainly that the aesthetic I'd just finished was calibrated for the persona least likely to ever subscribe, and that the actual reference product should have been Copilot Money, not Klima, from the start. I wrote that finding down (`DESIGN_DIRECTION.md`) and reversed the whole direction — light "Clearing," no serif, no saturated green — rather than defending four weeks of finished work. That reversal is the same instinct, at a different scale, as the eight-week gap: evidence I can act on data against my own sunk cost, which is a harder skill than shipping fast in one direction.

**Debugging sagas, not clean builds.** The AI insight layer took eight consecutive commits in a single day (March 22) chasing an "Invalid JWT" error through a Supabase Edge Function auth path — decoding the JWT locally instead of a network round-trip, fixing base64url decoding, fixing a header-override bug, before it actually held. Separately, this week's rebuild found that the app's card component had a systemic accent-rail pattern rendering as a positioned `View` rather than a border property — invisible to both lint and a plain grep for the property name, because it wasn't using the property at all. Neither of these is a flattering story in isolation. Together they're the more accurate picture of what building this actually looked like versus a highlight reel.

---

## Risks

The one I'm not going to soften: **the "hard outcome" monetization hook is still an open question** [`NORTH_STAR.md` §9, §11]. The current plan is a flat subscription for the intelligence layer — the autopilot itself, priced like Copilot Money — and never an offset transaction cut, because offset credibility is actively collapsing (2024 research puts 87%+ of many offset types at high risk of not delivering real reductions) and I don't want the business model resting on that. But subscription-for-awareness alone has a real precedent for failing: Miles ran flawless passive tracking for nine years and still shut down, because soft point rewards have a ceiling. Root, the profitable comparison case, shows passive tracking endures only when it's tied to a hard outcome the user already values — money saved, time saved, an insurance or utility incentive. I have candidates (the swap-engine savings math already exists; insurance and utility partnerships are unexplored) but no decision yet, and the Systems Optimizer persona specifically churns without one.

Smaller, more mitigated risks worth naming honestly: bank-link hesitancy (mitigated — sensors-only is a complete experience on its own, money is an upgrade not a gate); spend-estimate accuracy disappointment, a documented churn cause in this category (mitigated by explicit uncertainty labeling and receipts visibly upgrading estimates); and Plaid's sales-gated onboarding process, which needs a human conversation I haven't started yet.

---

## Build Notes

*Not for the website itself — for whoever builds it.*

- This document is content only. No HTML, no component code, no visual design decisions are made here — that's intentional, so the content can be reviewed and approved on its own before any building starts.
- Recommend building the actual site in a tool like **Replit Design** (or a comparable AI-assisted design tool), seeded with two inputs: (1) real screenshots from `docs/screenshots/` — there's already a captured set including onboarding, home, insights, profile, passport, and calculator screens, plus a `portfolio` subfolder — and (2) `docs/DESIGN_REQUIREMENTS.md`, the consolidated design-system reference written alongside this document (full color tokens, type scale, motion spec, illustration inventory, and an explicit list of what the system rejects) — point the build tool at that file directly.
- Whatever screenshots get used should be the current (Clearing / light-mode) build, not the `docs/screenshots/` set as captured — that set was shot against the prior dark "Understory" direction and will visually contradict the copy above about the light-mode pivot. New screenshots from the current build are worth taking before this goes live.
- No emoji anywhere in the actual site, matching the product's own design rule.
