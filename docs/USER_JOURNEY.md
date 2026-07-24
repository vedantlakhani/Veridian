# Veridian Branching User Journey Map

Maps every screen in `app/` to where a user actually arrives from and where they can go — the basis for the Understory rollout order in `docs/DESIGN_DIRECTION.md` and for the test plan each sub-agent must run after touching a screen.

## Trunk: first run

```
(onboarding)/index.tsx  →  (onboarding)/calculator.tsx  →  (auth)/signup.tsx
                                                              │
                                          (auth)/login.tsx ───┤
                                          (auth)/forgot-password.tsx
                                          (auth)/reset-password.tsx
                                                              ▼
                                                        (tabs) — home
```
- Branch: existing user → `(auth)/login.tsx` directly, skips onboarding/calculator (guarded by `onboardingComplete` in `app/_layout.tsx`).
- Branch: forgotten password → `forgot-password.tsx` → email → `reset-password.tsx` (deep link) → back to `login.tsx`.

## Trunk: daily loop (the screens that matter most — Understory priority #2–4)

```
(tabs)/index.tsx  (Home / autopilot status)
   ├─→ entry/[id].tsx          (tap any logged entry — edit/inspect)
   ├─→ recap.tsx                (modal — Weekly Recap, first-period vs delta framing)
   ├─→ passport.tsx             (modal — Carbon Passport, Month/Year toggle, paged story)
   ├─→ carbon-calculator.tsx    (manual entry fallback when autopilot has no data yet)
   └─→ (tabs)/insights.tsx  ──┬─→ entry/[id].tsx
                              └─→ challenge/[id].tsx   (active challenge detail)
(tabs)/log.tsx      (manual/quick-log entry point)
(tabs)/profile.tsx  ──┬─→ link-bank.tsx   (modal — Plaid Link flow)
                       └─→ import.tsx     (modal — CSV receipt/order backfill)
```

- **Home is the hub.** Every other daily screen is one tap away, and it's where the "autopilot" promise either lands or doesn't — this is why it's Understory priority #2 (right after the token layer itself).
- **Passport and Recap are the two "story" screens** — paged, narrative, meant to be screenshotted/shared. They should carry the boldest expression of Understory (grain texture, Fraunces at largest size, the hero count-up motion) since they're the closest thing Veridian has to Gentler Streak's shareable recap cards.
- **Profile → Link-bank / Import are setup branches**, visited rarely after initial setup — lower rollout priority, but must not look visually orphaned from the rest once the daily screens are redone (apply the same token layer even without bespoke motion work).

## Edge/recovery branches
- Offline: `VOfflineBanner` can appear over any screen in the protected stack (`app/_layout.tsx`) — must be re-skinned in the token pass since it's currently styled against light-mode colors.
- `app/modal.tsx` and `app/+not-found.tsx` — rarely seen, but should not be skipped entirely (a broken-looking 404/modal fallback undercuts the "this is a crafted app" impression if a user ever hits it).
- Deep link re-entry (password reset, Plaid OAuth return) re-enters mid-stack rather than at the trunk — verify token/motion changes don't assume a fresh mount.

## Test plan per screen (what "done" means for a sub-agent's screen)
1. Visual: token values actually come from `lib/theme.ts` (no hardcoded hex left behind), matches Understory palette on a real dark background.
2. Motion: any existing Reanimated entrance/press animation still fires; hero metrics use the count-up-with-glow pattern where applicable.
3. Regression: `npx tsc --noEmit` and the relevant Jest suite stay green — no visual change should break existing logic tests.
4. On-device: at minimum a screenshot-level visual check in the Simulator/real device for the four priority screens (Home, Passport, Recap, Insights) before calling the pass done — per the standing rule that UI changes need real visual verification, not just type-checks.
