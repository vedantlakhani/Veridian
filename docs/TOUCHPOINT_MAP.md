# Veridian — End-to-End Touchpoint Map

*Written 29 August 2026. Source of truth: the code on `main` at commit `0742c3d`, plus `docs/NORTH_STAR.md`, `docs/PRD.md`, `docs/USER_JOURNEY.md`, `docs/DESIGN_DIRECTION.md`, `docs/DESIGN_REQUIREMENTS.md`, `docs/DESIGN_RESEARCH.md`, `docs/PMF_ANALYSIS.md`, and the shipped marketing site under `website/`.*

---

## 0. Status of this document — read this first

**This is a DESIGNED journey, not an evidence-backed journey map.**

Veridian is pre-launch. There are no shipped users, no analytics pipeline, no funnel instrumentation, no retention cohorts, and no formal customer discovery interviews. What *does* exist, and must not be erased: `docs/PMF_ANALYSIS.md:73` records "a small amount of informal phone-testing feedback (which drove real fixes this session — the NAICS-code confusion, the chip bug, the missing carbon-literacy copy)." That is real user contact. It is not discovery research, and `PMF_ANALYSIS.md` says so directly, in full:

> "No real customer interviews exist yet to source this-quarter/this-year objectives in the customer's own words." — `docs/PMF_ANALYSIS.md:70`

The Five-Dimension Target Customer dossier in `PMF_ANALYSIS.md` §2 therefore comes back **DRAFT**, with "Objectives" and "Sharp Problems" flagged as gaps.

| What this document contains | What it does not |
|---|---|
| The journey **derived from** the autopilot thesis (`NORTH_STAR.md` §1–3) and what the code actually does | Any observed user behaviour at scale |
| Every touchpoint traced to a file and line, verified against source | Any usage, activation, retention, or funnel number |
| Labeled design **assumptions** about what a user will feel and do | Interview quotes, survey results, or session recordings |
| A named aha moment, cited to the strategy doc that already names it | A validated aha moment (validating it needs `PMF_ANALYSIS.md` §4's discovery week) |
| A distinction, held throughout, between **designed**, **shipped**, and **specced-but-unbuilt** | Roadmap language presented as shipped behaviour |

Every "the user feels / the user does" statement below is **design intent**, tagged **[ASSUMPTION]** where it is load-bearing. Where a number about user behaviour would normally go, this document writes **no data — pre-launch**.

**Two corrections to the inputs this map was built from.**

1. The screen-inventory brief supplied for this work omits three live surfaces on the Today tab: the daily-review entry card (`app/(tabs)/index.tsx:1235`), the paged confirm sheet (`app/(tabs)/index.tsx:1371–1382`), and the live-trip card (`app/(tabs)/index.tsx:1232`). Those three are the autopilot's primary user-facing loop. They are read from source and included here.
2. The brief begins at the app splash. **The app is not the first touchpoint.** `website/` is a shipped Vite marketing site with a working waitlist, and it is today the *only* surface a real person can actually reach. It is included as §2.A0.

---

## 1. The spine

### 1.1 THE AHA MOMENT — already named in the strategy doc

The aha moment is not a new derivation. It is written down:

> **"Empty States as Invitations — first-run previews the shape of the feed; the first detected trip visibly fills the ring (the aha moment)."** — `docs/NORTH_STAR.md:142` (§8, pattern 8)

**Doc-consistency defect, flagged:** `docs/PMF_ANALYSIS.md:19` states the opposite — *"Veridian has never formally named its 'aha moment' (first successful silent autopilot confirm? first Passport share?)"* — and recommends running the `aha-mapper` framework. Both documents are on `main`. One of them is wrong. `NORTH_STAR.md:142` is the earlier and more canonical statement; `PMF_ANALYSIS.md:19` should be corrected to "named in `NORTH_STAR.md` §8 pattern 8, never validated," which is the true and more useful sentence.

**The working definition this map uses**, tightened against the code:

> **The aha moment is the first time the user opens Veridian and finds a trip already in the ledger that they never typed — and resolves it in one tap.**

Concretely, in code, three sequences can produce it — and they are not equivalent:

- **Silent car variant (high confidence):** `decideTripAction` returns `auto_confirmed`, `useTrips` writes the emission entry, fires *"Trip logged — 4.2 km drive · 0.9 kg CO₂e"* (`hooks/useTrips.ts:434–437`), and the trip appears as a `FeedRow` under "Today" (`app/(tabs)/index.tsx:1295`). **The ring moves.** The user did nothing.
- **Confirm variant (ambiguous):** the trip lands `needs_confirmation`, the batched *"1 trip spotted — takes about 10 seconds to confirm — open Veridian"* notification fires (`hooks/useTrips.ts:645–648`), Today renders the review card (`app/(tabs)/index.tsx:1235`), and the paged `ConfirmCard` (sheet at `app/(tabs)/index.tsx:1371`) resolves it with one primary tap. For a non-zero-emission mode the confirm writes an entry (`hooks/useTrips.ts:880–890`) and **the ring moves.**
- **Zero-emission variant (walk/cycle auto-confirmed) — the ring does NOT move.** See §1.3b. This is a real defect in the aha path, not a definitional quibble.

### 1.2 Why this and not the other two candidates

**Candidate B — the first Weekly Recap.** Rejected as the *aha*, accepted as the *retention ritual*. Three reasons. (1) **Timing:** `app/(tabs)/index.tsx:1335` gates the week teaser on `recap.distinctDays >= 2`, and `hooks/useWeeklyRecap.ts:131` gates readiness on `currentKg > 0 || weekTrips.length > 0` — the earliest a meaningful recap exists is day 2–3, and the scheduled invitation is Sunday 18:30 (`lib/recapNotification.ts:26–28`). An activation moment that requires surviving to Sunday is a thing you measure *after* activation. (2) **Substitutability:** a recap over manually-typed data is indistinguishable from a recap in any logging app. It renders the ledger; it does not prove the ledger wrote itself. (3) **Thesis:** `NORTH_STAR.md` §1 is *"your only job is an occasional one-tap confirmation"* — the recap contains no confirmation.

**Candidate C — the first Carbon Passport.** Rejected as the aha, accepted as the **growth artifact**. `NORTH_STAR.md:151` is explicit that it is modeled on Flighty's Digital Passport, which the founder cites as a top-3 *organic growth* driver — growth, not activation. It is also monthly by default (`app/passport.tsx:451`), lives three levels deep behind one entry point (`app/(tabs)/profile.tsx:572`), and is what a *retained* user shows someone else. Naming it the aha would put the product's activation event ~30 days after install.

**Why A wins.**

1. **The strategy doc already says so** (`NORTH_STAR.md:142`). Everything below is corroboration, not derivation.
2. **It is the only candidate that is the thesis itself.** `NORTH_STAR.md:58`: *"The loop is the product."* Recap and Passport are renderings *of* the loop's output. If the loop never fires, both are logging-app features.
3. **It can happen on the very first app open.** `NORTH_STAR.md:69` and `hooks/useTrips.ts:470–492` describe retroactive CoreMotion history — the OS already logged up to 7 days of walk/cycle/automotive segments before Veridian was installed. A user who installs on Tuesday can, in principle, open the app and find last Friday's drive already in the ledger. **Caveat, load-bearing:** `hooks/useTrips.ts:474–480` is explicit that `VeridianMotion.isAvailable()` is false in Expo Go **and on simulators**, in which case GPS trips pass through `fuseSignals` unchanged and there is no retroactive history at all.
4. **It is the moment that is falsifiable.** `docs/DESIGN_DIRECTION.md:19` names the primary persona as churning on *"a broken-trust moment (a miscategorized transaction, a wrong trip mode) far faster than on price."* The first detection is simultaneously the promise and the trust test. Recap and Passport cannot fail in a way that disproves the product; a wrong first trip mode can.
5. **Adjacent-category precedent points here** — with the evidence stated at its actual strength. `NORTH_STAR.md:58` ports Copilot Money's mechanic and records only that Copilot users report manual work *"nearly disappears"* after 2–3 weeks. **There is no source in this repo for what Copilot's own aha moment is**; any claim about it would be invention. What the repo does have is the JTBD in the same shape: *"Know my carbon footprint is being tracked accurately without having to think about it — the way Copilot already handles my spending"* (`docs/PMF_ANALYSIS.md:76`).

**One superlative the earlier draft of this map over-claimed, corrected here.** It is *not* supportable that "no other consumer carbon app can do this." What `NORTH_STAR.md:17–24` supports is narrower and still strong: no *surviving* consumer carbon app combines all four proven ingredients, and Miles and Capture each shipped **one** signal only. Separately, `NORTH_STAR.md:69` notes that no React Native library exposes `CMMotionActivityManager` — a tooling claim, not a competitive moat.

### 1.3 Two things that break the aha before it can land

**(a) The false aha — a confident number before any input.** The first large number a user sees is not a detection. `app/(onboarding)/calculator.tsx:829` renders `<FooterCounter totalKg={calcFootprint(answers)} />` with `answers = {}`, and `calcFootprint` (`:168–185`) defaults every unanswered key: `500 + 2200 + 2400 + 300 + 400` = a confident **5,800 kg** on step 0, before the first question is answered.

This is the anti-aha. It teaches, in the first sixty seconds, that Veridian's numbers appear without inputs — the exact false-precision failure `NORTH_STAR.md` §5 names as a churn driver. **The designed first-run must move the first meaningful number from the calculator to the first detection.**

**(b) The zero-emission path fires the celebration and never moves the ring.** `lib/tripEngine.ts:41` auto-confirms walk/cycle at ≥0.5 km, and `hooks/useTrips.ts:608–613` fires *"Nice walk! · 3.1 km on foot · You avoided 0.55 kg CO₂"*. But:

- `hooks/useTrips.ts:361` filters `carRows = rows.filter((t) => t.mode === 'car')`, and only `carRows` are matched against `emission_entries` (`:363–373`).
- Zero-emission auto-logs are constructed with `kgCo2e: 0, entryId: ''` (`:375–386`). **No `emission_entries` row is ever written for a walk or cycle trip.**
- `confirmTripMutation` does the same on the confirm path: `const zeroEmission = mode === 'walk' || mode === 'cycling'`, and the `createDurable` call is skipped entirely for those modes (`hooks/useTrips.ts:857–890`).

The trip *does* appear in the Today feed — `feedItems` explicitly pulls walk/cycling auto-logs as `kind: 'trip'` rows with a `savedKg` (`app/(tabs)/index.tsx:1033–1044`). So the user gets a notification, a feed row, and an avoided-kg figure, and **the ring does not move.** `NORTH_STAR.md:82` calls zero-carbon modes *"the celebration engine."* Today the celebration engine is the one path that cannot produce the aha as `NORTH_STAR.md:142` defines it ("visibly fills the ring"). Either the ring definition or the ledger treatment has to change; the ambiguity should not survive into the demo.

### 1.4 The secondary moments (named, so they don't compete with the aha)

| Moment | What it is | Where it lives | Status |
|---|---|---|---|
| **Aha** | First untyped trip resolved in one tap | Today feed + review sheet | Shipped (car path); broken on the zero-emission path (§1.3b) |
| **Trust test** | First *correction* of a wrong mode | `ConfirmCard` mode chips, `app/(tabs)/index.tsx:708` | Shipped |
| **Retention ritual** | Sunday recap | `app/recap.tsx`, `lib/recapNotification.ts` | Shipped; not deep-linked (§3.3b) |
| **The quiet moment** | The confirm queue shrinking week over week | — | **Not possible today.** The learning loop is unbuilt — see §4.1 |
| **Growth artifact** | Monthly Passport | `app/passport.tsx` | Shipped; one entry point, three levels deep; no share action |

### 1.5 FIRST RUN (minute 0 – minute 4)

**Screen path:** splash → `/(onboarding)` → `/calculator` → `/(auth)/signup` → email confirmation (out of app) → `/(auth)/login` → `/(tabs)` Today. *(There is a materially shorter path — Apple Sign-In, §2.B5 — which no onboarding flow routes to.)*

| Step | File | State |
|---|---|---|
| Splash held | `app/_layout.tsx:66–70` | Renders `null` until both auth and onboarding stores resolve (`if (isLoading \|\| !isChecked) return null`). No branded interstitial exists between the OS splash and the first route, and no timeout branch if either store never resolves. |
| Carousel | `app/(onboarding)/index.tsx` | Three static slides. Slide 2 renders a hardcoded `MOCK_INSIGHT` (`:79–86`) through `VAiInsightCard` with `isLoading={false} error={null}`. Slide 3 renders `MOCK_LEADERBOARD` (`:88–91`). |
| Notification ask | `app/(onboarding)/index.tsx:152–173` | Dynamic-imported `requestPermissionsAsync` inside an empty `catch`, still carrying a `// TODO: 05-03` comment. Denial or module absence renders **nothing** — no state change, no navigation. |
| Calculator | `app/(onboarding)/calculator.tsx` | 8 questions, one card per step, animated slide, running footer. **No back, no skip, no close** anywhere in the file. Footer shows 5,800 kg at step 0 (§1.3a). |
| Results | `app/(onboarding)/calculator.tsx:476–...` | In-file `ResultsScreen`; annual tonnes as the hero number, a `globalAverageComparisonCaption` line (`:525`), comparison chips, four-category breakdown. |
| CTA branch | `app/(onboarding)/calculator.tsx:496–509` | Signed out → `setPendingBaseline` → `complete()` → `push('/(auth)/signup')`. Signed in → `saveBaseline(totalKg)` → `replace('/(tabs)')` with **no `.catch`, no pending state, no disabled CTA** (`void saveBaseline(totalKg).then(...)`). |
| Signup | `app/(auth)/signup.tsx` | Client validation (8-char min, confirmation). On submit, `authError` is read from a stale render-time snapshot (`:21` vs `:38–41`) — **a failed signup shows the "Check your email" success screen**. See §2.B2. |
| First tab mount | `app/(tabs)/_layout.tsx:67–85` | Gate effect. If `pendingBaselineKg` exists it saves it; otherwise if `profile === null \|\| baseline_kg == null` it fires `router.replace('/carbon-calculator')`. |

**What the user does:** three swipes, a permission dialog they may or may not see resolve, eight taps, an email round-trip, then lands on Today.

**What the user feels [ASSUMPTION]:** The primary persona (`DESIGN_DIRECTION.md:15–19`) has by this point been shown, in order: a promise of manual logging in seconds (slide 1: *"Log food, transport, and energy in seconds"*, `app/(onboarding)/index.tsx:63`), an AI insight they cannot verify (slide 2), and *"Create reduction challenges, climb the leaderboard, and earn achievement badges"* (slide 3, `:73`). `DESIGN_DIRECTION.md:19` names leaf icons, gamified badges and moralizing copy as things this persona is *"actively repelled by"*; `DESIGN_RESEARCH.md:138` names the **secondary** anti-persona as *"the performative activist wanting public leaderboards and virtue badges"* (the primary anti-persona is the **Offset Absolver**, `DESIGN_RESEARCH.md:134–136`). Then a number that appeared before they answered anything. The designed feeling is *"a precise instrument."* The built feeling is *"a generic eco app that guessed."*

**Today, at the end of first run, on a fresh account, renders:**

- Ring at 0.0 kg against `DAILY_CARBON_BUDGET_KG = 22` — a global constant (`types/emission.ts:90`, consumed at `app/(tabs)/index.tsx:148, 186`), **not** the baseline just calculated.
- Momentum pill with a leaf glyph (`components/ui/VMomentumBand.tsx:63`).
- No review card (`needsConfirmation.length === 0`).
- `VEmptyState` "Your day, auto-written" with a leaf icon (`app/(tabs)/index.tsx:1287–1293`).
- **A blank gap** where the AI insight should be: `moves.length === 0` takes the AI branch (`:1346–1359`), but `emissionContext` is `null` with no entries (`:1166–1184`), so `useAiInsight` never enables, `insight` is `undefined`, and `components/ui/VAiInsightCard.tsx:89` returns `null`.
- A row of grey week dots (`WeekStrip`, `:1362–1367`).

**The critical structural fact about first run:** nothing in it turns the autopilot on. `requestPermissions` (`hooks/useTrips.ts:704`) is called from exactly one place — `handleEnableDetection` at `app/log.tsx:477`, fired by the "Auto-detect trips" banner at `app/log.tsx:765–789`. **The activation control for the entire product thesis lives inside the manual-entry modal whose own header reads "Most things track themselves — this is for the rest" (`app/log.tsx:506`).** See §4.2.

### 1.6 THE AHA WINDOW (hour 1 – day 2)

**Designed sequence.** User moves. `AppState` goes `active`, `runRefreshPass` fuses OS activity + GPS buffer, writes `detected_trips`, and either auto-commits or queues a confirm. On iOS with motion granted, the retroactive query reaches back up to 7 days (`hooks/useTrips.ts:470–492`) — so the *first* refresh pass can populate history from before the app existed on the device.

**Screens:** Today (feed row appears, ring moves for car trips, "Earlier this week" may populate at `app/(tabs)/index.tsx:1298`), review card → `VBottomSheet` → `ConfirmCard`.

**State:** `feedItems.length > 0` for the first time. `ActiveTripCard` renders if `isInMotion` (`app/(tabs)/index.tsx:1232`) — the in-file comment calls it *"the app's most magical proof-of-life,"* and that is fair.

**What the user does:** opens the notification (or the app), taps the review card, taps the primary confirm or a mode chip, watches the number settle.

**What the user feels [ASSUMPTION]:** this is the moment the pitch stops being a claim. `DESIGN_DIRECTION.md:149`'s motion law ("an instrument doesn't bounce"; `damping: 30, stiffness: 220`) and the estimate-demotion pattern (spend-derived values rendered muted and italic while sensor values get plain `mono`) are the two craft details carrying this moment.

**What breaks it today:**
- **The permission gate** (§4.2) — for most users this window never opens at all.
- **Notifications do not route.** There is **no** `addNotificationResponseReceivedListener`, no `getLastNotificationResponseAsync`, and no `setNotificationHandler` anywhere in `app/`, `components/`, `hooks/`, `lib/`, `contexts/`, `tasks/`, or `stores/` (verified by repo-wide grep, returns empty). Tapping "1 trip spotted" opens the app to wherever it was. The `useTrips` comment at `:640–641` acknowledges this: *"Opening the app lands on Home, which already surfaces the review card — no custom deep-link handling."* That is true only if Home is where the app resumes.
- **Two divergent confirm UIs over one queue:** Today's paged sheet (`app/(tabs)/index.tsx:1371`) and `log.tsx`'s "Detected trips" list with a compact Confirm button (`app/log.tsx:565–600`). Same data, two products.
- **The zero-emission ring gap** (§1.3b).

### 1.7 DAY 2

**Screens:** Today (default), possibly Trends.

**State:** feed has 1–3 rows; `earlierItems` may be non-empty; `recap.distinctDays` is 1 or 2, so the week teaser (`app/(tabs)/index.tsx:1335`) may or may not appear; `moves.length` is likely still 0, so the AI card branch is still taken and still renders nothing.

**Notifications actually fired on day 2:** the weekly recap is scheduled, and trip notifications fire opportunistically. **N1–N5 — the five manual-logging reminders — fire zero times, for every user, today.** This is not a hedge; it is the read of the code (§3.3a). The correct finding on day 2 is therefore *not* "the app that promised to track itself sent five reminders to type." It is: **five off-thesis reminder strings are shipped, armed, and one INSERT away from firing** — and the INSERT is exactly what §4.5's settings screen would write.

**Designed feeling [ASSUMPTION]:** "it kept working while I wasn't looking."

### 1.8 DAY 7

**Screens:** Sunday 18:30 notification (`lib/recapNotification.ts:26–28`) → app → Today → `/recap` (4 pages: hero delta, category split, win, share summary).

**State:** `recap.isReady` is true if `currentKg > 0 || weekTrips.length > 0` (`hooks/useWeeklyRecap.ts:131`). Trends now has enough for a chart and possibly a "Best week." Profile's `avoidedKg` line is live.

**What the user does:** pages through four cards, lands on a share summary that ends with the caption *"Screenshot to share your week"* (`app/recap.tsx:219`).

**What breaks it:**
- The recap notification does not deep-link to `/recap` (no response listener). The user must find the week teaser on Today.
- A failed query renders "Your week is still filling in" (`app/recap.tsx:267`) — a data-fetch failure reported as an empty life.
- The share loop terminates in an instruction, not a share sheet, even though `Share.share` is already imported and used at `app/(tabs)/profile.tsx:258–262`.
- Profile now asserts "N kg never emitted" (`app/(tabs)/profile.tsx:155–162, 353`) where the current partial week is credited in full against `baseline_kg / 52`: `weeklyRows.reduce((sum, w) => sum + Math.max(0, baselineWeekly - w.total_kg_co2e), 0)`. On a 5,800 kg baseline, Monday's 2 kg produces a ~109 kg claim.

### 1.9 DAY 30

**Screens:** Profile → Passport (`app/(tabs)/profile.tsx:572` → `app/passport.tsx`), 5 pages, ending on the evergreen gradient passport card.

**State:** `passport.isReady` true; month period selected by default (`app/passport.tsx:451`); page 3 renders `tripsTrackedThemselves` under **"No typing. No logging. Just your life, ledgered."** (`app/passport.tsx:303`) — the thesis rendered as an artifact, and the single best-written surface in the product.

**What breaks it:**
- One entry point, three levels deep, below Achievements / Challenges / Linked accounts — contrary to `DESIGN_DIRECTION.md:172`, which specifies *"Passport moves under You, reachable from Today's weekly summary."* Both Today affordances route to `/recap` instead (`app/(tabs)/index.tsx:1319, 1340`).
- Same "screenshot to share" terminus (`app/passport.tsx:442`).
- Same error-as-empty collapse (`app/passport.tsx:479–505`).
- **There is no day-30 touchpoint for the business model.** No paywall, no trial state, no entitlement check anywhere in `app/`.
- **The "quiet moment" cannot occur** — nothing in the product learns from corrections (§4.1), so there is no mechanism by which week 4's queue is shorter than week 1's, let alone a surface that shows it.

---

## 2. The touchpoint atlas

Every touchpoint, grouped by function. **E** = entry, **S** = states, **X** = exits, **M** = missing / defective.

### A0 — The marketing site and waitlist (the real first touchpoint)

`website/` is a shipped Vite + React app (`website/src/App.tsx`), 14 sections, case-study-first. **Today it is the only Veridian surface a real person can reach, and the waitlist is the only conversion event that exists.** A map titled "end-to-end" that starts at the app splash omits the entire acquisition funnel.

- **E:** any inbound link to the site.
- **The waitlist:** `website/src/sections/WaitlistCTA.tsx` mounts **twice** — `variant="section"` after Solution (`website/src/App.tsx:48`) and `variant="inline"` in the Footer (`website/src/sections/Footer.tsx:66`) — sharing a module-level store so both resolve together. The file header states the reasoning: *"a page that asks twice after someone has already handed over an address would look careless."*
- **S:** four real states from `website/src/lib/waitlist.ts` — `invalid_email`, `duplicate` ("You're already on the list!", on PG `23505`), `unknown`, and success. Email is normalized with `trim().toLowerCase()` before insert, with an in-file comment explaining that the DB's unique index is a plain btree, not `citext`, so without normalization the duplicate message would never fire (`:10–14`). This is more careful error handling than most screens *in the app* have.
- **Motion:** the site honours `useReducedMotion` (`WaitlistCTA.tsx:25, 46`) and pins the same signature spring (`damping: 30, stiffness: 220`) that `DESIGN_DIRECTION.md:148` mandates. **The app does not** (§4.9).
- **M:** no analytics on the waitlist (consistent with "no data — pre-launch"); no confirmation email; no path from waitlist signup to a TestFlight build (gated on the paid Apple Developer account, §4.4).

### A. Pre-account (app)

#### A1 — Splash / cold-start hold
- **E:** every cold start. `app/_layout.tsx:66–70`.
- **S:** exactly one — `null` render while `isLoading || !isChecked`.
- **X:** first route, decided by `Stack.Protected` guards (`app/_layout.tsx:33–49`).
- **M:** no branded interstitial; no timeout or failure branch if either store never resolves — the app renders nothing indefinitely.

#### A2 — `/(onboarding)` carousel — `app/(onboarding)/index.tsx`
- **E:** cold start with `onboardingComplete === false` (`app/_layout.tsx:34–36`).
- **S:** populated only. Slide 2's insight card is hardcoded non-loading. The notification permission path has a silent-failure state (`:152–173`).
- **X:** Skip → `complete()` → `replace('/(auth)/login')`; Get Started → `push('/calculator')`; "Allow notifications" navigates nowhere.
- **M:** (a) the slides sell the retired product — slide 1 manual logging (`:63`), slide 3 leaderboard and achievement badges (`:73`), against `DESIGN_DIRECTION.md:38`; (b) **no motion or location permission priming anywhere** — the app asks for the least load-bearing permission and never mentions the ones the thesis depends on; (c) no privacy framing, despite `NORTH_STAR.md:140` specifying Apple-Journal-style *"your location history stays on your phone"* in onboarding; (d) raw `<Text>` rather than `VText` throughout, off the design system.

#### A3 — `/calculator` — `app/(onboarding)/calculator.tsx`
- **E:** `push('/calculator')` from A2.
- **S:** per-question populated; internal results phase (`:795`); two CTA variants on auth (`:496–509`). **No loading, error, empty, or offline state** — `saveBaseline` is fired as `void ... .then(...)` with no `.catch` and no pending UI.
- **X:** signed in → `saveBaseline` → `replace('/(tabs)')`; signed out → `setPendingBaseline` → `complete()` → `push('/(auth)/signup')`. No back, no close, no skip — OS gesture only.
- **M:** back control; skip; a `.catch` and disabled-while-pending CTA; provenance for `GLOBAL_AVG_KG = 4700` / `PARIS_TARGET_KG = 2500` (`:90–91`); suppression of the pre-answer 5,800 kg footer (§1.3a).
- **Strength:** `globalAverageComparisonCaption` is wired here (`:27, 525`) — one of only two places in the whole product where a carbon-literacy caption appears (§4.8).

#### A4 — `/carbon-calculator` — `app/carbon-calculator.tsx`
- **E:** automatic only — `router.replace('/carbon-calculator')` from the tabs gate (`app/(tabs)/_layout.tsx:83`). Nothing pushes it manually.
- **S:** identical to A3 (thin re-export).
- **X:** results CTA → `/(tabs)`.
- **M:** a close/exit. A signed-in user is *involuntarily* placed here and pinned until they answer eight questions. See also the gate hazard in §4.7.

### B. Auth

#### B1 — `/(auth)/login` — `app/(auth)/login.tsx`
- **E:** Skip from onboarding; footer link from signup; post-reset `replace` (`app/(auth)/reset-password.tsx:98`); any cold start with no session (`app/_layout.tsx:46–48`).
- **S:** populated; loading; error via `VToast tone="error"` from `authError`. No screen-level offline state (global banner only).
- **X:** session flip (no explicit router call); `/(auth)/forgot-password`; `/(auth)/signup`.
- **M:** the Google button is rendered unconditionally (`:104–110`) while `stores/authStore.ts:8, 18–21` treats a `placeholder-` client ID as unconfigured and sets `GoogleSignin = null`; `stores/authStore.ts:96` then surfaces the literal string *"Google Sign-In is not configured yet — add a real EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env."* An env var name must never reach a user.

#### B2 — `/(auth)/signup` — `app/(auth)/signup.tsx`
- **E:** calculator results when signed out; login footer.
- **S:** populated; success view (`:43–55`); loading; error toast + three local validation messages (`:24–36`).
- **X:** success → link to login; out-of-app email confirmation flips the root guard.
- **M:** **the success state is wrong on failure.** `authError` at `:21` is destructured once per render; `stores/authStore.ts:78–81` sets the error *after* the await; so `:41`'s `if (!authError) setSuccess(true)` reads the pre-submit snapshot and fires on every failure. **Any** failure — duplicate email, rate limit, network blip — lands the user on "Check your email" for an account that does not exist.

#### B3 — `/(auth)/forgot-password` — `app/(auth)/forgot-password.tsx`
- **E:** login link; `replace` from the invalid-link branch of reset (`app/(auth)/reset-password.tsx:114`).
- **S:** populated; sent; loading; error.
- **X:** `router.back()`; out-of-app `veridian://reset-password` (`stores/authStore.ts:86`).
- **M:** nothing structural.

#### B4 — `/(auth)/reset-password` — `app/(auth)/reset-password.tsx`
- **E:** deep link only. `useLinkingURL()` (`:40`), scheme in `app.json`. No in-app navigation reaches it.
- **S:** loading spinner while the token exchange runs; link-level error; form-level error; done; populated.
- **X:** success → `replace('/(auth)/login')`; invalid → `replace('/(auth)/forgot-password')`.
- **M:** **a guard-flip hazard.** The `(auth)` group is wrapped in `Stack.Protected guard={!session}` (`app/_layout.tsx:46–48`); this screen's job is to create a session. The instant it succeeds, the guard keeping its own group mounted goes false — while the user is still standing on the screen, before typing a new password. Untested end-to-end. Also not declared in `app/(auth)/_layout.tsx`.

#### B5 — Apple Sign-In (screen + OS sheet) — **missing from every prior inventory**
- **E:** `app/(auth)/login.tsx:112–120` renders a `variant="apple"` `VButton`, iOS only.
- **The sheet:** `stores/authStore.ts:116–159` drives `expo-apple-authentication`. Like Plaid's sheet (D3), this is **a full screen the user sees that appears nowhere in the route tree**, and it is absent from the permission-dialog inventory in G3.
- **S:** cancel is explicitly not an error — `ERR_REQUEST_CANCELED` returns silently (`:155`); missing identity token and generic failure both set `authError`.
- **Three consequences the app's own docs and prior maps miss:**
  1. **It is the only path in the product that creates a `profiles` row at signup** — `stores/authStore.ts:145–148` upserts `{ id, display_name }` on first sign-in only, with the comment *"Apple only provides name/email on FIRST sign-in."* Every other signup path leaves `profiles` empty, which is exactly the `profile === null` condition the tabs gate keys on (`app/(tabs)/_layout.tsx:81`).
  2. **It has no email round-trip**, making it by far the shortest first run — and the obvious answer to the demo's "can I try it?" problem (§5.3).
  3. Nothing in onboarding or the calculator's signed-out CTA routes to it; the CTA hardcodes `push('/(auth)/signup')` (`app/(onboarding)/calculator.tsx:505`).

### C. Daily surfaces

#### C1 — Today — `app/(tabs)/index.tsx` (the product's centre)

Sub-touchpoints, in render order:

| # | Surface | Line | Notes |
|---|---|---|---|
| C1.1 | Greeting + momentum pill | `:1206` | `VMomentumBand variant="pill"`; carries a leaf glyph (`components/ui/VMomentumBand.tsx:63`) |
| C1.2 | Budget ring hero | `:1211` | `BudgetRingHero`; measured against the global `DAILY_CARBON_BUDGET_KG` (`:148`, label `:186`), not `baseline_kg` |
| C1.3 | Efficacy line | `:1215–1219` | `EFFICACY_COPY[state]` — calm / watch / over, forward-facing, no red-as-shame |
| C1.4 | Live trip card | `:1232` | Renders only while `isInMotion`. The most direct proof-of-life in the app |
| C1.5 | **Daily review card** | `:1235–1259` | `"N moments to confirm / Takes about 10 seconds"`, sparkle icon (not a leaf), full a11y label, opens the sheet |
| C1.6 | Feed header + `+` | `:1262–1278` | `push('/log')`; in-file comment cites `DESIGN_DIRECTION.md` for why Log is not a tab |
| C1.7 | Feed | `:1279–1295` | loading = 2 `VSkeleton`; empty = `VEmptyState` "Your day, auto-written" (leaf icon, `:1288`); populated = `FeedRow[]` |
| C1.8 | Earlier this week | `:1298–1332` | conditional on `earlierItems.length > 0`; the in-file comment at `:1049–1055` calls this *"the backfill acknowledgment"*; "See the whole week" → `/recap` (`:1319`) |
| C1.9 | Week teaser | `:1335–1342` | conditional on `recap.distinctDays >= 2` → `/recap` (`:1340`) |
| C1.10 | Top Moves **or** AI insight | `:1345–1359` | `moves.length > 0` ? `VTopMovesSection` : `VAiInsightCard` |
| C1.11 | Week strip | `:1361–1367` | 7 dots coloured by daily budget state |
| C1.12 | **Confirm sheet** | `:1371–1382` | `VBottomSheet`; queue snapshotted on open (`:1128`) so live invalidations can't reshuffle mid-review; `ReviewAllDone` (`:791`) + auto-close |

- **E:** default tab; `replace('/(tabs)')` after baseline save; fallback close from recap (`app/recap.tsx:232`) and passport (`app/passport.tsx:456`).
- **S:** loading; empty; populated; **error-with-retry (the only one in the app** — `components/ui/VAiInsightCard.tsx:74–86`, rendered from `:1354–1356`); conditional sections; offline via the global banner only.
- **X:** `/(tabs)/trends` from the ring (`:276`); `/log` (`:1271`, `:1292`, `components/ui/VTopMovesSection.tsx`); `/recap` (`:1319`, `:1340`); tab bar.
- **M:** (a) the ring's denominator ignores the baseline the app gated tab access on (§5.3 B2); (b) leaf glyph in the always-visible pill and the empty state; (c) no entry point to Passport, against `DESIGN_DIRECTION.md:172`; (d) no surface for the confirm queue's trend — and no mechanism behind one (§4.1); (e) the AI branch defect below.

**C1.10, stated correctly.** The prior draft said `VAiInsightCard` "collapses to nothing for a new user." True, but that is the *minor* half. The load-bearing case is the other branch: `emissionContext` is set to `null` **whenever `moves.length > 0`** (`app/(tabs)/index.tsx:1166–1169`), with the in-file comment *"When Top Moves are available, skip the AI Edge Function entirely (saves the Claude call). Pass null context so useAiInsight's `enabled` gate stays false."* That same condition takes the `VTopMovesSection` branch at `:1346`. So **for every user with enough data to have Top Moves, the Claude call never runs**, and onboarding slide 2's promise — *"Claude analyses your emissions and gives you one specific, actionable step — every day"* (`app/(onboarding)/index.tsx:68`) — is served by a local client-side heuristic. `docs/USER_JOURNEY.md:223` already records this as *"Promise/delivery mismatch on AI."* It belongs in §4, not in a screen's nit list.

#### C2 — Trends — `app/(tabs)/trends.tsx`
- **E:** tab bar; ring press (`app/(tabs)/index.tsx:276`).
- **S:** loading; empty (`:498–503`, leaf icon at `:502`); populated; missing-value fallback `—`. **No error branch** — the query throws on `dayRes.error` / `weekRes.error` and nothing renders it.
- **X:** `/entry/{id}` (`:519`); swipe-to-delete stays in place; tab bar.
- **M:** on an empty account the chart renders as a zero-height frame above Personal Records showing "— / — / 0 days" — three separate declarations of emptiness in one scroll. **"Streak" survives as a personal record** (`:485`), against `NORTH_STAR.md:139`'s unqualified rule: *"Momentum, Not Streaks — rolling 7-day band that decays gently; no breakable chains, ever."* (`DESIGN_DIRECTION.md:38`'s wording — *"No badges, streaks, or confetti framed as moral achievement"* — is qualified and is the weaker citation; cite `NORTH_STAR.md:139`.) No export, no table view, no raw-number surface for the secondary persona.
- **Correction to a finding that was previously wrong three ways.** The earlier draft called Trends' `sectionTitleAccent` an accent rail on a rounded card, citing `DESIGN_DIRECTION.md:39` for an "8×8 dot" rule. In fact: (i) in Trends the accent is rendered by `SectionTitle` (`:73–80`) into a bare `View`, **not inside a card at all**; (ii) it is a 2×16 vertical bar beside a heading (`:567–572`), while `docs/DESIGN_REQUIREMENTS.md:335` defines the rejected pattern precisely as *"A colored strip down the edge of a card"*; (iii) **the phrase "8×8 dot" appears nowhere** in `DESIGN_DIRECTION.md` or `DESIGN_REQUIREMENTS.md` — grep returns nothing. It is a live project convention, and should be stated as one, never cited to a doc line. `docs/PRD.md:103` further records that the systemic `VCard` accent-rail pattern was already removed in commit `bb7988d`. **The defensible instance is Profile, not Trends** — see C3.

#### C3 — You / Profile — `app/(tabs)/profile.tsx`
- **E:** tab bar. Only entry.
- **S:** combined loading flag driving skeletons; empty challenges; empty linked accounts with CTA; section loading; error toast; pending flags (`isSaving` / `isUnlinking` / `isCreating` / `isJoining`); populated.
- **X:** `/challenge/{id}` (`:496`); `/link-bank` (`:512`); `/passport` (`:572`); `/import` (`:594`); `signOut()` which flips the root guard; tab bar.
- **Four sheets live on this screen and none appeared in prior inventories:** create-challenge, join-challenge, edit-profile, and — **an OS share sheet** at `:258–262`, `Share.share({ message: 'Join my Veridian carbon challenge! Use code: ...' })`. That last one is a full-screen OS surface, exactly the class of touchpoint D3 (Plaid) is listed as. It also matters that it exists: it is the proof that the share plumbing §4.10 asks for is already in the file.
- **M:**
  - **(a) `avoidedKg` credits the current partial week in full.** `:155–162` reduces over `weekly_summaries` rows as `Math.max(0, baseline_kg/52 - w.total_kg_co2e)`, including the in-progress week, producing an unearned "N kg never emitted" headline at `:353`.
  - **(b) The Grove.** `:49–52` renders procedural tree silhouettes, one per ~50 kg avoided, directly above that line. This is a touchpoint in its own right, not just a consumer of `avoidedKg`. `docs/USER_JOURNEY.md:237` flags it: *"Trees-as-earned-units is the visual language of tree-planting offset products… The framing is defensible; the imagery reads as absolution."* The Offset Absolver is the named primary anti-persona (`DESIGN_RESEARCH.md:134–136`), the business model `NORTH_STAR.md:160` explicitly rejects (*"Reduction, not absolution"*), and `DESIGN_REQUIREMENTS.md:336` bans *"no moral-closure UI."* Fixing the number underneath does not fix the imagery above it.
  - **(c) The achievements shelf** renders every definition with `earned=false` for a new account, and `components/social/AchievementBadge.tsx` draws a padlock over each — a shelf of locked badges as the first-run identity surface.
  - **(d) The badge-unlock toast.** `docs/USER_JOURNEY.md:167` records a `VToast` "Badge unlocked: {name}" on this tab. That is a *moment*, and it is the most on-the-nose "badge as moral win" surface in the product for a persona *"Repelled by… badges framed as moral wins"* (`DESIGN_RESEARCH.md:119`). The locked shelf is the static problem; the unlock event is the acute one.
  - **(e)** `createChallenge`, `joinChallenge` and `updateProfile` have `onSuccess` only — the `errorToast` is already wired in this file and simply not called from these three.
  - **(f) Accent rails inside `VCard`** — this *is* the defensible instance of the rejected pattern (`DESIGN_REQUIREMENTS.md:335`). Cite the call sites, which sit inside `<VCard elevation="sm">`: `app/(tabs)/profile.tsx:413` (Achievements), `:456` (Challenges), `:506` (Linked accounts). The style block is `:904`.
  - **(g) No settings screen** — see §4.5.

#### C4 — Tab bar — `app/(tabs)/_layout.tsx`
- **E:** always present under `(tabs)`.
- **S:** the active tab's dot colour follows today's budget state (`:64–65`), with the in-file comment *"the app's mood."* The idea is genuinely good.
- **M:** **it inherits the ring's defect.** `todayProgress` is `(daily?.total_kg_co2e ?? 0) / DAILY_CARBON_BUDGET_KG` — the same global 22 kg constant. The app's mood is computed against a number that belongs to no one. Any fix to B2 must reach here.

#### C5 — Global offline banner — `components/ui/VOfflineBanner.tsx`, mounted `app/_layout.tsx:76`
- **E:** `useNetInfo` transition to disconnected. Floats over every stack including auth and onboarding.
- **S:** hidden while `isConnected === null` (avoids cold-start flash); measured-height slide-in; `pointerEvents="none"`; `accessibilityLiveRegion="polite"`. Copy: *"You are offline — entries will sync when connected"* (`:23`).
- **M:** the promise is kept on two write paths, not all six. Quick-log taps route through `useDurableCreateEntry` (`app/log.tsx:401–408`) and auto-logged/confirmed trips through `createDurable` (`hooks/useTrips.ts:420`, `:880`); the sheet-based manual log (`app/log.tsx:413–426`), entry edits, challenge joins, baseline save, and CSV import have **no** offline path.

### D. The data-in surfaces

#### D1 — `/log` — `app/log.tsx` (modal, declared `app/_layout.tsx:40`)
- **E:** `+` on Today (`app/(tabs)/index.tsx:1271`); Today empty-state CTA (`:1292`); Top Moves.
- **S:** loading; empty today's-log; empty quick slots; populated; pending; permission-denied `Alert`; trip-confirmation list (`:565–600`); offline/failure deliberately silent for quick-log (`:401–408`).
- **X:** close `X` → `router.back()`; modal swipe-dismiss. No forward navigation.
- **Sub-touchpoints:** quick slots; category chips; factor browse/search; quantity sheet; today's log with swipe-to-delete; **"Detected trips" confirm list** (`:565–600`); **"Auto-detect trips" permission banner** (`:765–789`); **"Simulate trip (12 km · 45 km/h)"** (`:792–803`).
- **Strength:** `drivingComparisonCaption` is wired at `:57, 860` — the only in-app screen carrying carbon-literacy copy (§4.8).
- **M:**
  - **(a) The permission banner is the autopilot's only on-switch and it is buried here** (§4.2), with two conditions the prior draft got wrong — see the correction below.
  - **(b)** `createEntry.mutate` at `:415–426` has `onSuccess` only. A failure flips the button back from "Logging…" with no message, while `app/(tabs)/profile.tsx` shows the `errorToast` pattern is already available in the codebase.
  - **(c)** The quick-log path's deliberate silence (`:401–406`) should say "Saved — will sync when you're back online" rather than nothing; the in-file comment reasons that `VOfflineBanner` covers it, which is only true while the banner is up.
  - **(d)** `ParticleBurst` (`:144`, fired `:957`) is confetti, against `DESIGN_DIRECTION.md:38`; the checkmark morph at `:930` plus success haptic is the sanctioned form.
  - **(e)** The confirm list here and the sheet on Today are the same queue rendered as two different features.
  - **(f) The simulate button — restated at its real risk level.** The prior draft called `__DEV__` "a test harness in any build shown outside the team" and proposed gating on `IS_EXPO_GO` only. `app/log.tsx:790–791` carries the explicit rationale: *"Simulate is a dev-only pipeline test — dev builds on the Simulator have no real GPS/CoreMotion either, so it shows in any `__DEV__` run."* `__DEV__` is **false** in release/TestFlight/production builds, so this does not ship to users, and the proposed fix would remove the team's only way to exercise the trip pipeline on a simulator dev build. **Correct action: confirm release builds strip it. Not a blocker.**

**Correction to the permission-banner reading (two errors, one of them a permanent stuck state).** The banner's condition is `(hasPermission === false || IS_EXPO_GO)` (`app/log.tsx:766`), and in the Expo Go branch it renders `disabled` with different copy. More importantly, the iOS hydrate branch (`hooks/useTrips.ts:817–830`) sets `hasPermission = bg.status === 'granted'` — **`hasPermission` is true on iOS only when background "Always" location is granted.** A user who grants "While Using" sees the "Auto-detect trips" banner forever, cannot dismiss it, and tapping it re-runs a request that will not change the outcome. That is a permanent stuck state, not a nit.

#### D2 — `/link-bank` — `app/link-bank.tsx` (modal)
- **E:** Profile row (`app/(tabs)/profile.tsx:512`); linked-accounts empty CTA.
- **S:** connecting; three distinct errors — partial-sync, Plaid-reported exit, unavailable-on-this-build — all as `VToast tone="error"`; populated explainer; user-cancel explicitly not an error. No offline branch.
- **X:** close → `dismiss()` → `router.back()`; auto-dismiss after successful exchange; Plaid `onExit`.
- **M:** `dismiss()` is `if (router.canGoBack()) router.back()` with no fallback — inert on a cold start straight into the modal, unlike `app/recap.tsx:232` / `app/passport.tsx:456` which have the same guard but a `replace('/(tabs)')` fallback behind it. The trust copy itself is a genuine strength and matches `NORTH_STAR.md` §5.

#### D3 — Plaid Link native sheet — `app/link-bank.tsx:76–99`
- **E:** the Connect CTA. **A full screen the user sees that appears nowhere in the route tree.**
- **S:** owned entirely by Plaid.
- **X:** `onSuccess` → token exchange → auto-dismiss; `onExit` → back to D2.
- **M:** no in-app copy sets expectations for what the Plaid sheet will ask for, and no post-success confirmation surface — control returns to a dismissing modal.

#### D4 — `/import` — `app/import.tsx` (modal)
- **E:** Profile row (`app/(tabs)/profile.tsx:594`).
- **S:** progress "Importing N of M…" + row spinners; errors for zero parsed orders and unreadable file; success/notice toast with failed count and row warnings; silent return on cancelled picker; populated explainer.
- **X:** close → `dismiss()` → `router.back()`. Same missing fallback as D2. No forward navigation — the screen stays open after import.
- **M:** the imported entries are never shown. The user completes a backfill and is left on the import screen with a toast; nothing routes them to the feed where the result now lives. The OS share-sheet channel was removed pending an App Group entitlement (`app/import.tsx:9–15`), and the forwarding-address channel has **no UI at all** (§4.3).

### E. The story surfaces

#### E1 — `/recap` — `app/recap.tsx` (modal)
- **E:** "See the whole week" (`app/(tabs)/index.tsx:1319`); week teaser card (`:1340`, gated `distinctDays >= 2`).
- **S:** loading `ActivityIndicator` (`:245`); not-ready `VEmptyState` "Your week is still filling in" (`:267`) with a working close; populated — 4 pages. **No error or offline branch.**
- **X:** close (`:232`, with `replace('/(tabs)')` fallback); advancing past the last page auto-closes.
- **M:** error reported as emptiness; leaf icons (`:214`, `:290`); the terminus is *"Screenshot to share your week"* (`:219`) rather than a share sheet.

#### E2 — `/passport` — `app/passport.tsx` (modal)
- **E:** Profile row (`app/(tabs)/profile.tsx:572`). **One entry point, three levels deep.**
- **S:** loading; not-ready empty whose copy switches on month/year (`:501`) with close and period switch still usable; populated (5 pages); period-switch resets index (`:466`). No error or offline branch.
- **X:** close (`:456`, with fallback); advancing past the last page auto-closes.
- **M:** discoverability (`DESIGN_DIRECTION.md:172`); share sheet (`:442`); the `NoiseOverlay` grain (`:39`) is an Understory holdover on a near-white ground; leaf icons at `:406`.

### F. Detail and edit

#### F1 — `/entry/[id]` — `app/entry/[id].tsx`
- **E:** entry row on Trends (`app/(tabs)/trends.tsx:519`). **Only navigation into this route.**
- **S:** loading `ActivityIndicator`; saving; disabled while `quantity <= 0`; populated. **No error state.**
- **X:** close; Cancel; successful save → `router.back()`.
- **M:** `if (isLoading || !entry)` collapses two conditions into one spinner branch (`:59–66`), so a thrown query error shows an indefinite spinner — **and the close button lives in the populated branch (`:74–84`)**, so the user is stuck on a spinner with no exit. The mutation has no `onError`. Separately, this is the one screen that could be the provenance view for the secondary persona, and it shows a category badge, item name, subcategory, quantity, and a three-decimal estimate — the least provenance with the most significant figures (§4.6).

#### F2 — `/challenge/[id]` — `app/challenge/[id].tsx`
- **E:** challenge row on Profile (`app/(tabs)/profile.tsx:496`). Only entry.
- **S:** header skeletons; five leaderboard skeleton rows; empty "No participants yet"; populated; null-data fallback renders nothing. No error or offline branch.
- **X:** **none rendered.** `:34–40` sets `title` and `headerBackTitle: 'Profile'`, but `app/_layout.tsx:33` forces `headerShown: false` globally and this screen never overrides it. Grep for `close`, `router.back`, or `VIcon` in the file returns **nothing**. Only the iOS edge-swipe leaves; on Android there is no gesture equivalent.
- **M:** a close control. `app/entry/[id].tsx:74–84` renders its own precisely because the header is hidden. Hard dead end, not a styling nit.

### G. System and framework surfaces

#### G1 — Unguarded file-based routes — `app/modal.tsx`, `+not-found`, `entry/[id]`, `challenge/[id]`
The earlier draft called `app/modal.tsx` "a true orphan" whose text was "the only string in the app not in the Clearing voice." **Both halves are wrong**, and the real finding is more serious.

- The file uses `VText` and theme tokens throughout (`app/modal.tsx:3–4, 11, 13`) — it is *on* the design system. (The off-voice strings are elsewhere: `"Dinner time — a quick log keeps your streak alive"` in `hooks/useNotifications.ts:65`, and `+not-found`'s raw `<Text>`.)
- It is **not unreachable.** expo-router resolves files by path, so `veridian://modal` reaches it — the same reachability the draft correctly granted `+not-found`.
- **The real defect: it is not inside any `Stack.Protected` block.** `app/_layout.tsx:33–49` enumerates `(onboarding)`, `(tabs)`, `carbon-calculator`, five modals, and `(auth)`. `modal`, `+not-found`, `entry/[id]` and `challenge/[id]` are all absent, so they render with **no session**. `docs/USER_JOURNEY.md:56` already flags exactly this: *"these four are not enumerated in the root `<Stack>`… therefore not wrapped in an explicit `Stack.Protected` guard the way the modals are. Worth a deliberate check that this is intended rather than incidental."*
- **Action:** decide the guard question for all four. Deleting `app/modal.tsx` is still reasonable housekeeping, but it is not the finding.

#### G2 — `+not-found` — `app/+not-found.tsx`
- **E:** Expo Router convention; any malformed `veridian://` deep link.
- **S:** static, raw `<Text>`, no `VText`, no illustration, no `SafeAreaView`.
- **X:** `Link href="/"`.
- **M:** rebuild in the design system; `components/illustrations/` already covers empty states. Same guard question as G1.

#### G3 — OS permission and auth sheets (five, unrouted)

| Sheet | Triggered from | Problem |
|---|---|---|
| Notifications | `app/(onboarding)/index.tsx:169` **and** `hooks/useNotifications.ts:163` on every foreground while ungranted | Onboarding's version silently no-ops on denial |
| Foreground location | `hooks/useTrips.ts` (`requestPermissions`, `:704`) | Only reachable from the log-modal banner |
| Background "Always" location | same (iOS only; Android deliberately does not request it per `NORTH_STAR.md` §4) | Same — and on iOS this is what `hasPermission` actually means (see D1 correction) |
| Motion & Fitness | `hooks/useTrips.ts` `requestPermissions`, plus `ensureMotionPermissionRequested` on mount for already-granted users (`:811`, `:846`) | Never primed; a denial leaves the fusion path dormant with no user-facing explanation |
| **Apple Sign-In** | `stores/authStore.ts:116–159` | Full-screen OS sheet, never inventoried (§2.B5) |

**M:** no priming screen for any of the three permissions that matter. `NORTH_STAR.md:140` specifies Apple-Journal-style privacy framing in onboarding; none exists.

#### G4 — Background location task — `tasks/locationTask`, imported first at `app/_layout.tsx`
- **E:** OS. Fills the GPS ring buffer that `runRefreshPass` fuses.
- **M:** invisible. The user has no surface showing that detection is on, off, or degraded, other than the banner in the log modal — which, per the D1 correction, is shown when background location is *not* "Always" and cannot be dismissed.

---

## 3. Notification and re-engagement touchpoints

On an autopilot product these may be the *most*-seen surface, because the thesis is that the user does not open the app.

### 3.1 The complete inventory — with verified line numbers

| # | Notification | Copy | Trigger | Source (verified) |
|---|---|---|---|---|
| N1 | Daily reminder | **"Log your carbon today"** / *"A couple of taps keeps your momentum moving."* | Daily at the user's `reminder_time` | `hooks/useNotifications.ts:14–33` (title `:24`) |
| N2 | Breakfast | **"Morning check-in"** / *"What's fuelling your day? Log breakfast in two taps."* | Daily 08:30 | `hooks/useNotifications.ts:48–54` |
| N3 | Lunch | **"Midday moment"** / *"Log lunch and keep your carbon story going."* | Daily 12:30 | `:55–61` |
| N4 | Dinner | **"Evening wind-down"** / *"Dinner time — a quick log keeps your streak alive."* | Daily 19:00 | `:62–68` |
| N5 | Momentum nudge | **"Evening nudge"** / *"Log just one thing before midnight to keep your momentum building."* | Daily 21:00 | `:69–75` |
| N6 | Momentum milestone | **"N days of momentum"** / *"You've kept a nice rhythm going for N days straight."* | Immediate, from `useEmissionEntries` | `hooks/useNotifications.ts:116–126` |
| N7 | Weekly recap | **"Your week is ready"** / *"See your carbon story for the week."* | Sunday 18:30, repeating, stable identifier | `lib/recapNotification.ts:23, 26–28` |
| N8 | Trips spotted (batched) | **"N trips spotted"** / *"Takes about 10 seconds to confirm — open Veridian."* | One per refresh pass producing new `needs_confirmation` trips, deduped | `hooks/useTrips.ts:642–657` + `lib/tripNotifications.ts` |
| N9 | Trip auto-logged | **"Trip logged"** / *"4.2 km drive · 0.9 kg CO₂e"* | On successful entry creation for an auto-confirmed car trip | `hooks/useTrips.ts:434–437` |
| N10 | Zero-emission trip | **"Nice walk!" / "Great choice!"** / *"3.1 km on foot · You avoided 0.55 kg CO₂"* | On a walk/cycle trip landing `auto_confirmed` | `hooks/useTrips.ts:608–613` |

*(The prior draft's table was off by two lines on every meal row and mis-cited N6. Corrected above. Against §0's promise that every touchpoint is traced to a file and line, that class of drift is itself a credibility defect.)*

### 3.2 Scheduling architecture — what is correct

- **Ordering is deliberate and documented.** `scheduleDailyReminder` calls `cancelAllScheduledNotificationsAsync` (`:21`), so it must run *before* `scheduleMealNotifications` (which cancels by identifier) and before the weekly recap. `hooks/useNotifications.ts:175–186` gets this right and comments why.
- **Duplicate guards.** N7 uses a stable identifier plus cancel-before-schedule (`lib/recapNotification.ts:23`), so repeated foregrounding cannot stack duplicates. N8 uses a persisted notified-keys set with a pure, unit-tested set-difference (`lib/tripNotifications.ts` `selectNewlyNotifiableKeys`).
- **The delivery-gated write.** `fireNotification` returns `true` only when a notification was actually scheduled, and N8 marks keys as notified **only** on `true` (`hooks/useTrips.ts:649–656`) — so a no-permission no-op does not permanently suppress a trip's ping. This is careful work.
- **Failure isolation.** `runScheduleIfEnabled` swallows failures with a documented rationale (`hooks/useNotifications.ts:197–205`): notifications are a courtesy, not load-bearing, and an unhandled rejection would produce a touch-intercepting LogBox toast on every foreground in dev.
- **N6 is on-thesis.** Momentum framing, zero loss-aversion, explicitly annotated against `NORTH_STAR.md` §8 pattern 5 (`:108–114`).

### 3.3 What is wrong — and it is severe

**(a) N1–N5 are dead code today, and armed to fire the moment anything writes one row.** This is the corrected finding; the loud version ("five interruptions a day") describes an experience no user can currently have.

`scheduleDailyReminder` and `scheduleMealNotifications` run only inside `if (data?.daily_reminder_enabled && data.reminder_time)` (`hooks/useNotifications.ts:173–179`). `data` comes from a `.single()` SELECT on `notification_preferences` (`:167–171`). `supabase/migrations/20260315000010_create_notification_preferences.sql:4` defaults `daily_reminder_enabled` to **`false`**, and there is **no trigger, no seed, and no INSERT anywhere in the repo** — grepping `notification_preferences` across `app/ components/ hooks/ stores/ contexts/ lib/ supabase/` returns only that one read and the migration itself. So `.single()` errors with PGRST116, `data` is null, and **zero of N1–N5 ever schedule.**

The strings are nonetheless shipped, and one of them — N4's *"keeps your streak alive"* — is loss-aversion streak language banned outright by `NORTH_STAR.md:139` (*"no breakable chains, ever"*). The same file contains N6, rewritten to momentum framing with a comment citing that exact rule. N1–N5 were not.

**The sequencing consequence is the point:** the settings screen §4.5 asks for is precisely the thing that would write `daily_reminder_enabled = true`. **Rewrite or delete N1–N5 before building settings**, or the first act of the settings screen will be to switch on five daily instructions to log manually, in a product whose pitch is that you don't.

**(b) No notification routes anywhere.** Repo-wide grep across `app/`, `components/`, `hooks/`, `lib/`, `contexts/`, `tasks/`, `stores/` finds **zero** `addNotificationResponseReceivedListener`, `getLastNotificationResponseAsync`, or `addNotificationReceivedListener`. Tapping N7 does not open `/recap`. Tapping N8 does not open the confirm sheet. Every notification opens the app to wherever it was. The `useTrips` comment at `:640–641` assumes Home; that assumption is not enforced.

This is the single highest-leverage missing wire in the product. N8 is the aha moment's invitation and it lands the user somewhere unspecified.

**(c) No `setNotificationHandler` anywhere.** With expo-notifications, foreground notifications are not presented unless a handler says so. N8, N9 and N10 all fire from `runRefreshPass`, which runs on `AppState` `active` — i.e. **while the app is in the foreground.** The likely outcome is that the trip notifications the user is meant to see are the ones least likely to be displayed. Needs a device test; second-highest-risk notification finding after (b).

**(d) The one preference column that governs a notification that can fire is never read.** `streak_notifications` (migration `:6`, default `true`) appears nowhere in the app. N6 (`notifyStreakMilestone`) is gated on OS permission alone (`hooks/useNotifications.ts:117–118`). So the user-facing consequence of the missing `notification_preferences` row is *not* "cannot turn N1–N5 off" (there is nothing to turn off) — it is that **N6 fires regardless of the preference designed to govern it.**

**(e) Push infrastructure exists with nothing to push.** `registerPushToken` upserts into `push_tokens` (`hooks/useNotifications.ts:150–153`), and no edge function in `supabase/functions/` sends anything to it. It also silently returns on free personal teams (missing `aps-environment`, documented at `:144–148`). Every notification above is a *local* notification, meaning the app must have been foregrounded at some point to schedule or fire it — so for N8/N9/N10 the "spotted" ping arrives when the user opens the app, not when the trip happens.

**(f) Permission is requested twice, in the wrong order, from the wrong place.** Onboarding slide 3 asks (silently failing on denial), and `scheduleIfEnabled` re-requests on every foreground while ungranted (`:161–164`). Meanwhile motion and location — the permissions the notifications are *about* — are never primed.

---

## 4. Gap list — what must exist for the autopilot thesis to feel real, and does not exist in code

Ordered by how much the thesis depends on them. **§4.1 is a mechanism gap; most of the rest are surface gaps. That distinction is the most important thing in this section.**

### 4.1 The learning loop itself — **corrections are terminal**

This is the most serious finding in this document, and the prior draft got it wrong by framing it as a missing *surface*.

`NORTH_STAR.md:58` states the design: *"every correction trains a per-user prior (your 8am corridor = commute by car; your Friday transaction at that merchant = groceries) so the app gets quieter every week."* `NORTH_STAR.md:80` repeats it for classification: *"OS activity type × speed profile × HealthKit/Health Connect reconciliation + per-user priors."*

**Nothing in the repository implements this.**

- `confirmTripMutation` (`hooks/useTrips.ts:855–896`) resolves the emission factor, updates **one** `detected_trips` row to `status: 'confirmed'` with the chosen `mode`, and — for non-zero-emission modes — creates one entry via `createDurable`. That is the complete write set. No prior is stored.
- `dismissTripMutation` (`:898+`) writes a status and nothing else.
- The only thing named "prior" in the codebase is `activityConfidencePrior` (`lib/activityFusion.ts:183`), consumed at `:303–305` as `const blend = 0.5 * prior + 0.5 * gps.confidence`. It is **a static constant per OS confidence level, identical for every user**, and no correction ever changes it.
- Every classification threshold is a global constant: `lib/tripEngine.ts:38–41` — `CAR_AUTO_CONFIRM_MIN_CONFIDENCE = 0.75`, `CAR_AUTO_CONFIRM_MIN_KM = 2.0`, `ZERO_EMISSION_AUTO_CONFIRM_MIN_KM = 0.5`. No per-user table, no read path, no write path.
- `docs/PRD.md:123` names the same thing as the engagement bar with nothing behind it: *"a shrinking daily confirm-queue size per user over their first month."*

**Consequences that follow directly:**
- The "quiet moment" in §1.4 is **not currently possible**, not merely unsurfaced.
- §4.11's "queue is getting quieter" surface would today render a flat line, or noise.
- **The demo must not claim it.** See §5.2.

**What should exist, in order:** (1) a per-user correction store keyed on route/time-of-day/mode; (2) a read of it in `fuseSignals` / `decideTripAction` alongside the static prior; (3) *then* a surface showing the trend. Building (3) first would be a dashboard over a constant.

### 4.2 An activation touchpoint for the autopilot itself

**Does not exist.** `requestPermissions` (`hooks/useTrips.ts:704`) has exactly one call site: `handleEnableDetection` at `app/log.tsx:477`, fired by the "Auto-detect trips" banner at `:765–789`, which renders when `hasPermission === false || IS_EXPO_GO`. On a fresh install the hydrate effect leaves `hasPermission` false, so the banner does exist — inside the manual-entry modal, reached by tapping `+`, on a screen whose own header reads *"Most things track themselves — this is for the rest"* (`app/log.tsx:506`).

**The user must open the escape hatch to switch on the thing that makes the escape hatch unnecessary.**

Two further facts make this worse than a placement problem:
- On iOS, `hasPermission` is true only when **background "Always"** location is granted (`hooks/useTrips.ts:817–830`). A "While Using" user sees an undismissable banner forever.
- Motion & Fitness — the permission the retroactive-history feature actually depends on — is only requested *after* location succeeds (`:831–845`), so a location denial means motion is never even requested and the app never appears in Settings → Motion & Fitness.

**What should exist:** a permission-priming step in onboarding with the `NORTH_STAR.md:140` privacy framing, and a persistent card on Today when detection is off or degraded — with distinct copy for "no permission," "While Using only," and "motion denied." Without this, the aha moment named in §1.1 is unreachable for any user who never opens `/log`.

### 4.3 Notification → destination routing

**Does not exist** (§3.3b). Needs `addNotificationResponseReceivedListener` plus a `data` payload on N7 (`{ route: '/recap' }`) and N8 (`{ route: '/(tabs)', action: 'review' }`), and a `setNotificationHandler` so foreground fires are presented at all (§3.3c).

### 4.4 The three gaps that resolve on one undecided question

`docs/PRD.md:141` (Q4) records the paid Apple Developer account as **undecided**, and App Group entitlements as unavailable on a free personal team. Three items previously listed as separate gaps are downstream of that single decision:

1. **Push delivery** — `hooks/useNotifications.ts:144–148` catches the missing `aps-environment` entitlement and silently returns (§3.3e).
2. **The receipts share-extension channel** — removed for exactly this reason, documented in `app/import.tsx:9–15`.
3. **The ambient layer** — `NORTH_STAR.md:146–147` patterns 10 and 11 (Trip Live Activity / Dynamic Island, home-screen widgets); `docs/PRD.md:109` ties them to the same gate.

Listing them separately overstates the backlog. **One decision unblocks all three**, and the ambient layer is the one that matters most to the thesis: it is where an autopilot is *felt without opening the app*. That is the difference between "the app tracked my drive" and "my phone showed my drive accruing carbon on the lock screen."

### 4.5 A settings screen

**Does not exist.** There is no route for it. Consequences: nothing ever writes `notification_preferences`, which is why N1–N5 are inert *and* why `streak_notifications` is ignored (§3.3a, §3.3d); trip detection cannot be turned off once on; the baseline cannot be re-run (there is no manual path to `/carbon-calculator`); there is no privacy or data-handling surface despite the product asking for Always location, Motion & Fitness, and bank credentials; and there is no account-deletion path, an App Store review requirement for any app with accounts (`docs/store-metadata.md` is the submission doc; the flow it would describe is not built).

**Sequencing note, load-bearing:** this screen is the thing that arms N1–N5. Rewrite or delete those strings first (§3.3a).

### 4.6 A provenance / "why this number" surface

`lib/spendFactors.ts` computes `factorRef` (e.g. `"USEEIO v1.3.0 · NAICS 445110"`), `naicsCode`, a crosswalk `confidence`, and `isFallback`. **None of these appear anywhere in `app/` or `components/`.** `NORTH_STAR.md` §5 commits to "every spend-based number is labeled as an estimate with disclosed uncertainty"; the feed's estimate chip conveys *that* a value is estimated but never *which* factor, which version, or how confident. For a persona defined by mastery over personal data (`DESIGN_DIRECTION.md:15`), and for the persona most likely to fact-check an estimate, this is the missing trust surface.

The natural home is `app/entry/[id].tsx`, which today shows the least provenance and the most decimal places.

### 4.7 The pending-baseline gate protection is void for exactly the users it exists for

`hooks/useBaseline.ts:31–34` patches the profile cache with `(old) => old ? { ...old, baseline_kg: baselineKg } : old`, and the comment above it states the purpose: *"Patch the cache immediately so the gate in (tabs)/_layout sees the updated value… Without this, stale baseline_kg: null triggers another redirect."*

For a brand-new signup, `useProfile` returned `null` — `hooks/useProfile.ts:37` returns `null` on PGRST116 ("no rows found — valid for new users with no profile row yet"). So `old` is `null`, the patch is a **no-op**, and the documented protection does not exist for the only users it was written for. `docs/USER_JOURNEY.md:297` asserts the gate *"guards correctly… against double-firing after a pending baseline save (the `useBaseline.onSuccess` cache patch)"* — that assertion is false for every new account.

What actually holds the redirect off is the `if (profileLoading || profileFetching) return;` guard at `app/(tabs)/_layout.tsx:69`. Any change to profile fetch behaviour reopens a redirect loop into the eight-question calculator with no exit (§2.A4). *(`stores/authStore.ts:145–148` is the sole exception: Apple Sign-In creates a `profiles` row, so those users have a non-null `old` to patch.)*

### 4.8 Carbon-literacy captions, built and wired into two screens

`lib/impactCopy.ts` ships `drivingComparisonCaption` (`:42`) and `globalAverageComparisonCaption` (`:59`). Grep finds exactly two consumers: `app/log.tsx:57, 860` and `app/(onboarding)/calculator.tsx:27, 525`. `docs/USER_JOURNEY.md:307` lists this as open: *"caption still needs wiring into screens."*

Today's feed, the ring, Trends, Recap and Passport all still answer "is 4.2 kg a lot?" with nothing. Per `USER_JOURNEY.md:149`, this persona *"doesn't want to be taught; they want a second axis to reason on"* — and the caption form (stated once, muted, never a tooltip) is already written and tested. This is the cheapest real gap on the list.

### 4.9 Reduced motion is never handled in the app

`DESIGN_DIRECTION.md:149` requires *"Respect reduced-motion: fade in place, no transforms."* Grep across `app/`, `components/`, `hooks/`, `lib/` for `useReducedMotion`, `isReduceMotionEnabled`, `AccessibilityInfo`, or `reduceMotion` returns **nothing** — in a Reanimated-heavy product (`VCountUp`, `HeroGlowNumber`, `VStaggerIn`, paged Recap/Passport, `ParticleBurst` at `app/log.tsx:144`).

The marketing site *does* honour it (`website/src/sections/WaitlistCTA.tsx:25, 46`), which makes this a checkable defect rather than a speculative one: the same team applied the rule on the web and not in the app.

### 4.10 A real share action

Both story surfaces terminate in an instruction to screenshot (`app/recap.tsx:219`, `app/passport.tsx:442`). `Share.share` is already imported and used for challenge invite codes at `app/(tabs)/profile.tsx:258–262`. `NORTH_STAR.md:151` names the Passport as the growth loop and cites Flighty's founder on it being a top-3 organic growth driver. The loop ends one tap short.

### 4.11 A "the app is getting quieter" surface — blocked on §4.1

The confirm queue's size is visible only as today's count (`app/(tabs)/index.tsx:1235–1246`); its *trend* is not computed, not stored, and not rendered. **Do not build this before §4.1.** With static global thresholds and no learned priors, a trend line would be measuring the user's travel variance, not the product working.

### 4.12 A catch-up moment for the returning user — mostly a copy gap

`NORTH_STAR.md:69` calls retroactive history the fix for the product's worst bug, *"because opening the app once a week is now enough."* The "Earlier this week" section is **deliberately** the landing spot: the in-file comment at `app/(tabs)/index.tsx:1049–1055` names it *"THIS is the backfill acknowledgment."* So the surface exists and is correctly placed.

What is missing is the acknowledgment itself. A user returning after five days sees rows quietly appended under a neutral heading, with nothing saying the app just reconstructed five days it was not running for. That reconstruction is the most impressive thing the product does, and it is currently narrated by a section header.

### 4.13 A receipts forwarding-address surface — and a scope-doc mismatch

`NORTH_STAR.md` §6 specifies two provider-agnostic channels: a per-user forwarding address (`receipts@veridian.app`) and a share extension. In code: the share-intent path was **removed** (`app/import.tsx:9–15`, App Group entitlement — §4.4), and the forwarding address has **no UI anywhere** — no screen displays a per-user alias, no copy-to-clipboard, no setup instructions. `hooks/useReceiptImport.ts` retains a share-intent path function with no screen calling it; `supabase/functions/receipt-parse` exists.

**Also flag the doc:** `docs/PRD.md:101`, under **"Shipped and live,"** states *"Receipts layer (Sprint E Half 1, shipped July 18, 2026): forwarding-address and share-extension ingestion…"* Neither channel is reachable by a user. A scope document claiming two shipped channels the code does not expose is exactly the kind of thing a diligence pass finds, and it should be corrected in `PRD.md` rather than argued about later.

### 4.14 Snap-a-Plate — the largest specced-but-unbuilt touchpoint

`docs/SNAP_A_PLATE_SPEC.md` is 499 lines specifying a camera-first food flow. `docs/PRD.md:112` records it as *"a proposal awaiting product-owner sign-off. No implementation has started,"* with five open sub-decisions and a proposed 100-photo Haiku-vs-Sonnet accuracy gate before any UI work. `docs/PMF_ANALYSIS.md:117` is explicit: *don't build it before the motivation interviews.*

It belongs on this list precisely so it is not mistaken for a shipped touchpoint — and so its absence from the demo is a decision rather than an oversight.

### 4.15 A monetization touchpoint

`NORTH_STAR.md:159` commits to a flat subscription for the intelligence layer. There is no paywall, no trial state, no plan screen, no entitlement check anywhere in `app/`. This is correct sequencing — `docs/PRD.md:137` (Q2) says the hard-outcome decision must land first — but it means the journey has no terminus for the business model, and any pitch walkthrough hits a wall at "and how do you charge?"

### 4.16 Error and retry, nearly everywhere

Exactly one screen implements error-with-retry: the Today AI insight card (`components/ui/VAiInsightCard.tsx:74–86`, whose own comment reads *"quiet retry row — never a blank hole, never a crash"*). Trends throws and renders nothing. Recap and Passport report failure as emptiness. `entry/[id]` reports failure as an inescapable spinner. For a product whose entire trust proposition is "the numbers are right," a data-fetch failure that presents as "you have no data" is the worst available failure mode — and the pattern to copy already exists in the repo.

---

## 5. The 90-second investor demo

### 5.1 Setup — including the hardware requirement

**What the 90 seconds must prove:** one thing — **Veridian writes the ledger; the user edits it.** Not the calculator, not the badges, not the challenges. Every second spent elsewhere argues the opposite case.

**Do not demo first-run.** It currently contains a fabricated 5,800 kg, a leaderboard slide, a signup screen that shows success on failure, and a Google button that prints an env var name.

**Run on a pre-seeded, signed-in account with:** 6–10 days of history, at least two `needs_confirmation` trips queued, one auto-confirmed **car** trip in today's feed, and at least one estimated (spend-derived) row.

**Run on a physical iOS device with Motion & Fitness granted.** This is not optional and the prior script omitted it. `hooks/useTrips.ts:474–480` states plainly that `VeridianMotion.isAvailable()` is false in Expo Go **and on simulators**, in which case GPS trips pass through `fuseSignals` unchanged and there is no CoreMotion history at all. The t=1:02 line below — *"iOS logged these on the coprocessor before the app was even open"* — is true only on a real device. On a simulator you would be narrating a fiction over seeded rows, to an audience that may well ask to hold the phone.

### 5.2 The click path

| t | Screen | Action | What you say | Code |
|---|---|---|---|---|
| 0:00 | Today, cold open | Land on the ring | "I haven't opened this in three days. It kept going." | `app/(tabs)/index.tsx` |
| 0:08 | Ring + efficacy line | Point, don't tap | "That number is today. This line is the only thing the app says about it — no verdict, no guilt." | `:1211–1219`, `EFFICACY_COPY` |
| 0:15 | Feed | Scroll one screen | "Every row wrote itself. Nothing here was typed." | `:1295` `FeedRow` |
| 0:25 | An estimated row | Point at the muted italic chip | "Sensor values look like measurements. Spend-derived values look like estimates. On purpose — false precision is what kills these apps." | `ImpactPill` / estimate chip |
| 0:35 | **Review card** | Tap "2 moments to confirm" | "Here's the whole product. Two things it wasn't sure about." | `:1235–1259` |
| 0:42 | **ConfirmCard** | Tap the primary confirm | "One tap." | `:708`, sheet `:1371` |
| 0:50 | **ConfirmCard, second trip** | Tap a *mode chip* — reclassify car → bus | **"And when it's wrong, correcting it is the same one tap — and it's priced against the mode you chose, not the one it guessed."** | `hooks/useTrips.ts:868` (`findFactorForMode(factors, mode)`) |
| 0:58 | `ReviewAllDone` → auto-close | Let it close itself | "That's the daily interaction. Ten seconds." | `:791`, `:1373` |
| 1:02 | Today, "Earlier this week" | Scroll | "This is backfill — iOS logged these on the coprocessor before the app was even open." *(physical device only)* | `:1298`, `hooks/useTrips.ts:470–492` |
| 1:10 | Tap the week teaser | → `/recap` | "Sunday evening it turns the week into this." | `:1340` → `app/recap.tsx` |
| 1:18 | Recap pages 1–3 | Three swipes | "Delta, split, and one thing that went well. No confetti, no badge." | `app/recap.tsx` |
| 1:28 | Close → You → Passport | Two taps | "And monthly, this. It's the artifact people show other people — Flighty's growth loop, applied to carbon." | `app/(tabs)/profile.tsx:572` → `app/passport.tsx` |
| 1:35 | Passport page 3 | Stop here | "'No typing. No logging. Just your life, ledgered.' That's the whole pitch." | `app/passport.tsx:303` |

Total ≈ 95 seconds. Cut the Recap swipes to two to land at 90.

**The line that must be cut, and why.** The prior script said at t=0:50: *"That correction trains a prior. The queue gets shorter every week."* **That mechanism does not exist** (§4.1) — corrections write a status and a mode to one row and nothing else; every threshold is a global constant. The replacement line above is true, verifiable in `hooks/useTrips.ts:868`, and still lands the correction beat. If the learning loop comes up, the honest answer is: *"The design is that corrections train a per-user prior — that's `NORTH_STAR.md` §3. That layer isn't built yet; today the thresholds are global and the confirm loop is the backstop."* Saying anything else in an investor room is a misrepresentation of the product.

**Never open in this demo:** `/log` (simulate-trip button in a dev build, particle burst, the second divergent confirm UI); `/(tabs)/trends` on a thin account (empty chart, three em-dashes, and a Streak counter); `/challenge/[id]` (no way back out); first-run of any kind.

**A note on the walk trip.** Do not seed the demo account with a zero-emission auto-confirm as the hero moment. It produces a notification and a feed row but writes no `emission_entries` row (§1.3b), so the ring will not move — and "the ring fills" is both the scripted beat and `NORTH_STAR.md:142`'s definition of the aha.

### 5.3 What must be fixed before this path is clean

**Blocking — the path itself breaks or contradicts the pitch.**

| # | Fix | Where | Why it blocks |
|---|---|---|---|
| B1 | Replace the leaf glyph in the momentum pill and the Today/Trends empty states | `components/ui/VMomentumBand.tsx:63`, `app/(tabs)/index.tsx:1288`, `app/(tabs)/trends.tsx:502` | The pill sits beside the greeting, so a leaf is on screen for the entire 95 seconds. `DESIGN_DIRECTION.md:19` names leaf icons as a primary-persona repellent. Non-eco glyphs (`sparkle`, `chart`) are already in `VIcon` and already used on the review card. |
| B2 | Give the ring a real denominator, or say what it is | `types/emission.ts:90` and **every consumer**: `app/(tabs)/index.tsx:148, 186, 999, 1104`; `app/(tabs)/_layout.tsx:11, 64`; `app/(tabs)/trends.tsx:42, 350`; `app/(tabs)/profile.tsx:46, 311`; `app/log.tsx:58, 286, 442, 849, 853` and the on-screen string at `:866`; `lib/momentum.ts:21, 92` | "Of 22 kg" is a global constant on a product pitched as personal. The first question after 0:08 is "22 for whom?" and the honest answer is "everyone." The blast radius is ~17 call sites across six files plus the momentum engine — **and the tab-bar mood dot at `_layout.tsx:64`**, which the prior draft praised without noticing it inherits the same defect. Also resolve the unused second constant `TARGET_CARBON_BUDGET_KG = 7` (`types/emission.ts:92`, re-exported `types/index.ts:20`, consumed nowhere). |
| B3 | Prorate or gate `avoidedKg`, **and address the Grove above it** | `app/(tabs)/profile.tsx:155–162, 353`; Grove at `:49–52` | The Profile hero at 1:28 shows an unearned "N kg never emitted" — the current partial week credited in full against `baseline_kg / 52`. Fixing the number alone leaves the tree silhouettes, which `USER_JOURNEY.md:237` flags as offset visual grammar and `DESIGN_REQUIREMENTS.md:336` bans as moral-closure UI. Both are on screen in the same glance. |
| B4 | Add an error branch with retry to Recap and Passport | `app/recap.tsx:242–271`, `app/passport.tsx:472–505` | A failed query on stage says "Your week is still filling in" — the app confidently asserting the demo account has no data, indistinguishable from an empty account. `components/ui/VAiInsightCard.tsx:74–86` already implements the quiet retry row to copy. |
| B5 | Add a close control to `/challenge/[id]` | `app/challenge/[id].tsx` (no close/back/`VIcon` exists in the file) | Not on the scripted path, but one mis-tap on Profile at 1:28 lands in a screen with no exit on Android and only an edge-swipe on iOS. Watching a presenter hunt for a back button is a memorable bad moment. |
| B6 | Add a share action to the Passport card page | `app/passport.tsx:442` | "How does this spread?" is a certain question and the current answer is "the user screenshots it." `Share.share` is already used at `app/(tabs)/profile.tsx:258–262`. |
| B7 | Seed a **car** trip, not a walk, as the hero auto-log | demo data | §1.3b — a zero-emission auto-confirm writes no entry, so the ring will not move on the scripted beat. |

**Blocking if the demo touches first-run or manual log at all** — and it will, if anyone asks "can I try it?":

| # | Fix | Where |
|---|---|---|
| B8 | Read the auth error after the await instead of the stale snapshot | `app/(auth)/signup.tsx:38–41`; make `signUpWithEmail` return `error ?? null` (`stores/authStore.ts:78–81`) |
| B9 | Hide or disable unconfigured Google sign-in and replace the message | `app/(auth)/login.tsx:104–110`, `stores/authStore.ts:8, 18–21, 94–97` |
| B10 | **Route "try it" through Apple Sign-In** — no email round-trip, and it is the only path that creates a `profiles` row | `app/(auth)/login.tsx:112–120`, `stores/authStore.ts:116–159` |
| B11 | Suppress the pre-answer footprint counter | `app/(onboarding)/calculator.tsx:829` — render `—` until `Object.keys(answers).length > 0` |
| B12 | Add back and skip to the calculator, and a close on the `/carbon-calculator` entry | `app/(onboarding)/calculator.tsx` |
| B13 | Disable the results CTA while pending and catch its rejection; fix the null-cache patch | `app/(onboarding)/calculator.tsx:496–509`, `hooks/useBaseline.ts:31–34` (§4.7) |
| B14 | Replace the onboarding leaderboard slide with passive detection + the money layer | `app/(onboarding)/index.tsx:70–74, 88–91` |

*(The prior draft's B12 — "gate the simulate button on `IS_EXPO_GO` only" — is dropped. `__DEV__` is false in release builds, the in-file comment at `app/log.tsx:790–791` explains why it must show in dev-client runs, and removing it would break the team's only simulator path for exercising the trip pipeline. Correct action: confirm release builds strip it.)*

**Should-fix — not visible in 95 seconds, but the first thing diligence finds:**

- Rewrite or delete N1–N5 (`hooks/useNotifications.ts:14–75`) **before** building settings (§3.3a, §4.5). "Keeps your streak alive" is a shipped string in a product whose North Star says "no breakable chains, ever."
- Wire notification routing and a `setNotificationHandler` (§4.3).
- Decide the guard question for `modal`, `+not-found`, `entry/[id]`, `challenge/[id]` (§2.G1); rebuild `+not-found` in the design system.
- Add `onError` to `app/log.tsx:415–426` and to the three Profile mutations — the `errorToast` is already wired in that file.
- Replace `ParticleBurst` (`app/log.tsx:144, 957`) with the existing checkmark morph; replace the accent rails **inside `VCard`** at `app/(tabs)/profile.tsx:413, 456, 506` with the project's 8×8 dot convention. (Leave `app/(tabs)/trends.tsx:76` — it is not inside a card and is not the rejected pattern.)
- Wire `lib/impactCopy.ts` into the feed, ring, Trends, Recap and Passport (§4.8) — the cheapest real gap on the list.
- Audit reduced-motion across the Reanimated surfaces (§4.9); the website already shows the intended handling.
- Correct `docs/PMF_ANALYSIS.md:19` (the aha *is* named, at `NORTH_STAR.md:142`) and `docs/PRD.md:101` (neither receipts channel is user-reachable).
- Move the trip-detection activation out of `/log` (§4.2) — not cosmetic; it is the reason a real trial user would never reach the aha moment at all.

### 5.4 The two questions this demo cannot answer

**"How many people have done this?"** **No data — pre-launch.** The honest framing, and the one `docs/PMF_ANALYSIS.md` §4 already recommends: the mechanic is validated in adjacent categories (Copilot Money, Flighty, Whoop), the carbon-specific willingness to pay is not, and the next step is a customer discovery week against people who already pay for one of those three — not more build. The only real signal that exists today is the waitlist (§2.A0) and informal phone testing (`PMF_ANALYSIS.md:73`).

**"Does it actually get quieter over time?"** Not yet, and not for lack of a chart. The learning loop is unbuilt (§4.1). Say that plainly; it is a roadmap item with a clear shape, and it is far less damaging than a claim that does not survive a code read.
