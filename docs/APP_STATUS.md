# Veridian app status

**Snapshot:** commit `47396ec` on `main`, clean working tree. Audited 2026-10-03.
**Purpose:** the single source of truth for what works and what does not. When a row changes status, update it here and move the commit hash above.
**Sources:** two code audits (core loop and infrastructure), a guilt-free copy audit of 100 user-facing strings, `docs/UAT_FINDINGS_2026-10-02.md`, and spot checks against the code while writing this doc.

**Ground rules for reading this doc**

- Veridian has zero real users. Only about 4 people tried it informally. Nothing here is a user, retention, conversion or market number. Where a number would help, it is labelled as an assumption.
- "Unverified" means the code path exists but nobody has run it on a device or against the live service. Treat it as "probably broken until shown otherwise".
- Some facts can only be checked in a dashboard or on a phone. Section 5.6 lists them.

**Status definitions**

| Status | Meaning |
|---|---|
| works | Verified end to end (UAT on 2026-10-02, or code read plus passing tests). No defect that changes the outcome for the user. |
| partial | The main path works, but there is a defect, gap or off-thesis behaviour a user would notice. |
| broken | Reachable in the app, but gives a wrong result or fails. |
| not wired | Code or a plan exists, but no user can reach it, or a required credential or config is missing. |
| unverified | The code path looks complete but has never run on a device or against the live service. |

---

## 1. Summary

### 1.1 Counts

The two feature audits listed 61 rows (42 core, 19 infrastructure). After merging duplicates, there are **52 features**.

| Status | Count | Share |
|---|---|---|
| works | 7 | 13% |
| partial | 27 | 52% |
| broken | 6 | 12% |
| not wired | 6 | 12% |
| unverified | 6 | 12% |
| **Total** | **52** | |

By area (row numbers refer to the matrix in section 2):

| Area | Rows | works | partial | broken | not wired | unverified |
|---|---|---|---|---|---|---|
| Account and sign-in | 1-7 | 2 | 2 | 0 | 2 | 1 |
| First run | 8-12 | 0 | 4 | 1 | 0 | 0 |
| Today and trips | 13-20 | 2 | 4 | 0 | 0 | 2 |
| Manual logging | 21-27 | 1 | 6 | 0 | 0 | 0 |
| History and sharing | 28-32 | 0 | 4 | 1 | 0 | 0 |
| You tab | 33-37 | 1 | 2 | 2 | 0 | 0 |
| Data sources | 38-42 | 1 | 0 | 0 | 2 | 2 |
| Notifications | 43-45 | 0 | 1 | 0 | 1 | 1 |
| AI and evaluation | 46-48 | 0 | 1 | 1 | 1 | 0 |
| Release and infrastructure | 49-52 | 0 | 3 | 1 | 0 | 0 |
| **Total** | | **7** | **27** | **6** | **6** | **6** |

**Bottom line**

- **The app is wide, not deep.** 52 features exist and 7 work cleanly. Most of the rest work on the happy path and fail quietly at the edges.
- **The thesis loop has never run end to end for a new user on a real phone.** That loop is: the autopilot notices a trip, the user confirms it in one tap, and the app credits the lighter choice. Each step has a gap. Activation is hidden inside the manual-entry screen (row 9). Detection and confirmation are unproven on a device (rows 13, 14). The only "credit" number is calculated wrongly (row 35).
- **The words mostly pass the no-guilt test. The mechanics do not.** 74 of 100 strings are neutral or positive. The guilt comes from a ring that fills toward a "budget", the error colour painted onto past days, a budget percentage shown at the moment of logging, a push for every drive, and streaks (section 4).
- **Several features are cheaper to hide than fix for a first launch.** Challenges (37), the achievements shelf (36), the streak record (29, 30), daily reminders (43), the Grove until it is rebuilt (35), the unused `analyze-emissions` endpoint (47), and bank linking (38) until the sandbox test passes. Hiding them also removes most of the off-thesis surfaces.

### 1.2 Follow-up on the 23 UAT findings (2026-10-02)

| State | UAT numbers | Notes |
|---|---|---|
| Fixed | 1, 2, 3, 4, 7, 8, 11, 12 | Commits `8f9605a` and `47396ec`. #2 and #3 are fixed by hiding the unconfigured social buttons, not by making them work (row 6). |
| Partly fixed | 17 | Calculator header legibility is fixed. The Skip legibility and the missing "Frequent Flights" icon are still open (rows 8, 10). |
| Open | 5, 6, 9, 10, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23 | Mapped to rows 8 (#5, #6), 34 and 32 (#9), 32 (#10), 9 (#13), 21 (#14), 23 (#15), 24 (#16, #22), 1 (#18), 34, 35 and 36 (#19), 28 (#20), 41 (#21), 11 and section 4 (#23). |

### 1.3 Top 10 launch blockers, ordered by user impact

"Launch" here means a TestFlight build in outside testers' hands that keeps the core promise: it tracks itself, and it never makes you feel guilty. That definition is an assumption for this doc; change it if the goal changes.

Blockers 9 and 10 are gates, not experiences. Until they clear, no outside user sees anything. They come last because they are cheap, mostly founder actions, and can run alongside 1 to 8, not because they matter less.

**1. The autopilot never gets switched on.** (rows 9, 8)
- Who it hits: every new user.
- What happens: onboarding only asks for notification permission (`app/(onboarding)/index.tsx:170`). Location and motion are requested only from a banner inside the manual Log modal (`app/log.tsx:477`, banner at `:765-790`). A user who never opens that modal ends up with a manual logger, which is the product the thesis rejects. Onboarding slide 1 still sells manual logging (`app/(onboarding)/index.tsx:62-63`).
- Fix: a permission-priming step at the end of onboarding, an Open Settings fallback (`Linking.openSettings()`), and a rewritten slide 1. Effort: 1-2 days. Founder action: none.

**2. The core loop has never been seen working on a real phone.** (rows 13, 14, 45)
- Who it hits: every user. This is the aha moment.
- What happens: trip detection needs CoreMotion and background location, which the simulator lacks. No `setNotificationHandler` or response listener exists anywhere in the app, so the "trips spotted" invitation may not show while the app is open, and tapping it does not route to the review sheet. Car trips auto-confirm without a prompt (`lib/tripEngine.ts:39-40`), so a bus ride can be charged as a drive.
- Fix: a 3-5 day field test on a physical iPhone with a results table; add the notification handler and routing; ask about every car trip for the first 2 weeks. Effort: 3-5 days. Founder action: carry an iPhone through real trips.

**3. The daily hero and the logging moment judge the user.** (rows 15, 11, 19, 24, 45)
- Who it hits: every user, every day.
- What happens: the ring fills toward a 22 kg "budget" with no cited source (`types/emission.ts:89-90`). It turns amber at 50% (`lib/theme.ts:107-110`), which can happen by lunch. It paints past days in the same hex as the error colour (`lib/theme.ts:35,68,93`) in six places. The log sheet says "This is N% of today's budget" (`app/log.tsx:865`). Every auto-logged drive sends a push with its kg (`hooks/useTrips.ts:434-437`). The calculator results lead with "% above the global average" and offer no next step (`app/(onboarding)/calculator.tsx:533-547`).
- Fix: the P0 mechanics in section 4.3 and the P0 rewrites in 4.4. Most of this is copy, one constant and a colour mapping. Effort: 1-2 days. Founder action: decide personal band vs global constant (decision D2).

**4. The one positive number in the app is false.** (row 35)
- Who it hits: anyone who opens the You tab, and any interviewer who looks closely.
- What happens: "kg never emitted" is calculated as baseline minus logged (`app/(tabs)/profile.tsx:155-162`), so anything not logged counts as avoided. UAT showed "243 kg never emitted" after a single 27 kg entry. The Grove uses offset imagery the North Star rejects (`docs/NORTH_STAR.md:160`).
- Fix: hide it now. Then rebuild it as a "kept out of the air" ledger from detected walks and rides plus adopted Top Moves (section 4.7). Effort: 1-2 days. Founder action: decide what "offset" means (decision D1).

**5. Sign-up and password reset can mislead or trap people.** (rows 2, 3, 4)
- Who it hits: every new user who hits an error, and every user who forgets a password.
- What happens: any sign-up failure shows "Check your email" for an account that does not exist (`app/(auth)/signup.tsx:38-40` checks a stale error value). Forgot-password shows "Email sent" on failure. The reset deep link most likely drops the user into the app signed in, without ever setting a new password (`app/_layout.tsx:46-48`).
- Fix: return the error from the store and branch on it; keep the reset screen reachable during password recovery; test with a real inbox. Effort: hours. Founder action: Supabase Auth settings (confirm-email setting, redirect allow-list, custom SMTP).

**6. The AI feature is down and still promised.** (rows 46, 8)
- Who it hits: every new user. Users with fewer than 4 entries over 7 days get the AI branch instead of Top Moves.
- What happens: onboarding slide 2 promises "one specific, actionable step, every day" (`app/(onboarding)/index.tsx:68`). The function fails after auth, most likely because the Anthropic account has no credit (`eval/receipt-parse/README.md:67`), so the card hides and leaves a gap. The prompt has no tone rules and lets the model invent saving numbers (`supabase/functions/generate-suggestions/index.ts:17-39`).
- Fix: fund the key, compute the numbers in code, add voice rules and a small eval. Until then, remove the promise from slide 2. Effort: 1-2 days. Founder action: Anthropic credit and the secret.

**7. Numbers go stale, disagree and over-praise.** (rows 19, 20, 28, 29, 31, 32, 34)
- Who it hits: every user who logs something and then looks at another screen.
- What happens:
  - Seven query keys are never refreshed after a write (`hooks/useEmissionEntries.ts:143-146`, `hooks/useEmissionRealtime.ts:30-33`).
  - Lifetime and Passport read different tables, so they disagree (UAT #9).
  - The weekly and monthly deltas compare a partial period with a full one, giving lines like "Down 70%" on a Tuesday.
  - Errors render as "still filling in".
- Why it matters: in a no-guilt product, positive messages have to be true. Otherwise "no guilt" reads as marketing.
- Fix: one shared invalidation helper, one source of truth (entries), like-for-like comparisons, real error states. Effort: 1-2 days. Founder action: none.

**8. Streaks and rankings are broken and off-thesis.** (rows 29, 30, 36, 37, 43)
- Who it hits: every user in the Americas (streak), and anyone who opens Challenges.
- What happens:
  - The streak always reads 0 west of UTC, because dates are parsed as UTC and compared with local midnight (`hooks/useStreak.ts:32-48`).
  - The leaderboard shows 100% reduction for anyone with a baseline, because `current_kg` is never written (`hooks/useLeaderboard.ts:16-22`).
  - The challenge detail screen has no way back (`app/challenge/[id].tsx:35-40`).
  - Streak badges and the "keeps your streak alive" copy contradict `docs/NORTH_STAR.md:139` and the website's own "Momentum, not streaks" claim (`website/src/sections/ProductScreens.tsx:33`).
- Fix: hide Challenges and the achievements shelf, remove the streak record and the reminder notifications. Effort: hours. Founder action: confirm the cut (decision D3).

**9. App Review would most likely reject the build.** (rows 7, 49)
- What happens: there is no in-app account deletion, which Guideline 5.1.1(v) requires (https://developer.apple.com/app-store/review/guidelines/#5.1.1). The privacy policy URL in `docs/store-metadata.md:41` returned HTTP 404 on 2026-10-03. The policy text dates from March 2026 and does not mention location, motion, bank or receipt data. The store copy sells streaks and leaderboards (`docs/store-metadata.md:26,32`).
- Fix: a minimal settings screen with delete account; rewrite and host the policy; rewrite the store copy. Effort: 1-2 days. Founder action: host the policy and fill in the App Privacy labels.

**10. Nobody else can install the app.** (rows 49, 51)
- What happens: the only signing identity is a personal-team "Apple Development" certificate. `eas.json:32-34` still has placeholder submit values. Remote push needs the `aps-environment` entitlement, which a personal team cannot get.
- Fix: enroll, create the App Store Connect record, fill in `eas.json`, run `eas build -p ios --profile production`, and submit to TestFlight. Effort: hours of work once enrollment clears. Founder action: Apple Developer Program, $99 a year (https://developer.apple.com/support/enrollment/).

---

## 2. Feature matrix

Effort scale: hours, 1-2 days, 3-5 days, 1-2 weeks. "Founder action" means something only Vedant can do: accounts, credentials, payments, dashboard settings, physical devices or product decisions. UAT numbers refer to `docs/UAT_FINDINGS_2026-10-02.md`.

### Account and sign-in

| # | Feature | Status | Evidence | User impact | What it takes | Effort | Founder action |
|---|---|---|---|---|---|---|---|
| 1 | Email sign-in | works | `app/(auth)/login.tsx:21-29`, `stores/authStore.ts:85-89`. Passed UAT. UAT #18 still open: the error toast covers the subtitle and Email label. | Existing users get in. The overlapping toast looks unfinished. | Move the toast below the button or pin it to the top of the screen. | hours | none |
| 2 | Email sign-up | partial | `app/(auth)/signup.tsx:21` reads `authError` once per render. `:38-40` checks that stale value after `await signUpWithEmail`, but the store only sets the error after the await (`stores/authStore.ts:91-95`). No `emailRedirectTo`. Local `supabase/config.toml:119` has `enable_confirmations = false`; the live setting is unknown. Never run end to end: UAT used an existing account. | Any failure (duplicate email, rate limit, no network) shows "Check your email" for an account that does not exist. Trust breaks at the first touchpoint. | Return the error from `signUpWithEmail` and branch on it. Do one real sign-up on device against the live project. If confirmation is on, add `emailRedirectTo` and a confirm route. | hours | Check "Confirm email" and the SMTP sender in the Supabase dashboard. The built-in sender is rate-limited. |
| 3 | Forgot password | partial | `app/(auth)/forgot-password.tsx:19, :28-30` has the same stale-error bug. `redirectTo` is `veridian://reset-password` (`stores/authStore.ts:97-103`), allow-listed only in the local `supabase/config.toml:98`. | A failure still shows "Email sent". If the live project does not allow-list the link, the email does not open the app. | Same returned-error fix. Test with a real inbox. | hours | Add `veridian://reset-password` to the live Auth redirect allow-list. |
| 4 | Reset password (deep link) | unverified | `app/(auth)/reset-password.tsx:50-68` creates a session. `app/_layout.tsx:46-48` mounts `(auth)` only while there is no session, so the screen most likely unmounts before the new password is typed. The error state prints the raw link URL (`:110`). Minimum length is 6 here (`:72`) and 8 at sign-up (`signup.tsx:29`). Not declared in `app/(auth)/_layout.tsx`. Never tested. | A user who forgot their password probably lands in the app signed in without setting a new one, and is locked out again at the next sign-out. | Keep the screen reachable during password recovery (outside the `!session` guard). Remove the debug URL, use 8 as the minimum, test on device. | hours | Same allow-list as row 3. |
| 5 | Session persistence and sign-out | works | `lib/supabase.ts` (persisted session in expo-sqlite storage, refresh on foreground); `stores/authStore.ts:68-83`; sign-out at `app/(tabs)/profile.tsx:616-620`. Sign-out does not clear the React Query cache, the `useTrips` AsyncStorage keys or the offline queue. | Users stay signed in and can sign out. Local trip and queue state belongs to the device, not the account, so a second account on the same phone can inherit it. | Call `queryClient.clear()` on sign-out and namespace local trip and queue state by user id. | hours | none |
| 6 | Google and Apple sign-in | not wired | Buttons render only when configured (`stores/authStore.ts:8-38`, `app/(auth)/login.tsx:98-126`, commit `47396ec`). The `.env` Google client ID is a placeholder. `app.json:14` has `usesAppleSignIn: false`. Google on iOS also needs the `@react-native-google-signin` config plugin with `iosUrlScheme`, which is not in `app.json`. Guideline 4.8 requires Sign in with Apple (or an equivalent) whenever Google login is offered: https://developer.apple.com/app-store/review/guidelines/#4.8 | Email is the only way in. That adds an email round-trip before the first moment of value. | Launch with email only, which avoids Guideline 4.8. Add Apple and Google together later; the code exists (`stores/authStore.ts:129-172`). | hours, after accounts | Paid Apple Developer Program; Google OAuth clients (web and iOS); enable both providers in Supabase Auth. |
| 7 | Settings, notification preferences, account deletion | not wired | No settings route exists. Nothing writes `notification_preferences`. No in-app account deletion (grep finds none). Guideline 5.1.1(v): https://developer.apple.com/app-store/review/guidelines/#5.1.1 | Users cannot turn detection off, redo their baseline or delete their account. App Review is likely to reject the build. | A minimal settings screen: detection status and on/off, redo baseline, privacy link, delete account (an edge function using the service role, with cascade). | 1-2 days | none |

### First run

| # | Feature | Status | Evidence | User impact | What it takes | Effort | Founder action |
|---|---|---|---|---|---|---|---|
| 8 | Onboarding slides | partial | `app/(onboarding)/index.tsx:62-63`: slide 1 sells manual logging (UAT #5). `:67-68`: slide 2 promises a daily Claude step while the AI is down (row 46); the mock shows "Try this" above "Try lentils..." (UAT #6, `components/ui/VAiInsightCard.tsx:102`). Slide 3 fixed in `8f9605a`. `:154-175`: "Allow notifications" does nothing visible on denial and does not advance. No location, motion or privacy priming. Skip link hard to read (UAT #17). | The first minute sells the off-thesis product and a feature that is missing. The permissions the product depends on are never explained. | Rewrite slides 1-2 around "see it, balance it out, no guilt" (wording in section 4.4). Drop the AI promise until row 46 works. Replace the notification button with the priming step in row 9. | 1-2 days | none |
| 9 | Autopilot activation (location and motion permission) | broken | Onboarding only requests notifications (`app/(onboarding)/index.tsx:170`). The only call to `requestPermissions()` is `app/log.tsx:477`, behind a banner (`:765-790`) inside the manual Log modal, reached from "+" on Today (`app/(tabs)/index.tsx:1270`). `hasPermission` is true only with "Always", so "While Using" users see the banner forever (`hooks/useTrips.ts:704-776, :817-830`). The denial alert has only OK, no Open Settings (`app/log.tsx:479-483`; UAT #13). Also flagged in `docs/TOUCHPOINT_MAP.md:207`. | Users who never open the manual-entry modal never turn on the autopilot. For most people the thesis never starts. | Add a priming step at the end of onboarding: explain why, then request "Always" location and Motion & Fitness, with a `Linking.openSettings()` fallback. Use the privacy line the code supports: raw GPS stays on the phone and only distance, time and mode are uploaded (`lib/tripEngine.ts:246-248`). Add a persistent Today card for off or degraded states. | 1-2 days | none |
| 10 | Carbon calculator (questions) | partial | `app/(onboarding)/calculator.tsx:838` shows a dash until the first answer; header legibility fixed (`8f9605a`, `47396ec`). No back, skip or close control in the file. "Frequent Flights" has no icon (`:218`; UAT #17). `GLOBAL_AVG_KG = 4700` and `PARIS_TARGET_KG = 2500` (`:92-93`) show no source. Options are UK-flavoured (gas central heating, storage heaters). | One mis-tap cannot be undone, and the user cannot leave. That matters most for signed-in users routed here automatically (row 12). | Add back and skip, show sources for the averages, localise the home-energy options for US users. | 1-2 days | none |
| 11 | Calculator results screen | partial | The CTA uses `void ...then()` with no pending state and no `.catch` (`calculator.tsx:505-517`): a double tap saves twice and a failure leaves a dead button. Em dash in the CTA label (`:519`; UAT #23). The "Create a free account" hint shows to signed-in users (`:580-582`). The screen leads with "% above the global average" and a green Paris chip, with no next step (`:533-547`), against `docs/NORTH_STAR.md:138`. | The first emotional moment is a comparison verdict with no way forward. This is the guilt pattern the thesis rejects. | Add "your first move" (the biggest category plus one swap with a kg number), a pending and error state on the CTA, and copy that depends on sign-in state. | hours | none |
| 12 | Post-signup baseline gate | partial | `app/(tabs)/_layout.tsx:67-85` sends users without a baseline to `app/carbon-calculator.tsx`. A `profiles` row is created on every sign-up by the `handle_new_user` trigger (`supabase/migrations/20260315000000_create_profiles.sql:26-41`), so the cache patch in `hooks/useBaseline.ts:31-34` works (this corrects `docs/TOUCHPOINT_MAP.md` section 4.7). The baseline does not drive the ring, tab dot or week strip, which use the global `DAILY_CARBON_BUDGET_KG = 22` (`types/emission.ts:90`); it only feeds "kg never emitted" (row 35). Not exercised in UAT. Trigger on the live DB not confirmed. | New users face an 8-question wall with no exit, and the answers barely change what they see afterwards. | Decide whether the baseline sets a personal daily band (baseline / 365) for the ring, dot and strip, or make the calculator optional with a later prompt. | 1-2 days | Decision D2: personal band or global constant. |

### Today and trips

| # | Feature | Status | Evidence | User impact | What it takes | Effort | Founder action |
|---|---|---|---|---|---|---|---|
| 13 | Trip detection pipeline (background GPS plus CoreMotion, `modules/veridian-motion`) | unverified | `hooks/useTrips.ts:460-662` (GPS buffer plus 7-day motion history, then `fuseSignals`, then upsert `detected_trips`); `tasks/locationTask.ts:16-40`; `lib/backgroundTracking.ts:19-51`; `modules/veridian-motion/index.ts:33,80` (falls back to a no-op); thresholds in `lib/tripEngine.ts:28-41`. `app.json` has the background modes and the motion and location usage strings. Unit tests pass. Cannot run on the simulator. Last real-device fixes recorded July 2026 (`docs/PRD.md:176`). Android not validated (`modules/veridian-motion/README.md:124`). | This is the whole "it tracks itself" promise. Until it is proven on a real phone, the app is in practice a manual logger. | Install a Release build on a physical iPhone. Run a 3-5 day field test covering a drive, a walk, a bike ride and a bus or train ride. For each real trip, record whether it was detected, the mode guessed and the distance error. Fix what breaks. Keep that table: it is the strongest portfolio artifact available. | 3-5 days | Carry a physical iPhone through real trips with Motion & Fitness and "Always" location granted. |
| 14 | Trip confirm and correct (Today review card and sheet) | unverified | `ConfirmCard` at `app/(tabs)/index.tsx:698-800`: "Yes", mode chips, "Not a trip". Mutations re-price at the corrected mode (`hooks/useTrips.ts:855-920`, `findFactorForMode` at `:116-133`). A failed confirm or dismiss is swallowed and the sheet still advances (`index.tsx:1148-1159`). Car trips auto-confirm with no prompt at confidence >= 0.75 and distance >= 2 km (`lib/tripEngine.ts:39-40, :223-231`), and GPS speed cannot tell a bus from a car. No distance edit. A second, different confirm list lives in `app/log.tsx:565-613`. A dev-only "Simulate trip" button exists (`app/log.tsx:793-803`). | The core loop and aha moment have never been seen with real trips. A bus rider silently charged at the car rate will distrust every later number. | Test on device (row 13). For the first 2 weeks after install, send every car trip to confirmation, then auto-confirm only modes the user has confirmed before. Add a quiet retry on a failed confirm. Delete the duplicate list in `/log`. | 1-2 days | Physical iPhone (row 13). |
| 15 | Today budget ring | partial | Computed live from today's entries (`app/(tabs)/index.tsx:138-220, :996-999`); UAT confirmed it updates; glow removed (`47396ec`). The denominator is the global 22 kg (`:148, :185`), described in code as "Standard UK average daily carbon budget" with no cited source (`types/emission.ts:89-90`). `docs/NORTH_STAR.md:136` specifies a band against "your own" baseline. The flip side splits Food, Move and Power only (`:193-198`), but the total includes Shopping. The over-budget colour is the same hex as the error and danger tokens (`lib/theme.ts:35,68,93`). | "of 22 kg" belongs to no one and turns an average into a limit. Shopping-heavy days do not add up on the flip side. | Personal denominator (row 12), add Shopping to the split, and apply the mechanics fixes in section 4.3. | hours | none |
| 16 | Today day list (feed) and "Earlier this week" | works | `app/(tabs)/index.tsx:1011-1047, :1280-1330`; UAT: logging updates the list. Gaps: rows cannot be tapped to edit or delete (only receipt rows expand, `:573-607`). The empty state says "take a walk, we'll notice" (`:1289`) while detection stays off unless the user finds the banner in `/log` (row 9). | The list works, but the empty state makes a promise most users never see kept, and the main screen cannot fix an entry. | Make rows open `/entry/[id]`. When detection is off, the empty state should say so and route to turning it on. | hours | none |
| 17 | Today add (+) button | works | `app/(tabs)/index.tsx:1269-1278` pushes `/log`; UAT "logging an entry end to end" passed. | The manual escape hatch is reachable. | Nothing for function. | n/a | none |
| 18 | Top Moves (`lib/topMoves.ts`) | partial | Evidence floor of 4+ entries over 7+ days (`:18-19, :261-268`, commit `8f9605a`); tests pass. `SWAP_RULES` (`:82-195`) match only DEFRA subcategories, so NAICS-coded entries from Plaid and receipts never match. The energy rule is UK grid only (`electricity_uk`, `:183-191`) while Plaid is US only. Every card just opens `/log` (`components/ui/VTopMovesSection.tsx:21-23`). When moves exist, the AI card is skipped (`app/(tabs)/index.tsx:1163-1167`). | The right no-guilt mechanic (a doable partial swap with a kg saving). But a move cannot be adopted or credited, and a user fed by the bank and sensors only ever gets car moves. | Add "I'll try this" and credit the measured saving later. This is the natural "balance it out" loop (section 4.7). Add rules for the top spend NAICS groups and a US-grid energy rule. | 3-5 days | none |
| 19 | Today week strip | partial | `app/(tabs)/index.tsx:974-990, :1093-1108` read `daily_summaries` under the key `['week_strip']`. Nothing invalidates that key after a write (`hooks/useEmissionEntries.ts:143-146`, `hooks/useEmissionRealtime.ts:30-33`). Dots are coloured against the global 22 kg, including past days (`:1103`). | After logging, today's dot keeps its old colour until the screen remounts, so the app looks like it missed the action. Past days stay painted in the error colour. | One shared invalidation helper on every entry write, covering `week_strip`, `momentum`, `streak`, `personal_records`, `lifetime_total`, `impact_ledger` and `best_week`. Neutral colour for past days. | hours | none |
| 20 | Momentum band (Today pill, You card) | partial | `lib/momentum.ts` (gentle decay, tests pass); `hooks/useMomentum.ts:20-59`. `['momentum']` is never invalidated after a log. Walk and cycle trips write no entry or summary (`hooks/useTrips.ts:858-890`), so they earn zero momentum. A day whose entries were all deleted keeps a 0 kg summary row and counts as a light day. Leaf glyph at `components/ui/VMomentumBand.tsx:63`. | The most positive behaviour, walking or cycling instead of driving, is invisible to the motivation system. | Count zero-emission trip days as active, invalidate after writes, replace the leaf glyph. | hours | none |

### Manual logging

| # | Feature | Status | Evidence | User impact | What it takes | Effort | Founder action |
|---|---|---|---|---|---|---|---|
| 21 | Quick slots (one-tap log) | partial | `app/log.tsx:106-117, :297-333`: new users get pre-filled defaults, including the UK grid (UAT #14). A server rejection is silent (`:406-408`). Offline quick-logs lose their time: no `loggedAt` is passed (`:404`), so the flush writes the reconnect time (`hooks/useEmissionEntries.ts:113`). | New users see guesses labelled as "your usual". An evening log made offline can land on the next day. | Hide slots until there is history (or use locale defaults), pass `loggedAt: new Date().toISOString()`, show a quiet error. | hours | none |
| 22 | Category chips | works | `app/log.tsx:618-641`; passed UAT. | Fine. | Nothing. | n/a | none |
| 23 | Factor picker | partial | `app/log.tsx:354-366, :643-715`. UAT: the NAICS grouping is readable, but Food leads with USD store-type rows, mostly in one-item groups (UAT #15). Search only covers the selected category. | Finding "chicken" means scrolling past spending categories. | Physical foods first, collapse one-item groups, search across all categories. | hours | none |
| 24 | Quantity sheet (manual log) | partial | `app/log.tsx:412-426, :806-963`; works end to end in UAT. No `onError`, so a failure silently resets the button. "Logging..." lasts seconds (UAT #22) because the mutation awaits two summary upserts (`hooks/useEmissionEntries.ts:136-139`), then the achievements check and a streak query (`:143-165`). Shows "This is N% of today's budget" at the moment of logging (`app/log.tsx:864-866`). "Log 27.00 kg" is ambiguous (`:952`; UAT #16). Confetti (`ParticleBurst`, `:144-152, :957`) goes against `docs/DESIGN_DIRECTION.md`. No offline path. | The core manual action feels slow, fails silently and makes honest logging look bad. | Run the achievements and streak work fire-and-forget, add an error toast, label the button "Log 27 kg CO2e", remove the budget percentage and the confetti, route the write through `createDurable`. | hours | none |
| 25 | Entry detail and edit (`app/entry/[id].tsx`) | partial | Reachable only from Trends (`app/(tabs)/trends.tsx:519`). Quantity edit works (UAT). On a query error it spins forever, and the close button exists only in the loaded state (`:61-67`). `updateEntry` has no `onError` (`:49-58`). The factor cannot be changed, there is no delete, and the estimate shows 3 decimals with no source (`:111-115`). | A bad network traps the user with no exit. The factor behind the number is never shown. | Error state with a close button, a delete button, a line showing the factor and its source, sensible rounding. | hours | none |
| 26 | Delete entry (swipe) | partial | `components/ui/SwipeableEntryRow.tsx`; `app/(tabs)/trends.tsx:510-519`; `app/log.tsx:737-746`; `hooks/useEmissionEntries.ts:213-248` recomputes summaries and dismisses a linked trip. Permanent, with no confirm, no undo and no `onError`. Not exercised in UAT. | One accidental swipe and tap deletes data for good. | Undo toast (delay the server delete a few seconds) and an error toast. | hours | none |
| 27 | Offline queue | partial | `hooks/useOfflineQueue.ts` (SQLite queue, flush on reconnect); `hooks/useDurableCreateEntry.ts:43-58`; tests pass. Only quick-log (`app/log.tsx:404`) and trip writes (`hooks/useTrips.ts:418, :880`) are durable. The sheet log, edits, deletes, baseline save and CSV import are not. Quick-log loses its timestamp (row 21). Queued items are invisible until flushed. `VOfflineBanner` promises "entries will sync when connected". Not tested offline on device. | The banner's promise holds for 2 of the 6 write paths. | Pass `loggedAt`, route the sheet log through `createDurable`, show a "saved, will sync" state. | hours | none |

### History and sharing

| # | Feature | Status | Evidence | User impact | What it takes | Effort | Founder action |
|---|---|---|---|---|---|---|---|
| 28 | Trends periods and charts | partial | `app/(tabs)/trends.tsx:266-548`; UAT: charts update after logging. The month delta compares month-to-date with the whole previous month (`hooks/useSummaries.ts:65-137`, `trends.tsx:131-171`), so early in a month it always shows a big green "down". Queries throw with no error branch. The legend touches the card edge and placeholders show on first load (UAT #20). The summary line names the biggest day, never the lightest (`:125-126`). | Unearned praise is false reassurance, the mirror image of guilt, and it erodes trust once noticed. | Compare like-for-like day counts, add a quiet error row, mention the lightest day. | hours | none |
| 29 | Personal records (best day, best week, streak) | partial | `app/(tabs)/trends.tsx:286-313, :473-486`. `['personal_records']` is never invalidated. "Best day" can be today's partial day. The Streak record (`:485`) uses `useStreak`, which reads 0 west of UTC (row 30). | Users in the Americas see "Streak 0 days", a negative stat in a no-guilt product, plus stale bests. | Remove the Streak record or replace it with "Active days this month". Exclude today from best day. Invalidate on writes. | hours | none |
| 30 | Streak (`useStreak` and the streak-milestone notification) | broken | `hooks/useStreak.ts:32-48` and `hooks/useEmissionEntries.ts:20-37` parse `YYYY-MM-DD` with `new Date()` (UTC) and compare with local midnight. Reproduced in Node: with `TZ=America/Toronto`, 3 consecutive days give 0; with `TZ=Europe/London` they give 3. The server-side achievement check uses correct local dates (`hooks/useAchievements.ts:56-80`). Streaks also contradict `docs/NORTH_STAR.md:139` ("no breakable chains, ever"). | For users in the Americas the streak always reads 0, the progress hints (`app/(tabs)/profile.tsx:430-432`) never appear, and the 3/7/30-day notification never fires. | Delete the user-visible streak and keep momentum. If any streak logic stays, parse dates as local (`new Date(date + 'T00:00:00')`). | hours | none |
| 31 | Weekly Recap (and how it is reached) | partial | `app/recap.tsx`, `hooks/useWeeklyRecap.ts`. Reached only from Today's "See the whole week" (`app/(tabs)/index.tsx:1317-1328`, needs earlier rows this ISO week) or the week teaser (`:1334-1342`, needs 2+ days). The Sunday notification does not route there (row 44). It always shows the in-progress week (`useWeeklyRecap.ts:77-79`), so on Monday last week's recap is gone and there is no history. The delta compares a partial week with the full prior week (`:137`), giving for example "Down 70%" on a Tuesday. Sharing is "Screenshot to share" (`recap.tsx:219`). Errors render as "still filling in" (`:249-271`). UAT: no entry point appeared with one day of data. | The weekly ritual is hard to find and over-praises a partial week. | Show the last completed week on Sunday and Monday, route the notification there, use like-for-like deltas, add a real share sheet. | 1-2 days | none |
| 32 | Carbon Passport | partial | `app/passport.tsx`, `hooks/useCarbonPassport.ts`. Fixed in `8f9605a`: the clipped "0" and the lightest-day guard. Still open: "led your week" copy on month and year views (`lib/recap.ts:326-329`; UAT #10); "first tracked month" vs a higher Lifetime (UAT #9, two data sources); "Screenshot to share" (`passport.tsx:442`) although `Share.share` is already used at `app/(tabs)/profile.tsx:258-262`; failed queries render as "still filling in" (`:479-505`); the month delta compares a partial month with a full one. | The shareable artifact cannot actually be shared, and its copy contradicts itself. | Period-aware copy, a real share sheet (view-shot image plus Share), an error state, a like-for-like delta. | 1-2 days | none |

### You tab

| # | Feature | Status | Evidence | User impact | What it takes | Effort | Founder action |
|---|---|---|---|---|---|---|---|
| 33 | Carbon Passport entry | works | `app/(tabs)/profile.tsx:572-591`; UAT reached Passport. It is the only entry point; `docs/DESIGN_DIRECTION.md:172` asks for one from Today. | The growth artifact is buried. | Add an entry from Today or the Recap. | hours | none |
| 34 | Stats row (Lifetime, Best week, Momentum) | partial | `app/(tabs)/profile.tsx:124-179, :380-408`. Lifetime reads `daily_summaries` while Passport reads entries, so the two drift (UAT #9). Best week has no "> 0" filter (`:165-179`, compare `trends.tsx:294, :301`), so it includes the in-progress week and zeroed weeks. Labels truncate (UAT #19). None of these queries is invalidated after writes. | The numbers disagree between screens. | One source of truth (entries), add the filters, use the shared invalidation helper (row 19). | hours | none |
| 35 | Grove and "kg never emitted" | broken | `app/(tabs)/profile.tsx:155-162`: avoided = the sum over weeks of max(0, baseline / 52 minus logged), including the current partial week, so anything not logged counts as avoided. Shown at `:353`. UAT: "243 kg never emitted" after one 27 kg entry, and the tree art reads as arrows (UAT #19). One tree per ~50 kg (`:49-89`) is offset imagery that `docs/NORTH_STAR.md:160` and `docs/DESIGN_RESEARCH.md:134-136` reject; `docs/PITCH_READINESS.md:229` flags it too. | The most celebratory number in the app is the least true. A sharp user or interviewer will catch it and stop trusting the rest. | Hide it now. Rebuild it as a "kept out of the air" ledger: walk and cycle kg vs driving (already computed in `hooks/useWeeklyRecap.ts:110` and `hooks/useTrips.ts:609`) plus adopted Top Moves. Never baseline minus logged. Cut the Grove. | 1-2 days | Decision D1: what "offset" means (section 4.7). |
| 36 | Achievements shelf | partial | `app/(tabs)/profile.tsx:411-450`; `hooks/useAchievements.ts`. The seed (`supabase/migrations/20260315000007_create_achievements.sql:20-25`) includes "Streak: 3/7/30 Days" and "Centurion: Log 100 emission entries". Unlock checks run after every log (`hooks/useEmissionEntries.ts:148`). A new account sees a row of padlocks. `reduction_pct` compares a partial week with a full one (`useAchievements.ts:84-99`), so it is easy to earn. Names truncate (UAT #19). The unlock toast is neutral (`profile.tsx:785-793`). | The first identity surface is a row of locked badges, which the target persona is put off by (`docs/DESIGN_RESEARCH.md:119`). The badges reward streaks and logging emissions. | Hide the shelf for launch, or show only earned records. If it comes back, use the renamed badges in section 4.4. | hours | none |
| 37 | Challenges and leaderboard | broken | `challenge_participants.current_kg` is never written: only the migration (`supabase/migrations/20260315000006_create_challenge_participants.sql:7`) and readers mention it. `_computeReductionPct` treats null as 0 (`hooks/useLeaderboard.ts:16-22, :67`), so anyone with a baseline shows a 100% reduction. The baseline is last week's total (`hooks/useChallenges.ts:25-34`). `app/challenge/[id].tsx:35-40` never sets `headerShown` and the root hides headers (`app/_layout.tsx:33`), so there is no back or close (`docs/PITCH_READINESS.md` H3). Create and join have no error path (`app/(tabs)/profile.tsx:202-264`; PITCH_READINESS M3). Medal ranking in `components/social/LeaderboardRow.tsx:39-43`. Not tested in UAT. | Wrong numbers, a dead-end screen, and a competitive ranking that cuts against the thesis. | Hide the Challenges card for v1. If it returns, make it cooperative (one shared swap with a friend), with a job that writes `current_kg` and a header on the detail screen. | hours | Decision D3: hide for v1. |

### Data sources

| # | Feature | Status | Evidence | User impact | What it takes | Effort | Founder action |
|---|---|---|---|---|---|---|---|
| 38 | Plaid bank linking (`app/link-bank.tsx` plus 7 `plaid-*` edge functions) | unverified | All 7 `plaid-*` functions answered an unauthenticated OPTIONS probe with 200 on 2026-10-03. The client is wired (`app/link-bank.tsx:68-102`, `hooks/useLinkedAccounts.ts`; entry at `app/(tabs)/profile.tsx:503-569`). `supabase/functions/PLAID_SANDBOX_TESTING.md:126-132`: never run against the live Plaid API. No `webhook` is sent in `/link/token/create` (`supabase/functions/plaid-link-token/index.ts:33-39`) and nothing calls `plaid-sync` or `plaid-sync-now`, so transactions sync once inside `plaid-exchange` (`plaid-exchange/index.ts:79-85`) and never again. `country_codes: ['US']`. The catch-all error says "Bank linking isn't available yet on this build" whatever the cause (`link-bank.tsx:98-101`). | As built, a linked bank gives a one-time snapshot that goes stale after day 1, and a misconfigured key looks like "not available". | Run the sandbox walkthrough. Pass the `plaid-webhook` URL in link/token/create. Call `plaid-sync-now` on app foreground, throttled. Show the real error. Check in sandbox whether the first sync returns data. For a sensors-first launch, hide the entry until this passes. | 3-5 days | Confirm `PLAID_CLIENT_ID`, `PLAID_SECRET` and `PLAID_ENV` in Supabase function secrets. Plaid Production access later. |
| 39 | Transaction-to-emission mapping (`lib/spendFactors.ts`, `lib/naicsGroups.ts`) | works | `lib/spendFactors.ts:179-196` applies EPA USEEIO v1.3 factors through a Plaid category to NAICS crosswalk, deflated to 2022 USD, with refunds as negative kg and confidence capped at medium. The Deno copy (`supabase/functions/_shared/spendFactors.ts:31-32`) imports the same data files. Tests pass. `lib/naicsGroups.ts` maps 69 NAICS codes to 11 readable groups. MCC is accepted but not used (`:175-178`). | Turns card spend into an honest, labelled estimate. Never run on real Plaid categories. | A parity test so the two copies cannot drift. Check the crosswalk against real sandbox categories during the Plaid test. | hours | none |
| 40 | Receipt CSV backfill (Amazon, DoorDash) | unverified | `app/import.tsx:74-108`, then `hooks/useReceiptImport.ts:71-97`, then the pre-parsed branch of receipt-parse with no LLM call (`supabase/functions/receipt-parse/index.ts:185-188`). Content-hash idempotency (`:161-182`); replaces the bank estimate (`:368-429`). Deployed. Parser tests pass. Never run with a real export: UAT only opened the screen. The user must request and unzip a data export first (`app/import.tsx:16-20`). | High effort, late payoff. Few users will do it, so it is not a launch feature. | Run one real Amazon export end to end. Keep it as a power-user option and keep it out of onboarding. | hours | Request your own Amazon order-history export. |
| 41 | Receipt photo import | not wired | `useParseSharedReceipt` (`hooks/useReceiptImport.ts:49-62`) has no callers. The share-sheet path was removed because App Groups need a paid team (`app/import.tsx:9-15`). The backend image path exists (`receipt-parse/index.ts:116-126, :192`, hardcoded to `image/jpeg`). The You tab still promises it: "Share a receipt or backfill Amazon/DoorDash orders" (`app/(tabs)/profile.tsx:609`; UAT #21). No `NSCameraUsageDescription` in `app.json`. The eval has no image cases. | A visible promise the app cannot keep, on the screen where trust is built. | Now: change the copy at `profile.tsx:609` to "Backfill Amazon or DoorDash orders". Later: an `expo-image-picker` button (already a dependency) that sends a resized JPEG to the existing path, plus the camera string and image eval cases. | hours (copy), 1-2 days (feature) | Anthropic API credit (the Haiku call is paid). |
| 42 | Snap-a-Plate (photo food logging) | not wired | `docs/SNAP_A_PLATE_SPEC.md`: a proposal awaiting approval, with no implementation. The `plate-scan` function is not deployed (OPTIONS 404 on 2026-10-03). | Food has no passive signal, so manual food logging stays the main friction. | Defer until rows 9, 13, 14 and 46 work on device. Gate it on the 100-photo eval the spec proposes. | 1-2 weeks | Anthropic API credit. |

### Notifications

| # | Feature | Status | Evidence | User impact | What it takes | Effort | Founder action |
|---|---|---|---|---|---|---|---|
| 43 | Daily and meal reminder notifications | not wired | `hooks/useNotifications.ts:14-33, :41-108` schedule only when a `notification_preferences` row exists (`:167-179`). Nothing inserts one, and the migration defaults to false. The copy is off-thesis: "Log your carbon today" (`:24`), "a quick log keeps your streak alive" (`:65`), "before midnight" (`:72`). A streak-milestone push sits at `hooks/useEmissionEntries.ts:154-163`. | None fire today. They would start the moment a settings screen writes the row (row 7). | Delete these reminders. If a nudge is needed, make it "N moments to confirm", never "log manually". | hours | none |
| 44 | Weekly recap notification (Sunday 18:30) | partial | `lib/recapNotification.ts:30-57`, rescheduled on every foreground once permission is granted (`hooks/useNotifications.ts:187`). There is no `addNotificationResponseReceivedListener` or `setNotificationHandler` anywhere in `app/`, `hooks/`, `lib/`, `components/` or `contexts/` (grep, 2026-10-03), so a tap opens wherever the app last was. Not device-tested. | The weekly invitation lands nowhere in particular. | A response listener with a `data.route` payload (`/recap`), plus `setNotificationHandler`. | hours | none |
| 45 | Trip notifications (trips spotted, trip logged, walk or ride) | unverified | `hooks/useTrips.ts:142-155, :604-614, :637-656` send local notifications during foreground refresh passes. Without `setNotificationHandler`, notifications are probably not shown while the app is open, and taps do not route. Every auto-logged drive sends a push with its kg (`:434-437`). Walk and ride pushes say "Great choice!" and "Nice walk!" (`:611-612`). Push tokens are registered, but nothing sends to them (`hooks/useNotifications.ts:136-155`). | The aha moment's invitation may never be seen, while every drive sends a negative-fact ping. | Add the handler and route taps to the review sheet. Remove the per-drive push. Rewrite the walk copy (section 4.4). Test on device. | hours | Physical iPhone; paid Apple account for real remote push (`aps-environment`). |

### AI and evaluation

| # | Feature | Status | Evidence | User impact | What it takes | Effort | Founder action |
|---|---|---|---|---|---|---|---|
| 46 | AI insight card (`generate-suggestions`) | broken | Client: `hooks/useAiInsight.ts:45-104` (24h cache, then a direct fetch), called from `app/(tabs)/index.tsx:1162-1190`, rendered at `:1344-1357` only when Top Moves is empty. The function is deployed but fails after auth. `eval/receipt-parse/README.md:67` records the key in `supabase/functions/.env` failing with "Your credit balance is too low"; the deployed secret is likely the same key (unconfirmed). On error the card hides and only logs `console.warn` (`components/ui/VAiInsightCard.tsx:48-50, :79-82`). The prompt (`supabase/functions/generate-suggestions/index.ts:17-39`) has no tone rules and asks the model to invent a saving. Output is `JSON.parse`d with no schema check (`:90-93`). No eval. The JWT is decoded without verification (`:59-72`), relying on the gateway's `verify_jwt`. | New users see an empty gap where onboarding promised a daily Claude step. Switched back on as-is, nothing stops a guilt-toned output or a made-up number. | Fund the key. Compute the saving in code from the factor table (Top Moves already does this) and let the model only phrase it. Add the voice rules in section 4.5, schema and length checks, and a 20-30 case tone-and-grounding eval. Log failures somewhere other than the console. | 1-2 days | Buy Anthropic API credit; set or verify `ANTHROPIC_API_KEY` in Supabase function secrets. |
| 47 | `analyze-emissions` edge function | not wired | Deployed (OPTIONS 200), but nothing in `app/`, `hooks/`, `lib/` or `components/` calls it. A near-duplicate of generate-suggestions on Sonnet 4.5 (`supabase/functions/analyze-emissions/index.ts:79-84`), with proper auth (`:59-69`). | None for users. It is a live endpoint any signed-in user can call to spend Anthropic credit. | Delete it, or repurpose it as the weekly "carbon agent" job. Do not leave a second unused LLM endpoint deployed. | hours | none |
| 48 | Receipt-parse eval harness (`eval/receipt-parse`) | partial | `run-harness.mjs` plus the frozen `golden-v1.jsonl`: 40 text cases (16 happy path, 12 hard legitimate, 8 confusion pairs, 4 adversarial, 6 holdout), no images. Grading runs through the production NAICS logic, with no LLM judge. `eval/receipt-parse/README.md:63-69`: zero runs, blocked on credit. `RUN_LOG.md` has a header and no rows. | No user impact. For the portfolio it is the "I evaluate AI" proof, and it has no numbers yet. | Fund the key, run `node eval/receipt-parse/run-harness.mjs`, commit the baseline row, then do one prompt-variant run to show the regression gate working. | hours | Anthropic API credit (same key). |

### Release and infrastructure

| # | Feature | Status | Evidence | User impact | What it takes | Effort | Founder action |
|---|---|---|---|---|---|---|---|
| 49 | Build and release readiness (EAS, TestFlight, store listing, privacy policy) | broken | `eas.json:32-34` holds placeholder submit values (`your-apple-id@example.com`, `YOUR_APP_STORE_CONNECT_APP_ID`, `YOUR_APPLE_TEAM_ID`). The only signing identity on this Mac is a personal-team "Apple Development" certificate; there is no Distribution certificate. EAS CLI is logged in. The privacy policy URL (`docs/store-metadata.md:41`) returned HTTP 404 on 2026-10-03. The policy text (`docs/privacy-policy.html`, identical to `website/public/privacy-policy.html`) dates from March 2026 and omits location, motion, Plaid and receipts. No account deletion (row 7). The store copy sells manual logging, daily AI, leaderboards and streaks (`docs/store-metadata.md:12-35`). | Nobody but the founder can install the app, and a submission as-is would likely be rejected. | Enroll, create the App Store Connect record, fill in the `eas.json` submit block, run `eas build -p ios --profile production` (a cloud build avoids the local Xcode 27 issue), submit to TestFlight. Add delete account, rewrite and host the privacy policy, rewrite the store copy around the no-guilt autopilot. | 3-5 days | Apple Developer Program ($99 a year); App Store Connect record; App Privacy labels; a hosted privacy policy URL. |
| 50 | App config (`app.json`) | partial | Bundle id `com.vedantlakhani.veridian`; custom icon and splash; background modes and motion and location usage strings present. The generated `ios/Veridian/PrivacyInfo.xcprivacy` declares UserDefaults, which the Swift module uses. Missing: `NSCameraUsageDescription` (needed only for photo import) and `ITSAppUsesNonExemptEncryption`. `package.json:2` name is still `veridian-temp`. `docs/store-metadata.md:94` describes a different icon from the one shipped. | Fine for a first build. Small gaps cause upload or review friction. | Add `ios.config.usesNonExemptEncryption: false`, add the camera string if photo import ships, rename the package. | hours | none |
| 51 | Environment and secrets | partial | App `.env`: Supabase URL and anon key (working per UAT); Google client ID is a placeholder. Function secrets: `ANTHROPIC_API_KEY` (unfunded per the eval README); `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (unverified; `supabase/functions/_shared/plaid.ts:22, :63-66`, defaults to sandbox); Supabase keys are injected by the platform. Local only: `supabase/functions/.env` and `website/.env`. Remote push needs `aps-environment`, so it is a no-op on a personal team (`hooks/useNotifications.ts:141-147`); local notifications work. The Supabase CLI is not installed, so secrets could not be listed. | Every broken AI feature and the unverified bank feature come down to two secrets only the founder can set or check. | Check the secrets in the dashboard. Before inviting testers, set up custom SMTP for auth emails: Supabase documents its built-in sender as rate-limited and not meant for production (https://supabase.com/docs/guides/auth/auth-smtp). | hours | Anthropic billing, Plaid keys, Supabase secrets, an SMTP provider account. |
| 52 | Marketing website and waitlist (`website/`) | partial | Vite and React site (`website/src/App.tsx`: Hero, ProductScreens, CaseStudy, DeepDive, WaitlistCTA, Footer). The waitlist inserts into `waitlist_signups` (`website/src/lib/waitlist.ts:20`) with insert-only anonymous access (migration `20260818000028`). No hosting config and no live URL anywhere in the repo. Whether the migration is applied on the live database is unverified. The footer links the March 2026 privacy policy. "Momentum, not streaks. No guilt copy." (`website/src/sections/ProductScreens.tsx:33`) is not yet true of the app (row 30). | No public front door, so no demand evidence and nothing to link from a resume. | Deploy to Vercel or Netlify with `VITE_SUPABASE_*`, make one test signup and confirm the row lands, update the privacy policy. Keep the "no guilt" claim only once the P0 items in section 4 ship. | hours | Hosting account (free tier is fine); optional custom domain. |

---

## 3. Founder-only actions checklist

Ordered by what each action unblocks. Nothing in this list can be done from the code.

### Credentials and payments

- [ ] **Buy Anthropic API credit and verify the `ANTHROPIC_API_KEY` function secret in the Supabase dashboard.**
  - Why: unblocks the AI insight (row 46), the first eval baseline (row 48) and, later, photo receipts (row 41). The eval run is the AI-evaluation portfolio proof, and today it has no numbers.
  - Cost: the repo's own note puts Haiku 4.5 at $1 per million input tokens and $5 per million output tokens (`supabase/functions/receipt-parse/index.ts:199-203`). That is a code comment, not billing truth.
  - Also confirm that the deployed secret is the funded key, not just the one in `supabase/functions/.env`.
- [ ] **Check the Plaid secrets in Supabase function secrets:** `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox`.
  - Why: row 38 cannot be tested without them. A wrong key shows up in the app as "Bank linking isn't available yet on this build", which hides the cause.
- [ ] **Enroll in the Apple Developer Program ($99 a year).**
  - Why: it is the gate for TestFlight and outside testers (blocker 10), real remote push (row 45), Sign in with Apple (row 6), App Groups for the share-sheet receipt path (row 41), and a Distribution certificate. A free personal team works for testing on your own phone, but its provisioning expires after 7 days.
- [ ] **Later: Plaid Production access** (company verification and paid per-connection pricing), only after the sandbox flow works.
- [ ] **Later: Google OAuth clients** (web and iOS), after the Apple account exists, so Google and Apple ship together (Guideline 4.8).

### Dashboard settings

- [ ] **Supabase Auth: check whether "Confirm email" is on.**
  - Why: it decides whether sign-up needs `emailRedirectTo` and a confirm route (row 2).
- [ ] **Supabase Auth: add `veridian://reset-password` to the redirect allow-list.** Add `veridian://confirm-email` too if confirmation is on.
  - Why: without it, password-reset emails do not open the app (rows 3, 4). Today these links are allow-listed only in the local `supabase/config.toml:98`.
- [ ] **Supabase Auth: set up a custom SMTP sender before inviting testers.**
  - Why: the built-in sender is rate-limited and not meant for production (https://supabase.com/docs/guides/auth/auth-smtp). Rate-limit failures currently show "Check your email" anyway (row 2).
- [ ] **Confirm two migrations on the live database** in the SQL editor: the `handle_new_user` trigger and the `waitlist_signups` table.
  - Why: the baseline flow (row 12) and the website waitlist (row 52) depend on them. Neither could be checked this session: the Postgres connection failed and the Supabase CLI is not installed.
- [ ] **App Store Connect: create the app record, fill in the `eas.json` submit block (`appleId`, `ascAppId`, `appleTeamId`) and complete the App Privacy labels.**
  - Why: required for TestFlight and review (row 49).

### Hosting and public pages

- [ ] **Rewrite and host the privacy policy.** It must cover location, motion, bank data through Plaid, receipts and waitlist emails, and the hosted URL must return 200.
  - Why: the current URL returns 404 and the text predates all of these features (row 49). App Review checks it.
- [ ] **Create a hosting account (Vercel or Netlify free tier) for `website/` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.**
  - Why: there is no public front door yet, so no waitlist evidence and no resume link (row 52).

### Devices and test data

- [ ] **Carry a physical iPhone through 3-5 days of real trips** with Motion & Fitness and "Always" location granted. Cover a drive, a walk, a bike ride and a bus or train ride.
  - Why: trip detection, the confirm card and trip notifications cannot run on the simulator (rows 13, 14, 45). This is the product's core promise and has never been shown working.
- [ ] **Request your own Amazon order-history export.**
  - Why: the CSV backfill (row 40) has never run on a real file.

### Product decisions only you can make

- [ ] **D1. What "offset" means for Veridian.** Option A (recommended for v1): a "kept out of the air" ledger, with no purchases and no netting. Option B (later, only if users ask): a separate contribution area for high-quality removals. Section 4.7 has the detail. This decides how row 35 gets rebuilt.
- [ ] **D2. A personal daily band or the global 22 kg constant** for the ring, tab dot and week strip (rows 12, 15, 19). If the constant stays, it needs a cited source and the name "typical day", not "budget".
- [ ] **D3. Cut list for v1:** Challenges (37), achievements shelf (36), streak record and streak notifications (29, 30, 43), daily and meal reminders (43), Grove (35), `analyze-emissions` (47). Bank linking (38) and receipt backfill (40) stay hidden or in power-user settings until verified.
- [ ] **D4. Launch with email-only sign-in** (avoids Guideline 4.8), or wait for Apple and Google together (row 6).
- [ ] **D5. Car-trip auto-confirm policy:** ask about every car trip for the first 2 weeks, or keep silent auto-confirm (row 14).

---

## 4. Guilt-free copy audit

### 4.1 What the audit found

100 user-facing strings and string families across the app were classified into five classes:

| Class | Meaning | Count |
|---|---|---|
| SHAME/GUILT | Judges the person, or the act of reporting | 2 |
| MORAL VERDICT | Judges choices or days as good or bad | 15 |
| COMPETITIVE PRESSURE | Rank, race, streak, loss aversion | 9 |
| NEUTRAL-FACTUAL | States a fact without judgement | 48 |
| POSITIVE-AGENCY | Credits an action or offers a doable step | 26 |

By surface: Today has 6 moral verdicts. The You tab and challenges have 6 competitive strings. Notifications hold 1 shame string, 1 moral verdict and 2 competitive strings. Manual log holds the other shame string. The website, store copy and AI prompt were audited separately.

**Headline:** the words mostly pass. The house voice rules in `lib/feedCopy.ts:11-16`, `lib/impactCopy.ts:11-19` and `lib/recap.ts:11-13` are good and mostly followed. **The guilt is in the mechanics:** what the hero shows, which colours get reused, what fires a push, and which side of the ledger gets counted.

### 4.2 Principles

These ten rules put "see it, reduce it, no guilt" into practice. Every rewrite below follows them. Sources are in section 4.9.

1. **The past is context, not a verdict.** History is shown in neutral ink. Only today and the next step get colour. Shame makes people hide or escape, while guilt about a specific act prompts repair (Tangney, Stuewig and Mashek 2007). Self-compassion after a lapse raised motivation to improve (Breines and Chen 2012).
2. **Every number travels with one doable next step, or it stays quiet.** Threat changed behaviour only when efficacy was high (Peters, Ruiter and Kok 2013). Fear is generally ineffective for climate engagement (O'Neill and Nicholson-Cole 2009). `docs/NORTH_STAR.md:138` already says this; enforce it.
3. **Two ledgers, never netted.** What you emitted and what you kept out of the air get equal visual weight and are never subtracted into a "net" or "neutral" figure. Anticipated pride raised pro-environmental intentions more than anticipated guilt (Schneider et al. 2017).
4. **Credit only what is real, attributable and named.** Every avoided kg states its comparison ("vs driving the same 3.2 km"). Nothing unlogged ever counts as avoided. Over-crediting is the failure the product claims to reject: fewer than 16% of carbon credits studied represented real reductions (Probst et al. 2024).
5. **Compare to yourself first.** Never show a stranger's benchmark without a constructive cue. Neighbour comparisons led low users to increase use, and an approval cue removed the effect (Schultz et al. 2007). Opower-style reports worked when they paired comparison with tips (Allcott 2011).
6. **Reward recording, never punish it.** Logging something heavy must cost nothing on screen. Social desirability drives misreporting in diet self-reports (Maurer et al. 2006). Applying that to carbon is an inference to test, not a proven finding.
7. **No chains that break, no rankings.** Use counts that only grow ("12 active days this month") and doing things together instead of races. Highlighting a broken streak lowered later engagement (Silverman and Barasch 2023).
8. **Praise the act, not the person, and hand over the next lever right after a win.** This guards against moral licensing (Blanken et al. 2015) and single-action bias (Weber 2006).
9. **Fresh starts at real landmarks, with an action.** Use Monday, the first of the month or a new recap, never "tomorrow" at 2 pm. Temporal landmarks increase goal pursuit (Dai, Milkman and Riis 2014). A broken daily limit invites the "what-the-hell" pattern (Cochran and Tesser 1996).
10. **One voice everywhere, including the AI, and measured.** The LLM prompt carries the same rules, and its output is scored against the five classes above.

### 4.3 Mechanics to change (the behaviour, not the words)

| # | Mechanic | Where | What the user experiences | Priority |
|---|---|---|---|---|
| M1 | The hero is an emissions number filling a ring | `app/(tabs)/index.tsx:148, :175-186` | In Apple's Activity rings, a closed ring means success. Here it means "over". Every emission makes the hero fuller. | P0 |
| M2 | An average presented as a "budget" | `types/emission.ts:89-90` | Being above an average is routine, but "over budget" sounds like failure. The 22 kg has no cited source. For context, Our World in Data lists 2024 per-capita CO2 at 14.20 t for the US (about 39 kg a day), 4.53 t for the UK and 4.73 t for the world (https://ourworldindata.org/grapher/co-emissions-per-capita). A fully tracked US day would sit well over the ring, and one 27 kg beef meal already goes over (UAT data). | P0 |
| M3 | Amber warning at 50% | `lib/theme.ts:107-110` | "Tracking a touch high" at 11 kg, whatever the time of day. | P0 |
| M4 | The over colour spreads to six places, including the past | Ring line (`index.tsx:1216`), tab dot "the app's mood" (`app/(tabs)/_layout.tsx:63-65`), avatar ring (`profile.tsx:310-312`), week dots (`index.tsx:1103`), Trends bars (`trends.tsx:338-355`), log bar (`log.tsx:848-856`) | One heavy meal paints the whole app in the same hex as the error colour (`lib/theme.ts:35,68,93`). Past days stay painted. | P0 |
| M5 | Budget share shown at the moment of logging | `app/log.tsx:846-867` | The more honestly you log, the worse it looks. | P0 |
| M6 | "Tomorrow's a fresh start" in the afternoon | `app/(tabs)/index.tsx:96` | Writes off the rest of today. | P0 |
| M7 | Positive actions never reach the hero | Avoided kg appears only as feed chips and on Profile (`profile.tsx:353`) | The app only shows the debit side of the ledger. | P0 |
| M8 | A push for every drive, with its kg | `hooks/useTrips.ts:434-437` | A commuter could get about 10 negative-fact pings a week (an estimate from a twice-daily commute), each with no action attached. Violates "Silent-by-Default" (`docs/NORTH_STAR.md:140`). | P0 |
| M9 | Streaks still exist | `trends.tsx:485`; achievements seed `:21-23`; hints `profile.tsx:430-431`; `useNotifications.ts:65`; `docs/store-metadata.md:32` | A chain that breaks, banned by `docs/NORTH_STAR.md:139`. | P0 |
| M10 | "kg never emitted" counts unlogged as avoided | `profile.tsx:155-162` | Partial coverage looks heroic. The one positive number is the one most likely to be called greenwashing. | P0 |
| M11 | A lifetime emissions counter that only grows | `profile.tsx:388-394` | A number on the identity screen that never goes down. | P1 |
| M12 | Top Moves cannot be acted on | `components/ui/VTopMovesSection.tsx:21-23` routes to `/log` | No "I'll try this", and no credit when you do it. | P1 |
| M13 | Medal leaderboard | `components/social/LeaderboardRow.tsx:23-27, :39-43` | Friends ranked gold, silver and bronze. An increase is shown to the group. | P1 |
| M14 | Share cards lead with emissions | `app/recap.tsx:182-207`; `app/passport.tsx:424` | The artifact made for sharing shows the heaviest number and "Up 23%". | P1 |
| M15 | First impression is a comparison | `app/(onboarding)/calculator.tsx:533-546` | "121% above the global average" before the user has done anything. A below-average user risks the boomerang effect. | P1 |
| M16 | Momentum rewards opening the app more than reducing | `lib/momentum.ts:31-38, :98-103` | The gentle decay is a strength, but the score counts logged days, and the light-day bonus is tied to the 22 kg figure. | P2 |

**P0 changes in one list (mostly copy, one constant and a colour mapping):**

1. Stop painting history. Use neutral ink or category colours for the week dots, Trends bars, tab dot and avatar ring (`index.tsx:316-317, :1103`; `trends.tsx:350-354`; `app/(tabs)/_layout.tsx:63-65`; `profile.tsx:310-312`). Today's line under the ring also goes neutral (`index.tsx:1216`).
2. Rename the 22 kg figure to a "typical day" (`types/emission.ts:89-90`) and cite its source before showing it. Drop the 50% amber state (`lib/theme.ts:107-110`) or scale it by hour of day.
3. Remove the budget percentage from the log sheet (`app/log.tsx:846-867`). Keep the driving comparison.
4. Stop the per-drive push (`hooks/useTrips.ts:434-437`) and the meal and streak reminders (`hooks/useNotifications.ts:41-76`). Keep "trips spotted" and "Your week is ready".
5. Remove the streak surfaces: the Trends record (`trends.tsx:485`), the streak achievements (seed `:21-23`), the progress hint (`profile.tsx:430-431`) and the store copy.
6. Fix or hide "kg never emitted". Count only verified avoided kg (section 4.7) and cut the Grove.

### 4.4 Prioritised rewrite table

House style for every replacement: short and warm, with no exclamation marks, no emoji and no em dashes (UAT #23). **Where a current string contains an em dash in the code, it is written here as `--`.**

| P | Current string | File:line | Problem | Replacement |
|---|---|---|---|---|
| P0 | `Over today's band -- tomorrow's a fresh start` | `app/(tabs)/index.tsx:96` | A verdict with no step. Writes off the rest of today. | Template by today's top category. Food: "Heavier day so far. A plant-based dinner still helps." Transport: "Heavier day so far. Walking the next short trip still helps." Energy: "Heavier day so far. A degree cooler tonight still helps." Shopping: "Heavier day so far, mostly one purchase. Nothing to fix." |
| P0 | `Tracking a touch high -- one light choice keeps you in band` | `app/(tabs)/index.tsx:95` | Fires at 11 kg. Band metaphor. | "Close to a typical day. One light choice keeps it there." |
| P0 | `Plenty of headroom today` | `app/(tabs)/index.tsx:94` | Budget metaphor. | "Lighter than a typical day so far." |
| P0 | `of 22 kg` | `app/(tabs)/index.tsx:185` | An average presented as a limit. | "typical day 22 kg" |
| P0 | `This is {n}% of today's budget` | `app/log.tsx:865` | Judges honest reporting. | Remove. The driving comparison at `:860` is enough. If kept: "About {n}% of a typical day" in neutral ink. |
| P0 | `Budget: 22 kg per day` | `app/log.tsx:866` | Same. | "A typical day is about 22 kg" |
| P0 | `Trip logged` / `{x} km drive · {y} kg CO₂e` | `hooks/useTrips.ts:435-436` | A push for every emission. | Remove the push. Show "{x} km drive added" quietly in the feed only. |
| P0 | `Great choice!` / `Nice walk!` + `... You avoided {y} kg CO₂` | `hooks/useTrips.ts:611-612` | Judges the choice; exclamation marks. | Title "Walk added" or "Ride added". Body "{x} km on foot, about {y} kg less than driving it." |
| P0 | `Dinner time -- a quick log keeps your streak alive.` | `hooks/useNotifications.ts:65` | Streak loss aversion. | Remove. |
| P0 | `Log just one thing before midnight to keep your momentum building.` | `hooks/useNotifications.ts:72` | Deadline plus loss framing. | Remove. |
| P0 | `Log your carbon today` / `A couple of taps keeps your momentum moving.` | `hooks/useNotifications.ts:24-25` | Duty framing. Contradicts the autopilot. | "Anything to confirm?" / "Most of today tracked itself. Have a look when you have a minute." |
| P0 | `Streak` | `app/(tabs)/trends.tsx:485` | A breakable chain. | "Active days", showing "{n} this month" |
| P0 | `Streak: 3 Days` / `Streak: 7 Days` / `Streak: 30 Days` | `supabase/migrations/20260315000007_create_achievements.sql:21-23` | Breakable chains. | "Three days in", "A week of rhythm", "A month of rhythm", counted as active days in any rolling window, never consecutive. Needs a migration. |
| P0 | `{n} kg never emitted` | `app/(tabs)/profile.tsx:353` | False maths: unlogged counted as avoided. | After the fix: "{n} kg kept out of the air", subline "from walks, rides and swaps" |
| P1 | `{n}% above the global average` | `app/(onboarding)/calculator.tsx:533-535` via `lib/impactCopy.ts:70-72` | A ranking as first contact. | "Most of it is {category}. That is where small changes count most." Keep "World average: 4.7t" as a muted chip with its source. |
| P1 | `Paris target: {t}t` (green chip) | `app/(onboarding)/calculator.tsx:545` | A moral benchmark with no source. | Move behind a "Where these numbers come from" sheet, labelled "1.5°C-aligned: about 2.5t". |
| P1 | `Save my footprint -- Sign Up` | `app/(onboarding)/calculator.tsx:519` | Em dash; "save my footprint" sounds like keeping the bad thing. | "Keep my results" (signed out: "Create an account to keep my results") |
| P1 | `Up {x}% from last {period} -- a fresh start this {period}` | `lib/recap.ts:253` | No cause and no step. Printed on the share card. | "Up {x}% on last week, mostly {category}." Put the category lever on the next page. |
| P1 | `Just {x} -- proof a lighter day is doable.` | `lib/recap.ts:486` | Quietly judges the other days. | "{x}. Worth noticing what was different." |
| P1 | `Mostly {category} · {x} kg` (share card) | `app/recap.tsx:299`, `app/passport.tsx:531` | Shares the heavy number. | "{n} trips tracked themselves" or "{x} km on foot this week" |
| P1 | `Beef is your top source at {x} kg/wk.` | `lib/topMoves.ts:92, :105` | Points at the habit, not the lever. | "Beef meals are about {x} kg a week, your biggest food lever." |
| P1 | `Reduce chocolate consumption by a quarter` / `Cut {n} of your {m} chocolate servings` | `lib/topMoves.ts:141-144` | Sounds like a diet being policed. | "Swap {n} of your {m} chocolate treats for something else" |
| P1 | `Chocolate adds {x} kg/wk -- small cuts add up.` | `lib/topMoves.ts:145` | Same. | "Chocolate is about {x} kg a week for you." |
| P1 | `Thanks -- that keeps your footprint honest.` | `app/(tabs)/index.tsx:800` | Treats accuracy as honesty, implying a skipped confirm is dishonest. | "Thanks. Today is up to date." |
| P1 | `{Category} drove {pct}% of your {period} -- {Day} was your biggest day.` | `app/(tabs)/trends.tsx:125-126` | Spotlights the worst day. | "{Category} was {pct}% of your {period}. {LightestDay} was your lightest." |
| P1 | `Race a friend to a smaller footprint` | `app/(tabs)/profile.tsx:485` | Competition. | "Try one swap with a friend for two weeks." |
| P1 | `Join my Veridian carbon challenge! Use code: {code}` | `app/(tabs)/profile.tsx:261` | Competition; exclamation mark. | "Want to try a swap with me for two weeks? Join on Veridian with code {code}." |
| P1 | `Leaderboard`, medals, `Be the first to join and set the pace` | `app/challenge/[id].tsx:71, :85`; `components/social/LeaderboardRow.tsx:39-43` | Ranking. | "Who's in", with no medals or rank. Empty state: "Invite a friend to try it with you." |
| P1 | `Track your impact` / `Log food, transport, and energy in seconds. See your true carbon footprint, day by day.` | `app/(onboarding)/index.tsx:62-63` | The thesis is never stated, and it sells manual logging (UAT #5). | "Your carbon, without the guilt" / "Veridian keeps track quietly, counts every lighter choice, and points to the next easy one." |
| P1 | `Claude analyses your emissions and gives you one specific, actionable step -- every day.` | `app/(onboarding)/index.tsx:68` | Overclaimed while the AI is down, and users with Top Moves never get it. | "Each week Veridian finds the one swap that would help you most." |
| P1 | `Share a receipt or backfill Amazon/DoorDash orders` | `app/(tabs)/profile.tsx:609` | Promises a removed feature (UAT #21). | "Backfill Amazon or DoorDash orders" |
| P2 | `Nothing logged yet today -- start with a quick slot above.` | `app/log.tsx:728` | Pushes manual logging. | "Nothing added by hand today. Most things track themselves." |
| P2 | `Nice!` | `app/log.tsx:598` | Exclamation mark. | "Nice one" |
| P2 | `You've kept a nice rhythm going for {n} days straight.` | `hooks/useNotifications.ts:122` | "Straight" brings back the chain. | "{n} active days this week. Nice rhythm." |
| P2 | `10% Reduction` / `Reduce your weekly emissions by 10%` | achievements seed `:24` | A weekly verdict you can lose next week. | "First lighter week" / "A week lighter than your usual" |
| P2 | `Centurion` / `Log 100 emission entries` | achievements seed `:25` | Rewards logging emissions. | "100 kg kept out of the air" |
| P2 | Mock walk row `0 kg` | `app/(onboarding)/index.tsx:91` | Misses the positive moment. | "saved 0.2 kg" |
| P2 | `Momentum, not streaks. No guilt copy.` | `website/src/sections/ProductScreens.tsx:33` | Not true yet. A credibility risk in interviews. | Keep only once the P0 items ship. |
| P2 | `your streak is safe` / `Earn achievement badges for streaks...` | `docs/store-metadata.md:26, :32` | Loss aversion and competition. | "nothing is lost" / remove the badges line |

The `Save my footprint` and `Share a receipt` rows were added while writing this doc; the rest come from the guilt-free audit.

### 4.5 Voice rules for the AI prompt

Add to `supabase/functions/generate-suggestions/index.ts` (prompt at `:17-39`). This is the only place user-facing copy is generated outside the house voice rules today.

```
Voice rules:
- State past emissions once, as a fact. Never call them bad, high, excessive, or a problem.
- If anything this week was zero-emission or lighter, mention it first.
- Give exactly one action sized to this person's own data, with its saving.
- Never compare the person to other people, averages, or targets.
- No "should", "must", "unfortunately", no exclamation marks, no emoji.
```

Pair the rules with code-side grounding: compute the saving from the factor table and pass it in, so the model never invents a number.

### 4.6 What is already right (keep it)

- Voice rules and comparison chips in `lib/feedCopy.ts:11-16, :179` ("Walked 1.6 km, saved 0.3 kg vs driving").
- Carbon-literacy captions in `lib/impactCopy.ts` ("About a 6 km drive").
- One-fact, one-step category lines in the recap (`lib/recap.ts:323-330`).
- The hedged confirm card wording and the zero-emission "nice one" (`app/(tabs)/index.tsx:742-756`).
- Amber, not red, for increases in Trends and the leaderboard (`trends.tsx:149-152`, `LeaderboardRow.tsx:23-27`).
- Momentum decay that never drops to zero (`lib/momentum.ts:9-18`).
- Blame-free errors, the "added to your record" toast, and "upgraded from an estimate".
- Top Moves partial swaps instead of "quit" (`lib/topMoves.ts:77-78`), and the evidence floor.

### 4.7 "Offset it in a positive way": the tension and a version that fits both

**The tension, stated plainly.** The founder wants people to "feel the need to offset this carbon in a very positive way". The project's own canon says no to offsets:

- "Never an offset transaction cut. ... Reduction, not absolution." (`docs/NORTH_STAR.md:160`)
- The "Offset Absolver" is the named anti-persona (`docs/DESIGN_RESEARCH.md:134-136`).
- The design requirements ban "you're now carbon neutral" moments (`docs/DESIGN_REQUIREMENTS.md:338`).

Today the only offset-like surface in the app is the Grove plus "kg never emitted" (row 35). It is calculated as baseline minus logged, which is absolution by arithmetic: exactly the pattern the docs reject. Nothing in the code sells or mentions offset purchases.

**A version that fits both: a "kept out of the air" ledger.** You balance carbon out by doing things, not by buying anything. The building blocks already exist.

| Rule | Why |
|---|---|
| **Counts only:** detected walk, cycle and transit trips vs driving the same distance (`savedKg` already exists at `hooks/useTrips.ts:385` and `lib/recap.ts:371-376`); Top Moves the user said "I'll try" and the data then confirms; receipt-verified swaps. | Every kg traces back to an action (principle 4). |
| **Never counts:** unlogged emissions, baseline minus logged (replace `profile.tsx:155-162`), purchased credits, trees. | Removes the greenwashing risk in M10. |
| **Shown next to the footprint, never subtracted from it.** No net figure, no "neutral" state, no progress bar toward zero. | This is the line between balancing and absolution. The ledger only grows when you do something. |
| **The comparison is always named:** "1.2 km on foot, about 0.2 kg less than driving it." Skip trips shorter than a plausible drive. The proposed threshold of 1 km is an assumption to test. | Not every stroll replaced a drive. Overclaiming breaks trust. |
| **A win always ends with the next lever.** | Guards against licensing and single-action bias (principle 8). |
| **The copy never says "offset", "neutral", "earned" or "cancel out".** Say "kept out of the air" or "lighter by". | The word "offset" attracts the anti-persona. |
| **It leads the shareable artifacts.** The Recap and Passport hero becomes "{x} kg kept out of the air · {n} trips tracked themselves", with the total second. | Pride is what people share (M14). |

**Decision D1 (founder):**

- **Option A, recommended for v1:** the ledger only. No purchases, no netting. The North Star stays intact, and the founder's "balance it out positively" wish is met through action.
- **Option B, possible later:** a separate "Contribute" area, outside the ledger, for high-quality carbon removals. It is never netted, never says "neutral", and the app takes no cut. Consider it only if real users ask.
- If the founder means something closer to B now, `docs/NORTH_STAR.md` section 9 needs an explicit rewrite, not a silent drift.

**Business tie-in:** the same swaps can be priced in money saved, which is the "hard outcome" candidate in `docs/NORTH_STAR.md:161`. Note that `lib/topMoves.ts` does not compute money today (`docs/USER_JOURNEY.md:261`), although the North Star says it does.

### 4.8 Making the voice measurable

- **Copy lint test.** A Jest test that flags `budget`, `streak`, `!` and "kg CO₂e" inside sentences in user-facing strings. It makes the principles enforceable and is a small, credible PM artifact.
- **Tone eval for the AI.** Generate insights over seeded contexts and have an LLM judge label each one with the five classes in 4.1. Target: zero SHAME/GUILT and zero MORAL VERDICT. It is smaller than the receipt-parse eval and could be the first agent eval that actually runs.
- **A 5-person check of the Today hero.** Show the current ring and a "two ledgers" version. Ask "How do you feel about today?" and "What would you do next?" and record answers verbatim. This tests principles 2 and 3 with real people. No results exist yet.

### 4.9 Sources for this section

- Tangney, Stuewig and Mashek 2007, moral emotions and behaviour: https://pmc.ncbi.nlm.nih.gov/articles/PMC3083636/
- Peters, Ruiter and Kok 2013, fear appeal meta-analysis: https://cris.maastrichtuniversity.nl/en/publications/threatening-communication-a-critical-re-analysis-and-a-revised-me
- O'Neill and Nicholson-Cole 2009, "Fear Won't Do It": https://journals.sagepub.com/doi/10.1177/1075547008329201
- Schultz et al. 2007, social norms and the boomerang effect: https://cbsm.com/articles/32578-the-constructive-destructive-and-reconstructive-power-of-social-norms
- Allcott 2011, Opower (J-PAL summary): https://www.povertyactionlab.org/evaluation/opower-evaluating-impact-home-energy-reports-energy-conservation-united-states
- Schneider, Zaval, Weber and Markowitz 2017, anticipated pride vs guilt: https://pmc.ncbi.nlm.nih.gov/articles/PMC5708744
- Breines and Chen 2012, self-compassion: https://pubmed.ncbi.nlm.nih.gov/22645164/
- Dai, Milkman and Riis 2014, fresh start effect: https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf
- Silverman and Barasch 2023, broken streaks: https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions
- Blanken, van de Ven and Zeelenberg 2015, moral licensing meta-analysis: https://journals.sagepub.com/doi/10.1177/0146167215572134
- Weber 2006, single-action bias: https://elke-u-weber.com/media/2006_climaticchange_weber.pdf
- Probst et al. 2024, carbon credit effectiveness: https://pmc.ncbi.nlm.nih.gov/articles/PMC11564741
- Maurer et al. 2006, dietary misreporting: https://experts.arizona.edu/en/publications/the-psychosocial-and-behavioral-characteristics-related-to-energy/
- Cochran and Tesser 1996, the "what the hell" effect (book chapter, not read in full): https://www.routledge.com/Striving-and-Feeling-Interactions-Among-Goals-Affect-and-Self-regulation/Martin-Tesser/p/book/9780805820393
- VTT/LUT carbon handprint guide (the idea behind the "kept out of the air" ledger; applying it to individuals is an adaptation): https://sarjaweb.vtt.fi/julkaisut/muut/2021/Carbon_handprint_guide_2021.pdf
- Our World in Data, CO2 per capita: https://ourworldindata.org/grapher/co-emissions-per-capita

---

## 5. Build and run notes

### 5.1 Health at HEAD (run on 2026-10-03)

- **Jest:** 47 suites, 446 tests passed, 16 todo, 0 failed. Tests cover pure libraries only. Screen behaviour has no tests, including the sign-up error path, cache invalidation and offline flush timestamps.
- **TypeScript:** `tsc --noEmit` shows 0 errors in app code. The 3 errors it reports are all in `website/`, because `tsconfig.json:19-21` excludes only `supabase/functions`. That is harmless but noisy; add `website` to the exclude list.
- **Edge functions:** an unauthenticated OPTIONS probe shows 10 functions deployed and answering 200 (`generate-suggestions`, `analyze-emissions`, `receipt-parse` and the 7 `plaid-*`). `plate-scan` returns 404. Only 6 are called from the client (section 2, rows 38, 40, 46).

### 5.2 Running on the simulator with Xcode 27

`npx expo run:ios` (the `ios` script in `package.json:9`) fails on this Mac. Xcode 27 has no standalone Simulator.app (it was replaced by DeviceHub), and Expo CLI 54 stops with "Can't determine id of Simulator app" (`docs/UAT_FINDINGS_2026-10-02.md:47`). The workaround is to build with `xcodebuild`, install with `simctl` and start Metro yourself.

The commands below are reconstructed from that note and from the build products on disk (`ios/build/Build/Products/Debug-iphonesimulator/Veridian.app`). The exact flags used on 2026-10-02 were not recorded.

```sh
cd "/Users/vedantlakhani/Desktop/03 - Projects & Ventures/Veridian"

# 1. Build the dev client for the simulator (workspace and scheme are both "Veridian")
xcodebuild -workspace ios/Veridian.xcworkspace -scheme Veridian \
  -configuration Debug -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath ios/build build

# 2. Boot (skip if already booted) and install
xcrun simctl boot "iPhone 17 Pro"
xcrun simctl install booted ios/build/Build/Products/Debug-iphonesimulator/Veridian.app

# 3. Start Metro yourself, in its own terminal
npx expo start --dev-client

# 4. Launch the app
xcrun simctl launch booted com.vedantlakhani.veridian
```

Notes:
- On 2026-10-03, both "iPhone 17 Pro" and "iPhone 17 Pro Max" (iOS 26.5) were already booted. With two booted devices, `booted` is ambiguous, so pass the device UDID from `xcrun simctl list devices booted` instead.
- To see the screen, use Xcode 27's DeviceHub (Simulator.app is gone).
- The dev-only "Simulate trip" button (`app/log.tsx:793-803`) is the only way to exercise the confirm card on the simulator. Simulated trips do not prove detection.

### 5.3 The Podfile deployment-target fix is local only

- **What it does:** Xcode 27 rejects pods whose deployment target is below 15.0. A `post_install` loop in `ios/Podfile:63-68` raises every pod target below the app's floor (`podfile_properties['ios.deploymentTarget'] || '15.1'`) up to that floor.
- **Why it is fragile:** `ios/` is gitignored (`.gitignore:46`, `/ios`). The fix is in no commit and is lost whenever `ios/` is regenerated (`npx expo prebuild --clean`, a fresh clone, or a new machine). EAS cloud builds also run prebuild from `app.json`, so the fix will not be there. Whether EAS's build image uses an Xcode version that hits this error is unverified.
- **Making it permanent:** move the same lines into a small Expo config plugin that edits the Podfile at prebuild time (for example with `withDangerousMod`), and register it in the `app.json` plugins next to `expo-build-properties` (`app.json:73`). Setting `ios.deploymentTarget` through `expo-build-properties` only changes the app's own platform line (`ios/Podfile:19`). It does not raise pods that declare a lower target themselves, which is why the loop exists.

### 5.4 Physical iPhone (needed for trip detection)

Trip detection depends on CoreMotion activity history and background location. Neither is available on the simulator, so rows 13, 14 and 45 can only be verified on a real phone.

1. Connect the iPhone and open `ios/Veridian.xcworkspace` in Xcode. Under Signing for the Veridian target, choose your personal team.
2. Build a **Release** configuration. It embeds the JS bundle, so the phone works away from the Mac and Metro, which a multi-day field test needs.
3. On the phone, trust the developer profile in Settings, then grant Motion & Fitness and Location "Always". With "While Using", the app keeps showing the banner (row 9).
4. A free personal team's provisioning expires after 7 days. Rebuild and reinstall before then, or detection silently stops.
5. A personal team supports local notifications, background location and CoreMotion. It does not support remote push (`aps-environment`), App Groups or Sign in with Apple. Those need the paid program.
6. For each real trip, record: detected yes or no, mode guessed vs actual, distance error, and whether the "trips spotted" notification appeared and where a tap landed.

### 5.5 Cloud builds and TestFlight (after the paid account)

Once enrolled: fill in `eas.json:32-34`, then run `eas build -p ios --profile production` and `eas submit -p ios`. EAS CLI is already logged in on this Mac. A cloud build avoids the local Xcode 27 problem, but see 5.3 about the Podfile fix.

### 5.6 What cannot be verified from the code

These need a dashboard, the live service or a device:

- Live Supabase Auth settings: email confirmation, SMTP sender, redirect allow-list.
- Whether `ANTHROPIC_API_KEY` is set in function secrets and funded, and whether the Plaid secrets are set.
- Whether the migrations ran on the live database (`handle_new_user` trigger, `waitlist_signups`). The Postgres connection failed this session and the Supabase CLI is not installed.
- Every device-only path: CoreMotion, background location, notification presentation and routing.
- Live Plaid behaviour and real Plaid categories.
- Android: the Kotlin motion module has never been validated on a device (`modules/veridian-motion/README.md:124`).

### 5.7 Corrections to existing docs

- `docs/TOUCHPOINT_MAP.md` section 4.7 says email sign-ups have no `profiles` row, so the baseline cache patch does nothing. That is wrong: `supabase/migrations/20260315000000_create_profiles.sql:26-41` defines a `handle_new_user` trigger that creates the row on every sign-up. It has not been confirmed against the live database.
- `docs/NORTH_STAR.md:161` says Top Moves already computes money saved. It does not (`docs/USER_JOURNEY.md:261`).
- `docs/UAT_FINDINGS_2026-10-02.md:16` (#6) says the tip generator is not wired up. It is wired (`hooks/useAiInsight.ts:45-104`). It fails at runtime, most likely on Anthropic credit.
