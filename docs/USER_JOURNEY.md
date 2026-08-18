# Veridian User Journey — Persona-Branched

*Rewritten August 2026. Supersedes the previous version, which mapped routes against the retired dark "Understory" direction and a four-tab IA that no longer exists.*

---

## 0. How to read this document

**Personas are canonical and defined elsewhere.** All four are specified in [`DESIGN_RESEARCH.md`](DESIGN_RESEARCH.md) § Personas. This document does not redefine them, does not add new ones, and does not extend their descriptions. Where a persona trait is load-bearing for a journey decision, it is quoted verbatim from `DESIGN_RESEARCH.md` and attributed. If a trait matters and isn't quoted here, look it up there — this document is downstream.

**The visual direction is canonical and defined elsewhere.** [`DESIGN_DIRECTION.md`](DESIGN_DIRECTION.md) ("Clearing", light-mode, Copilot-Money-modelled) is the current direction and explicitly supersedes "Understory". Anything in the codebase still carrying Understory assumptions is migration debt, tracked in § 5.

**Strategy is canonical and defined elsewhere.** [`NORTH_STAR.md`](NORTH_STAR.md) owns the product thesis, the roadmap, and the open decisions. Where this document touches an unresolved strategic question — notably the "hard outcome" hook — it quotes `NORTH_STAR.md` and stops there. It does not resolve it (§ 4).

**Every screen claim here was read from source**, not inferred from a spec. Friction points are tagged one of three ways:

| Tag | Meaning |
|---|---|
| **Confirmed bug / gap (being fixed)** | Reproducible defect, or a verified missing piece. A fix is landing in the same work session as this document. Do not re-diagnose. |
| **Design risk (flagged, not decided)** | The code works as written; the question is whether it *should* work that way for the persona. Needs a product call. |
| **Non-issue / strength** | Verified as working in the persona's favour. Recorded so it doesn't get "improved" away. |

---

## 1. Verified screen inventory

Read from `app/` on the current branch. This is the real route table, not the aspirational one.

### Tabs — three, confirmed from `app/(tabs)/_layout.tsx`

| Route file | `title` | Icon |
|---|---|---|
| `app/(tabs)/index.tsx` | **Today** | `home` |
| `app/(tabs)/trends.tsx` | **Trends** | `chart` |
| `app/(tabs)/profile.tsx` | **You** | `person` |

There is no Log tab. `app/log.tsx` is a **modal**, declared in `app/_layout.tsx` as `<Stack.Screen name="log" options={{ presentation: 'modal' }} />` and reached from a 28pt `+` button in the "Today" feed header (`app/(tabs)/index.tsx`, `styles.addButton`, `router.push('/log')`) and from the feed's empty-state CTA. This matches `DESIGN_DIRECTION.md` § Information architecture: "Log is demoted from a tab to a `+` affordance on Today."

The active tab carries a 4pt dot whose colour is `budgetStateColors[budgetStateFor(todayProgress)].accent` — today's budget state is expressed in the tab bar itself.

### Entry gates

- `app/(onboarding)/index.tsx` — 3-slide carousel, `Skip` always visible.
- `app/(onboarding)/calculator.tsx` — 8-question baseline calculator + results.
- `app/(auth)/` — `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`.
- `app/carbon-calculator.tsx` — the *post-auth* re-entry to the calculator, targeted by the baseline gate in `app/(tabs)/_layout.tsx`.

### Modals (declared in `app/_layout.tsx`, all behind `<Stack.Protected guard={!!session}>`)

`log.tsx` · `recap.tsx` · `passport.tsx` · `link-bank.tsx` · `import.tsx`

### Other route files

`app/entry/[id].tsx` (edit entry) · `app/challenge/[id].tsx` · `app/modal.tsx` · `app/+not-found.tsx`

Note: these four are **not enumerated** in the root `<Stack>` in `app/_layout.tsx`. They resolve through expo-router's file-based fallback and are therefore not wrapped in an explicit `Stack.Protected` guard the way the modals are. Worth a deliberate check that this is intended rather than incidental. *(Design risk, flagged, not decided.)*

### Global chrome

`VOfflineBanner` is mounted once in `RootLayout`, above `AppNavigator` — so it floats over every screen in every stack, not just the protected one.

---

## 2. The first-run trunk

```
(onboarding)/index.tsx  ──"Get Started"──▶  (onboarding)/calculator.tsx
        │                                            │
     "Skip"                                    8 questions
        │                                            ▼
        │                                    ResultsScreen
        │                                            │
        │                              setPendingBaseline(totalKg)
        │                                    → complete()
        │                                            ▼
        └────────────▶  (auth)/login.tsx     (auth)/signup.tsx
                              │                      │
                              └──────────┬───────────┘
                                         ▼
                                    (tabs) — Today
                                         │
                            baseline gate in (tabs)/_layout.tsx
                                         │
                        profile.baseline_kg == null ? → /carbon-calculator
```

**Baseline hand-off across signup is genuinely well-built.** `ResultsScreen.handleCta` branches: if a user already exists it calls `saveBaseline` directly; if not it stashes `pendingBaselineKg` in `useOnboardingStore`, marks onboarding complete, and pushes to signup. `(tabs)/_layout.tsx` then picks the pending value up after auth and clears the flag. A calculator result is never lost to the signup wall. *(Non-issue / strength.)*

**The Skip path drops users into a gate with no explanation.** `handleSkip` completes onboarding and routes to `login.tsx`. After login the tab layout's effect sees `profile.baseline_kg == null` and fires `router.replace('/carbon-calculator')`. The user skipped a calculator and lands in the same calculator, with no sentence explaining why. *(Design risk, flagged, not decided.)*

**Onboarding copy sells the product `NORTH_STAR.md` retired.** The three slides in `(onboarding)/index.tsx` read:

1. "Track your impact — Log food, transport, and energy in seconds."
2. "AI-powered insights — Claude analyses your emissions…"
3. "Challenge friends — Create reduction challenges, climb the leaderboard, and earn achievement badges."

Slide 3 renders a mock leaderboard (`MOCK_LEADERBOARD`: "Alex K. 12.4 kg", "Maria S. 15.1 kg"). `NORTH_STAR.md` §1 states the opposite thesis — "The manual log is the gate. The gate goes" — and §8 pattern 1 is titled "Today, Auto-Written". This is the first sixty seconds of the product arguing against itself; persona impact is broken out per-persona below. *(Design risk, flagged, not decided.)*

**The calculator is the cleanest already-migrated screen.** `(onboarding)/calculator.tsx` uses `Illustration` components from `components/illustrations/` with names like `transport.bike`, `food.vegan`, `energy.solar`, `shopping.minimal` — the custom line set specified in `DESIGN_DIRECTION.md` § Illustration. The in-file comment is explicit: "no emoji, ever". The `hasIcons` guard keeps each question homogeneous (either every option has a glyph or none do), which avoids the ragged half-illustrated list. *(Non-issue / strength.)*

**Calculator numbers are unsourced on screen.** `GLOBAL_AVG_KG = 4700` and `PARIS_TARGET_KG = 2500` are hardcoded, and every option hint is a round figure ("~2,500 kg/yr", "~3,300 kg/yr") with no provenance shown. The results screen renders `{totalTonnes}t` at 56pt as a confident primary-coloured number. *(Design risk, flagged, not decided — persona-specific severity below.)*

---

## 3. Persona-branched journeys

### 3.1 Persona #1 — "The Quiet Optimizer" (primary design target)

`DESIGN_RESEARCH.md`: *"Motivated by mastery over personal data, the aesthetic pleasure of a well-crafted app, effortless self-knowledge. Not 'saving the planet'…"* and *"Churns on a broken-trust moment (miscategorized transaction, wrong trip mode) far more than on price; any copy that moralizes; any UI that reads as generic eco-app — leaf icons, saturated green, cutesy illustration."* Explicitly *"Repelled by Duolingo-style gamification, badges framed as moral wins."*

#### First open

The onboarding carousel is the single worst-targeted surface in the app for this persona. Slide 3 leads with badges and a leaderboard — the exact two things `DESIGN_RESEARCH.md` lists them as repelled by — before they have seen a single real number. Slide 1 sells manual logging in seconds, which sets the expectation that this is a data-entry app; the actual product is the opposite. *(Design risk, flagged, not decided.)*

The calculator recovers well: illustration set, no emoji, no moralising, one question per screen with a live footprint counter in the footer. *(Non-issue / strength.)*

#### Daily use — Today

The hero is `BudgetRingHero` at 224pt with `HeroFootprintNumber` inside it. The count-up uses `withSequence(withTiming(...), withSpring(0, motion.springGentle))` on a glow pulse — high damping, short settle. The in-file comment names the rule: "an instrument doesn't bounce". This is exactly the register `DESIGN_DIRECTION.md` § Motion specifies. *(Non-issue / strength.)*

`EFFICACY_COPY` is the anti-guilt system working as designed:

```
calm:  'Plenty of headroom today'
watch: 'Tracking a touch high — one light choice keeps you in band'
over:  "Over today's band — tomorrow's a fresh start"
```

No red-as-shame, and the "over" line points forward. *(Non-issue / strength.)*

The confirm queue is a first-class surface: an `accentSoft`-filled card reading "3 moments to confirm / Takes about 10 seconds", opening a `VBottomSheet` that pages one `ConfirmCard` at a time with a snapshotted queue (`openReview` copies `needsConfirmation` into local state so live invalidations can't reshuffle the index mid-review). One primary "Yes, that's right" plus five mode chips plus a quiet "Not a trip". This is `NORTH_STAR.md` §3's Copilot mechanic, correctly built. *(Non-issue / strength.)*

Estimated values are visually demoted. `ImpactPill` renders a spend-derived value in `feedStyles.estimatedChip` — muted background, italic, `textSecondary` — while a sensor-measured value gets the plain `mono` treatment. The in-file comment cites `NORTH_STAR.md` §5: "an estimate never LOOKS like a confident number". For the persona that churns on broken trust, this is the highest-value detail on the screen. *(Non-issue / strength.)*

**Two divergent confirm surfaces for one queue.** Both `app/(tabs)/index.tsx` and `app/log.tsx` read `needsConfirmation` from `useTripsContext()` and render it with different copy and different affordances. Today gives "Yes, that's right" / "Yes — nice one" plus mode chips in a paged sheet; `log.tsx` gives a "Detected trips" list with a compact "Confirm" / "Nice!" button and an `X`. The *pipeline* was unified per `NORTH_STAR.md` §7.3; the *UI* was not. A user who opens `+` mid-review sees the same trips styled as a different feature. *(Design risk, flagged, not decided.)*

**Leaf iconography as decoration.** `DESIGN_DIRECTION.md` § "What Clearing is NOT" opens with "No leaf iconography as decoration." `VIcon name="leaf"` currently appears in the Today empty state, the Trends empty state, the Recap share card wordmark, and the Passport card mark. *(Design risk, flagged, not decided.)*

#### Daily use — the `+` manual log

Header copy is right on thesis: "Add manually" / "Most things track themselves — this is for the rest." *(Non-issue / strength.)*

**Category chip clipping.** The Shopping and Transport chips on `app/log.tsx` wrapped and clipped their labels — `styles.categoryChip` is `flex: 1` with `justifyContent: 'center'` and no horizontal padding or truncation, and the row renders four chips rather than three once `availableCategories` picks up the seeded `shopping` factors. **Confirmed bug (being fixed in this session.)** Persona impact: a clipped label on the first manual-entry screen is a craft failure in front of the persona `DESIGN_RESEARCH.md` says pays *for* craft (Flighty's survey: "good design as the #1 requested feature").

**Raw NAICS group headers in the Shopping factor picker.** `log.tsx` groups factors by `f.subcategory` and renders `humanizeSubcategory(subcategory)` as the group label. For shopping rows seeded by `supabase/migrations/20260718000023_seed_shopping_factors.sql`, `subcategory` *is* the six-digit NAICS code — `'442110'`, `'443142'`, `'448140'` — and `humanizeSubcategory` has no override for numerics, so it returns the digits unchanged. The user saw "442110" as a section heading. **Confirmed bug (being fixed in this session via the new `lib/naicsGroups.ts`.)** Persona impact: this is a literal database internal leaking into the UI. For a persona defined by *"mastery over personal data"*, an unexplained numeric code reads as either a bug or a secret — both corrode trust.

Note the same raw value surfaces a second time: `app/entry/[id].tsx` renders `entry.emission_factors.subcategory` directly, with no `humanizeSubcategory` call at all. Worth confirming the `naicsGroups` fix covers that surface too.

**No carbon-literacy comparison anywhere in the running app.** Outside the calculator's two static chips ("Global avg: 4.7t", "Paris target: 2.5t"), no screen answered "is 4.2 kg a lot?". **Being fixed in this session via the new `lib/impactCopy.ts`**, which supplies `drivingComparisonCaption(kg)` → "About a 6 km drive" and `globalAverageComparisonCaption(...)` → "14% below the global average", with voice rules pinned in the file header ("State a fact, then give one plain equivalent. Nothing more… No exclamation points. No emoji."). Persona impact: this persona doesn't want to be taught; they want a second axis to reason on. The caption form — stated once, muted, never a tooltip — is the right register for them.

**Celebration motion on the log sheet is off-register.** `handleLog` fires `ParticleBurst` (12 particles, outward spring), the quick-slot card plays a `withSpring(1, motion.springBouncy)` "stamp", and the CTA is a `LinearGradient`. `DESIGN_DIRECTION.md` § Motion is explicit: "an instrument doesn't bounce… Target: `damping: 30, stiffness: 220`", and § "What Clearing is NOT" rules out confetti. *(Design risk, flagged, not decided.)*

#### Weekly use — Trends and Recap

`StoryCard` composes a real sentence from the data — the template resolves to lines like "Transport drove 62% of your week — Tuesday was your biggest day." (numbers illustrative) — and the month-over-month delta chip uses `colors.warningGlow` / `colors.warning` when the number rises, never a danger colour. The in-file comment cites §8.4 by name. *(Non-issue / strength.)*

**"Streak" is still a Personal Record.** The records row is Best day / Best week / **Streak**, fed by `useStreak`. `NORTH_STAR.md` §8 pattern 5 is "Momentum, Not Streaks — rolling 7-day band that decays gently; no breakable chains, ever", and `DESIGN_DIRECTION.md` bans streaks outright. Today and You both correctly use `VMomentumBand`; Trends kept the raw streak counter. Inconsistent, and it's the one metric on the screen that can *break*. *(Design risk, flagged, not decided.)*

Recap is four pages ending in a screenshot-shareable card with a `deltaSentence` chip and "Screenshot to share your week". Restrained `FadeIn`/`FadeInDown` entrances, no confetti. *(Non-issue / strength.)*

#### Periodic use — Passport and You

Passport page 3 is the thesis rendered as an artifact: a hero count of `tripsTrackedThemselves` under the line **"No typing. No logging. Just your life, ledgered."** Page 5 is the evergreen gradient passport card — the one deliberate dark surface, with an in-file comment explaining exactly why its text colours are hardcoded whites rather than Clearing tokens. This is `NORTH_STAR.md` §8's growth artifact, built correctly. *(Non-issue / strength.)*

**Passport has exactly one entry point, three sections deep.** It is only reachable from a row in `app/(tabs)/profile.tsx`, below Achievements, Challenges and Linked accounts. `DESIGN_DIRECTION.md` § IA says "Passport moves under You, **reachable from Today's weekly summary**" — but both Today affordances (`WeekTeaserCard` and "See the whole week") route to `/recap`. The most shareable object in the product is the hardest one to find. *(Design risk, flagged, not decided.)*

**Gamification cluster on the You tab.** The tab currently leads with `Grove` (procedural tree silhouettes, one per ~50 kg avoided), then an Achievements shelf with `VToast` "Badge unlocked: {name}", then Challenges with "Race a friend to a smaller footprint" and a trophy icon. `DESIGN_RESEARCH.md` lists this persona as *"Repelled by Duolingo-style gamification, badges framed as moral wins."* **Flagged as anti-persona risk and being toned down — not removed — in this same session.**

Worth recording the nuance found while reading: challenges are **private, invite-code** (`useCreateChallenge` → `invite_code`, shared via `Share.share`), not a public leaderboard. The mechanic is closer to a two-person bet than to a virtue ranking, which is materially less anti-persona than the onboarding slide advertising "climb the leaderboard" implies. The slide is worse than the feature.

`link-bank.tsx` is a genuine highlight: three plain-language trust lines — "We never see your credentials", "Unlink anytime, from your Profile", "Bank-level encryption, handled by Plaid" — matching `NORTH_STAR.md` §5's "the bank-connect screen is the highest-leverage conversion surface in the app". *(Non-issue / strength.)*

---

### 3.2 Persona #2 — "The Systems Optimizer" (secondary, roadmap)

`DESIGN_RESEARCH.md`: *"28–50, engineer/tech-adjacent, often EV + home solar, runs a budgeting spreadsheet. Motivated by optimization as a hobby and by **money**, not virtue… Tolerates and wants more data density than #1. Candidate for an eventual expert mode."*

#### First open

The calculator's eight questions with visible per-option magnitudes ("~2,500 kg/yr", "×1.5") let this persona reverse-engineer the model as they answer — they can see it is a lookup-times-multiplier estimate, which is honest. The results breakdown by Transport / Food / Home / Shopping gives them four levers immediately. *(Non-issue / strength.)*

The friction is that the model stops there. `calcFootprint` is a pure exported function, but nothing on screen says where `TRANSPORT_BASE` or `GLOBAL_AVG_KG = 4700` came from. This persona will want the citation more than any other. *(Design risk, flagged, not decided.)*

#### Daily use

The ring measures against `DAILY_CARBON_BUDGET_KG = 22` — a **global constant** in `types/emission.ts`, identical for every user, despite the app having just captured that user's personal `baseline_kg` through the calculator and gating tab access on it. For a persona whose entire motivation is optimisation against a target, being measured against a stranger's target is the central design problem on Today. *(Design risk, flagged, not decided.)*

#### The density ceiling

The ledger records far more than the UI shows. `lib/spendFactors.ts` computes a `factorRef` string — e.g. `"USEEIO v1.3.0 · NAICS 445110"` — plus `naicsCode`, a crosswalk `confidence`, and an `isFallback` flag. **`factorRef` appears nowhere in `app/` or `components/`.** The feed's `estimatedChip` conveys "this is an estimate" but not *which* factor, *which* version, or *how* confident. `app/entry/[id].tsx` — the one screen that could be the expert view — offers a category badge, the item name, the raw subcategory string, a quantity field, and an "Estimated:" line rendered to three decimals.

That three-decimal figure is the sharpest small irony in the app: the screen with the *least* provenance shows the *most* significant figures. `NORTH_STAR.md` §5 warns that "false precision is a documented churn driver". *(Design risk, flagged, not decided.)*

Trends offers Today/Week/Month, a bar chart, a composition bar with tappable legend filtering, three records, and a swipe-to-delete entry list. There is no export, no table view, no raw-number surface. `DESIGN_RESEARCH.md` calls this persona a *"Candidate for an eventual expert mode"* — nothing in the current build is that mode, which is consistent with #2 being explicitly secondary/roadmap. Recorded as a gap, not a defect.

#### The thing that actually decides this persona

See § 4. It is not a UI problem and this document does not treat it as one.

---

### 3.3 Persona #3 — "The Committed Reducer" (amplifier, not revenue base)

`DESIGN_RESEARCH.md`: *"22–35, values-driven, climate-identity-forward. This is the Earth Hero power user. Least spare income, highest guilt-fatigue, highest skepticism toward numbers that look like greenwashing. Will fact-check estimates fastest and churn hardest on a trust violation. Valuable for word-of-mouth. Not the paying core."*

#### First open

This is the one persona the current onboarding carousel is actually calibrated for — challenges, badges, community. That is precisely the problem `DESIGN_RESEARCH.md` § "What this means for the design" identifies about Klima: *"Its look is calibrated for Persona #3 — the segment least likely to subscribe."* The onboarding is currently doing Klima's job. *(Design risk, flagged, not decided.)*

#### Daily use — where trust is won

The confirm card's hint line is well-judged for a sceptic: `"Roughly ${formatKgChip(estimate)} if we log it as a drive."` — hedged, conditional, and it names the assumption being made. Likewise the walk/cycle case: `` `Zero emissions — you saved ${formatKgChip(estimate)} vs driving.` `` — a stated comparison against a named alternative rather than a claimed absolute good. *(Non-issue / strength.)*

Zero-emission modes are celebrated rather than merely tolerated: walk and cycle trips get their own feed rows with a `savedChip`, a `primaryGlowSoft` row wash, and "Yes — nice one" on the confirm button. This is `NORTH_STAR.md` §4's "Walking gets reinstated… zero-carbon modes are the celebration engine". *(Non-issue / strength.)*

#### Where this persona will fact-check first

The unsourced numbers land hardest here. `DAILY_CARBON_BUDGET_KG = 22` with no derivation, `GLOBAL_AVG_KG = 4700` and `PARIS_TARGET_KG = 2500` hardcoded in the calculator, and hint values like "~3,500 kg/yr" for frequent flights. This persona *"will fact-check estimates fastest"*, and every one of these is a number they can check and none of them says where it came from. `NORTH_STAR.md` §5 already commits to the countermeasure — "Every spend-based number is labeled as an estimate with disclosed uncertainty" — which the feed's `estimatedChip` does but the calculator does not. *(Design risk, flagged, not decided.)*

The new `lib/impactCopy.ts` helps here for a different reason than it helps #1: it derives the driving comparison from `CAR_KG_PER_KM`, the same factor `tripEngine` uses to price and credit trips, so the caption is internally consistent with the ledger rather than a separate marketing number. That consistency is checkable, which is exactly what this persona does.

**Promise/delivery mismatch on AI.** Onboarding slide 2 promises "Claude analyses your emissions and gives you one specific, actionable step — every day." On Today, `emissionContext` is set to `null` whenever `moves.length > 0`, with the comment: "When Top Moves are available, skip the AI Edge Function entirely (saves the Claude call)." `useTopMoves` is a pure client-side ranking over already-fetched entries. So the advertised daily Claude analysis is, for most active users, a local heuristic. The Top Moves output is good — its templates resolve to lines like "Cycle 8 km of your 40 km of driving" and "Beef is your top source at 6.2 kg/wk" (numbers illustrative) — but it is not what was promised, and this is the persona most likely to notice. *(Design risk, flagged, not decided.)*

#### Weekly and periodic

Recap and Passport are the strongest surfaces for this persona and also the most shareable, which matters because `DESIGN_RESEARCH.md` values #3 for *"word-of-mouth"*. Both currently end on "Screenshot to share" rather than a share sheet, even though `Share.share` is already imported and used in `profile.tsx` for challenge invite codes. Low-cost gap in the growth loop. *(Design risk, flagged, not decided.)*

---

### 3.4 Anti-persona check — "The Offset Absolver"

`DESIGN_RESEARCH.md` defines this persona as wanting *"to pay for a clean conscience with minimal engagement"*, and notes `NORTH_STAR` §9 already rejects the model ("Reduction, not absolution").

**The app is clean on the substance.** There is no offset purchase flow, no marketplace, no "you are now carbon neutral" state, and no moral-closure moment anywhere in `app/`. Monetisation surfaces do not exist yet in the UI at all. *(Non-issue / strength.)*

**The Grove borrows offset visual grammar.** `profile.tsx` renders tree silhouettes at one tree per ~50 kg avoided, above a "{n} kg never emitted" line. Trees-as-earned-units is the visual language of tree-planting offset products, even though the underlying quantity here is avoided emissions rather than purchased credits. The framing is defensible; the imagery reads as absolution. Worth resolving as part of the same toning-down pass already underway on this tab. *(Design risk, flagged, not decided.)*

---

## 4. OPEN — the "hard outcome" hook (Persona #2)

**This is unresolved, and this document does not resolve it.**

`NORTH_STAR.md` § 9 (Business model) states:

> **Find the hard outcome** (Root's lesson: passive tracking endures when tied to money/time the user already values). Candidates to explore post-v1: money saved via the swap engine (Top Moves already computes this), commute/expense export, EV/utility incentive matching, insurance partnerships. This is the open strategic question — see §11.

`NORTH_STAR.md` § 11 (Open decisions — need Vedant's call), item 2:

> **The hard outcome** to anchor monetization (§9). Needs a positioning decision before Sprint D pricing.

And § 12 (Risks & mitigations) lists the mitigation for "Consumer carbon monetization graveyard (Greenly et al.)" as:

> Subscription for intelligence, not offsets; **pursue hard-outcome hook**; keep burn small.

`DESIGN_RESEARCH.md` ties the persona to it directly: Persona #2 is *"the persona for whom the 'hard outcome' hook (utility/insurance/expense integration) would be *the* feature"*, and *"Churns if the hard-outcome hook never ships and the app stays pure-awareness — the exact failure mode that killed Miles despite good tech."* `DESIGN_DIRECTION.md` § Open questions carried forward, item 3, repeats it: *"The 'hard outcome' hook (`NORTH_STAR` §11) remains unbuilt. Persona #2 churns without it."*

**What this means for the journey map.** Persona #2's journey as documented in § 3.2 is complete only up to the awareness layer. There is no hook screen, no hook surface, and no hook step to trace, because the decision has not been made. Four candidates are named in §9 and none has been selected. Anyone building against this document should treat § 3.2 as a journey with a known missing terminus, not as a finished journey.

**Do not infer the answer from the codebase.** `lib/topMoves.ts` computes kg-based swap rankings; it does not compute money saved. The presence of a swap engine is not evidence that "money saved via the swap engine" is the chosen hook — it is one of four listed candidates, and §11 says the positioning decision is still owed.

---

## 5. Open visual-migration debt

Tracked separately from § 3 because these are direction-migration leftovers, not persona friction. **The passport item below is not being fixed in this session.**

**`app/passport.tsx` still ships a grain-texture overlay.** `NoiseOverlay()` (lines ~35–78) builds a memoised, seeded scatter of 90 hairline dots at 2–4% opacity in `colors.textPrimary`, rendered via `styles.noiseOverlay` across the full screen. It is mounted twice — once in the not-enough-data branch and once in the main story branch. The in-file comment describes it as "Atmosphere — a static, battery-cheap grain overlay… this is texture, not motion."

Grain/paper texture was an Understory device, built for dark editorial surfaces. `DESIGN_DIRECTION.md` § Why Understory was wrong retires that direction wholesale, and Clearing's neutrals (`canvas #FCFCFD`, `surface #FFFFFF`) are near-white grounds where near-black dots at 2–4% read as dirt rather than atmosphere. **Open. Needs a direction call on whether Passport keeps any texture at all — not a silent deletion, since Passport is one of the two screens where `DESIGN_DIRECTION.md` explicitly permits extra warmth.**

Related, already tracked upstream (listed for completeness, not as new findings):

- **Photography grading.** `DESIGN_DIRECTION.md` § Open questions item 2 flags the `hero-*.jpg` set as chosen for a dark treatment. Both `(onboarding)/index.tsx` and `(onboarding)/calculator.tsx` currently compensate with a `rgba(255,255,255,0.14)` wash and an in-file comment pointing at that open question. Interim, acknowledged.
- **Dark-surface holdovers in light-mode chrome.** `calculator.tsx` `styles.headerChip` uses `backgroundColor: 'rgba(13,17,23,0.55)'`; several screens reference a token literally named `colors.trackOnDark` (Passport/Recap story progress tracks, Today's empty week dots, Trends' zero-value bars). Both are consistent with Clearing only if those tokens have been re-pointed at light-ground values in `lib/theme.ts` — worth a confirming pass during the token sweep.

---

## 6. Edge and recovery branches

All three verified in source.

**Offline.** `VOfflineBanner` (`components/ui/VOfflineBanner.tsx`) is mounted once in `RootLayout` in `app/_layout.tsx`, above `AppNavigator`, so it overlays every stack. It watches `useNetInfo`, renders nothing while `isConnected === null` (avoiding a false flash on cold start), and slides in on a **measured** height rather than a guessed constant (`onLayout` → `setMeasuredHeight`). It is `pointerEvents="none"` and carries `accessibilityLiveRegion="polite"`. Copy: "You are offline — entries will sync when connected."

That promise is now backed: `useOfflineQueue(mutateAsync)` is wired in `AppNavigator`, and `log.tsx`'s quick-slot path uses `useDurableCreateEntry`, whose comment states that "offline/network failures enqueue silently (VOfflineBanner already tells the user they're offline) and still play the success haptic". This closes `NORTH_STAR.md` §7.4 ("`useOfflineQueue` is built, tested, mounted — and never called"). *(Non-issue / strength.)*

One inconsistency: only the quick-slot path is durable. The sheet-based manual log path (`handleLog` → `createEntry.mutate`) does **not** route through the offline queue, so a user who logs via the bottom sheet while offline gets a different outcome from one who taps a quick slot — while the banner overhead promises both will sync. *(Design risk, flagged, not decided.)*

**404.** `app/+not-found.tsx` exists and is minimal: a `<Stack.Screen options={{ title: 'Not Found' }} />`, "Screen not found", and a `<Link href="/">Go home</Link>`. It uses `colors` tokens rather than hardcoded hex, so it will inherit the Clearing palette, but it has no `VText`, no illustration, and no `SafeAreaView`. `DESIGN_DIRECTION.md` § Execution plan puts 404 in Phase 5 (Remainder) — correctly deprioritised, but it should not stay a bare `Text` when the empty-state illustrations in `components/illustrations/` already cover "no connection" and "empty feed".

**Deep-link re-entry.** Two paths re-enter mid-stack rather than at the trunk:

1. *Password reset* — `(auth)/forgot-password.tsx` → email → `(auth)/reset-password.tsx` opens directly into the auth group with no session, then returns to `login.tsx`.
2. *Post-auth cold start* — `RootLayout` holds the splash (`SplashScreen.preventAutoHideAsync()`, released only once `!isLoading && isChecked`), then `Stack.Protected guard={!!session}` mounts the tabs directly, and `(tabs)/_layout.tsx`'s effect may immediately `router.replace('/carbon-calculator')`.

The gate in `(tabs)/_layout.tsx` guards correctly against firing mid-fetch (`if (profileLoading || profileFetching) return;`) and against double-firing after a pending baseline save (the `useBaseline.onSuccess` cache patch). Anything that changes profile loading behaviour must preserve both conditions or the redirect will loop. *(Non-issue / strength, with a standing regression risk worth naming in any auth or profile refactor.)*

---

## 7. Summary of open items

| # | Item | Tag | Owner surface |
|---|---|---|---|
| 1 | Log category chip clipping | Confirmed bug (being fixed) | `app/log.tsx` |
| 2 | Raw NAICS group headers in Shopping picker | Confirmed bug (being fixed) | `app/log.tsx`, new `lib/naicsGroups.ts` — check `app/entry/[id].tsx` too |
| 3 | No carbon-literacy comparison caption | Confirmed gap (being fixed) | new `lib/impactCopy.ts` — caption still needs wiring into screens |
| 4 | Grove / Achievements / Challenges anti-persona weight | Flagged, being toned down (not removed) | `app/(tabs)/profile.tsx` |
| 5 | Passport grain-texture overlay | **Open — not being fixed this session** | `app/passport.tsx` `NoiseOverlay` |
| 6 | Onboarding sells logging, badges, leaderboard | Design risk | `app/(onboarding)/index.tsx` |
| 7 | `DAILY_CARBON_BUDGET_KG = 22` ignores personal baseline | Design risk | `types/emission.ts`, Today ring |
| 8 | Two divergent confirm UIs over one queue | Design risk | Today sheet vs `log.tsx` |
| 9 | "Streak" survives as a Personal Record | Design risk | `app/(tabs)/trends.tsx` |
| 10 | Provenance (`factorRef`, confidence) never surfaced | Design risk | `app/entry/[id].tsx` |
| 11 | Passport reachable from one place only | Design risk | `app/(tabs)/profile.tsx`, Today teaser |
| 12 | Leaf icon used decoratively | Design risk | Today, Trends, Recap, Passport |
| 13 | AI promised in onboarding, skipped when Top Moves exist | Design risk | `app/(tabs)/index.tsx` |
| 14 | Sheet log path bypasses the durable offline queue | Design risk | `app/log.tsx` `handleLog` |
| 15 | Unsourced constants in the calculator | Design risk | `app/(onboarding)/calculator.tsx` |
| 16 | Recap/Passport end at "screenshot", no share sheet | Design risk | `app/recap.tsx`, `app/passport.tsx` |
| 17 | `entry/`, `challenge/`, `modal`, `+not-found` not enumerated in root Stack | Design risk | `app/_layout.tsx` |
| 18 | Hard-outcome hook | **Open strategic decision — `NORTH_STAR.md` §11.2** | Not a UI surface |
