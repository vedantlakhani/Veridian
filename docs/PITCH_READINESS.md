# Veridian — Pitch Readiness Blocker List

*What must be true before Veridian can be shown to an investor.*

**Written August 2026. Sources: the repository itself. Every claim below cites a file, and where useful a line.**

---

## 0. Read this first — the data discipline of this document

Veridian is **pre-launch with zero real users**. There is no analytics install, no funnel, no cohort, no retention curve, no interview corpus. Wherever a number about user behaviour would normally sit, this document writes **no data — pre-launch**, and it does so deliberately rather than reaching for a plausible figure.

The one exception on record, and it is not evidence: `docs/PMF_ANALYSIS.md:73` notes "a small amount of informal phone-testing feedback (which drove real fixes this session — the NAICS-code confusion, the chip bug, the missing carbon-literacy copy)." That is a handful of taps by people close to the project. It is not customer discovery and it is not cited below as such.

Everything in this document is either (a) a fact read out of a file, or (b) a **labeled assumption**. There is no third category.

---

## 1. The three-track framing

`docs/PMF_ANALYSIS.md` returns a verdict of **VALIDATE_FIRST** (§4) with two of five customer dimensions marked as gaps in the customer's own words (§2, Objectives and Sharp Problems). That verdict is correct and this document does not argue with it. But it answers a different question than the one here, and conflating the two has already cost sequencing clarity once.

There are three separable tracks:

| Track | What it is | Gated on real users? | Time to done |
|---|---|---|---|
| **A — Pitch-ready product artifact** | A build that survives twelve minutes in a stranger's hands without contradicting the pitch | **No** | Days |
| **B — Brand identity** | An icon, a mark, a wordmark, store assets, and metadata that say "instrument," not "eco app" | **No** | Days |
| **C — PMF evidence** | Named sharp problems and objectives from real interviews; carbon-specific willingness to pay | **Yes** | Weeks, and it starts by talking to people |

**A and B do not require C.** This is the load-bearing claim of this document, so it is worth stating without hedging.

At pre-seed there is by definition no retention curve to underwrite. What is being underwritten is: a thesis that is specific enough to be wrong, a founder whose taste and execution are visible in an artifact, and a wedge that is technically non-obvious. Veridian has all three on file — the thesis at `docs/NORTH_STAR.md:9` ("it writes your carbon story automatically from signals your life already emits"), the wedge at `NORTH_STAR.md:69` (retroactive `CMMotionActivityManager` history, seven days, zero battery, which no React Native library exposes today), and a competitor graveyard at `NORTH_STAR.md:28-31` that is genuinely good analysis. The product's job in the room is to prove the founder can *build the thing they described*. That is a craft question, and craft is demonstrable on day one.

What kills a pre-seed meeting is not a missing retention chart. It is a build that undercuts its own pitch in the first ninety seconds — a demo that stalls at signup, a screen that shows an unearned number, a slide that promises "precision instrument" followed by a screen offering achievement badges. Every one of those exists in the repo today and every one is fixable this week.

**Track C runs in parallel and on its own clock.** `PMF_ANALYSIS.md:104-110` already specifies it: 5-10 motivation interviews with people who already pay for Copilot Money / YNAB / Whoop / Oura, 5-10 workflow interviews, and a 20-80 response survey. Start booking those calls now — they take calendar weeks to land regardless of what happens on tracks A and B. Do not let track C block the pitch, and do not let the pitch pretend track C is finished.

**Assumption, labeled:** the ordering below assumes the near-term goal is a pre-seed conversation with a working demo, not an App Store launch. If the goal is public launch, `docs/store-metadata.md` and the screenshot set move from HIGH to BLOCKER.

---

## 2. BLOCKERS — ranked by investor-demo visibility

Ranking rule: **strictly by when and how hard an investor hits it**, not by how interesting the engineering is. A 45-minute fix that lands at t=0:15 outranks a three-day fix nobody will see.

---

### B0 — Do not say "that correction trains a prior." (Not ranked; it is not on screen.)

**What it is.** The natural demo narration for the confirm loop is the sentence in `docs/NORTH_STAR.md:58`: "every correction trains a per-user prior... so the app gets quieter every week." That layer is not built.

**The real file.** `hooks/useTrips.ts:855-896` — `confirmTripMutation` resolves an emission factor, writes `status: 'confirmed'` and `mode` to one `detected_trips` row, and creates one entry. Nothing else is written. No per-user prior is stored and none is read on the classification path. The only object in the repo named a prior is `activityConfidencePrior` in `lib/activityFusion.ts:183` — a **static constant per OS confidence level, identical for every user**. Every classification threshold is a global constant (`lib/tripEngine.ts:38-41`).

**Why it matters.** This is not a rendering gap that a chart would fix. The mechanism does not exist. Saying it in a room, to someone who may later read the code in diligence, is a misrepresentation — and "how does it get better over time?" is the single most predictable question about an autopilot.

**The fix.** Cut the sentence from the script. Replace it with the true and still-strong version: *"Corrections are the design's training signal. Today they correct the ledger; the per-user prior layer is the next thing I build, and it's specced at NORTH_STAR §3."* Roadmap stated as roadmap is not a weakness at pre-seed. A claimed mechanism that isn't there is fatal.

**Effort: 10 minutes.** Highest ratio in this document.

---

### B1 — The app icon is a mint leaf on a dark ground, and the native iOS catalog is still the raw Expo template

**What it is.** Two separate failures stacked.

**The real files.**
- `assets/images/icon.png` (referenced `app.json:8`) is an Understory-era mint-green leaf on a near-black `#0E1512` ground. It is a leaf — banned outright at `docs/DESIGN_DIRECTION.md:35`. It is dark — while `app.json:9` sets `"userInterfaceStyle": "light"` and `lib/theme.ts:15-45` has no dark palette at all. Its green is not `accent #0F6B41` (`lib/theme.ts:27`). `#0E1512` appears nowhere in `lib/theme.ts`.
- `ios/Veridian/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` md5 `9e41612e6ff72156906ea24a928f6335` **differs** from `assets/images/icon.png` md5 `18f224545e2692cc03ee98f1e2d72034`. The committed `ios/` prebuild directory was never regenerated. It contains the blue Expo "A" chevron with its construction guides still visible.
- `app.json:28` sets the Android adaptive background to `#0E1512`; `app.json:45` points the web favicon at `assets/images/favicon.png`, dated `Oct 26 1985` — the Expo template's fixed mtime, still the blue chevron.
- Four `react-logo*.png` template files are still committed in `assets/images/`.

**Why it kills the demo.** The icon is the first artifact an investor sees and the only one that persists on their phone after the meeting. A build made from the committed `ios/` tree without a fresh prebuild ships the literal Expo placeholder to TestFlight. Everything after that is arguing against a first impression of "unfinished side project."

**The fix.** Full asset work order in §4. Minimum viable path: draw Concept A, produce the five raster assets, change `app.json:28` and `app.json:66` backgrounds to `#FCFCFD`, run `npx expo prebuild --clean`, verify the AppIcon md5 changed, delete the react-logo files.

**Effort: 1–2 days for the mark, 3 hours for asset production, 30 minutes for prebuild and verification.**

---

### B2 — "Continue with Google" prints an internal `.env` instruction on the login screen

**What it is.** The most familiar button on the first screen returns a developer error string.

**The real file.** `.env` sets `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=placeholder-…`. `stores/authStore.ts:8` computes `hasRealGoogleClientId` by rejecting anything starting with `placeholder-`, and line 20 sets `GoogleSignin = null`. `stores/authStore.ts:94-96` then sets `authError: 'Google Sign-In is not configured yet — add a real EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.'` The button is rendered unconditionally at `app/(auth)/login.tsx:104-110`.

**Why it kills the demo.** t≈0:10. Before any product value exists on screen, the app hands the viewer an environment variable name. It reads as a half-wired prototype, and it is the single most likely button for someone unfamiliar with the app to press.

**The fix.** Hide the provider button entirely when `GoogleSignin === null` — export the flag from `stores/authStore.ts` and gate `app/(auth)/login.tsx:104-110` on it. Replace the toast copy with user-facing language regardless: "Google sign-in isn't available right now — use email." Never leak an env var name to a user, in any build.

**Better still, and cheap:** Apple Sign-In already works and is the shortest possible first run. `app/(auth)/login.tsx:112-120` renders it on iOS; `stores/authStore.ts:116-159` drives `expo-apple-authentication`, treats `ERR_REQUEST_CANCELED` as not-an-error (`:155`), and uniquely upserts a `profiles` row with `display_name` on first sign-in (`:139-149`) — so it is also the only auth path that satisfies the `profile === null` gate at `app/(tabs)/_layout.tsx:81` without a round trip. **Make Apple the demo's primary auth path and demote Google.** Note `app.json:16` currently has `"usesAppleSignIn": false` — that needs flipping before the build.

**Effort: 30 minutes to gate the button. 30 minutes to flip `usesAppleSignIn` and re-verify the Apple path on device.**

---

### B3 — A failed signup shows the "Check your email" success screen

**What it is.** Signup reads a stale error snapshot and declares success on failure.

**The real file.** `app/(auth)/signup.tsx:21` destructures `authError` from the Zustand store at render time. `app/(auth)/signup.tsx:37-41`:

```
setLoading(true);
await signUpWithEmail(email, password);
setLoading(false);
if (!authError) setSuccess(true);
```

`signUpWithEmail` at `stores/authStore.ts:78-82` sets the error **inside the store, after** that snapshot was captured. So `authError` is still `null` at line 40 and `setSuccess(true)` fires. The success screen's only exit is "Back to Sign In" (`app/(auth)/signup.tsx:49-50`).

**Why it kills the demo.** t≈0:15, and it is terminal. Any failure — email already registered, Supabase rate limit, weak-password rejection, conference wifi blip — lands on a confident "Check your email." The account does not exist. Login then fails. The demo is over before the product has been seen, and the presenter has no way to know what happened.

**The fix.** Make `signUpWithEmail` return the error: change `stores/authStore.ts:78-82` to `return error?.message ?? null`. Then in `app/(auth)/signup.tsx:37-41`: `const err = await signUpWithEmail(email, password); setLoading(false); if (!err) setSuccess(true);` Apply the same pattern to `signInWithEmail` (`stores/authStore.ts:~74`) — it has the same shape.

**Effort: 45 minutes including a test.**

---

### B4 — Onboarding slide 3 of 3 pitches the exact gamification the positioning rejects

**What it is.** The third and last thing a new user is told the product is for is leaderboards and badges.

**The real file.** `app/(onboarding)/index.tsx:71-74`:

```
title: 'Challenge friends',
subtitle: 'Create reduction challenges, climb the leaderboard, and earn achievement badges.',
```

backed by `MOCK_LEADERBOARD` at `app/(onboarding)/index.tsx:88-91` and rendered at `:180-188`. Against: `docs/DESIGN_DIRECTION.md:38` ("No badges, streaks, or confetti framed as moral achievement"), `docs/DESIGN_DIRECTION.md:19` (the primary persona is "actively repelled by leaf icons, saturated green, gamified badges"), `docs/DESIGN_RESEARCH.md:138` (the performative activist wanting public leaderboards is a named anti-persona), and `docs/NORTH_STAR.md:139` ("Momentum, Not Streaks — no breakable chains, ever").

**Why it kills the demo.** t≈0:30, unavoidable, on screen for as long as the presenter is explaining the thesis. It positions Veridian as generic eco-gamification inside the same ninety seconds the pitch claims it is a precision instrument for people who hate that. An investor who has read the deck will notice the contradiction, and the contradiction is more damaging than either half alone.

**The fix.** Replace slide 3 with the actual differentiator — passive detection and the confirm loop. Suggested copy in the Clearing register: *"It tracks itself"* / *"Trips log from your phone's motion history. Spending and receipts fill in the rest. Your only job is an occasional one-tap confirm."* Replace `MOCK_LEADERBOARD` with a mock confirm card, which the codebase already has a component shape for. Challenges stay in the product, discoverable from Profile — they stop being the third thing a stranger is told the product is.

While in this file: slide 2 (`app/(onboarding)/index.tsx:68`) promises "Claude analyses your emissions and gives you one specific, actionable step — every day." See B8 — that promise is currently not kept for anyone.

**Effort: 3 hours (copy, mock swap, screenshot check).**

---

### B5 — The calculator shows a fabricated 5,800 kg footprint before the user has answered anything

**What it is.** The first number the app ever displays is invented.

**The real file.** `app/(onboarding)/calculator.tsx:829` renders `<FooterCounter totalKg={calcFootprint(answers)} />`. On step 0, `answers` is `{}`. `calcFootprint` (`app/(onboarding)/calculator.tsx:~486-495`) falls back to a hardcoded default for every missing key — transport 500 × 1.0, food 2200 × 1.0, home 2400 × 1.0, clothes 300, electronics 400. The footer at `:430` therefore reads "Your estimated footprint / 5,800 / kg CO₂e / year" before a single question is answered.

**Why it kills the demo.** t≈0:45. This is the first data the app ever shows, on the one screen whose entire job is establishing that the numbers are trustworthy. *"Where does 5,800 come from? I haven't told it anything yet"* is the most damaging single question that can be asked of a product positioned as a precision instrument — and `docs/NORTH_STAR.md:96` names false precision as a documented churn driver in the project's own research.

**The fix.** Accumulate only from answered keys. Until `Object.keys(answers).length > 0`, render the footer as an em-dash with the label "Answer a question to start." Do not default unanswered dimensions into a headline figure.

**Effort: 1 hour.**

---

### B6 — The 8-question onboarding calculator has no back, no skip, and no exit

**What it is.** A one-way corridor the presenter cannot leave.

**The real file.** `CalculatorScreen` (`app/(onboarding)/calculator.tsx:751-846`) renders a progress header, a question card, and the footer counter. There is no back control, no close, and no skip. `handleOptionSelect` advances irreversibly on a single tap. The same component is the standalone route `app/carbon-calculator.tsx`, which `app/(tabs)/_layout.tsx:82-84` force-enters via `router.replace('/carbon-calculator')` for any signed-in user with no baseline. The root Stack sets `headerShown: false` (`app/_layout.tsx:33`), so there is no navigation header either.

**Why it kills the demo.** A mis-tap on question 2 of 8 cannot be corrected. The presenter cannot back out to show anything else. If an investor takes the phone and asks "can I change that answer?" the answer is no — which, on a screen selling accuracy, is worse than the mis-tap.

**The fix.** Add a back chevron to the progress header calling `setStep(s => Math.max(0, s - 1))`. Add a "Skip for now" affordance that writes a null baseline and continues to the tabs. On the authenticated `/carbon-calculator` entry, add a close that returns to `/(tabs)`.

**Effort: 3 hours.**

---

### B7 — The final button of the first-run flow can do nothing, silently

**What it is.** Saving the baseline has no pending state, no disabled state, and no error path — and the cache patch meant to protect the redirect gate is a no-op for exactly the users it exists for.

**The real files.** `app/(onboarding)/calculator.tsx:496-509`:

```
void saveBaseline(totalKg).then(() => { router.replace('/(tabs)' as any); });
```

No `.catch`, no pending state, no disabled state on the CTA (`:563-569`). Separately, `hooks/useBaseline.ts:31-34` patches the cache with `(old) => old ? { ...old, baseline_kg } : old`. For a brand-new user `useProfile` returned `null` (`hooks/useProfile.ts:37`), so `old` is null and the patch is a no-op. `docs/USER_JOURNEY.md:297` asserts this patch "guards correctly... against double-firing after a pending baseline save." **That documented protection is void for every brand-new signup** — the gate at `app/(tabs)/_layout.tsx:80-84` depends entirely on the refetch landing, held off only by the `profileFetching` guard at `:69`.

**Why it kills the demo.** This is the last step before the product itself. On a slow or failed Supabase write the button does nothing at all — no spinner, no toast, no explanation — and the user is stranded on a results screen that also has no back (B6). The demo never reaches the app.

**The fix.** Use the mutation's state: disable the CTA while `isPending`, show a `VToast` with retry on rejection. In `useBaseline.onSuccess`, write a full object when `old` is null: `old ?? { id: user.id, baseline_kg: baselineKg }`, so the gate is satisfied regardless of the refetch.

**Effort: 2 hours.**

---

### B8 — The Home screen delivers no AI, and for real users the Claude call never runs at all

**What it is.** Two halves of one broken promise. Slide 2 of onboarding sells daily AI (`app/(onboarding)/index.tsx:68`); neither an empty account nor a full one gets it.

**The real files.**
- *Empty account:* `components/ui/VAiInsightCard.tsx:89` — `if (!insight) return null;`. On Home, `moves.length === 0` for a new user so the AI branch is taken (`app/(tabs)/index.tsx:1346-1359`), but `emissionContext` is `null` when there are no entries (`app/(tabs)/index.tsx:1166-1184`), which keeps `useAiInsight` disabled. `insight` is undefined, `isLoading` false, `error` null — the section collapses to blank space.
- *Account with data:* `app/(tabs)/index.tsx:1166-1168` sets `emissionContext` to `null` **whenever `moves.length > 0`**, with the in-file comment "When Top Moves are available, skip the AI Edge Function entirely (saves the Claude call)." That same condition takes the `VTopMovesSection` branch at `:1346`. So for every user who has data, the headline AI feature is served by a local client-side heuristic and the Claude call never fires. `docs/USER_JOURNEY.md:223` already records this as "Promise/delivery mismatch on AI."

**Why it kills the demo.** On an empty account Home is: a ring at 0.0, one empty state, a blank gap, and a row of grey dots — ninety seconds after being told the app has AI-powered daily insights. On a seeded account the presenter narrates "Claude analysed this" over a heuristic. The second half is worse than the first, because it is only wrong if said out loud — and it will be said out loud.

**The fix.** Two parts. (1) Add a third state to `VAiInsightCard` for `!insight && !isLoading && !error` — keep the gradient-bordered card and preview the feature: "Your first insight lands once there's a day to read." (2) Decide the Top Moves / Claude precedence deliberately and make the demo account land on the branch you intend to narrate. If Top Moves is the better product, say "our swap engine computed this" and move the AI claim off slide 2.

**Effort: 2 hours for the empty state. 2 hours to resolve the branch and align the copy.**

---

### B9 — A leaf icon is on screen for essentially the entire demo

**What it is.** The banned iconography is in the always-visible momentum pill and in five other places.

**The real files.** `VIcon name="leaf"` appears at `components/ui/VMomentumBand.tsx:63` (the pill beside the greeting in the Home hero, mounted at `app/(tabs)/index.tsx:1206`), `app/(tabs)/index.tsx:1288` (Home empty state), `app/(tabs)/trends.tsx:502`, `app/link-bank.tsx:120` (bank-connect hero), `app/recap.tsx:214`, `app/passport.tsx:406`. Against `docs/DESIGN_DIRECTION.md:19` ("actively repelled by leaf icons") and `docs/DESIGN_DIRECTION.md:35` ("No leaf iconography as decoration").

**Why it kills the demo.** The momentum pill sits next to the greeting on Home, so a leaf is on screen continuously. It is also the first icon in the empty state. It quietly recategorises the product as the generic eco app the pitch is spending its whole runtime denying — and it is the exact detail that makes the leaf app icon (B1) read as intentional rather than stale.

**The fix.** Swap to glyphs already present in `VIcon`: `sparkle` or `chart` for the momentum pill and empty states, `lock` for the bank-connect hero (it is already the CTA icon on that screen), a mode glyph (`walk` / `bike`) for recap and passport.

**Effort: 1 hour.**

---

### B10 — Profile claims "N kg never emitted" from a week that has not happened yet

**What it is.** The headline number on the identity screen credits the user for the remainder of the current week in advance.

**The real file.** `app/(tabs)/profile.tsx:155-162` sums `Math.max(0, baselineWeekly - w.total_kg_co2e)` over every row in `weekly_summaries`, where `baselineWeekly = profile.baseline_kg / 52`. The current, partially-elapsed week counts in full. A user with a 5,800 kg/yr baseline who logs 2 kg on Monday is credited `111.5 - 2 = 109 kg` "avoided." It renders as "109 kg never emitted" (`:353`) and drives the Grove tree count at `:52` — `floor(avoidedKg / 50) + 1`.

**Why it kills the demo.** t≈1:30. It is the hero figure on the screen the source itself calls the identity monument, and it is the first thing a curious investor interrogates. On a fresh demo account it will be large and obviously unearned, and the honest explanation — "we credit the rest of the week in advance" — is precisely the false-precision trust break `NORTH_STAR.md:96` names as a churn driver.

**Related, same screen, fix together:** the Grove itself (`app/(tabs)/profile.tsx:49-52`) renders one tree silhouette per ~50 kg avoided. `docs/USER_JOURNEY.md:237` flags trees-as-earned-units as the visual grammar of tree-planting offset products, and the Offset Absolver is the named anti-persona at `docs/DESIGN_RESEARCH.md:134-136`, explicitly rejected at `NORTH_STAR.md:160` ("Reduction, not absolution"). Fixing the number under a grove of trees is half a fix. **Cut the Grove for v1.**

**The fix.** Exclude the in-progress week from the ledger entirely, or prorate it by elapsed days. Gate the whole avoided-kg display until at least one complete week exists. Label it explicitly "vs. your estimated baseline." Remove the Grove.

**Effort: 3 hours including the Grove removal.**

---

### B11 — First-run Profile is a shelf of padlocked badges

**What it is.** The screen that is supposed to demonstrate restraint demonstrates the pattern the pitch says was rejected.

**The real files.** `app/(tabs)/profile.tsx:404-441` renders every achievement definition with `earned=false` for a new account; `components/social/AchievementBadge.tsx:88-100` draws a padlock overlay and a greyed medal-star on each. A streak counter also survives as a Personal Record at `app/(tabs)/trends.tsx:485`, against `NORTH_STAR.md:139` ("no breakable chains, ever"). `docs/USER_JOURNEY.md:167` additionally records a `VToast` "Badge unlocked: {name}" — the most literal possible badge-as-moral-win event, for a persona documented at `docs/DESIGN_RESEARCH.md:119` as repelled by exactly that.

**Why it kills the demo.** On a fresh account, Profile is a horizontal row of padlocks over an empty stat row. It looks unfinished *and* simultaneously demonstrates the design pattern the deck claims to have rejected. Those two impressions compound.

**The fix.** Remove the achievements shelf from Profile for v1 — the momentum band at `app/(tabs)/profile.tsx:400` already covers consistency in the way the design docs endorse. At minimum, hide unearned badges so the shelf appears only once something real is in it. Suppress the unlock toast. Rename the Trends "Streak" record to a momentum figure.

**Effort: 3 hours.**

---

### B12 — The store metadata sells a product the design system forbids, and `eas.json` is unfilled

**What it is.** Not a screen, but it is the document an investor's associate reads during diligence, and it currently contradicts the deck on four counts.

**The real files.** `docs/store-metadata.md`:
- The full description sells "Earn achievement badges for streaks, reductions, and milestones" — banned at `DESIGN_DIRECTION.md:38` and `NORTH_STAR.md:139`.
- "Why Carbon Tracking Matters — The average person emits ~8 tonnes... Veridian makes the invisible visible" — moralising register, against `DESIGN_DIRECTION.md:40` ("No guilt copy. Ever.").
- Keywords lead `carbon,footprint,climate,emissions,sustainability,tracker,eco,green` — positioned squarely at the anti-persona (`DESIGN_RESEARCH.md:134-138`).
- The icon spec names "Forest Green (#1B7A4A) background, white leaf/ring motif." `#1B7A4A` exists nowhere in `lib/theme.ts` and "leaf" is banned.
- `eas.json` submit block is still `your-apple-id@example.com` / `YOUR_APP_STORE_CONNECT_APP_ID` / `YOUR_APPLE_TEAM_ID`.

**The fix.** Rewrite the description in the Clearing voice around the autopilot mechanic. Kill the badges paragraph and the "Why Carbon Tracking Matters" section entirely. Re-weight keywords toward the instrument positioning (`automatic, passive, tracking, precision, ledger, insights, trips, spending`) and away from `eco, green, climate`. Replace the icon spec with the §4 spec. Fill the `eas.json` placeholders — that is a prerequisite for a TestFlight link, which is a prerequisite for leaving a build behind after the meeting.

**Effort: 2 hours for metadata, 15 minutes for `eas.json` once the Apple account decision at `NORTH_STAR.md:184` is made.**

---

## 3. HIGH and MEDIUM — compact table

Fix these in the sweep after the blockers. Ordered within tier by demo exposure.

| # | Tier | Item | File | Fix | Effort |
|---|---|---|---|---|---|
| H1 | HIGH | Demo requires a physical device — `VeridianMotion.isAvailable()` is false in Expo Go **and on simulators** (`hooks/useTrips.ts:474-480`), so "iOS logged these on the coprocessor" is only true on real hardware with Motion & Fitness granted | `hooks/useTrips.ts` | Rehearse and present on a physical iPhone, Motion & Fitness granted, seeded account. Never demo the autopilot on a simulator | 0 code; rehearsal constraint |
| H2 | HIGH | Manual log has no error path; quick-log discards failures by design ("Genuine server rejection — no user-facing error for quick-log taps") | `app/log.tsx:404-408`, `:415-426` | Add `onError` to both, surface the existing `VToast` with retry. If the offline queue absorbs it, say "Saved — will sync when you're back online" | 2h |
| H3 | HIGH | Challenge detail screen has no back or close; `Stack.Screen` sets a title but never `headerShown`, and root forces `headerShown: false` | `app/challenge/[id].tsx:35-40`, `app/_layout.tsx:33` | Add the header close row the other detail screens use (`app/entry/[id].tsx:75-84`), or register the route with `headerShown: true` | 45m |
| H4 | HIGH | Permanent stuck state on iOS: `hasPermission` is true only when background "Always" is granted, so a user who grants "While Using" sees the enable banner forever with no dismiss | `app/log.tsx:766`, `hooks/useTrips.ts:818-826` | Treat "While Using" as a satisfied state for the banner, or add a dismiss | 2h |
| H5 | HIGH | `/modal` renders with **no session** — it is not inside any `Stack.Protected` block, and expo-router resolves `veridian://modal` by path. Same for `entry/[id]`, `challenge/[id]`, `+not-found` | `app/_layout.tsx:33-49`, `docs/USER_JOURNEY.md:56` | Delete `app/modal.tsx`. Bring the other three inside the guard | 1h |
| H6 | HIGH | Empty Trends renders a zero-height chart plus "Best day —", "Best week —", "Streak 0 days" — three separate ways of saying nothing is here | `app/(tabs)/trends.tsx:414-425`, `:472-486` | Wrap chart and Personal Records in the `entries.length === 0` guard already used at `:498`; lift `VEmptyState` to cover the tab | 1h |
| H7 | HIGH | The website waitlist is the **only touchpoint a real person can reach today** and is absent from every readiness doc | `website/src/sections/WaitlistCTA.tsx`, `website/src/lib/waitlist.ts` | Verify the four states end-to-end (`invalid_email`, `duplicate` on PG `23505`, `unknown`, success) before the meeting. This is the one live conversion surface — instrument it now so track C has a top of funnel | 1h |
| M1 | MED | Passport and Recap report a fetch failure as "Your month is still filling in" — no `isError` branch, so the app confidently asserts the user has no data | `app/passport.tsx:472-506`, `app/recap.tsx:242-271` | Add `isError` with a retry, matching `components/ui/VAiInsightCard.tsx:75-87` | 1h |
| M2 | MED | The Passport's share action is a caption telling the user to take a screenshot, on the artifact the source calls "the shareable artifact" | `app/passport.tsx:441-443`, `app/recap.tsx:219` | Real share button via `react-native-view-shot` + `Share.share` (already used at `app/(tabs)/profile.tsx:256-262`), screenshot hint as fallback only. Viral sharing is a standard growth question | 4h |
| M3 | MED | Challenge create, challenge join, and profile save have no failure path — the button just stops spinning | `app/(tabs)/profile.tsx:228-241`, `:245-248`, `:273-277` | Add `onError` reusing the `errorToast` already wired at `:186` / `:795`. Distinguish an invalid invite code from a network failure | 1h |
| M4 | MED | Zero-emission auto-confirms fire "Nice walk! · You avoided 0.55 kg" but write no `emission_entries` row, so the ring does not move — while the ring moving is the stated aha (`NORTH_STAR.md:142`) | `lib/tripEngine.ts:229-231`, `hooks/useTrips.ts:361`, `:376-391` | Decide: either write a zero-kg entry so the feed and ring agree, or drop the notification. Today they contradict each other | 3h |
| M5 | MED | A debug "Simulate trip (12 km · 45 km/h)" button renders under `__DEV__` | `app/log.tsx:790-803` | `__DEV__` is false in release builds, so it does not ship to users — but it **is** in the dev build a demo runs on. Verify it is absent from the release build; if demoing from a dev build, gate it behind a settings toggle for that session. Do not delete it — it is the team's only simulator pipeline test | 1h |
| M6 | MED | N1–N5 meal and reminder notifications are dead code armed to fire — `notification_preferences` is never INSERTed anywhere in the repo, so `.single()` errors and nothing schedules. Any future settings screen arms all five at once | `hooks/useNotifications.ts:167-179`, `supabase/migrations/20260315000010_create_notification_preferences.sql:4` | Delete the meal-notification strings before building settings. Separately, `streak_notifications` (migration `:6`) is never read, so N6 is gated on OS permission alone | 2h |
| M7 | MED | Confetti particle burst on manual log success, and 2×16 accent rails inside rounded `VCard`s on Profile | `app/log.tsx:144-152`, `:957`; `app/(tabs)/profile.tsx:411/413`, `:454/456`, `:504/506` | Drop the burst — the checkmark morph at `app/log.tsx:948-950` plus haptic is the restrained confirmation `DESIGN_DIRECTION.md:148` calls for. Replace the in-card rails with a small dot. (Note: the Trends instance at `:567-572` renders into a bare `View`, not a card — leave it) | 2h |
| M8 | MED | Modal close is a no-op when there is no history | `app/link-bank.tsx:64-66`, `app/import.tsx:69-71` | Extract the recap/passport fallback (`app/recap.tsx:230-233`) into a shared helper so every modal has a guaranteed exit | 45m |
| M9 | MED | Reduced-motion is never audited across a Reanimated-heavy app, against `DESIGN_DIRECTION.md:149`. The **website** honours it (`website/src/sections/WaitlistCTA.tsx:27, 47`), which makes the app's status a checkable question | `VCountUp`, `HeroGlowNumber`, `VStaggerIn`, paged Recap/Passport | Audit and add `useReducedMotion` guards. Turn Reduce Motion on before demoing to anyone who might have it on | 3h |
| M10 | MED | `DAILY_CARBON_BUDGET_KG = 22` is a global constant consumed in 11 places, including the on-screen string "Budget: 22 kg per day" and the tab-bar mood dot — a hardcoded universal budget in a product selling personalised baselines | `types/emission.ts:90`; `app/(tabs)/index.tsx:148, 999, 1104`; `app/(tabs)/_layout.tsx:11, 64`; `app/(tabs)/profile.tsx:46`; `app/log.tsx:58, 286, 442, 849, 853, 866` | Derive from `profile.baseline_kg / 365`. There is also a second, unreconciled `TARGET_CARBON_BUDGET_KG` at `types/index.ts:20` | 4h |
| M11 | MED | Carbon-literacy captions are built but wired into only two screens; Today, the ring, Trends, Recap and Passport all answer "is 4.2 kg a lot?" with nothing | `lib/impactCopy.ts`; used only at `app/log.tsx:57, 860` and `app/(onboarding)/calculator.tsx:27, 525`. Open per `docs/USER_JOURNEY.md:307` | Wire `drivingComparisonCaption` under the Home ring at minimum — it is the cheapest credibility gain on the highest-traffic screen | 2h |
| M12 | MED | `docs/PRD.md` §6 lists under **"Shipped and live"**: "Receipts layer... forwarding-address and share-extension ingestion." Neither channel exists — share-intent was removed (`app/import.tsx:9-15`) and there is no forwarding-address UI anywhere | `docs/PRD.md` §6 | Correct the PRD. A scope doc claiming two channels the code lacks is the kind of thing diligence finds and generalises from | 30m |
| M13 | MED | `docs/PMF_ANALYSIS.md:19` says Veridian "has never formally named its aha moment." `docs/NORTH_STAR.md:142` names it: "the first detected trip visibly fills the ring (the aha moment)" | both files | Reconcile. Two canonical docs contradicting each other on the product's central moment is a doc-consistency defect, and the answer is already written down | 30m |
| M14 | MED | `+not-found` uses raw `<Text>` and an unstyled link — outside the design system | `app/+not-found.tsx:10-13` | Rebuild with `VText` / `VButton` | 30m |

---

## 4. Brand identity work order

This is track B. It runs in parallel with track A and needs no user data.

### 4.1 What already exists and must be honoured

Do not treat this as a greenfield brand exercise. The system is built and it is good; the logo is the only missing piece, and a mark that ignores the system will look bolted on.

- **Color, complete and justified in prose against a persona:** `lib/theme.ts:15-45`. `accent #0F6B41` is a genuinely uncommon brand green — low-chroma, forest-dark, closer to British racing green than eco-mint. `DESIGN_DIRECTION.md:78` records why: bright mint is the strongest generic-eco-app signal and the primary persona reads it as unserious. This is the strongest single brand asset that exists.
- **A 24-glyph custom SVG illustration set:** `components/illustrations/glyphs.tsx`, with a precisely specified construction grammar — single-weight stroke, `strokeWidth = 1.8` default on a 24×24 artboard, `strokeLinecap: 'round'`, `strokeLinejoin: 'round'`, `fill: 'none'` as shared defaults (`glyphs.tsx:18-26`), fills used only as weight accents (a wheel hub, a walker's head, a turbine hub) and never as color statements. `DESIGN_REQUIREMENTS.md:325` verifies zero gap between the spec's required v1 set and the shipped set.
- **The ring geometry:** `components/ui/VProgressRing.tsx:109-121` — round caps, `rotate(-90)` so progress starts at 12 o'clock and sweeps clockwise, `strokeWidth = 8` at `size = 80` (1:10 stroke-to-diameter).
- **The only on-system mark that exists:** `website/public/favicon.svg` — a modulated-stroke V in exactly `#0F6B41`. It lives only on the marketing site (`website/index.html:5`) and nowhere in the app.

### 4.2 The mark brief

**What it must express**, in priority order:

1. **Instrument, not emblem.** It should look drawn to a specification — a gauge face, a survey mark, a measuring tool. `DESIGN_DIRECTION.md:128`: "drawn with a ruler, not a shaky hand."
2. **Light arriving in a gap.** *Clearing* is a break in the canopy where light reaches the floor (`DESIGN_DIRECTION.md:27`). This is the one figurative idea permitted, and only as negative space and aperture — never as sunbeams or foliage.
3. **Restraint.** One idea, no secondary flourish. It must survive at 16px in a single flat color.
4. **Quiet confidence, not cheer.** Opening a well-made instrument, not being congratulated.
5. **Continuity with the glyph system.** The same drafting hand as the 24 glyphs, so icon and in-app illustration read as one authorship.

**One-line test:** if the mark would look at home on a government sustainability report cover, it is wrong. It should look at home on the bezel of a well-made measuring instrument.

**Forbidden, each for a documented reason:**

| Forbidden | Why |
|---|---|
| Leaf | Banned at `DESIGN_DIRECTION.md:35`; the current icon is one. To the Quiet Optimizer it signals "free eco app with a donation button" — the price-resistant segment `DESIGN_DIRECTION.md:21` identifies as least likely to subscribe. It also lies about the product, which reads bank and sensor data, not plants |
| Globe or Earth | Planetary-stakes moralising. The persona's motivation is mastery over personal data; climate is "not why they open it" (`DESIGN_DIRECTION.md:17`) |
| Green checkmark | A check is a **verdict**. The Offset Absolver (`DESIGN_RESEARCH.md:134-136`) seeks exactly the moral closure the product refuses (`NORTH_STAR.md:160`). It would also collide with `StateAllConfirmed` (`glyphs.tsx:212`), where a check correctly means "queue empty" |
| Badge, shield, crest, laurel | `DESIGN_DIRECTION.md:38-39`; persona actively repelled (`:19`) |
| Footprint | The most-used mark in the category and read as guilt iconography |
| Tree, sprout, droplet, recycling triangle, CO₂ subscript | Category clichés; the tree specifically is offset-product grammar (`USER_JOURNEY.md:237`) |
| Sunburst, radiating rays | Too close to `EnergySolar` (`glyphs.tsx:138`). "Light" here means aperture, not radiance |
| Mint gradient, glow, bevel, 3D | Elevation caps at 10% opacity (`lib/theme.ts:221-227`); a glowing icon is the Understory device the reboot removed |
| Serif, anywhere | `DESIGN_DIRECTION.md:37`. Constrains the wordmark and any letterform in the mark |
| `#1B7A4A`, any mint above ~40% chroma, `#0E1512` or any dark ground, purple | Not tokens. `#1B7A4A` is the stale `store-metadata.md` spec; purple banned at `DESIGN_DIRECTION.md:37` |

### 4.3 The mark to draw: Concept A, "The Clearing"

Specified on a 24×24 artboard so it sits natively in the glyph system, then scaled ×42.67 to 1024×1024. Shared glyph defaults apply (`glyphs.tsx:18-26`): round caps, round joins, `fill: none`.

- A single circular arc, `cx=12, cy=12, r=8.5`, `strokeWidth=2.4`
- Rendered as an arc, not a closed circle: a **296° arc with a 64° gap centered on 12 o'clock**. The gap is the clearing
- Both terminals sit exactly on the circle path. No flare, no taper
- Inside the gap, at `cx=12, cy=12`, a **solid dot, `r=2.0`**, filled `#0F6B41`, no stroke — the reading, the value, the thing in the clearing
- Nothing else

**Why this one.** The arc is the same object as `VProgressRing` (`VProgressRing.tsx:109-121` — round caps, 12 o'clock origin): the mark is literally the product's central UI device with a fixed gap. It is monochrome and single-color by construction, so Android monochrome and iOS tinted-icon modes come free. At 16px the ring reads as a ring and the dot survives.

**Optical variants:** widen the gap toward 90° at app-icon size, narrow toward 48° at 16px.

**The one risk, stated plainly:** ring-with-a-dot is a common shape. The specific asymmetry — one wide gap at 12 o'clock and nothing else — is the entire distinction. **Draw the gap generously.** A timid gap reads as a generic loading spinner.

**Secondary mark:** keep `website/public/favicon.svg`'s V as the monogram, redrawn as a single-weight stroked chevron with a **flat 2px base** rather than a point — a V terminated at a measured datum instead of a dramatic apex. Polyline `(4.5, 5.5) → (11.0, 17.6) → (13.0, 17.6) → (19.5, 5.5)`, `strokeWidth=2.6`. This fixes the current SVG's weakness (it is a filled, thick/thin, quasi-calligraphic letter that fights the single-weight rule at `glyphs.tsx:18-26`) while inheriting its equity. Use it in the lockup and as the favicon; use Concept A as the app icon.

### 4.4 Wordmark

- **Face:** SF Pro Display, Inter as the web stand-in. **Semibold 600.** No serif (`DESIGN_DIRECTION.md:37`). Do not license a display face — `DESIGN_DIRECTION.md:107` names Söhne as the eventual purchase and says explicitly it is not needed now
- **Tracking:** −4% of cap height (`DESIGN_DIRECTION.md:104`, `lib/theme.ts:174`)
- **Case:** sentence case, "Veridian." Never all-caps; the uppercase +12% treatment is reserved for 11px eyebrows (`DESIGN_DIRECTION.md:120`)
- **Color:** `ink #0D1117` when paired with a `#0F6B41` mark; `#0F6B41` when standing alone
- **Lockup:** mark left, wordmark right, optically centered on the wordmark's x-height. Gap = 0.5× mark height. Clear space on all sides = 1× mark height
- **Minimum sizes:** mark alone 16px; full lockup 96px wide

### 4.5 Asset delivery checklist

Ordered. Every item is required before a build leaves the machine.

1. `assets/images/icon.png` — 1024×1024, **no alpha, no rounded corners** (Apple applies the mask), mark in `#0F6B41` on `#FFFFFF`. A light-ground icon is the correct read for a light-mode app (`app.json:9`) and is *differentiating* on a home screen where every rival ships a saturated-green tile. If a filled tile is needed for contrast, invert to `#FCFCFD` on `#0F6B41`. Do not introduce a third green
2. `assets/images/splash-icon.png` — mark only, transparent. Change `app.json:66` `backgroundColor` from `#0E1512` to `#FCFCFD`. Also update `ios/Veridian/Images.xcassets/SplashScreenBackground.colorset/Contents.json`, which currently encodes RGB `0.098 / 0.1098 / 0.1098`
3. `assets/images/android-icon-foreground.png`, `-background.png`, `-monochrome.png`. Change `app.json:28` `backgroundColor` to `#FCFCFD`. Keep the mark inside the 66dp safe circle of the 108dp adaptive canvas
4. `assets/images/favicon.png` — replace the Expo blue chevron currently referenced at `app.json:45`. Point it at the same V as `website/public/favicon.svg` so the two properties agree
5. **`npx expo prebuild --clean`**, then verify `md5 ios/Veridian/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` has changed from `9e41612e6ff72156906ea24a928f6335`. **This step is not optional** — without it the committed Expo template icon ships
6. `rm assets/images/react-logo*.png assets/images/partial-react-logo.png`
7. Rewrite `docs/store-metadata.md` per B12
8. Fill the `eas.json` submit placeholders
9. Store screenshots at 1290×2796 ×5 and 1179×2556 ×5 (iOS), 1080×1920 ×4 (Android). Nothing at spec exists today: `docs/screenshots/` holds 11 dev captures, `website/public/screenshots/` holds 5 web-sized files, none framed or captioned. **Deferrable if the goal is a pitch, not a launch** — but the deck needs three or four hero shots at retina, and those come from the same capture session
10. **Photography:** `assets/images/PHOTO_CREDITS.md` closes with "Real photography selection deferred to pre-App-Store-submission design pass." The nine `hero-*.jpg` files were graded for a dark treatment (`DESIGN_REQUIREMENTS.md:351`). Any deck hero sourced from them will read Understory-dark against a Clearing-light product. Re-grade or re-select the two or three the deck actually uses

---

## 5. The recommended sequence

For one builder. Estimates assume focused days, not calendar days.

### Day 0 — 10 minutes, before anything else

Cut the "corrections train a prior" sentence from the demo script (**B0**). Write the roadmap version in its place. This costs nothing and removes the only item on this list that could end a meeting after it has gone well.

### Day 1 — The demo cannot start (≈8 hours)

Everything between launching the app and reaching the home screen.

- **B3** signup false success — 45m
- **B2** Google button gating + flip `usesAppleSignIn`, make Apple the demo path — 1h
- **B5** calculator's phantom 5,800 — 1h
- **B7** baseline save pending/error state + the `useBaseline` null patch — 2h
- **B6** calculator back / skip / exit — 3h

**Exit condition:** a stranger can go from cold launch to the Today tab, make a mistake, correct it, and arrive — with no leaked env vars and no invented numbers.

### Day 2 — The demo contradicts the pitch (≈8 hours)

- **B4** onboarding slide 3 rewritten to the autopilot — 3h
- **B9** leaf sweep, six call sites — 1h
- **B8** AI empty state + resolve the Top Moves / Claude branch and align slide 2's copy — 4h

**Exit condition:** nothing on screen in the first two minutes says "eco-gamification app," and no promise made in onboarding goes unkept on the next screen.

### Day 3 — Profile, and the number an investor will interrogate (≈6 hours)

- **B10** avoided-kg proration or gating, plus removing the Grove — 3h
- **B11** achievements shelf removed, unlock toast suppressed, Trends streak renamed — 3h

**Exit condition:** every number on screen is one you can defend out loud, and Profile stops demonstrating the pattern the deck rejects.

### Days 4–6 — Brand (≈2.5 days)

- Draw Concept A. Give it a full day; the gap width is the whole mark and it will take iterations to get right
- Redraw the V monogram single-weight with the flat base
- Produce the five raster assets, change both `backgroundColor` values, run `expo prebuild --clean`, **verify the AppIcon md5 changed**
- Delete the react-logo files
- Rewrite `docs/store-metadata.md`; fill `eas.json`

**Exit condition:** the icon on the home screen is the same object as the ring inside the app, and the native catalog no longer contains an Expo template.

### Day 7 — HIGH sweep and rehearsal (≈8 hours)

- **H1 first:** get onto a physical iPhone with Motion & Fitness granted and a seeded account. `hooks/useTrips.ts:474-480` means the autopilot narration is fiction on a simulator, and that is the one sentence in the demo that cannot be walked back
- H3 challenge back button, H5 route guards, H6 empty Trends, H2 log error path, H4 the "While Using" stuck banner
- H7: verify the website waitlist end to end. It is the only live conversion surface and track C needs a top of funnel
- Turn on Reduce Motion (M9) and run the demo once. Then turn it off and run it again

**Exit condition:** the twelve-minute walkthrough has been performed, on hardware, three times, without the presenter apologising once.

### Week 2 and onward — parallel, not sequential

- **Track C starts now, not after.** Book the interviews specified at `PMF_ANALYSIS.md:104-110`. Target people who already pay for Copilot Money, YNAB, Whoop, or Oura — that is the identified beachhead, not a cold audience. Ten conversations converts both DRAFT dimensions at `PMF_ANALYSIS.md:82` to COMPLETE and answers the one unresolved axis at `PMF_ANALYSIS.md:46`: carbon-specific willingness to pay. **This is the strongest slide in the next deck and it does not exist yet.**
- MEDIUM sweep from §3 as time allows. M11 (carbon-literacy captions under the ring) and M10 (the hardcoded 22 kg budget) are the two that most improve how the product *reads* to a careful observer
- Store screenshots at spec, if launch is on the table
- **Do not build Snap-a-Plate** (`docs/SNAP_A_PLATE_SPEC.md`, 499 lines, unstarted per `docs/PRD.md` §6). `PMF_ANALYSIS.md:117` is explicit: it is a real engineering investment riding on the same unproven willingness-to-pay assumption. It is also not needed for any of the above

### Total

**Seven focused days to a build that can be handed to a stranger.** Roughly three of those are engineering, two and a half are brand, one and a half are sweep and rehearsal.

Nothing in that seven days requires a single user.

---

## Appendix — what this document deliberately does not claim

- No activation rate, retention curve, conversion rate, DAU, or session length. **No data — pre-launch.**
- No claim that fixing these items produces product-market fit. It produces a demo that does not contradict the pitch. Those are different achievements and `docs/PMF_ANALYSIS.md` is right about which one is harder.
- No claim about how any investor will react. The ranking is a design and product judgment derived from the documented persona (`docs/DESIGN_RESEARCH.md`), the design position (`docs/DESIGN_DIRECTION.md`), and the code — **a labeled assumption, not a tested one.** No pitch has been given and no feedback has been collected.
