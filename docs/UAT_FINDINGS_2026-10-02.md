# Live on-device UAT findings, 2026-10-02

Method: dev build (Debug) on iPhone 17 Pro simulator (iOS 26.5), Xcode 27.0, driven screen by screen. Backend: live Supabase. Signed-in testing used the `designreview` test account (signed in by the user; credentials are not stored in this repo).

Not tested: trip detection (needs a real iPhone), Plaid link flow, receipt photo parsing, Weekly Recap (no entry point appeared), Challenges, push notifications.

## Confirmed on screen

| # | Screen | Finding | Severity for a demo |
|---|---|---|---|
| 1 | Calculator | Footer shows **5800 kg CO2e/year before any answer** (defaults for every question). | High |
| 2 | Login | "Continue with Google" shows a developer message: "Google Sign-In is not configured yet - add a real EXPO_PUBLIC_GOOGL...". | High |
| 3 | Login | "Continue with Apple" spins then silently does nothing in the simulator. No error shown. | Medium |
| 4 | Onboarding slide 3 | Pitches leaderboard and achievement badges with fake names (Alex K., Maria S.). Contradicts positioning. | High |
| 5 | Onboarding slide 1 | Copy: "Log food, transport, and energy in seconds" pitches manual logging. | Medium |
| 6 | Onboarding slide 2 | Sample card shows "Try this / Try lentils..." (doubled "Try"). Promises daily Claude-generated step; tip generator is not wired up per code review. | Medium |
| 7 | Passport page 4 | **"Friday was your lightest - Just 27.0 kg"** while Trends says Friday was the biggest day, and 27 kg is over the 22 kg budget. Single-day data not guarded. | High |
| 8 | Passport share card | Trips count renders as a **clipped "0" that looks like "U"** on the shareable card. | High |
| 9 | Passport page 1 | Says "Your first tracked month" but Lifetime (33.3 kg) exceeds this month (27.0 kg). | Medium |
| 10 | Passport page 2 | Says "Food led your week" while the Month view is selected. Bar has no value label. | Low |
| 11 | Today | **Top Moves** shows "from your last 4 weeks" and "-13.1 kg/wk" after a single beef entry. One meal treated as a weekly habit. | High |
| 12 | Today | Red over-budget ring has a pale pink square halo with clipped corners. | Medium |
| 13 | Location flow | Choosing "While Using" leads to an alert "Enable it in Settings -> Veridian -> Location -> Always" with only OK, no Open Settings button. | Medium |
| 14 | Add manually | One-tap shortcuts are pre-filled for a brand-new user (Car petrol 8 km, Electricity UK grid 8 kWh, Chicken 0.3 kg). "UK grid average" is odd for a US app. | Medium |
| 15 | Food picker | Leads with seven store-type rows priced per USD before real foods. Most groups hold a single item. | Low |
| 16 | Quantity sheet | Button "Log 27.00 kg" can be read as 27 kg of beef rather than CO2e. | Low |
| 17 | Calculator | Dark text on dark photo on transport and shopping questions (title, "1 OF 2" label); Skip button near-invisible on slide 1. "Frequent Flights" has no icon; some rows share icons. | Medium |
| 18 | Sign-up/login | Error toast covers the subtitle and the Email label. | Low |
| 19 | You | Grove art looks like arrows and cuts through "243 kg never emitted". Labels truncated ("MOMENT...", "Streak: 3..." twice, "10% Red..."). | Medium |
| 20 | Trends | Composition legend's last item touches card edge. Charts show grey placeholders for a few seconds on first load. | Low |
| 21 | Import receipts | Only CSV import (Amazon/DoorDash). The "Share a receipt" photo path promised on the You tab is not reachable. | High |
| 22 | Add manually | "Logging..." state lasts several seconds before the sheet closes. | Low |
| 23 | Copy | Em dashes in several UI strings (results CTA, empty states). | Low |

## Worked correctly
- Build, launch, Supabase connection, sign-in.
- Intro slides, calculator maths (categories sum to headline; footer reacts to answers).
- Results screen (4.8t, global average, Paris target, breakdown).
- NAICS grouping in the Food picker ("Groceries & Dining", not raw codes), category chips, carbon-literacy caption ("About a 161 km drive", "123% of today's budget").
- Logging an entry end to end: updates header, Today ring and list, Trends charts, Passport, You stats.
- Edit entry, Trends insight line, calm over-budget copy.

## Test data left in the design review account
One entry: Beef (average), 1 kg, 27 kg CO2e, 2 Oct 2026 13:11.

## Environment notes (Xcode 27)
- Xcode 27 has no standalone Simulator.app (replaced by DeviceHub); Expo CLI 54 fails with "Can't determine id of Simulator app". Workaround: xcodebuild + simctl install + manual Metro.
- Xcode 27 rejects pods with deployment target below 15.0. Local fix added to `ios/Podfile` post_install (ios/ is gitignored, so it is lost on prebuild).
