# Veridian: go-to-market direction

**Date:** 2026-10-03. **Covers:** the next six weeks (Mon 5 Oct to Sun 15 Nov 2026) and the decision that follows them.
**Basis:** the repo at HEAD `47396ec`, the 2026-10-03 status, guilt-free, market, AI and portfolio audits, and `docs/UAT_FINDINGS_2026-10-02.md`.
**Ground rules:** Veridian has zero real users. Every threshold below is a pre-registered **ASSUMPTION**: a decision rule locked before testers arrive, not a benchmark. Effort figures are estimates, each labelled with its source. Outside claims carry a link. Nothing here is a user quote.

---

## The verdict

**Is there a real need?** Partly. The wish to act on climate is real: 52% of US adults are Alarmed or Concerned and those groups are "most interested in learning about solutions" ([Yale, Fall 2025](https://climatecommunication.yale.edu/publications/global-warmings-six-americas-fall-2025/)), and 59% of 16 to 25 year olds are very or extremely worried ([Hickman et al. 2021](https://doaj.org/article/abfc090cee0744608acb782041a00910)). Paying to *see* a footprint is not: about 1% of Germans use carbon footprint apps ([eco.de](https://international.eco.de/presse/eco-survey-for-world-environment-day-only-14-6-per-cent-use-apps-to-live-more-eco-friendly/)), about 4% of NatWest app users opened a free built-in one ([FF News](https://ffnews.com/news/300000-natwest-users-have-now-accessed-their-carbon-footprint-with-cogo-integration)), and a paid calculator changed no behaviour while an offset plan did ([Gargano & Rossi 2025](https://faculty.marshall.usc.edu/Gerard-Hoberg/CETAFE/papers/paper6.pdf)). So Veridian is a product only if it changes what people do, and a business only if someone pays, either testers or an employer. Demand for a grocery-receipt version specifically is unproven, and receipt-to-carbon apps already exist (Evocco, 2021). **The decision:** for six weeks, build one loop and test it with real people. The loop is: photograph a grocery receipt, confirm the basket, pick one swap, and get credit when the next receipt shows the swap happened. It is built, gated on evals and a device QA pass, and put in front of 15 to 20 people, alongside 10 employer calls, 5 interviews with people who already pay for "quiet autopilot" apps, and a trip-detection field test on your own iPhone. **The next six weeks:** weeks 1 to 4 build and gate, the cohort starts on the first Monday after every pre-cohort gate passes (target Mon 2 Nov, latest Mon 16 Nov), on target the day-14 checkpoint lands Sun 15 Nov, and the decision is written on day-21 data (target Sun 22 Nov). Three results would mean "no": testers feel judged (M5), testers never get started (M1), or testers look but never act (M4).

### One screen

- **The bet:** a guilt-free grocery receipt loop where your next receipt counts the difference your swap made.
- **Dates:** reader extraction gate Fri 23 Oct. Thresholds locked Sun 25 Oct. Lever gate Fri 30 Oct. Device QA Thu 29 to Sat 31 Oct. Cohort target Mon 2 Nov. Day-14 checkpoint Sun 15 Nov. Decision Sun 22 Nov (target).
- **The rule that replaces the loop you are stuck in:** dates follow gates; gates never move. The cohort starts the first Monday after the gates pass.
- **Five things you do this Monday (5 Oct):**
  1. Enrol in the Apple Developer Program.
  2. Fund the Anthropic account, set a monthly cap, and check the function secret.
  3. Install and link the Supabase CLI and create a free staging project.
  4. Start the email fix: domain, DNS records and custom SMTP (section 7, week 1).
  5. Answer the currency question: where do you and your 8 to 10 likely receipt donors shop, and in what currency?
- **Three things you will not do in these six weeks:** add features mid-cohort (fixes only, plus any change that removes a guilt trigger); polish the website beyond truth fixes and evidence updates; switch to a different wedge before the decision.

---

## 1. The thesis and the guilt-free spine

### The thesis

**See your footprint, reduce it, and never feel shamed for what is already emitted.** Every message, flow and visual detail should leave people with a sense of positive agency. For these six weeks the thesis is applied to one place, the grocery basket, and tested with a kill metric (M5) that overrides every other result.

### Why no-guilt is the edge, stated accurately

1. **It keeps people looking.** People avoid information that makes them feel bad; investors check their portfolios less after bad market news ([Karlsson, Loewenstein & Seppi 2009](https://www.cmu.edu/tepper/faculty-and-research/assets/docs/ppaper-61264983153898-ostrich-effect-1.pdf); [Golman et al. 2017](https://www.cmu.edu/dietrich/sds/docs/loewenstein/InfoAvoidance.pdf)). In this product, a read-out that stings is a receipt the user stops photographing. M2 and M5 measure that.
2. **What the research actually says:**
   - Shame, which is about the self, leads to hiding and avoidance; guilt about a specific act tends toward repair ([Tangney, Stuewig & Mashek 2007](https://pmc.ncbi.nlm.nih.gov/articles/PMC3083636/)).
   - Fear appeals motivate on average, work better with an efficacy message, and the meta-analysis found no conditions where they backfired ([Tannenbaum et al. 2015](https://pubmed.ncbi.nlm.nih.gov/26501228/)).
   - Guilt about a specific act predicts pro-environmental action ([Shipley & van Riper 2022](https://carenavanriper.web.illinois.edu/wp-content/uploads/2023/12/Shipley-VR_2022-syst-rev.pdf); [Rees, Klug & Bamberg 2015](https://pub.uni-bielefeld.de/record/2759787)).
   - Threat changes behaviour only when people feel able to act ([Peters, Ruiter & Kok 2013](https://cris.maastrichtuniversity.nl/en/publications/threatening-communication-a-critical-re-analysis-and-a-revised-me)), and anticipated pride beat anticipated guilt ([Schneider et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5708744)).
3. **The product rule stays strict:** no guilt and no shame, always a doable next step, pride as the reward. Guilt can motivate in experiments. We choose no guilt anyway, because this product only works if people keep looking.
4. **One citation in the canon needs correcting, not the rule.** `docs/NORTH_STAR.md:30` and `docs/PRD.md:28` say fear/shame messaging "backfires into eco-paralysis" unless paired with a doable step, and attribute it to an "academic consensus" that cites AIGA and Atmos, which are journalism. Replace that support with the studies above. The efficacy-pairing rule in those lines is right and stays.
5. **Tone alone is not unique.** Earth Hero is free, action-focused and rated 4.9 stars ([App Store](https://apps.apple.com/app/id1458057746)). The edge is the combination: no guilt, grounded in your own receipt, and credit only when the next receipt shows the change.

### The spine: ten rules, applied to the basket

| Rule | What it means in the basket loop |
|---|---|
| **R1** The past is context, not a verdict | Neutral ink. Never the `#B0442F` over/danger/error colour (`lib/theme.ts:35,68,93`). No basket-over-basket trend chart in v1. |
| **R2** Every number travels with one doable step, or stays quiet | "Nothing to change here. A low-carbon basket." |
| **R3** Two ledgers, never netted | Baskets read and kg kept out of the air sit side by side. Never subtracted, never "net", never "neutral". |
| **R4** Credit only what a receipt shows | The credit rule below. Missing items never count. |
| **R5** Compare to yourself, never to strangers | No world averages, no Paris target in the basket loop. People below average drift up when compared ([Schultz et al. 2007](https://cbsm.com/articles/32578-the-constructive-destructive-and-reconstructive-power-of-social-norms)). |
| **R6** Recording costs nothing on screen | The biggest item is "your biggest lever", never "your top source". A scan never reveals a miss. |
| **R7** No chains that break, no rankings | No streaks, badges, leaderboards, or consecutive counts of any kind (`docs/NORTH_STAR.md:139`). |
| **R8** Praise the act, then offer, never push, the next lever | A swap that keeps showing up is celebrated, with an equal-weight "I'm happy with this for now". |
| **R9** Fresh starts at real landmarks | The next shop, never "tomorrow" in the middle of a day. |
| **R10** One voice everywhere, including the AI and every non-app touchpoint | The copy lint, the template render check, and the tester-facing text review. |

**Notification budget:** at most one opt-in shop-day reminder a week, nothing else, ever. It pauses itself after two reminders in a row with no scan. TestFlight's automatic new-build alerts are switched off for fixes-only builds.

**Copy lint (enforced in code, section 4, F23).** Banned in tester-facing strings: budget, streak, should, too much, offset, cancel out, net, carbon neutral, "neutral" as a claim, balance this week, earned, top source, "kg CO2e" inside a sentence (the existing voice rule at `lib/feedCopy.ts:14-15`), guilt, guilt-free, without judging, prove, proof, verify, light, lighter, heavy, cut, consumption, exclamation marks and em dashes. An explicit allowlist covers the pulse options "Neutral" and "Guilty".

### "Offset it in a very positive way": the honest resolution

**Your words:** people should "feel the need to offset this carbon in a very positive way."

**The canon says no to offsets as a product:** "Never an offset transaction cut... Reduction, not absolution" (`docs/NORTH_STAR.md:160`), and the Offset Absolver is the named anti-persona (`docs/DESIGN_RESEARCH.md:134-136`).

**The evidence cuts both ways.** Offset and contribution plans are what consumers have actually paid for, and in one causal study the offset plan reduced net emissions where the calculator did not (Gargano & Rossi 2025). But fewer than 16% of the credits studied were real reductions ([Probst et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11564741)), and the EU restricts offset-based neutrality claims from 27 Sep 2026 ([Directive 2024/825](https://transition-pathways.europa.eu/legislation/directive-eu-2024825-empowering-consumer-green-transition)).

**One word to change: "need".** "Feel the need to offset" can tip into obligation, which is guilt by another route. The design target is *want to*: people who want to do a bit more are given an easy way, and people who don't are never made to feel short.

**v1 resolution: a "kept out of the air" ledger.** You balance carbon out by doing things, not by buying anything.

| Rule | Detail |
|---|---|
| **Counts only** | A swap the user chose, and a later receipt that shows the alternative, and a one-tap confirm ("Did it stand in for some {source}?"). |
| **Formula** | Credited kg = source factor x source quantity replaced, minus alternative factor x alternative quantity, never below zero. Source quantity replaced = alternative quantity x a replacement ratio (an ASSUMPTION table owned by code), capped at the user's usual quantity. "Usual" needs the source item on at least 2 earlier receipts. |
| **Money line** | Only from actual prices on the two receipts, and only shown when the saving is positive and at least $0.50 (ASSUMPTION floor). Never "more spent", never a negative. The signed difference is still logged for analysis. |
| **Never counts** | A missing source item (it may have been bought elsewhere), anything unlogged, purchased credits, trees. This replaces the "kg never emitted" maths at `app/(tabs)/profile.tsx:155-162`, which counts anything unlogged as avoided. |
| **Display** | Beside basket totals, never subtracted from them. Hidden until the first credited swap. |
| **Copy** | "Kept out of the air". Never "offset", "neutral", "net" or "cancel out". If you want "balance" language, the only place it may appear is on the action ledger ("balanced out by your swaps"), never on anything you pay for. Default: "kept out of the air". |

**Evidence instead of a hunch.** From day 1, after a tester's first read-out, Home carries one card: **"Want to do a bit more?"** with [Pick another swap] (real) and [Chip in to a carbon removal project] (a fake door: "Not available yet. Would you want this? Yes / No"). The heading implies no debt, and the card is constant from day 1 so it never changes the treatment mid-cohort. Pre-registered rule: if contribute taps exceed swap taps **and** at least a third of active testers tap contribute, you explicitly revisit `NORTH_STAR.md` section 9. Option B would be a separate contribution area that is never netted, never claims "neutral" and takes no cut. Otherwise the ledger stays action-only. Contribute taps also get a confound note: the swap button competes with the read-out's own swap, so read it together with the exit-survey question "ways you'd like to do more".

### Belonging: deferred, on purpose

You named belonging as part of the experience. Every social surface in the app today is competitive (leaderboards, medals, challenges) and is cut under R7. The right replacement is cooperative and never ranked, for example "Veridian testers kept {x} kg out of the air together this week", built only from credited swaps and shown only when 5 or more testers contributed. **It is deferred until after the decision** because with 15 to 20 testers the 5-person rule would leave it empty most weeks and switch it on mid-cohort, which changes the treatment. The exit survey asks "Did Veridian make you feel part of something bigger?", and the cooperative design is ready for the next round.

---

## 2. Who it is for, and why they would use it

### Positioning (internal until the week-1 desk check is done)

> Snap your grocery receipt. Veridian shows what your basket carries and suggests one easy swap for your next shop. Your next receipt counts the difference for you: an honest estimate of the carbon your swaps keep out of the air.

This line does not go on the public page until the desk check confirms what is and is not new.

### Primary segment

Climate-concerned iPhone users who do most of their household's grocery shopping and want to do one thing that counts, without a lecture. This is closest to the "Committed Reducer" (`docs/DESIGN_RESEARCH.md:128-132`), and the docs are blunt about two things:
- "Valuable for word-of-mouth. Not the paying core." (`:132`). Accepted, because the payer question is tested elsewhere (employer calls, reservations, adjacent-payer interviews).
- "Highest skepticism toward numbers that look like greenwashing. Will fact-check estimates fastest and churn hardest on a trust violation." (`:131`). This is the most important line for Basket, because Basket uses price-to-weight and typical-pack estimates. It is why M3 (reader trust) is a kill metric, why every figure says "about", why weights are editable, and why kg accuracy is gated only where ground truth exists.

### Contrast group (up to 4 people, analysed separately)

Money-first shoppers who already pay for a budgeting or "quiet autopilot" app (Copilot Money, YNAB, Whoop, Oura). Recruited from the adjacent-payer interviews (section 6). They test whether money saved per swap is a real reason to stay or only an assertion.

### Not for

- The Offset Absolver.
- Calorie or nutrition tracking. Basket must not drift toward it (`docs/SNAP_A_PLATE_SPEC.md:450`).
- People who never get receipts.
- Android users, for now: TestFlight is iOS-only and the Kotlin module is unvalidated (`modules/veridian-motion/README.md:124`).

### Cohort country: US recommended, after a Monday check

- `receipt-parse` computes kg only for USD (`lib/receiptValidation.ts:52-55`, used at `supabase/functions/receipt-parse/index.ts:241`). The BLS average-price series used for price-to-weight are US data.
- **Monday check:** where do you and your 8 to 10 likely receipt donors shop, and in what currency? The plan relies on your own receipts and your network. If any answer is not USD, pick one before building the reader: (a) extend `isSupportedCurrency` and add a local price-to-weight source for that country, or (b) recruit the cohort only from US communities and keep non-USD receipts out of dogfooding and the eval set. Record the choice in `docs/DECISIONS.md`.
- The per-kg food factors are labelled "DEFRA 2025" (`supabase/seed.sql:11-45`) with unverified provenance. Fine for an internal eval, not for a public accuracy claim.

### Hypothesised job (ASSUMPTION A8, not from interviews)

When I'm putting the groceries away or writing the next list, I want to know which one change to my usual basket would matter most, so I can do something real about climate without overhauling how I eat or feeling bad about what I already bought. Tested in the 5 to 8 exit interviews ("Walk me through the last time you thought about changing what you buy").

### What people use today

- Generic "eat less meat" advice.
- Free one-off calculators, which `docs/PMF_ANALYSIS.md:36` calls "not sharp".
- Receipt-to-carbon apps already exist. **Evocco** (Dublin, founded 2017, UK and Ireland, iOS and Android) has users photograph a grocery receipt, estimates each item with Eaternity life-cycle data, and offered offsets through a tree-planting nonprofit ([CNN, 15 Mar 2021](https://amp.cnn.com/cnn/2021/03/15/tech/evocco-carbon-footprint-app-ireland-spc-intl); [earth.org, 22 Mar 2021](https://earth.org/evocco-the-startup-that-works-out-the-carbon-footprint-of-your-grocery-receipt/)). Its current status (alive or shut down) is **UNVERIFIED**; record it in the week-1 desk check.

**So "starts from your actual basket" is not new.** The bet is narrower: **credit only when the next receipt shows the swap**, plus no guilt. Whether anyone already does that verification loop is **UNVERIFIED** until the desk check.

### Context (not segment evidence)

None of these sources describes the exact segment (US iPhone household shoppers who would photograph receipts). There is **no direct evidence** that this segment will photograph receipts; A2 and M2 test it.

| Signal | What it supports | Source |
|---|---|---|
| 52% of US adults Alarmed or Concerned, most interested in solutions | A wish to act exists | [Yale Six Americas, Fall 2025](https://climatecommunication.yale.edu/publications/global-warmings-six-americas-fall-2025/) |
| 59% of 16 to 25 year olds very or extremely worried (global sample) | Emotional burden to relieve | [Hickman et al. 2021](https://doaj.org/article/abfc090cee0744608acb782041a00910) |
| 61% of UK consumers skipped sustainable actions because of cost | A **barrier** (UK data); supports the money-saved framing | [Deloitte UK 2024](https://www.deloitte.com/uk/en/about/press-room/cost-and-sustainability-fatigue-stifle-consumers-efforts-to-adopt-more-sustainable-lifestyles.html) |
| 26% paid EUR 2.50 for a calculator that did not change behaviour; a EUR 7 offset plan reduced net emissions (young, lower-income European fintech users) | Information alone is weak | [Gargano & Rossi 2025](https://faculty.marshall.usc.edu/Gerard-Hoberg/CETAFE/papers/paper6.pdf) |
| Diet is one of the few high-impact individual levers (studied as a fully plant-based diet, not partial swaps) | The lever matters | [Wynes & Nicholas 2017](https://konsument.at/system/files/2022-09/climate-mitigation-gap_env-res-letters_2017__0.pdf) |

### Assumption register

| # | Assumption | Tested by |
|---|---|---|
| A1 | Most shops produce a paper receipt or e-receipt | Weekly capture-gap question |
| A2 | Testers photograph one receipt per main shop for 3 weeks | M2 |
| A3 | A partial food swap feels doable, not like a diet being policed | M4, M5, the Annoyed follow-up |
| A4 | Testers own an iPhone | Screener |
| A5 | Testers shop in USD | Screener |
| A6 | Money saved is what keeps money-first testers | Contrast group (reported, not gated) |
| A7 | Whoever pays for this is not the shopper | Employer calls, reservations, adjacent-payer interviews |
| A8 | The hypothesised job above | Exit interviews |

### Where this plan departs from `docs/PMF_ANALYSIS.md`

Section 4 of that doc (`:98-111`) prescribes interviews with people who already pay for Copilot, YNAB, Whoop or Oura **before** building more, as "far cheaper than the alternative of building". This plan builds first and tests a different segment, because you asked for the product to work end to end and for one direction that ends the loop, and because a working loop also produces the portfolio evidence you need now. To keep the repo's own unresolved question (carbon-specific willingness to pay among adjacent-app payers) inside the window, the plan restores a scaled-down version: **5 motivation interviews with adjacent-app payers in weeks 2 to 4** (section 6). The full discovery week remains the fallback if every track fails.

---

## 3. How people actually use it

### The tester app, in one map

```
Install -> Onboarding (2 screens) -> Email sign-up -> Consent (one screen, before first scan)
        -> First capture: [Camera] [Photos]  or  "No receipt handy?" [Sample basket] [Remind me on my shop day]
        -> Reading -> Review card (only uncertain lines) -> Read-out -> Swap choice
Home (Basket): Scan button (always visible) | This week's swap | Ledger (hidden until first credit)
               | "Want to do a bit more?" card | Settings gear
Settings: shop-day reminder on/off | Don't suggest food swaps | What the founder can see
          | Privacy policy | Sign out | Delete account
Hidden in tester mode: tab bar, Today ring, Trends, You, Passport, Recap, manual log, calculator gate
```

Today the 3-tab bar (`app/(tabs)/_layout.tsx:108-126`) would point at near-empty screens once the cuts land, so the tester build hides it. Figures use neutral ink, never `#B0442F`.

All copy below is proposed, passes the lint in section 1, and uses placeholders. Code computes every figure. kg appears only as a chip ("about 2 kg"), never inside a sentence.

### Day 1: the first few minutes

| Step | What the user sees and does | Spine |
|---|---|---|
| 1. Onboarding, 2 screens | "See what your groceries carry." / "Pick one easy swap. Your next receipt counts the difference for you." Replaces the slides at `app/(onboarding)/index.tsx:60-75` (slide 1 still pitches manual logging, UAT #5; slide 2 promises a daily Claude step, UAT #6). The thesis is shown, not claimed: "no guilt" stays an internal rule and a case-study line, not first-run copy. | R2 |
| 2. Account | Email sign-up, with the stale-error bug fixed (`app/(auth)/signup.tsx:21,38-40`) and the error toast moved off the form (UAT #18). | Honest errors |
| 3. Consent, before the first scan | "Veridian sends this photo to Anthropic's Claude to read the items. Anthropic doesn't train on it, and Veridian keeps only the items it reads. You can delete them anytime in Settings." [Continue] [Not now]. A consent timestamp is stored, and the server refuses the image call until it exists. Required by [Guideline 5.1.2(i)](https://developer.apple.com/app-store/review/guidelines/#5.1.2), which asks apps to disclose sharing with third-party AI and get explicit permission. (`receipt-parse` has no storage write for the image; Anthropic's [vision docs](https://platform.claude.com/docs/en/build-with-claude/vision) state uploaded images are not used for training.) | Trust |
| 4a. First capture | "Snap your latest grocery receipt. A screenshot of an online order works too." [Camera] [Photos] | R6 |
| 4b. No receipt handy | [Show me a sample basket] shows a read-out labelled "Sample basket. Nothing here is saved." It is never stored and never counts. [Remind me on my shop day] asks for notification permission at that moment, not before. | R2 |
| 5. Reading | Items appear as they are read. A failure says "Couldn't read that one. Try again, or try a clearer photo." Never an empty screen. | Honest errors |
| 6. Review card | Only uncertain lines need a tap, each with the top-2 alternatives from seeded classes: "Beef mince, 1 pack? [Yes] [Pork mince] [Chicken mince] [Something else]". Quantity is asked only when it changes the lever, and in pack terms first. Non-food lines: "{n} household items, not counted yet." | User as editor ([Google PAIR](https://pair.withgoogle.com/chapter/People%20+%20AI%20Guidebook%20-%20Feedback%20+%20Control.pdf)) |
| 7. Read-out | Code picks one of three templates by the share of kg in high-carbon classes (below). Then one lever. | R1, R2, R5, R6 |
| 8. Swap choice | [I'll try it] [Something smaller] [Not now] [This was a one-off] [Never suggest this]. "I'll try it" asks once: "Which day do you usually shop?" (optional reminder). "This was a one-off" hides the lever without saving a preference. "Never suggest this" is stored as a visible preference the user can delete. | R8, user control |

**The three read-out templates (code picks; every opening line must be true):**

| Basket | Opening | Then |
|---|---|---|
| Mostly low-carbon | "Most of this basket was low-carbon: {classes}." | If no lever is worth suggesting: "Nothing to change here. A low-carbon basket." Otherwise the lever line. |
| Mixed | "{n} of {m} items were low-carbon. Your biggest lever this time: {item}." chip "about {x} kg" | The swap line. |
| Mostly high-carbon | "{n} items read. {low-carbon classes present} were the low-carbon part." If none are present, skip the opening. | "One easy swap would make a real dent: {alternative} in one meal." chip "about -{y} kg" |

**The lever line respects how little one receipt says** (the same bug UAT #11 found for Top Moves, fixed in `8f9605a` with an evidence floor at `lib/topMoves.ts:18-19`):
- Item seen on one receipt: "If {item} is a regular for you, {alternative} in one meal next shop would make a real dent." chip "about -{y} kg".
- Item seen on 2 or more receipts: "Try {alternative} in one meal next shop?" chip "about -{y} kg".

**Pulse (at most weekly, asked on the next app open, not on the read-out screen):** "How did your last basket read-out land?" Encouraged first, then Neutral / Judged / Guilty / Annoyed in random order. Annoyed opens one follow-up tap: "Mostly: taking the photo / the suggestion / something else".

### Day 2: nothing required

- The app is silent. No push, no empty-day message, no daily score.
- If the user opens it, Home shows **"This week's swap"** with [Add to my shopping list] (iOS share sheet; `Share.share` is already used at `app/(tabs)/profile.tsx:258-262`).
- A top-up receipt joins the same week.

### Week 1: the next main shop

- **Shop day (opt-in only):** "Shopping today? {alternative} is on your list if you want it." Tapping opens the swap and shopping-list hand-off, not the scan screen. This needs a notification handler and tap routing; none exist today (no `setNotificationHandler` or `addNotificationResponseReceivedListener` in `app/`, `hooks/`, `lib/` or `components/`).
- **After the scan:**

| What the receipt shows | What the user sees |
|---|---|
| The alternative appears | "{Alternative} on this receipt. Did it stand in for some {source}? [Yes] [Not really]". On Yes: "{Alternative} stood in for {source}." chip "-{x} kg". "Compared with your usual {source}" only once the source has appeared on 2 or more receipts. Money line only under the rule in section 1. |
| The alternative does not appear | **Nothing about the swap.** The read-out is a normal read-out. Home's "This week's swap" stays quietly in place; tapping it offers [Keep it] [Make it smaller] [Try another]. A miss is never announced, because a scan must never cost anything on screen. |

- **Weekly one-tap question:** "Any shops we didn't catch this week? None / One / A few. No problem either way." This measures A1 and guards against undercounting.
- **Duplicate check:** if the merchant, order date and total match an earlier receipt, "Looks like you already added this one." [It's a different shop] [Skip it].

### Week 4: the habit, and the next lever

- **Ledger (once at least one swap is credited):** "Kept out of the air" chip "-{x} kg", "from {n} swaps", and the money line when it qualifies. Shown beside "{k} baskets read", never netted. Before the first credit: "Your first swap will show up here.", with no basket count beside it.
- **A swap that keeps showing up is counted cumulatively and never resets:** "{Alternative} has been in {n} of your shops." [Add another swap] [I'm happy with this for now]. Choosing "happy" suppresses next-lever prompts for 2 shops. When a swap stops showing up, nothing is announced. This guards against single-action bias ([Weber 2006](https://elke-u-weber.com/media/2006_climaticchange_weber.pdf)) and moral licensing ([Blanken et al. 2015](https://journals.sagepub.com/doi/10.1177/0146167215572134)) without a treadmill.
- **No trend chart in v1.** "Up 20%" brings the verdict pattern back.

### Coming back after a gap

- No scan for 14 or more days: Home says "Welcome back. Snap your latest shop whenever you like. Your swap is still here, or pick a new one." Missed weeks are never counted or mentioned.
- The shop-day reminder auto-pauses after 2 reminders in a row with no scan, and Settings says so once: "Reminders paused. Turn them back on anytime."

### Opting out of food suggestions

Settings has "Don't suggest food swaps". It keeps receipt reading and the ledger and silences suggestions. Some people have a difficult relationship with food, and a swap app must not corner them.

---

## 4. What we launch with: KEEP / FIX / CUT

**Status source:** `docs/APP_STATUS.md`, the single source of truth for what works (52 features after merging duplicates: 7 work, 27 partial, 6 broken, 6 not wired, 6 unverified; Jest 47 suites, 446 tests passing at `47396ec`). Row numbers below ("row 41") refer to its section 2 matrix. Its launch blockers (section 1.3) assume an autopilot launch, where trips are the product. This plan launches the basket loop instead, so Appendix A maps every one of its 52 rows to what happens in the cohort, and maps its ten blockers to the fixes below.

**Rule:** anything not on the path photo, review, read-out, swap, credited swap is hidden in tester mode. Code is kept, not deleted, unless a row says otherwise.

### KEEP

| Item | Evidence |
|---|---|
| Email sign-in, session persistence, sign-out | `app/(auth)/login.tsx:21-29`, `stores/authStore.ts:68-89`; worked in UAT. Add `queryClient.clear()` on sign-out. |
| `receipt-parse` skeleton: auth, idempotency, currency gate, bounds checks, atomic claim RPC, cost logging | `supabase/functions/receipt-parse/index.ts` (cost logging `:199-205`) |
| Per-kg food factors | `supabase/seed.sql:11-45` (35 classes; units include litre, bottle, pint and 25 ml measure, not only kg) |
| Swap-maths pattern: partial swaps, evidence floor | `lib/topMoves.ts:18-19, :80-202`, tests passing |
| Voice rules | `lib/feedCopy.ts:11-16`, `lib/impactCopy.ts:11-19`, `lib/recap.ts:11-13` |
| Eval harness runner and logging | `eval/receipt-parse/run-harness.mjs`. Its grader is text-only and NAICS-based, so it must be extended (H1). `RUN_LOG.md` has only a header. |
| Image-picker dependency | `package.json:36` (installed, unused) |

### What the critical path actually reuses

An **untested** backend image branch (`receipt-parse/index.ts:116-126`, never called by any client, media type hard-coded at `:121`), the harness's runner and logging (its grader must be rewritten for food class, quantity and kg), and an installed but unused `expo-image-picker`. Everything else on the path is new work.

### FIX (must work end to end before any tester; function before polish)

**Sources:** "Audit" means the 2026-10-03 status audits. "Plan" means an estimate made for this plan, an **ASSUMPTION**.

| # | Fix | Evidence | Effort (source) |
|---|---|---|---|
| F1 | **Fund Anthropic, set a monthly spend cap, verify `ANTHROPIC_API_KEY` in function secrets** | Credit-blocked (`eval/receipt-parse/README.md:67`) | Founder, 10 min |
| F2 | **Email that reaches testers.** Buy a domain or confirm you own veridian.app (it is a parked page; ownership unverified). Add the SMTP provider's DNS records (SPF, DKIM). Configure custom SMTP in Supabase Auth. Rewrite the confirm and reset email templates in the house voice. Add `veridian://reset-password` to the live redirect allow-list. Until a real sign-up and a real reset reach an address outside the Supabase team, turn "Confirm email" off so sign-up works (reset stays broken until SMTP passes). | Without custom SMTP, Supabase Auth "will refuse to deliver messages to addresses that are not part of the project's team", capped at 2 messages an hour ([Supabase](https://supabase.com/docs/guides/auth/auth-smtp)). Local `supabase/config.toml:119` has confirmations off; the live setting is unknown. | Founder, half a day plus DNS wait (plan) |
| F3 | **Supabase CLI and staging.** Install, `supabase login`, `supabase link`, then `supabase migration list` to confirm remote history matches the 29 local migration files. Create a free staging project and apply each migration there first. Per-week deploy order: migrations, then functions, then app build. | CLI not installed; remote history drifted before (`.planning/STATE.md:109`, "migration repair ... remote DB had schema but no migration history"). F10, F11, F14, F16, F20 and F24 all need migrations. | Founder, half a day (plan) |
| F4 | **Durable iOS build, day 1 of week 1, before any prebuild.** A small config plugin for the Xcode 27 deployment-target fix (today it lives only in the gitignored `ios/Podfile:63-70` and "is lost on prebuild", `docs/UAT_FINDINGS_2026-10-02.md:48`). A committed `scripts/ios-device-release.sh` (xcodebuild with `-allowProvisioningUpdates`, install via devicectl). Document `simctl addmedia` for simulator photo tests. | The only documented Xcode 27 workaround is simulator-only (`UAT_FINDINGS:47`). Camera strings, the image-picker plugin and a new native module all trigger prebuild. | 0.5 to 1 day (plan) |
| F5 | **Release plumbing.** Fill `eas.json:32-34`. Set `ios.config.usesNonExemptEncryption=false`. Configure the `expo-image-picker` plugin with explicit camera and photos strings and `microphonePermission: false` (the generated `ios/Veridian/Info.plist:56-65` carries generic "Allow $(PRODUCT_NAME)..." strings and an unused microphone string). Reviewer note covering third-party AI consent and background location (below). Submit a first external build to Beta App Review as soon as enrolment clears, to an external group with no testers, so review timing is learned early. | Build-readiness audit | 3 to 5 days including founder steps (audit) |
| F6 | **Design frames, before build.** Low-fidelity frames of Scan, Consent, Reading, Review card, Read-out (3 templates), Home (empty, first credit, coming back) and Settings, using the existing `docs/DESIGN_DIRECTION.md` tokens, checked against R1-R10. | No screen list or navigation map existed | 0.5 to 1 day (plan) |
| F7 | **One switch, one binary.** Basket mode for every account. A per-user server flag (a `profiles` column) turns on trip detection and the old confirm queue for your account only. Bypass the forced calculator gate (`app/(tabs)/_layout.tsx:67-85`). Hide the tab bar. No per-row flag system (none exists today). | Avoids two binaries fighting over one bundle id | 1 to 1.5 days (plan) |
| F8 | **Notification cleanup.** Delete the daily reminder (`hooks/useNotifications.ts:14-33`) and the meal and momentum reminders (`:41-76`). Flag off the weekly recap scheduled on every foreground (`:185`). Remove the automatic permission request at sign-in (`:161-165`, mounted for every signed-in user at `app/_layout.tsx:26`); ask only when the user opts into the shop-day reminder. Delete the streak-milestone push and the achievements check from the create-entry success handler (`hooks/useEmissionEntries.ts:147-163`); it is ungated by preferences, and `streak_notifications` defaults to true (`supabase/migrations/20260315000010_create_notification_preferences.sql:6`). Remove the per-drive push (`hooks/useTrips.ts:434-437`) and retitle the walk and ride push (`:608-612`, "Great choice!" / "Nice walk!") to "Walk added" / "Ride added" with "{x} km on foot" and a saved chip. Add `setNotificationHandler` and tap routing. | Today the dormant reminders stay off only because nothing sets `daily_reminder_enabled=true` (`:173-179`). Setting it would re-enable them, and `scheduleDailyReminder` calls `cancelAllScheduledNotificationsAsync()` (`:21`), which would also wipe a shop-day reminder. | 0.5 day (audit: hours) |
| F9 | **Auth correctness.** Branch on the returned error, not the store snapshot (`app/(auth)/signup.tsx:38-40`, `forgot-password.tsx:28-30`). Keep reset-password reachable during a recovery session (`app/_layout.tsx:46-48`). Move the error toast so it never covers the form (UAT #18). | Audit | 0.5 to 1 day (audit: hours, three items) |
| F10 | **Per-user dedup.** Unique on `(user_id, content_hash)` and a user-scoped lookup. Also dedup on `(user_id, merchant, order_date, total)` with the "already added" prompt, because a second photo of the same receipt hashes differently (`index.ts:161`). Key M2 and swap checks to `receipts.order_date`, not scan time. | `content_hash TEXT UNIQUE` is global (`migrations/20260718000025_create_receipts.sql:19`) and the lookup at `index.ts:164-168` filters on hash only, so it can return **another user's receipt**. Privacy bug. | 0.5 day (plan) |
| F11 | **Events table** (Supabase, insert-own RLS, no vendor SDK) and the event list in section 6 | No analytics exists today | 0.5 to 1 day (plan) |
| F12 | **Scan entry.** Camera and library through `expo-image-picker`, the consent screen and server-side consent check, resize with `expo-image-manipulator` (not installed; add it in the same native rebuild as F4), media-type detection instead of the hard-coded JPEG. Single image or 2 to 3 overlapping crops, decided by the week-1 sizing test (section 5). | `useParseSharedReceipt` has zero callers (`hooks/useReceiptImport.ts:49-62`) | 1 to 2 days (audit) plus 0.5 to 1 day for consent and resize (plan) |
| F13 | **Reader v2.** The model returns a `foodClass` from a closed enum v1 and any printed quantity. Code resolves quantity in each factor's own unit and multiplies by the factor. Raise `max_tokens` from 1536 (`index.ts:195`) and treat a truncated response as a retryable failure. Factor sourcing, unit table, BLS price table and typical-pack table are part of this row (details in section 5). | Today grocery lines are either priced at 0.186 kg/$ (any line resolving to NAICS 445110, `migrations/20260718000023_seed_shopping_factors.sql:46`; kg at `index.ts:334`) or silently dropped when the substring resolver returns nothing. Running the resolver locally: "grocery", "meat" and "produce" map to 445110; "groceries", "dairy", "bakery" and "food" return nothing; "deli" maps to a courier code (`_shared/itemFactors.ts:65-100`). An exact enum lookup removes that bug class. | 2.5 to 4 days (plan) |
| F14 | **Review card and pending status.** Write items as `pending` (the status exists, `migrations/20260710000019_emission_entries_provenance.sql:9,13`) instead of the hard-coded `'auto_confirmed'` (`migrations/20260718000026_claim_receipt_item_entry_fn.sql:51`). Store predicted and chosen class on every verdict. "Add an item" must not reuse the slow log path. | Turns corrections into eval data | 1.5 to 2.5 days (plan) |
| F15 | **Read-out:** the three templates, the lever line rules, the swap choice buttons | Section 3 | 1 to 2 days (plan) |
| F16 | **Swap commitments, credit rule and lever function.** A `swap_commitments` table, swap rules that point only at enum v1 classes, the replacement-ratio table (ASSUMPTION), the credit rule, deletable preferences. Lever selection is a **pure function in `lib/`** imported by both the app and the harness, so lever correctness can be scored offline. | Top Moves matches only manual DEFRA subcategories (`lib/topMoves.ts:80-202`) and cannot be adopted (`components/ui/VTopMovesSection.tsx:21-23` just opens `/log`) | 3 to 5 days (audit: Top Moves adopt-and-credit) |
| F17 | **Basket Home** with first-run, empty-ledger, first-credit and coming-back states, the Scan button and the Settings gear | `app/(tabs)/index.tsx` is 1,517 lines; the old Today stays behind the per-user flag | 1 to 2 days (plan) |
| F18 | **Onboarding:** 2 screens, consent, the no-receipt path | `app/(onboarding)/index.tsx` (409 lines) | 1 to 2 days (audit) |
| F19 | **Pulse** (with the Annoyed follow-up), capture-gap question, the "Want to do a bit more?" card | Section 3 | 0.5 to 1 day (plan) |
| F20 | **Minimal Settings and delete account.** Delete account through an edge function with the service role. Add a migration so `audit_log.user_id` cascades or nulls (today it has no ON DELETE action, `supabase/migrations/20260315000012_create_audit_log.sql:8`, so any row blocks deletion). Delete the user's `avatars` storage objects (`20260322000015_storage_avatars_bucket.sql`) before deleting the auth user. Test end to end on a staging account. Copy: "Your data will be deleted. Thanks for trying Veridian." The reminder toggle must not touch `daily_reminder_enabled`. | Required by [Guideline 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/#5.1.1) | 1 to 2 days (audit) |
| F21 | **Privacy policy and App Privacy labels.** Rewritten and hosted. Says receipt images go to Anthropic for reading, what is kept, retention and deletion, and what the founder can see. | The listed URL returned 404 on 2026-10-03; the text dates from March (`docs/store-metadata.md:41`) | Founder, half a day |
| F22 | **Visible error states on the scan path** | Do not copy the hide-on-failure pattern at `components/ui/VAiInsightCard.tsx:82` | Hours (audit) |
| F23 | **Copy, lint and every tester-facing touchpoint.** The lint (section 1) runs over a Basket copy module (`lib/basketCopy.ts`), the new screens and an email-template copy file, with the pulse allowlist. Cut screens are out of its scope, so it passes on day one. A tester-facing text list, each item reviewed against R1-R10 before Sun 25 Oct: auth email templates (week 1, with F2); the screener and its rejection message (week 3); the TestFlight beta description and What to Test (week 3); a rewrite of `docs/store-metadata.md`, which still sells streaks and badges (`:26`, `:32`), before the App Store Connect record is created (week 3); fake-door text, the exit survey and the interview guide (week 3); delete-account copy. The website gets a narrower check (em dashes, exclamation marks, "carbon neutral", offset claims) plus the truth pass. | Guilt audit | 0.5 to 1 day (plan) |
| F24 | **Field-test hedge:** store `predicted_mode` before the confirm overwrites it (`hooks/useTrips.ts:870-873`) | The online agreement metric for the passive path | 2 to 3 hours (portfolio audit) |
| F25 | **Endpoint hygiene.** Delete `analyze-emissions` (deployed, no caller). Undeploy or gate `generate-suggestions` (its prompt asks the model to invent a CO2e saving, `supabase/functions/generate-suggestions/index.ts:31-36`). | Once the key is funded, any deployed endpoint can spend credit for any signed-in user | Hours (audit) |
| H1 | **Harness v2.** Image inputs; food class and quantity grading; order-insensitive line matching; lever correctness through the shared `lib/` function; kg scored only on lines with known weight; a PII-leak check; latency capture; a `--cases` flag that loads private cases from a gitignored `eval/receipt-parse/private/`. Run it on 5 of your receipts before freezing the set. | `run-harness.mjs:121-122` builds text messages only and grades through the NAICS resolver | 1.5 to 2.5 days (plan) |
| E1 | **Eval authoring:** assemble golden-v2-food, write the swap and lapse sequences as Jest tests over the pure functions | Section 5 | 1 to 2 days of build, plus founder labelling hours (plan) |
| Q1 | **Pre-cohort device QA** (Thu 29 to Sat 31 Oct), component tests for the credit rule and review-card states, and a 15-minute smoke script for every Thursday build | No screen behaviour is tested today | 1.5 to 2 days (plan) |
| | **AI-0 baseline run and truth pass** | Section 5, section 7 | 1 to 1.5 days (portfolio audit) |

**Honest total:** about **27 to 45 working days** of build (estimates; the width of that range is itself the main schedule risk), against about 20 working days between Mon 5 Oct and Fri 30 Oct. Your own history cuts both ways: three sprints shipped between 10 and 12 July (`docs/PRD.md:99-101`), which suggests these estimates may be pessimistic, and the 23 UAT findings show that fast builds need a QA pass. Hence the schedule rule in section 7: **the cohort starts on the first Monday after every gate passes**, with a velocity check on Sun 18 Oct.

**Already cut from the baseline (decided now, not on the gate day):**
- The "skip the photo" fake door on the scan screen. Its question moves to the exit survey.
- The no-guilt labelled set (AI-3b) and the narrator with its judge (AI-4): offline, during or after the cohort, only if hours allow.
- The belonging line (section 1).
- The full onboarding permission-priming flow (trips are off for testers).

### Background location in the tester binary

`app.json` is static (no `app.config.js`), so the tester build still declares `UIBackgroundModes: location` and the Always-location strings even with trips switched off. Hiding the feature does not avoid review questions about it. **Default:** keep one binary, include a reviewer note ("Background location is used only by an opt-in trip-detection feature that is switched off for beta testers and enabled per account"), and never request location in Basket mode. **Fallback if Beta App Review objects:** move to `app.config.js` with a tester profile that removes background location; your trip build then gets its own profile and signing.

### CUT for the cohort (hidden in tester mode)

| Cut | Status (audit) | Why |
|---|---|---|
| Trip detection, location and motion permissions, confirm queue, trip pushes | Unverified, needs a physical device | Kept for **your account only** through the per-user flag (the field test). |
| Plaid | Unverified; syncs once and never again (`supabase/functions/plaid-link-token/index.ts:33-39`) | Production access and per-connection pricing |
| Amazon/DoorDash CSV import | Unverified | High effort, late payoff |
| Today ring, the 22 kg "budget" (`types/emission.ts:89-90`), over-budget colour, week strip | Partial; the main guilt mechanics in the guilt audit | Home is rebuilt as Basket. Any future self-comparison uses the user's own early weeks, never a global constant. |
| Trends, records, streak, momentum | Streak broken (`hooks/useStreak.ts:32-48`) | Off-wedge; streaks are off-thesis |
| Achievements, challenges, leaderboard | `current_kg` never written | Competitive and shows wrong numbers |
| Grove and "kg never emitted" | Broken maths (`app/(tabs)/profile.tsx:155-162`) | Replaced by the receipt-credited ledger |
| Passport, Weekly Recap | Partial | The read-out is the recap in v1 |
| AI insight card | Broken | Replaced by the read-out |
| Manual log modal, quick slots | Partial | Survives only as "Add an item" on the review card |
| Forced calculator gate | Partial | Bypassed by F7, or new testers get pinned in an 8-question wall |
| Google and Apple sign-in | Not wired | Email only also avoids [Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/#4.8) |
| Snap-a-Plate, Android | Spec only; unvalidated | The natural next expansion if Basket works |

(Widgets were listed in an earlier draft. None exist in the code; they appear only as a business-model idea at `docs/NORTH_STAR.md:158`, so there is nothing to cut.)

### Pre-cohort device QA gate (Thu 29 to Sat 31 Oct)

Install the TestFlight build on your iPhone and 2 non-cohort devices. Run a written script: fresh install; email sign-up to a real inbox; onboarding; consent; camera capture of 3 paper receipts (long, crumpled, faded); 1 e-receipt screenshot; 1 library photo; review card; read-out; "I'll try it"; the shop-day reminder fires and its tap opens the swap hand-off; a second receipt credits the swap; pulse on the next open; reset password; delete account. Log results in `docs/UAT_FINDINGS_2026-10-31.md` in the same format as the 10-02 file. **Gate: zero High findings open.** A camera or sign-up bug in the first 72 hours would trip M1's kill rule for a defect, not a need failure, and corrupt the decision.

---

## 5. AI and agentic plan, with evals

**Principle: code computes every number, the model reads and phrases, the user decides anything uncertain.** This is a workflow, not an agent, following [Anthropic's guidance](https://www.anthropic.com/research/building-effective-agents) to add agentic complexity only when it demonstrably helps. No model produces a kg figure the user sees; today's `generate-suggestions` prompt does exactly that (`index.ts:31-36`) and is retired by F25.

### AI-0: the first eval run, this week (under $1 estimated)

1. **Smoke-test the funded key** without printing it, then confirm the in-app function returns 200.
2. **Logging-only harness patch:** per-case outputs to `runs/<ISO>-<label>.jsonl` and an explicit fabrication flag. Grading does not change, so the frozen `golden-v1.jsonl` (40 cases) stays valid.
3. **Run golden-v1 three times** to measure the noise band. The AI audit estimates about $0.04 to $0.08 per run.
4. **Error analysis**, bucketing each failure as extraction, item split, category reasoning, resolver mapping, fabrication or invalid JSON.
5. **Image sizing test:** run Haiku on your 3 longest real receipts at 1568 px and read the output. Haiku 4.5 is in the standard vision tier: images are downscaled to at most 1568 px on the long edge and 1568 visual tokens ([Anthropic vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)). My arithmetic from those limits: a 4:1 receipt ends up roughly 390 px wide, which may make thermal print unreadable. The result decides single image vs 2 to 3 overlapping crops (F12). Latency is reported, not gated, until that choice is made.
6. Log rows in `RUN_LOG.md` and write up the finding below.

**The finding to write up comes from reading the code, not from an eval result.** It is true today:
- Grocery lines are either priced at 0.186 kg/$ (`seed_shopping_factors.sql:46`) or silently dropped when the resolver returns nothing (F13 row).
- Convenience and liquor stores share the same 0.186 rate (`:47-48`), so the resolver bug that maps "convenience" to grocery changes zero kg.
- The harness's headline confusion pair is grocery 0.186 vs limited-service restaurant 0.255 (`:98`), about a 1.4x gap.
- Beef at 27.0 and dry lentils at 0.90 kg per kg (`seed.sql:11, :40`) differ 30x per kilogram. Per dollar the gap is smaller, roughly an order of magnitude at typical US prices (ASSUMPTION pending a check against BLS average prices). A per-dollar pipeline blurs it entirely.
- Other harness limits: both-null categories count as a pass, and the confusion gate rests on 7 tuning cases, so one flipped case moves it about 14 points.

### AI-1: Reader v2 (Haiku 4.5 vision). The core AI, gated before any tester sees it.

**Enum v1 (published before golden-v2 is frozen):**
- The 35 seeded food classes (`seed.sql:11-45`).
- `other_food`: anything edible without a per-kg factor (ready meals, cereal, sauces, soft drinks, plant-based meat, plant milk), priced at the existing grocery spend rate, 0.186 kg/$, and labelled as a spend estimate.
- `non_food`: shown as "household items, not counted yet".
- New classes (for example plant milk or plant-based mince) are added only with a cited per-kg source and a provenance flag, **through a migration**, because `seed.sql` is not applied by `supabase db push`. Default for v1: no additions.

**Units:** the seeded factors are not all per kg. Milk and oil are per litre (`seed.sql:21, :44`), wine per 750 ml bottle (`:36`), beer per pint (`:37`), spirits per 25 ml measure (`:38`). Code resolves quantity in each factor's own unit through a small conversion table (for example a 12 oz can is 355 ml). Where it can't, the line falls back to `other_food`. Drinks are excluded from swap suggestions in v1.

**Swap table v1 (seeded classes only; replacement ratios are ASSUMPTIONS):**
- beef to chicken (27.0 to 5.54; the same direction as the existing rule at `lib/topMoves.ts:88-92`)
- beef to beans or lentils in one meal (27.0 to 0.82 / 0.90)
- lamb to chicken (24.5 to 5.54)
- prawns to fish (11.9 to 2.90)

**Quantity resolution order:** (1) quantity printed on the receipt; (2) line price divided by the US average retail price where a [BLS average-price series](https://www.bls.gov/cpi/factsheets/average-prices.htm) exists, built only for swap-relevant and high-factor classes; (3) a typical-pack table shown on screen as an assumption ("about 1 pack (500 g), tap to change"). Low confidence, or a quantity from step 3 that changes the lever, routes the line to the review card.

**`golden-v2-food` (about 75 cases; frozen only after H1 has scored it once):**

| Slice | Cases |
|---|---|
| Real photographed grocery receipts (yours plus the receipt drive; consented, redacted, kept in the gitignored private directory, never in the public repo) | 30 |
| E-receipt and online-order screenshots | 10 |
| Synthetic hard cases (abbreviations, weighed produce, multi-buys, coupons) | 10 |
| High-stakes and must-not-confuse pairs: beef vs pork vs chicken mince, lamb vs beef, prawns vs fish, plant-based meat that must not become beef, oat or soy milk that must not become dairy milk | 10 |
| Adversarial (non-receipts, restaurant bill, injected instructions) | 8 |
| Privacy leakage (card last-4, loyalty IDs, addresses; none may appear in stored output or any aggregate) | 6 |
| Held out, drawn across slices | about 8 |

**Ground truth for kg is collected honestly.** Most receipts print no weight, and you cannot know donors' pack sizes, so "true" weights from the same price-to-weight rules would make the check circular. Ask donors to write the pack size next to each food line or photograph the product. Score kg error only on lines with a printed weight or a donor-supplied size. For every other line, grade extraction and class, holding the quantity rule fixed, so the gate isolates model error. Labelling time is re-estimated after you count lines on the first 5 receipts (placeholder ASSUMPTION: 8 to 15 hours).

**Two gates, a week apart (ASSUMPTIONS, recorded in `docs/DECISIONS.md` before run 1):**

| Gate | Date | Metric | Bar |
|---|---|---|---|
| Extraction | Fri 23 Oct | Fabrication | 0 (blocking) |
| | | PII leakage | 0 (blocking) |
| | | JSON-valid | 100% |
| | | Line recall and precision | 95% or more |
| | | `foodClass` top-1 | 90% or more |
| | | High-stakes and must-not-confuse classes | 95% or more |
| | | Mean cost per receipt | $0.01 or less |
| Lever | Fri 30 Oct | **Lever correctness:** same lever picked from the predicted basket as from the truth basket, using the shared `lib/` function | 90% or more of receipts. **The decision metric.** |
| | | kg on known-weight lines | within 25% on 80% or more of those lines |
| | | Every Basket template rendered over about 30 fact sheets (10 high-carbon, 5 sparse, a credited swap, the empty ledger), run through the lint and read by you | Zero lint flags, zero lines you would not want to receive |

Each gate passes only on two consecutive runs. The extraction gate lands a week before the lever gate, so an extraction problem surfaces with time for a fix and a rerun. **No LLM judge here:** every field is exact, within a tolerance, or an enum, as `eval/receipt-parse/README.md:40` already argues. **Online metric:** the review-card verdict mix per prompt version (M3). Every correction becomes a candidate case for golden-v3.

### AI-2: One-Swap workflow (deterministic in v1), evaluated by simulation

Propose a swap; the user commits; the next receipt credits it or stays silent; a lasting swap is celebrated; declines persist as preferences. No LLM in v1.

**Eval:** 34 scripted 4-week receipt sequences, written as Jest tests over the pure functions.

| Slice | Sequences |
|---|---|
| Swap kept | 8 |
| Partial (smaller variant) | 6 |
| Missed (source item reappears) | 6 |
| Bought elsewhere (neither item appears) | 6 |
| Declined, then the preference must hold | 4 |
| Lapsed (no scans for 2+ weeks, then a return) | 4 |

**Gates:** false credit = 0 (the greenwashing failure; blocking). Credited kg matches the script exactly. A declined swap is never re-suggested. At most one reminder a week, none when opted out, none after the auto-pause. No missed-week copy. No miss announcement. The money line never shows a negative.

### AI-3: the no-guilt guardrail (the thesis as code)

- **(a) Static lint (F23).** Runs from week 1 over the Basket copy scope. **This is the only guardrail gate before the cohort.**
- **Template render check:** part of the lever gate above.
- **(b) Labelled set of about 150 strings** (40 real app strings, 40 written to carry guilt, 40 borderline real strings such as "This is {n}% of today's budget" at `app/log.tsx:865` and "Beef is your top source..." at `lib/topMoves.ts:92`, and 30 absolution lines). Gates (ASSUMPTIONS): guilt recall 0.95 or more, false-positive rate 0.10 or less. It needs a validated judge, so it runs only after AI-4's judge validation, offline. During the cohort no runtime LLM text exists, so it gates nothing before the decision. **First item in the cut order.**

### AI-4: grounded narrator with a validated judge (offline; ships only after the decision)

- Haiku phrases the read-out from a fact sheet built in code, as JSON `{headline, body, swapId}`.
- **Set:** 50 to 60 fact sheets, oversampling high-carbon and sparse baskets.
- **Deterministic gates at 100%:** valid JSON; every numeral appears in the fact sheet; `swapId` comes from the provided set; the lint passes.
- **LLM judge:** Sonnet, three binary checks (guilt, agency, unsupported claim).
- **Judge validation:** you label 100 outputs, including outputs from a deliberately guilt-prone prompt variant so real positives exist. A second person labels 40 of them; require human-to-human Cohen's kappa of 0.6 or more. Accept the judge when, on 50 held-out items, guilt true-positive rate is 0.90 or more and true-negative rate is 0.85 or more (ASSUMPTIONS).
- **Ship rule:** write down what "beats the templates" means before the run, for example zero guilt flags on the high-carbon slice **and** a higher judged agency rate. If it doesn't win, say so in the case study. "I tested an LLM and kept the template" is a credible result.
- **Second in the cut order.** Nothing about the tester build changes because of it.

### The agentic answer

The first real agent is the **One-Swap Coach**, built after the decision and only if M4 reaches its success line. It replaces AI-2's deterministic planner with a Haiku tool-calling planner (`get_candidates`, `get_preferences`, `get_progress`, `save_commitment`, `schedule_nudge`); every number comes from a tool. It is evaluated as a **trajectory eval** on the same 34 sequences plus 10 new ones: false credit 0, declined swap never repeated, at most 1 nudge a week, correct tool order, checked over 3 repeated runs. It ships only if it matches the deterministic baseline on credit and beats it on swap acceptance. In an interview: "I built the agent's eval harness and a deterministic baseline first. The agent has to beat it to ship."

### Not building in these six weeks

Daily AI insight, chat or Q&A, Snap-a-Plate, an autonomous agent, purchasable offsets, any model-generated kg.

### Cost

| Item | Estimate |
|---|---|
| Per receipt | About $0.004 is the **spec target** in the code comment at `receipt-parse/index.ts:78`, unmeasured. The AI audit estimates about $0.002 for text and about $0.003 for a 1024 px photo. Replaced by measured mean cost from the AI-0 and AI-1 runs. Crops would raise it. |
| Per user per month | Cents, assuming 1 to 2 receipts a week |
| All eval runs together | Low single-digit dollars (estimate) |

The constraint is funding the account and spending your hours, not model cost.

---

## 6. The go-to-market test

### The Basket cohort

| Item | Plan |
|---|---|
| **Who** | 15 to 20 iPhone adults who do most of their household's grocery shopping most weeks, usually get a receipt or e-receipt, answer yes to the climate question, and shop in USD. Plus up to 4 money-first contrast testers. Close friends capped at about a third. |
| **Screener climate question** | "Is doing something about climate change something you'd like to fit into everyday life?" Worded as an invitation, not a virtue test. |
| **Screener rejection message** | "Thanks. This round needs iPhone users who shop in USD; we'll let you know when that changes." |
| **Recruiting ($0 to $100)** | (1) The 8 to 10 receipt-drive participants. (2) The earlier informal testers (`docs/APP_STATUS.md` says about 4; the website says "a small number of real people", `docs/WEBSITE_STRUCTURE.md:84`). Leave them out of recruiting maths and keep the count off public pages. (3) Student climate groups and climate communities, as a recruiting pool only, after reading each community's self-promotion rules. (4) The adjacent-payer interviewees (contrast group). Invite about 25 to land 15 to 20 active testers (ASSUMPTION). **No cash incentive**, because it would distort willingness to pay. |
| **Screener doubles as the message smoke test** | The screener is an external form linked from the existing site and from posts (no new website route this round; `website/src/App.tsx` is a single page with no router, and `waitlist_signups` stores only an email, `migrations/20260818000028`). Three copies of the form, identical except the headline: (a) "See what your groceries carry. One easy swap, no lectures." (b) "Balance out your footprint through the swaps you make." (c) "One grocery swap a week, and the money it saves." Posts rotate the links. The form tool's view and completion counts give a completion rate per headline. Low precision, reported, not gated. It also tests your own "balance it out" framing before anything is written for a store listing. |
| **Distribution** | TestFlight external group. The first external build needs Beta App Review ([Apple](https://developer.apple.com/testflight/)); that build is submitted in week 2 or 3 to an empty group. A fixes-only build ships every Thursday with TestFlight's automatic tester notifications off. |
| **What testers do** | Use Basket on their normal shops with no instructions beyond the app. The pulse at most weekly, the capture-gap question weekly, a web exit survey, and 15-minute calls with 5 to 8 testers, at least one of them lapsed. |
| **Contacting a lapsed tester** | One message, no follow-ups, never quoting their usage: "No need to come back. If you have 15 minutes, I'd love to hear what didn't work." |
| **What the founder can see (told to testers in consent, onboarding and Settings)** | Event counts and receipt items. Your review view shows pseudonymous IDs. You read item lines only to fix misreads and corrections. You never raise a tester's specific purchases in a call unless they bring it up. Receipt-drive donors can cross out any line before sharing. Anything shared outward suppresses cells under 5 people. Real receipts and event data never go into the public repo. |
| **Dates** | Day 1 is the first Monday after every gate passes. Target Mon 2 Nov: day 7 Sun 8 Nov, day 14 Sun 15 Nov, exit survey Fri 20 Nov (day 19), **decision Sun 22 Nov (day 21)**, confirmation read Sun 29 Nov (day 28). |
| **Events** | `consent_given`, `scan_started`, `scan_parsed{ms,cost,prompt_version,truncated}`, `item_verdict{predicted,chosen,action}`, `readout_viewed{template}`, `swap_offered`, `swap_response`, `swap_credited{signed_price_diff}`, `pulse_answer{option,annoyed_reason}`, `capture_gap_answer`, `more_card_viewed`, `more_card_tap{swap,contribute}`, `no_receipt_at_install`, `sample_viewed`, `reminder_paused`, `app_open`. No payment or reservation event in the app. |

**Definitions:**
- **Installer:** accepted the invite and opened the app.
- **Activated:** reached a read-out from a real receipt.
- **Active (for the fake-door rule):** opened the app in the cohort's latest week.
- **M2 counts only testers who installed by Wednesday of week 1** (target Wed 4 Nov).

### Metrics (ASSUMPTIONS; locked in `docs/DECISIONS.md` by Sun 25 Oct; never moved)

| # | Metric | Definition | Success | Kill |
|---|---|---|---|---|
| M1 | Activation | **Gated:** share of installers who reach a read-out from a real receipt within 7 days of install (one weekly shop; people install mid-week, after the receipt is in the bin). **Reported:** the same within 72 hours. | 70% or more | under 40% |
| M2 | Repeat capture | Share of activated testers with a receipt whose order date falls in at least 2 of the 3 cohort weeks | 50% or more | under 25% |
| M3 | Reader trust | Share of food lines accepted unchanged on the review card | 85% or more | under 70% |
| M4 | Credited swap | Share of activated testers with at least one swap credited by a later receipt and confirmed, by day 21 | 30% or more | under 10% |
| M5 | No-guilt guardrail | (Judged + Guilty + Annoyed-at-the-suggestion) divided by all pulse answers | **under 5%** | 15% or more |
| M6 | Pull and pay | Web exit survey: the Sean Ellis "very disappointed" share ([CRV](https://www.crv.com/content/product-market-fit-survey)) and reservations at the founding price | 40% or more **and** 3 or more reservations | under 20% **and** 0 reservations |

**M5 runs on a per-answer trigger as well as a rate.** Every Judged, Guilty or Annoyed-at-the-suggestion answer gets a root-cause review within 48 hours: which read-out that tester saw, and which string or state caused it. A copy cause ships in the next Thursday build and is logged with its date in `docs/DECISIONS.md`. M5 is reported before and after each such change. M5 is first read on day 7.

**Reported, not gated:** the Annoyed share split by reason (only "taking the photo" is the photo-fatigue signal for M2); capture-gap answers (A1); median receipts per tester per week; M5 split by high-carbon vs low-carbon baskets and by whether the tester tapped the "do a bit more" card; the contrast group; M1 at 72 hours; production latency and cost; the smoke-test completion rates.

**Reservations, outside the app.** All price and payment UI stays out of the binary: paying to unlock features inside an iOS app must use in-app purchase (Guideline 3.1.1), which has no "charge later" option for a subscription. The reservation lives only in the web exit survey, never live in an interview, with no climate words: "Reserve the founding price. Nothing is charged until launch, you can cancel anytime, and your beta access doesn't change." **Default:** an email-confirmed stated intent with no card, which counts as weaker evidence. A stated-intent M6 pass can lead at most to a real price test, never to "this is a company". If you want stronger evidence, set up a refundable Stripe deposit (add Stripe, terms and a refund policy to your list) before Fri 16 Oct.

**Exit survey items:** the Ellis question; the reservation; an open "What would you pay per year?"; "ways you'd like to do more"; "which would you rather: forward e-receipts / connect a card / keep snapping" (this replaces the cut fake door); "Did Veridian make you feel part of something bigger?"; the pulse.

### Stop points and decision rules

**There are exactly two pre-registered stop points before the decision:** day 7 (M5 only) and day 14 (M1, M3 and M5 kill rules). No other change of direction before the decision.

Kills are checked in this order: **M5, then M3, then M1, then M2, then M4.**

| Result | Decision |
|---|---|
| M5 kill (day 7, 14 or 21) | **STOP.** Copy and design rework before anything else. This fails the thesis itself. If it recurs after one rework, the thesis cannot hold in food as built: park Basket. |
| M3 kill | **STOP AND FIX.** Add the failures to golden-v3, fix, re-gate. Never scale an untrusted number. |
| M1 kill | **PARK the wedge.** Run 5 exit interviews to separate a positioning failure from a need failure. |
| M2 kill | **CAPTURE WALL.** A 2-week zero-photo test using the capture option the exit survey favoured. If that fails too, the receipt wedge is dead and the passive path is next (combined rule below). |
| M4 kill | **MIRROR ONLY.** People like seeing their basket but don't act (the Gargano & Rossi pattern). One 2-week lever iteration: money first, smaller swaps, shopping-list hand-off. Kill if still under 10%. |
| M1 to M5 at success, M6 at success | **CONTINUE.** Widen the TestFlight link, build zero-photo capture, run a real price test, prepare the App Store submission. |
| M1 to M5 at success, M6 fails | **FEATURE, NOT COMPANY** (for consumers). Keep Basket as a free product and portfolio piece; the business question moves to the employer track. |
| Any metric between its lines, no kill | **EXTEND once:** two more weeks with the same cohort plus about 10 new testers, no new features. If M5 is the metric between its lines, fix the copy first, then extend. Never extend unchanged. |
| Day-28 read | Changes the verdict only if it crosses a kill line the day-21 read did not. |

### Adjacent-payer interviews (the scaled-down discovery step)

- **Who:** 5 people who already pay for Copilot Money, YNAB, Whoop or Oura (the beachhead in `docs/PMF_ANALYSIS.md:104`).
- **When:** weeks 2 to 4, 30 minutes each.
- **Ask:** what they would want from carbon tracking inside tools they already trust, whether they would pay, and their reaction to the receipt loop. Up to 4 of them become the contrast group.
- **Result:** reported in the decision memo. Fewer than 5 held is itself a finding about access to this group.

### Employer discovery (best-evidenced payer, with its own risks)

- **Who and how many:** 10 calls with sustainability or HR leads at companies plausibly in scope of California's SB 253. CARB's *proposed* first Scope 3 reporting includes Category 7, employee commuting ([Debevoise, Jul 2026](https://www.debevoise.com/insights/publications/2026/07/carb-previews-proposed-sb-253-reporting-require)). About 2,600 companies are in scope ([Akin](https://www.akingump.com/en/insights/sustainability-legislation-tracker/sb-253-california-requires-businesses-with-over-dollar1-billion-in-total-annual-revenue-to-disclose-greenhouse-gas-emissions)). Commute data today mostly comes from staff surveys ([GHG Protocol Ch. 7](https://GHGprotocol.org/sites/default/files/2022-12/Chapter7.pdf)).
- **Contrary evidence:** the market research rates this channel a medium fit, not a sure thing. Automatic commute trackers already exist ([TripShift](https://www.seedrs.com/tripshift), [CommuteSaver](https://netzerocompare.com/software/commutesaver)). An engagement-only vendor, Pawprint, went into liquidation on 23 Mar 2026 ([The Gazette](https://www.thegazette.co.uk/notice/5097826)). EU CSRD scope was cut by about 80% ([KPMG](https://kpmg.com/xx/en/our-insights/ifrg/2025/esrs-eu-omnibus.html)).
- **Outreach:** build a list of about 40 to 50 contacts and send all outreach in weeks 1 and 2. Prefer warm intros. The share who agree to a call is an ASSUMPTION; fewer than 5 calls held by Sun 15 Nov is a reportable result about channel access, not a plan failure.
- **Script:** how they collect commute data today, what it costs, who owns it, what privacy constraints apply, and "How would this compare to TripShift or CommuteSaver for you?"
- **Employee-side non-negotiables, stated in every call and in any letter of intent:** opt-in only; no employer sees individuals; aggregates only, with cells under 5 suppressed; no team rankings, challenges or commute scores; employees see their own data first. **Disqualifying question:** "Would aggregate-only data, with no individual or team rankings, meet your reporting need?" A "no" counts as a failed lead, even with a letter of intent. A commute score a manager can see is shame with a paycheck attached.

| Result | Threshold (ASSUMPTIONS) |
|---|---|
| Success | At least 1 unpaid 30-day pilot or letter of intent that accepts the non-negotiables |
| Weak signal | At least 3 of 10 describe current collection as costly or painful without being prompted |
| Fail | Neither |

**Campus contacts (optional, at most 3):** campus sustainability offices that report to AASHE STARS can earn credit OP-14, Commute Modal Split ([STARS v3.0](https://stars.aashe.org/wp-content/uploads/2024/04/OP-14_-Commute-Modal-Split-v3.0.pdf)), in a rating system institutions choose to take part in. Basket does not produce that data, so any campus contact belongs in the commute discovery track. Student climate groups are a recruiting pool only.

### Founder field test (keeps the passive thesis alive)

- **Setup:** before enrolment clears, a Release build on your personal team (`scripts/ios-device-release.sh`; the profile expires every 7 days). As soon as enrolment clears, move to the TestFlight build with the trips flag on for your account. Trip detection was last fixed on a device in July (`docs/PRD.md:176`) and has never run under Xcode 27.
- **Fix budget, decided now:** record failures only, no trip fixes before the decision. If you want fixes, they take a named 2 to 3 days from the cut order (the audit rates field test plus fixes at 3 to 5 days).
- **Ground-truth table:** each real trip, whether it was detected, the guessed mode, distance error, and "how did this notification feel?". Days lost to profile expiry are recorded as exclusions, not misses. Raw location data stays private.
- **Gate (ASSUMPTIONS); aim for 20 trips by Sun 1 Nov, final read at the decision:** at least 20 real trips across at least 3 modes; detection recall 80% or more on trips of 1 km or more; mode correct 75% or more; a fresh install backfills the past week; zero crashes.
- **Precondition for any future trip-path cohort:** the guilt audit's P0 list is done (the per-drive push, the ring and 22 kg budget, the amber 50% state, the streak surfaces). F8 already covers the pushes.

### Combined rule for what comes after the decision

| Employer track | Field test | Basket | Next bet |
|---|---|---|---|
| Success | Pass | Any | A commute pilot on the trip pipeline, under the employee non-negotiables. B2B2C was Phase 3 in the April 2026 PRD (`VERIDIAN_PRD.md:176`, status "Not started" at `:214`; superseded by `docs/PRD.md`). If Basket also says CONTINUE, **you choose.** Default: follow the payer, because consumer carbon willingness to pay is the unresolved axis in `PMF_ANALYSIS.md`. |
| Success | Fail | Any | Fix the trip pipeline first. It is what the payer wants. |
| Fail | Any | CONTINUE | Basket plus a price test |
| Fail | Pass | Any other outcome | A screened autopilot cohort: US iPhone users who already pay for an autopilot app and use at least 2 transport modes |
| Fail | Fail | Any other outcome | Park the business track and keep the portfolio piece. Run the full discovery week from `PMF_ANALYSIS.md` section 4 before building anything more. |

### Path to public launch

- **No public App Store launch in these six weeks.** The TestFlight cohort is the launch rehearsal.
- **If the decision is CONTINUE:** earliest App Store submission the week of Mon 7 Dec (two weeks after a 22 Nov decision). Checklist: `docs/store-metadata.md` rewritten, App Privacy labels, delete account working, price set, privacy policy hosted, the reviewer note. Weeks 8 to 13 test 2 acquisition channels (the best smoke-test headline, and whichever recruiting source produced the most activated testers), each with thresholds written down before it starts.

### Honest limits

- One person moves a metric by about 5 to 10 points depending on its denominator (installers, activated or active testers). These are decision rules, not statistics.
- A network-recruited cohort inflates M2 and M6. That is why M6 asks for a reservation, and why friends are capped.
- Public retention benchmarks (for example about 3 to 4% day-30 retention for Health & Fitness, [Plotline](https://www.plotline.so/blog/retention-rates-mobile-apps-by-industry)) don't apply to a recruited beta. Never quote them against these results.

---

## 7. Six-week plan

### Tracks, quoted accurately

Your memory note (`veridian-two-track-strategy.md`) defines **Track A** as investor pitch readiness (brand identity, an end-to-end touchpoint map, a verified clean demo click path) and **Track B** as PMF evidence, closed by "a real Customer Discovery Week targeting existing Copilot/Whoop/Oura subscribers". Its rule: "Never let Track B's open questions block Track A execution, and never let Track A polish masquerade as Track B validation."

**This plan deliberately departs from the note in two ways.** (1) Your goals this session are market and portfolio, not an investor raise, so Track A for six weeks means the portfolio and public surfaces, limited to truth fixes and evidence updates. Further brand and pitch polish pauses. (2) The full discovery week is replaced by 5 adjacent-payer interviews plus the Basket cohort (section 2 explains why). Every item below is tagged **[A]** or **[B]**; the note's second rule still holds, so no [A] item is counted as validation.

### The schedule rule

- The cohort starts on **the first Monday after every pre-cohort gate passes**: the extraction gate, the lever gate, the 5-person pre-test, and device QA with zero High findings. **Target Mon 2 Nov. Latest Mon 16 Nov.** The decision is always day 21.
- **Velocity check, Sun 18 Oct:** if the week 1 and 2 build items are not done, move the target start to Mon 16 Nov that day, once, and record it in `docs/DECISIONS.md`. Don't let it drift a week at a time.
- If the gates have not passed by Sat 14 Nov, stop building and re-scope. That is itself a finding about solo capacity.
- **Your hours:** this plan assumes roughly full-time build days (ASSUMPTION). Write your real weekly build hours into `docs/DECISIONS.md` in week 1; if the number is lower, the start date moves, never the gates.

`[FOUNDER]` marks what only you can do: accounts, money, credentials, your phone, outreach, consent, decisions.

### Week 1, Mon 5 to Sun 11 Oct: unblock, cut, baseline

**[FOUNDER]**
- **Monday:**
  - Enrol in the Apple Developer Program, $99/yr ([Apple](https://developer.apple.com/programs/)). Individual enrolment shows your personal legal name as the seller; organisations need a D-U-N-S Number ([Apple enrolment](https://developer.apple.com/programs/enroll/)). [B]
  - Fund Anthropic, set a monthly cap, check the function secret (F1). [B]
  - Install and link the Supabase CLI, check migration history, create the staging project (F3). [B]
  - Answer the currency question (section 2). [B]
- Domain, DNS records, SMTP provider, Supabase Auth settings, email templates (F2). **Exit check by Sun 18 Oct:** one real sign-up and one password reset on a device, to an address outside the Supabase team. [B]
- The section 10 decisions, or let the defaults apply on Wed 7 Oct. [B]
- Hosting for the existing site (free tier). [A]
- Employer list of 40 to 50 contacts; start outreach. [B]
- Field test: install the personal-team Release build on your iPhone and start the ground-truth table. [B]

**Build:** F4 first (config plugin before any prebuild, device script), then F7, F8, F9, F10, F11 skeleton, F24, F25, and the lint harness from F23. [B]

**Eval:** AI-0, including the image sizing test on your 3 longest receipts. [B]

**Truth pass, about half a day [A]:**
- `README.md:33` (forwarded order confirmations, not built), `:34` ("every correction trains a per-user prior so the app needs less input every week", not built), `:46` (daily AI insight, broken), `:50` ("44 suites / 415 tests"; actual 47 suites / 446 tests).
- `website/src/sections/CaseStudy.tsx:172-176` (forwarded or shared receipt images described as working), `:252` and `:267-268` ("46/46"), and `Feedback.tsx:282` ("46/46").
- `website/src/sections/Solution.tsx:148-149` (forwarding address and share-sheet extension).
- `docs/PRD.md:101` (forwarding and share-extension ingestion "shipped").
- `docs/NORTH_STAR.md:110` ("~97% field accuracy on clean images"; no image eval exists).
- `website/src/sections/ProductScreens.tsx:33` ("Momentum, not streaks. No guilt copy." over screenshots that still show guilt mechanics). Re-caption the old screenshots as "before" screens or replace them with Basket screens once they exist.
- Exclude `website/` from the root `tsconfig.json`; fix the dead `#summary` hero link (`Hero.tsx:173`).
- Deploy the existing single-page site with these fixes. No new routes this round.

**Desk research, 1 to 2 hours [B]:** receipt- and grocery-based carbon apps (Evocco's current status first), grocer carbon labels, and whether anyone credits a swap from a later receipt. Nothing goes into public copy until this is done.

**Case-study checkpoint, Fri 9 Oct [A]:** Part 05 gets the AI-0 results (three runs, noise band, error buckets, the spend-factor finding), copied from `RUN_LOG.md`.

**Exit check:** baseline logged; enrolment submitted; Release build running on your iPhone; tester mode switch in place; outreach sent.

### Week 2, Mon 12 to Sun 18 Oct: reader, review card, first external build

**Build [B]:** F6 design frames (first), F12 scan entry, F13 Reader v2 (enum v1, units, BLS and typical-pack tables), F14 review card, F20 Settings and delete account, H1 harness v2. Submit the first external build to Beta App Review as soon as enrolment clears (F5), with the demo account (it needs working email from F2).

**[FOUNDER] Receipt drive [B]:**
- Ask 8 to 10 people for 2 to 4 grocery receipts each, with written consent covering a private eval set.
- Ask them to cover card digits and loyalty IDs, cross out any line they'd rather not share, and write the pack size next to food lines.
- Count lines on the first 5 receipts and re-estimate labelling hours. Label every line.

**Eval [B]:** run H1 on 5 of your receipts; then assemble and freeze `golden-v2-food`, including the privacy slice. Dogfood your own receipts.

**[FOUNDER] [B]:** 2 employer calls; 2 adjacent-payer interviews; finish employer outreach.

**[A]:** record a 60-second scan-to-read-out clip from the simulator build for interviews.

**Sun 18 Oct:** SMTP exit check; velocity check.

**Exit check:** Reader v2 runs end to end from the photo library; golden-v2 frozen; first external build submitted.

### Week 3, Mon 19 to Sun 25 Oct: read-out, swap, extraction gate

**Build [B]:** F15 read-out, F16 swap commitments, credit rule and lever function, F17 Basket Home, F18 onboarding, F19 pulse and card, F22 error states, F23 copy, the shop-day reminder and its routing, component tests for the credit rule and review card.

**Eval [B]:** golden-v2 extraction runs; the 34 swap sequences; the lint.

**[FOUNDER] Fri 23 Oct [B]:** extraction gate.

**[FOUNDER] Release [B]:** F21 privacy policy and App Privacy labels; the `docs/store-metadata.md` rewrite before the App Store Connect record; TestFlight beta description and What to Test.

**[FOUNDER] Recruit [B]:** publish the three screener copies, review every tester-facing text item, check the friend cap. 2 employer calls, 2 adjacent-payer interviews.

**[FOUNDER] Sun 25 Oct [B]:** every threshold, both gates, the stop points and the schedule rule written into `docs/DECISIONS.md`.

**Case-study checkpoint, Sun 25 Oct [A]:** publish the pre-registered thresholds (a link to `docs/DECISIONS.md`) and a decision entry, "Why I narrowed to the grocery basket for six weeks, and what would reverse it", so the site and the case study tell one story.

**Exit check:** extraction gate passed on two consecutive runs; thresholds locked; screener live.

### Week 4, Mon 26 Oct to Sun 1 Nov: lever gate, pre-test, device QA

- **[FOUNDER] Lever gate, Fri 30 Oct [B]:** including the template render check.
- **[FOUNDER] 5-person pre-test, by Sun 1 Nov, about 2 hours [B]:** show 5 people outside the cohort mock read-outs for a low-carbon, a mixed and a high-carbon basket, plus the empty-ledger and coming-back states. Ask "How does this make you feel?" and "What would you do next?" Record the answers verbatim. Any judged or guilty answer is fixed before invites go out.
- **Device QA, Thu 29 to Sat 31 Oct [B]** (section 4).
- **[FOUNDER] [B]:** 2 employer calls; 1 adjacent-payer interview; invites scheduled.
- **Sun 1 Nov:** field-test checkpoint, target 20 trips.
- **Exit check:** every gate passed; zero High findings open. If not, the start moves to the next Monday after they pass.

### Week 5, Mon 2 to Sun 8 Nov: cohort days 1 to 7 (if on target)

- **[FOUNDER]** Invites go out Monday. [B]
- **Thursday build:** fixes only, plus any change that removes a guilt, shame or pressure trigger, logged with its date. [B]
- **Every day, about 15 minutes:** read events and verdicts through the pseudonymous view; tag every correction as a golden-v3 candidate; run the 48-hour M5 review on any trigger answer. [B]
- **[FOUNDER]** 2 employer calls. [B]
- **Sun 8 Nov, day 7:** first M5 read and its kill rule. [B]
- **Offline, if hours allow:** AI-4 narrator build, your 100 labels, recruiting the second labeller. [A]

### Week 6, Mon 9 to Sun 15 Nov: cohort days 8 to 14

- **Thursday build.** [B]
- **[FOUNDER]** 3 to 5 tester calls, including one lapsed tester; 2 employer calls. [B]
- **Sun 15 Nov, day 14 checkpoint:** compute M1, M3 and M5 and apply their kill rules. This is the end of the six-week window. [B]
- **Offline, if hours allow:** judge validation (kappa, true-positive and true-negative rates), the narrator eval run, then AI-3b. [A]

### Week 7, Mon 16 to Sun 22 Nov: cohort days 15 to 21, then the decision

- **Fri 20 Nov:** the web exit survey. [B]
- **[FOUNDER]** Finish the employer calls to reach 10; finish the adjacent-payer interviews; finalise the field-test table. [B]
- **[FOUNDER] Sun 22 Nov:** the decision memo against the pre-registered rules, plus the offset entry and the combined rule, in `docs/DECISIONS.md`. [B]
- **[A]:** update case-study Parts 05 and 06 with real numbers; record the 2-minute demo (scan flow from the simulator's photo library, camera on a device).
- **Sun 29 Nov:** the day-28 read, confirmation only.

### If you fall behind, cut in this order

1. AI-3b, the labelled guardrail set.
2. AI-4, the narrator and its judge.
3. Campus contacts.
4. Field-test trips beyond the 20-trip minimum.
5. The money line on the ledger (keep the logged price difference).

**Never cut:** the extraction and lever gates, F10 (dedup privacy fix), F2 (email), consent, delete account, the copy lint, the pulse and its 48-hour review, the events table, device QA, the 5-person pre-test.

### Founder-only summary

| When | Action | Cost | Unblocks |
|---|---|---|---|
| W1 Mon | Apple Developer Program | $99/yr | TestFlight, the cohort |
| W1 Mon | Anthropic credit, spend cap, verify the secret | Low (estimate) | All AI and evals |
| W1 Mon | Supabase CLI, link, staging project | Free tier | Every migration |
| W1 | Domain, DNS records, SMTP provider, Auth settings | Domain and provider pricing (check before buying) | Sign-up and reset for testers |
| W1 | Hosting | Free tier | Website, policy URL |
| W1 | Section 10 decisions (defaults apply Wed 7 Oct) | None | Copy, scope, thresholds |
| W1 to W2 | Employer outreach to 40 to 50 contacts | Time | Payer signal |
| W1 to W7 | Carry your iPhone; ground-truth table | Time | Passive hedge |
| W2 | Receipt drive: consent, redaction, pack sizes, labelling | Time | golden-v2 |
| W2 to W4 | 5 adjacent-payer interviews | Time | Willingness-to-pay evidence |
| W3 | Privacy policy, App Privacy labels, store-metadata rewrite, App Store Connect, `eas.json`, external group | None | Beta review |
| W3 | Optional: Stripe for refundable deposits | Stripe fees | Stronger M6 evidence |
| W4 | 5-person pre-test | About 2 hours | The thesis check before invites |
| W5 to W7 | Recruiting, tester calls, daily event read | Time | The cohort |
| Decision day | Decision memo | None | The next six weeks |

### Founder hours (ASSUMPTIONS; confirm in week 1)

Non-build founder work, kept under a hard cap of **15 hours a week** so job applications have room. Build time is separate. If you exceed the cap two weeks running, apply the cut order.

| Week | Founder work | Estimate |
|---|---|---|
| 1 | Enrolment, Anthropic, CLI, domain and SMTP, hosting, decisions, currency check, employer list and outreach, field-test setup | 8 to 10 h |
| 2 | Receipt drive and labelling, outreach, 2 calls, 2 interviews | 12 to 15 h |
| 3 | Privacy policy, store metadata, App Store Connect, screener, recruiting, text review, 2 calls, 2 interviews | 10 to 12 h |
| 4 | Pre-test, device QA, invites, 2 calls, 1 interview | 8 to 10 h |
| 5 | Invites, daily event read, M5 reviews, 2 calls | 6 to 8 h |
| 6 | Tester calls, 2 calls, day-14 checkpoint | 6 to 8 h |
| 7 | Exit survey, final calls, decision memo | 6 to 8 h |

---

## 8. Portfolio packaging

### The story, in two dated versions

**True now (present tense; say this until the RUN_LOG rows exist):**

> "Reading the pipeline before the first eval run showed it can't tell beef from lentils. Grocery lines are either priced at 0.186 kg of CO2e per dollar or silently dropped when a substring resolver finds nothing; 'dairy' and 'bakery' resolve to nothing, and 'deli' resolves to a courier code. Beef and lentils differ 30x per kilogram, about an order of magnitude per dollar, and the pipeline sees neither. Meanwhile my harness's headline confusion pair, grocery versus fast-food restaurant, is a 1.4x gap. So I'm changing the unit of measure to kilograms of food and rebuilding the eval around the decision the product actually makes: which swap to suggest. The gates are written down before run 1."

**After the golden-v2 rows exist in `RUN_LOG.md` (fill only from the log):**

> "...I changed the unit of measure, rebuilt the eval around lever correctness, froze it before the first run, and gated on it. Run 1 scored [X] on lever correctness; error analysis showed [failure mode]; run 2 moved it to [Y]."

**Rule:** the past tense is used only once the matching RUN_LOG rows exist. The same applies to user results and the events table.

### What it shows, mapped to cited hiring signals

Google's AI-native PM posting ([posting](https://jobs.anitab.org/companies/google-24698/jobs/90751768-product-manager-search-ai-native-product-development)) and Google Labs' 0-to-1 posting ([posting](https://jobs.anitab.org/companies/google-24698/jobs/77326867-group-product-manager-0-1-ai-products-google-labs)) ask for these:

| What it shows | Evidence in this plan |
|---|---|
| Prototyping AI features 0 to 1 | A shipped AI capture loop with real testers |
| Eval frameworks for non-deterministic systems | Frozen sets, a measured noise band, error analysis before metrics ([Hamel Husain](https://hamel.dev/blog/posts/evals-faq/why-is-error-analysis-so-important-in-llm-evals-and-how-is-it-performed.html)), two gates on a decision metric, honest ground truth for kg |
| Judgment about when not to use a judge or an agent | No judge for receipts; a kappa-validated judge for open-ended copy; a workflow now, and an agent that must beat a deterministic baseline |
| UI that handles uncertainty, and a human-in-the-loop flywheel | Top-2 alternatives on the review card; predicted vs chosen class stored |
| A brand promise as a testable constraint | The copy lint, the template render check, M5 as a kill metric with a 48-hour review |
| Defining early success and pivoting gracefully | Pre-registered thresholds, gate-driven dates, a dated verdict, a combined rule for every outcome |
| Go-to-market thinking | 10 employer calls with non-negotiables, adjacent-payer interviews, a headline smoke test, honest results either way |

### Three links for a resume

1. **The case study page**, with the demo at the top and the 30-second answer (product, eval metric, outcome number) above the fold ([Institute of AI PM](https://www.institutepm.com/knowledge-hub/best-ai-pm-portfolios)). Interim checkpoints: Fri 9 Oct (AI-0 results), Sun 25 Oct (thresholds and the narrowing decision), the 60-second clip from week 2.
2. **`eval/` on GitHub:** `receipt-parse/RUN_LOG.md` (golden-v1 three times, error analysis, golden-v2 gates, the swap simulation, and the guardrail and judge work if they ran). Real receipts stay private.
3. **`docs/DECISIONS.md`:** the wedge and the time-boxed trip cut with reversal conditions, the offset ledger rule and the fake-door result, no judge for receipts, workflow before agent, and the decision memo.

The field-test table is a supporting artifact, aggregates only.

### Say / don't say

| Say | Don't say |
|---|---|
| "The gates and the market thresholds were written down before run 1 and before the first tester." | Any number not in `RUN_LOG.md` or the events table |
| The present-tense story until the RUN_LOG rows exist | The past-tense story before then |
| "Corrections are stored as prediction vs choice; per-user priors are next." | "every correction trains a per-user prior so the app needs less input every week" (`README.md:34`) |
| "Guilt can motivate in experiments. I chose no guilt anyway, because people stop looking at information that makes them feel bad, and this product only works if they keep looking." | That fear or guilt messaging "backfires" as a research consensus (the overstated line at `NORTH_STAR.md:30`) |
| "I built the agent's eval harness and a deterministic baseline first; the agent has to beat it to ship." | That an agent ships today |
| "Receipt-to-carbon apps exist (Evocco, 2021). My bet is the verification loop." | "Nobody does this" |
| "Grocery basket" | "Your whole footprint" for Basket |

---

## 9. Risks, the strongest counter-argument, and what would make us stop

### Risks

| Risk | Why it is real | Mitigation |
|---|---|---|
| **The schedule** | 27 to 45 build days of estimates against about 20 before the target start, next to a job search | Gate-driven start, the 18 Oct velocity check, cuts made now, the founder-hours cap |
| **Email doesn't reach testers** | The built-in Supabase sender refuses non-team addresses | F2, with an exit check by 18 Oct |
| **Beta App Review** | Third-party AI consent (5.1.2(i)), generic permission strings, background location in the binary | Consent screen, explicit strings, reviewer note, first external build submitted in week 2 or 3 |
| **The photo is effort** | The July pivot moved away from manual work; Miles shows passive tracking with weak rewards still died ([MoneyPantry](https://moneypantry.com/miles-app-review/)) | Screenshots count, the no-receipt path, M2 as a kill metric, the Annoyed follow-up, zero-photo capture as the fallback |
| **Receipt photos are hard to read** | A tall receipt is downscaled to roughly 390 px wide on Haiku's tier (my arithmetic from Anthropic's limits) | The week-1 sizing test, crops if needed, latency reported until decided |
| **Not new** | Evocco did receipt-to-carbon in 2021 | The desk check; the claim narrows to the verification loop |
| **Non-paying segment** | `DESIGN_RESEARCH.md:132`; no evidence for a standalone price of $10 or more a month | M6 needs reservations, not praise; employer calls; adjacent-payer interviews |
| **Employer channel** | Existing trackers (TripShift, CommuteSaver), Pawprint's liquidation, CSRD cut | The competitor question and the disqualifier in every call |
| **A basket mirror may not change behaviour** | Gargano & Rossi; [Büchs et al. 2018](https://ideas.repec.org/a/eee/enepol/v120y2018icp284-293.html) | The loop ends in a credited swap; M4 kill leads to MIRROR ONLY; never claim impact from 20 people over 3 weeks |
| **Food is personal** (ASSUMPTION) | Swap suggestions can read as diet policing | Low-carbon vocabulary, pack terms not grams, the one-off button, "Don't suggest food swaps", M5 with a 48-hour review |
| **Trust in the numbers** | Price-to-weight is crude; "DEFRA 2025" provenance is unverified; the segment fact-checks fastest (`DESIGN_RESEARCH.md:131`) | "About" on every figure, editable quantities, kg gated only on known-weight lines, lever correctness as the decision metric |
| **Receipt privacy** | Images go to Anthropic; the repo is public; the global dedup leak; the founder can read purchases | F10, consent, F21, the privacy eval slice, pseudonymous review view, redaction, no real data committed |
| **Spend leak** | A funded key with deployed but unused endpoints | F25 plus the spend cap |
| **Dormant guilt reminders reactivate** | `useNotifications.ts:173-179`, `useEmissionEntries.ts:147-163` | F8 lands before F20 |
| **The passive thesis withers** | Six weeks with no tester on trips | Field-test table, `predicted_mode` capture, the combined rule routes back to it |

### The counter-argument, at full strength

- Every consumer carbon tracker that tried to stand alone has shut down, sold, moved to business customers or rebuilt around money: Miles shut down, Klima was sold, Capture closed, Commons now leads with budgeting, Pawprint was liquidated.
- Measured usage is tiny: about 1% in Germany and about 4% even when free inside NatWest's app.
- The only revealed payers are offset subscribers and employers.

This plan makes things harder for itself. It targets the persona the docs say won't pay, adds a manual step the North Star rejected, shrinks the promise to one category, enters a space Evocco tried in 2021, and its own cited study says an information mirror does not change behaviour. Even if every metric passes, the result may be a well-loved free feature, like Earth Hero, not a company.

### Why this plan anyway

1. **One person can build it.** Nothing on the critical path depends on an unverified device pipeline, Apple's review of a background-location feature that testers use, or a partner saying yes.
2. **It produces evidence whatever happens:** eval numbers in week 1, real testers after the gates, a dated verdict.
3. **The counter-argument can win, and the plan says where to go when it does.** M2 says "too much effort", M4 says "mirror, not lever", M6 says "feature, not company". Each leads to a named next step.
4. **The strongest alternatives run alongside at near-zero build cost:** employer calls test the best-evidenced payer, adjacent-payer interviews test the repo's own open question, and the field test keeps the passive autopilot ready.

### What would make us stop

- **M5 kill, twice** (once before and once after a rework): the guilt-free thesis cannot hold in food as built. Park Basket.
- **M1 kill:** people don't start. Park the wedge after 5 exit interviews.
- **M4 kill after one lever iteration:** people look but don't act. The basket is a mirror.
- **M2 kill and a failed zero-photo test:** the receipt wedge is dead.
- **Employer fail, field-test fail and Basket short of CONTINUE:** park the business track, keep the portfolio piece.
- **Gates not passed by Sat 14 Nov:** stop building and re-scope.

The plan fails only if the thresholds move after the data arrives. Lock them by Sun 25 Oct.

---

## 10. Decisions only the founder can make

Each has a default that applies automatically if you haven't decided by **Wed 7 Oct**, so nothing stalls.

| # | Decision | Default |
|---|---|---|
| 1 | Approve Basket as the single bet, the gate-driven start rule, and the two stop points | Required; nothing starts without it |
| 2 | Offset: ledger only (option A) or a separate contribution area (option B, which means rewriting `NORTH_STAR.md` section 9 explicitly). Approve the "Want to do a bit more?" card and its rule. | Option A, card approved |
| 3 | "Balance" language on the action ledger | No; "kept out of the air" |
| 4 | Cohort country and currency | Per the Monday check; US if you and most donors shop in USD |
| 5 | Founding price, and whether to show one | Show it at $39/yr, an ASSUMPTION anchor from an earlier draft (set below Copilot Money's reported $95/yr, [Finny](https://getfinny.app/blog/copilot-money-pricing-2026), retrieved October 2026; the repo records Copilot at $13/mo, `docs/DESIGN_RESEARCH.md:91`). It is not evidence of carbon willingness to pay. Plus the open "What would you pay per year?" field. |
| 6 | Reservation mechanism | Email-confirmed stated intent, weighted lower; Stripe deposit only if you set it up by Fri 16 Oct |
| 7 | Lock every threshold, both gates and the schedule rule in `docs/DECISIONS.md` | By Sun 25 Oct |
| 8 | Apple enrolment type | Individual (fastest; your name shows as seller) |
| 9 | "Confirm email" | On, with custom SMTP; off temporarily until the SMTP check passes |
| 10 | Receipt-drive consent and redaction terms, and where private eval data lives | A one-paragraph consent template stored privately; data in the gitignored private directory, never the public repo |
| 11 | Second labeller for the kappa check | One named PM peer from your job-search network (only needed if AI-4 runs) |
| 12 | Background location in the tester binary | Keep one binary with a reviewer note; move to `app.config.js` only if review objects |
| 13 | Trip fixes before the decision | None; record failures only |
| 14 | Your real weekly build hours | Needed in week 1 to set dates honestly |
| 15 | Canon edits: correct the citation (not the rule) at `NORTH_STAR.md:30` and `PRD.md:28`; remove "~97% field accuracy" (`NORTH_STAR.md:110`) and the per-user-prior claim (`README.md:34`) until evidence exists | Approved as part of the week-1 truth pass |
| 16 | If both the employer track and Basket light up, which gets the next six weeks | Follow the payer |

---

## Appendix A: every status row, mapped to the cohort

Status and evidence for each row live in `docs/APP_STATUS.md` section 2. This table adds only what happens to each row under this plan.

### A1. The 52 rows of `docs/APP_STATUS.md`

| Row | Feature | Status | In the cohort |
|---|---|---|---|
| 1 | Email sign-in | works | Keep; toast fix (F9) |
| 2 | Email sign-up | partial | Fix (F2, F9) |
| 3 | Forgot password | partial | Fix (F2, F9) |
| 4 | Reset password deep link | unverified | Fix (F9); run in device QA |
| 5 | Session persistence and sign-out | works | Keep; add `queryClient.clear()` on sign-out |
| 6 | Google and Apple sign-in | not wired | Cut; email only |
| 7 | Settings, account deletion | not wired | Build (F20) |
| 8 | Onboarding slides | partial | Replace (F18) |
| 9 | Autopilot activation | broken | Your account only (trips flag, F7) |
| 10 | Calculator questions | partial | Cut (gate bypassed, F7) |
| 11 | Calculator results | partial | Cut |
| 12 | Post-signup baseline gate | partial | Bypassed (F7) |
| 13 | Trip detection pipeline | unverified | Founder field test |
| 14 | Trip confirm and correct | unverified | Founder field test, with every car trip asking (status doc decision D5), so mode errors are measurable |
| 15 | Today budget ring | partial | Cut (Basket Home) |
| 16 | Today feed | works | Cut (Basket Home) |
| 17 | Today add (+) | works | Cut; "Add an item" on the review card instead |
| 18 | Top Moves | partial | Cut; its swap-maths pattern and evidence floor are reused in F16 |
| 19 | Week strip | partial | Cut |
| 20 | Momentum band | partial | Cut |
| 21 | Quick slots | partial | Cut |
| 22 | Category chips | works | Cut (manual log hidden) |
| 23 | Factor picker | partial | Cut |
| 24 | Quantity sheet | partial | Cut; F8 removes the achievements and streak work from the shared create-entry path |
| 25 | Entry detail and edit | partial | Cut |
| 26 | Delete entry (swipe) | partial | Cut |
| 27 | Offline queue | partial | Not on the basket path; a scan needs a connection and shows a retry on failure (F22) |
| 28 | Trends | partial | Cut |
| 29 | Personal records | partial | Cut |
| 30 | Streak | broken | Cut; milestone push removed (F8) |
| 31 | Weekly Recap | partial | Cut; the read-out is the recap in v1 |
| 32 | Carbon Passport | partial | Cut |
| 33 | Passport entry | works | Cut |
| 34 | Stats row | partial | Cut |
| 35 | Grove and "kg never emitted" | broken | Cut; replaced by the "kept out of the air" ledger (section 1) |
| 36 | Achievements shelf | partial | Cut; unlock check removed from create-entry (F8) |
| 37 | Challenges and leaderboard | broken | Cut |
| 38 | Plaid bank linking | unverified | Cut |
| 39 | Transaction-to-emission mapping | works | Not on the path; its 0.186 kg/$ grocery rate is reused for `other_food` |
| 40 | Receipt CSV backfill | unverified | Cut |
| 41 | Receipt photo import | not wired | **Build: the core of the plan** (F12, F13, F14) |
| 42 | Snap-a-Plate | not wired | Not built |
| 43 | Daily and meal reminders | not wired | Delete (F8) |
| 44 | Weekly recap notification | partial | Flag off (F8); the notification handler is added for the shop-day reminder |
| 45 | Trip notifications | unverified | Your account only; per-drive push removed, walk and ride push retitled (F8) |
| 46 | AI insight card | broken | Cut; endpoint gated or undeployed (F25) |
| 47 | `analyze-emissions` | not wired | Delete (F25) |
| 48 | Receipt-parse eval harness | partial | AI-0 this week; extended by H1 |
| 49 | Build and release readiness | broken | Fix (F4, F5, F21; store copy in F23) |
| 50 | App config | partial | Fix (F5) |
| 51 | Environment and secrets | partial | Fix (F1, F2, F3) |
| 52 | Marketing website and waitlist | partial | Truth pass and deploy [A]; screener runs on an external form |

**Its ten launch blockers, under this plan:** 1 (autopilot never switched on) and 2 (core loop unseen on a phone) become the founder field test; 3 (the daily hero judges) and 7 (stale, disagreeing numbers) are cut with the screens that cause them; 4 (the false "never emitted" number) is cut and replaced by the receipt-credited ledger; 5 (sign-up and reset) is F2 and F9; 6 (the AI promise) is F18 and F25; 8 (streaks and rankings) is the CUT list plus F8; 9 (App Review) is F20, F21 and the store-copy rewrite in F23; 10 (nobody else can install) is F4 and F5. Its decision D2 (personal band or the global 22 kg constant) is moot for testers, because the basket loop has no daily budget; decide it only if the ring returns.

### A2. The 23 UAT findings, reconciled

| # | Finding | Status |
|---|---|---|
| 1 | Calculator shows 5800 kg before any answer | Fixed (`8f9605a`) |
| 2 | Google button shows a developer message | Fixed: hidden unless configured (`47396ec`) |
| 3 | Apple button spins silently | Fixed: hidden unless configured (`47396ec`) |
| 4 | Onboarding slide 3 pitches leaderboards and badges | Fixed (`8f9605a`) |
| 5 | Onboarding slide 1 pitches manual logging | Fix before cohort (F18) |
| 6 | Slide 2 doubled "Try" and the daily Claude promise | Fix before cohort (F18 removes it) |
| 7 | Passport "lightest day" on one day of data | Fixed (`8f9605a`); Passport cut |
| 8 | Passport share card clipped "0" | Fixed (`8f9605a`); Passport cut |
| 9 | Passport "first tracked month" vs Lifetime | Cut by mode; defer |
| 10 | Passport "led your week" on month view | Cut by mode; defer |
| 11 | Top Moves extrapolates one meal | Fixed (`8f9605a`); the same rule applies to the read-out's lever line |
| 12 | Ring halo clipped | Fixed (`47396ec`); ring cut |
| 13 | "While Using" alert with no Open Settings | Cut by mode (trips founder-only); defer to the trip path |
| 14 | Quick slots pre-filled for a new user | Cut by mode |
| 15 | Food picker leads with store-type rows | Cut by mode |
| 16 | "Log 27.00 kg" ambiguous | Cut by mode; "Add an item" must not reuse the label |
| 17 | Calculator dark text, Skip legibility, missing icon | Header fixed (`47396ec`); rest cut by the gate bypass; defer |
| 18 | Error toast covers the form on sign-up and login | Fix before cohort (F9) |
| 19 | Grove art and truncated labels on You | Cut by mode |
| 20 | Trends legend and placeholders | Cut by mode |
| 21 | Receipt photo path promised but unreachable | Fix before cohort (F12); the core of the plan |
| 22 | "Logging..." lasts seconds | Cut by mode; F8 removes the achievements and streak work that caused part of it |
| 23 | Em dashes in UI strings | Fix in Basket scope (F23 lint); cut screens keep theirs behind the switch |

---

## Appendix B: choices made while merging the plan

- **Passive autopilot vs a weekly receipt photo.** Testers get Basket only; trips stay alive as your field test. `NORTH_STAR.md` is not rewritten; a `docs/DECISIONS.md` entry records a time-boxed scope cut and what would reverse it (an M2 kill, or a passing field test combined with a failed Basket).
- **Decision date.** An earlier draft started the cohort Mon 26 Oct and decided Sun 15 Nov. The re-estimate (27 to 45 build days) made that start unrealistic, so the start now follows the gates (target Mon 2 Nov) and the decision is day 21 (target Sun 22 Nov), one week after the window. The day-14 checkpoint still lands inside it.
- **Segment.** Primary: climate-concerned household grocery shoppers. Contrast: money-first adjacent-app payers. The payer question goes to employer calls, reservations and the adjacent-payer interviews, not to the cohort's enthusiasm.
- **Offset.** Ledger only in v1; a constant day-1 card measures appetite for contributing; a pre-registered rule decides whether you revisit section 9.
- **Narrator.** Its eval is offline and optional during the cohort. Nothing about the tester build changes because of it; it ships after the decision only if it beats the templates.
- **Freeze vs weekly builds.** Both: a Thursday build each week, fixes only, plus any change that removes a guilt, shame or pressure trigger, logged with its date and M5 reported before and after.
- **The 22 kg constant.** Basket Home has no daily budget. The constant survives only on hidden screens.
- **Earlier informal testers.** `docs/APP_STATUS.md` says about 4; the website says "a small number of real people" (`docs/WEBSITE_STRUCTURE.md:84`). Invite them, leave them out of recruiting maths, keep the number off public pages.
- **The Xcode 27 fix.** Made durable with a config plugin on day 1 of week 1, because any prebuild deletes it.
- **Dormant reminders.** Deleted before Settings exists, because a Settings toggle that sets `daily_reminder_enabled` would switch on streak pushes and wipe other schedules.

---

## Appendix C: review notes kept or adjusted (one line each)

- The extraction gate date moved from the reviewer's Fri 16 Oct to Fri 23 Oct with the schedule shift; its purpose (a week before the lever gate, with room for a rerun) is kept.
- Device QA moved from Thu 22 to Sat 24 Oct to Thu 29 to Sat 31 Oct, and its log file is dated `2026-10-31` to match.
- The repo has 29 local migration files, not 28 as one review note said; the plan uses 29.
- The STARS OP-14 credit name was checked against the AASHE PDF; the "up to 6 points" figure could not be confirmed, so it is left out.
- One review note proposed a high-carbon template that said "about {y} kg lighter"; it was rewritten in low-carbon vocabulary to satisfy the lint and the diet-language concern.
- The message smoke test runs through three copies of the external screener form instead of a new `/` route, which reconciles "test headlines in weeks 1 to 2" with "defer the route split".
- M1 "within 72 hours of the first shop after install" cannot be observed for people who never scan, so the gated version is "within 7 days of install" (one weekly shop) and the 72-hour version is reported.
- The "do a bit more" card is shown from day 1 rather than moved to the exit survey, to keep a revealed-preference test of the offset question while keeping the treatment constant.
- Belonging was deferred rather than adopted, because the 5-person suppression rule would switch the line on mid-cohort.
- The lint's ban on "guilt" applies to tester-facing app and email copy, not the website, because the case study must describe the thesis by name; the website gets a narrower check plus the truth pass.
- The reviewer's proposed scope cuts were adopted, and the plan also moved the start date, because even after the cuts the estimate exceeds the time available.

---

**Key files (absolute paths):**
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/docs/GO_TO_MARKET_PLAN.md` (this document)
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/docs/APP_STATUS.md` (status of record)
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/supabase/functions/receipt-parse/index.ts`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/supabase/seed.sql`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/supabase/migrations/20260718000023_seed_shopping_factors.sql`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/supabase/migrations/20260718000025_create_receipts.sql`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/supabase/migrations/20260718000026_claim_receipt_item_entry_fn.sql`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/supabase/migrations/20260315000012_create_audit_log.sql`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/lib/receiptValidation.ts`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/lib/topMoves.ts`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/hooks/useNotifications.ts`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/hooks/useEmissionEntries.ts`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/hooks/useTrips.ts`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/hooks/useReceiptImport.ts`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/app.json`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/eas.json`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/ios/Podfile` (gitignored, local only)
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/eval/receipt-parse/README.md`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/eval/receipt-parse/RUN_LOG.md`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/docs/NORTH_STAR.md`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/docs/DESIGN_RESEARCH.md`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/docs/PMF_ANALYSIS.md`
- `/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian/docs/UAT_FINDINGS_2026-10-02.md`
