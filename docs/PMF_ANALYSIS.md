# Veridian — Product-Market-Fit Analysis

*Run using two frameworks from [ProductMind Skills](https://github.com/ojiudezue/productmind-skills) (open-source, derived from* Building Rocketships *by Oji &amp; Ezinne Udezue): the **Sharp Problem Test** (Ch. 1) and the **Five-Dimension Target Customer** (Ch. 11). A third skill, **VMSOO-P strategy/North Star** (Ch. 7+14), was deliberately NOT run — see §3 for why, in the skill's own words.*

*Sources: `docs/NORTH_STAR.md`, `docs/DESIGN_RESEARCH.md`, `docs/PRD.md`. No claim below is invented — where evidence doesn't exist, that's stated as a gap, per both skills' explicit refusal rules against fabricating customer data.*

---

## 0. Skill-fit verdict — does this toolkit make sense for Veridian?

**Yes, with one important caveat: most of the catalog doesn't apply yet, and that's itself the finding.**

| Skill | Fit right now | Why |
|---|---|---|
| `sharp-problem-test` | **Use now** | Exactly the question Veridian hasn't answered with real evidence — run below (§1) |
| `five-dim-customer` | **Use now** | Same — run below (§2), comes back DRAFT, which is itself informative |
| `customer-discovery-week` | **Use now — the actual next action** | Both above tests are data-starved; this is the fix |
| `vet-a-feature` | **Use for the next feature decision** | Already informally what I did for Snap-a-Plate last session; worth formally re-running through this skill before writing any code for it |
| `aha-mapper` | **Worth running soon** | Veridian has never formally named its "aha moment" (first successful silent autopilot confirm? first Passport share?) — Ch. 4's framework would sharpen this |
| `vmsoop-strategy` | **Correctly not applicable yet** | Its own refusal rule: "pre-PMF, refuse to design a mature North Star." Applying it now would optimize for the wrong thing |
| `growth-lever-picker`, `roadmap-from-strategy`, `pricing-tier-math`, `reverse-freemium-design` | **Not yet** | All presuppose a validated problem/customer and (for the last two) a monetization decision that's explicitly still open (`NORTH_STAR.md` §9/§11) |
| `customer-id-architect` | **Low priority, quick check** | Audits primary-key design (refuses email-as-PK); Veridian already uses Supabase UUIDs, so this is likely a fast PASS, not urgent |
| `vibememo`, `auto-kanban` | **Genuinely useful for how you work solo** | Decision-trail capture and capture-first kanban — separate from PMF, but a good fit for a solo builder; not evaluated further here |

The honest headline: **this toolkit's own logic says Veridian is earlier-stage than the amount of engineering work already invested suggests.** That's not a criticism of the build quality — it's a real, useful signal about sequencing.

---

## 1. Sharp Problem Test (Ch. 1)

### Sharpness Verdict: **NEEDS MORE EVIDENCE**

### Question 1 — Alternatives
There are two different problems bundled together here, and they have different answers:

- **"What's my carbon footprint?"** (a one-time number) — alternatives are trivial. Klima's own onboarding quiz, and a dozen competitors' free calculators, already answer this in two minutes at zero cost. **Not sharp** as a standalone product.
- **"Keep my footprint accurately tracked without me doing the work"** (ongoing) — alternatives are weak: manual-logging apps (documented high dropout — this is the exact failure mode `NORTH_STAR.md` cites Miles/Greenly for), or nothing at all. This is the sharper of the two, and it's the one Veridian is actually built around post-pivot.

### Question 2 — Prevalence
- **Market size:** broad in theory (anyone with a footprint), narrow in practice for the *paying* segment — `DESIGN_RESEARCH.md`'s central finding is that "climate-motivated" and "pays-for-subscriptions" are two different, barely-overlapping populations. The addressable market is the intersection, not the union.
- **Problem growth:** growing awareness (Gen Z ~71% "extremely worried," per the cited research) but concentrated in the segment least able/willing to pay a recurring fee.
- **Niche-ness:** this framework's "role" language is built for B2B; adapted to a consumer app, it's genuinely broad-based, not role-specific.
- **Frequency:** here's a real tension the framework surfaces that's worth naming plainly — sharp-problem heuristics generally reward *high* problem frequency. Veridian's entire thesis is to make the user-*experienced* frequency as close to zero as possible (autopilot, one-tap confirm). The underlying emission events are high-frequency (every meal, every trip, every purchase); the felt problem for the user is closer to a *preference* ("I want this handled quietly") than an acute, high-frequency pain the way Calendly's scheduling-friction was. That's not disqualifying, but it's a softer sharpness profile than the framework's worked examples assume.

### Question 3 — Value / willingness to pay
Evidence for willingness to pay exists **only in adjacent categories**, not for carbon specifically: Copilot Money ($13/mo, 1M+ downloads), Flighty ($49/yr), Whoop ($199-359/yr) all prove people pay for "quiet autopilot" tools. Evidence *against* carbon-specific willingness to pay is direct and negative: Miles ($20M raised, 9 years of working tech, shut down May 2025, users earned $1-5/yr), Greenly (100k users, pivoted away from consumers within 8 months), Klima (documented price resistance in its own App Store reviews). **This is the single biggest open question in the whole analysis, and it's the same one `NORTH_STAR.md` already names as unresolved (§9/§11, "the hard outcome hook") — the framework and the team's own prior research converge on the identical gap, which is a good cross-check that the diagnosis is real, not an artifact of running a new framework.**

### Improvement bar check (≥3x)
Not provable without usage data. No retention numbers, no activation numbers, no A/B evidence exist yet — Veridian is pre-launch.

### Recommendation
Don't treat "the problem is sharp" as settled. Validate the *specific* claim — "current Copilot Money / Whoop / Oura subscribers would value carbon tracking bolted onto a tool they already trust, enough to pay for it" — with real interviews before investing further build effort, especially before Snap-a-Plate (a real engineering project, not a quick fix).

### Analogous case from the book
Calendly's own feature discipline is the relevant parallel: they refused to ship "email your link from the app" (trivial workaround existed) and only built it because it unlocked a genuinely sharp adjacent feature (automatic reminders). Veridian's manual-logging screen is the same shape of "not sharp on its own" — which is exactly why the product's whole strategy is to make it disappear behind autopilot, not polish it. That reasoning is sound; the autopilot's *value*, not the manual screen's, is the untested claim.

---

## 2. Five-Dimension Target Customer (Ch. 11) — "The Quiet Optimizer"

### 5-dimension verdict: **DRAFT** (not COMPLETE)

### Role
Not a B2B role — this framework needs consumer adaptation. Adapted: individual consumer, senior IC or manager (engineer/PM/physician/attorney/consultant), 30-45, household income $100K-250K+.

### Persona
Motivated by mastery over personal data and the aesthetic pleasure of a well-crafted tool — not by "saving the planet" (a secondary value). Already pays for at least one adjacent "quiet autopilot" app (Copilot Money/YNAB + Whoop/Oura/Strava) — this is the single strongest behavioral signal in the whole research base. Anti-persona: the "Offset Absolver" (wants to buy a clean conscience via offsets), the performative activist (wants public leaderboards), the bank-link refusenik.

### Objectives
**Gap, honestly flagged.** No real customer interviews exist yet to source this-quarter/this-year objectives in the customer's own words. Per the skill's refusal mode, I'm not inventing plausible-sounding goals here.

### Sharp Problems
**Gap, honestly flagged.** The persona's problems are currently *inferred* from adjacent-app research (what Copilot/Whoop users are documented to value) and a small amount of informal phone-testing feedback (which drove real fixes this session — the NAICS-code confusion, the chip bug, the missing carbon-literacy copy). Neither is the same as a named problem in the target customer's own words, with frequency and intensity, from an actual discovery interview. This is the framework's real bar, and Veridian hasn't cleared it yet.

### JTBD + Workflow
- **JTBD:** "Know my carbon footprint is being tracked accurately without having to think about it — the way Copilot already handles my spending."
- **Target workflow:** passive multi-signal capture (motion/bank/receipts) + a once-a-day confirm-queue review.
- **Preceding workflow:** opening the banking or fitness app they already use and trust (this is the on-ramp Veridian is riding, not creating).
- **Succeeding workflow:** Weekly Recap / Carbon Passport — reflection and sharing, not further logging.

### Coverage gaps
Objectives and Sharp Problems are the two dimensions genuinely missing real customer evidence. Everything else is well-sourced.

### Recommendation
Route straight to `customer-discovery-week` (§4 below) rather than treating this dossier as ready to build further roadmap decisions on. The gap isn't a knowledge problem — it's an interviews problem, and it's a fast one to close.

### Analogous case
The book's own Calendly example shows what COMPLETE looks like: named sharp problems in the rep's own words ("I lose 2-3 deals a month to scheduling friction"), with frequency and intensity attached. Veridian doesn't have this yet for any persona.

---

## 3. Why VMSOO-P / North Star was deliberately skipped

The skill's own text: *"If the user is pre-PMF, refuse to design a mature North Star... pre-PMF, the only valid metric is 'is this problem sharp' and 'are we learning faster.'"* Veridian is pre-launch with zero real users — running this now would produce a plausible-looking metrics hierarchy with no evidence underneath it, which is precisely the anti-pattern the skill exists to catch. Worth noting for calibration: `docs/NORTH_STAR.md`'s own name could misleadingly suggest a mature North Star already exists — on inspection it doesn't lock in a formal metrics regime (its own PRD companion doc explicitly says so: "no replacement metrics framework has been formally written down yet"), so the project is already, correctly, not violating this rule in practice.

---

## 4. Overall verdict and recommended next step

**Verdict (adapting `vet-a-feature`'s vocabulary to the whole product): VALIDATE_FIRST.**

Not BUILD (the core customer-value claim is unproven with real evidence), not SCRAP (the adjacent-category evidence for the underlying mechanic — autopilot confirm loops — is genuinely strong, just not yet proven for carbon specifically), not PARK (there's a fast, cheap way to get the missing evidence).

**Concrete next step — a real Customer Discovery Week (Ch. 1's 3-step process), sequenced deliberately:**

1. **5-10 motivation interviews**, targeting people who already pay for Copilot Money, YNAB, Whoop, or Oura (the identified beachhead, not a cold audience) — ask what they'd want from carbon tracking bolted onto a tool they already trust, and whether they'd pay for it.
2. **5-10 workflow interviews** — walk through how they currently think about (or ignore) their footprint, and where a confirm-loop would fit into their existing daily app-opening habits.
3. **A short survey (20-80 responses)** to quantify frequency/intensity/willingness-to-pay from the same beachhead population.

This single week of real work would convert both DRAFT items in §2 to COMPLETE, and directly answer §1's one unresolved axis (carbon-specific willingness to pay) with real evidence instead of adjacent-category inference. It's also far cheaper than the alternative of building Snap-a-Plate or resolving the hard-outcome-hook decision on inferred data alone.

---

## 5. What NOT to do next, per this analysis

- Don't run `vmsoop-strategy` or write a formal North Star/OKR set yet — premature per the skill's own rule.
- Don't build Snap-a-Plate (`docs/SNAP_A_PLATE_SPEC.md`) before at least the motivation-interview pass above — it's a real engineering investment riding on the same unproven willingness-to-pay assumption.
- Don't lock the "hard outcome hook" decision (`NORTH_STAR.md` §9/§11) without discovery evidence — it's the single most consequential open question across every document written this project, and it should be informed by real interviews, not inferred from adjacent-category data alone.
