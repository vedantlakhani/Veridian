---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x + @testing-library/react-native |
| **Config file** | `jest.config.js` — Wave 0 installs |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx jest --passWithNoTests && npx tsc --noEmit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx jest --passWithNoTests && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite green + `npx expo export --platform all` (no bundle errors)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FOUND-01 | type-check | `npx tsc --noEmit` | Wave 0 | ⬜ pending |
| 1-01-02 | 01 | 1 | FOUND-01 | smoke | `npx expo export --platform all` | Wave 0 | ⬜ pending |
| 1-02-01 | 02 | 1 | FOUND-02 | smoke | `npx supabase db reset` | Wave 0 | ⬜ pending |
| 1-02-02 | 02 | 1 | FOUND-03 | smoke | `npx supabase db reset` + policy check | Wave 0 | ⬜ pending |
| 1-02-03 | 02 | 1 | FOUND-22 | smoke | `npx supabase db reset` + count query | Wave 0 | ⬜ pending |
| 1-03-01 | 03 | 2 | FOUND-04 | integration | `npx jest __tests__/auth/email.test.ts` | Wave 0 | ⬜ pending |
| 1-03-02 | 03 | 2 | FOUND-07 | smoke | `npx jest __tests__/auth/session.test.ts` | Wave 0 | ⬜ pending |
| 1-03-03 | 03 | 2 | FOUND-05 | manual | N/A — native module (EAS Build required) | Manual | ⬜ pending |
| 1-03-04 | 03 | 2 | FOUND-06 | manual | N/A — iOS device only | Manual | ⬜ pending |
| 1-04-01 | 04 | 2 | FOUND-08 | unit | `npx jest __tests__/lib/theme.test.ts` | Wave 0 | ⬜ pending |
| 1-04-02 | 04 | 2 | FOUND-09 | snapshot | `npx jest __tests__/components/VCard.test.tsx` | Wave 0 | ⬜ pending |
| 1-04-03 | 04 | 2 | FOUND-10 | snapshot | `npx jest __tests__/components/VButton.test.tsx` | Wave 0 | ⬜ pending |
| 1-04-04 | 04 | 2 | FOUND-11 | snapshot | `npx jest __tests__/components/VBadge.test.tsx` | Wave 0 | ⬜ pending |
| 1-04-05 | 04 | 2 | FOUND-12 | snapshot | `npx jest __tests__/components/VInput.test.tsx` | Wave 0 | ⬜ pending |
| 1-04-06 | 04 | 2 | FOUND-13 | snapshot | `npx jest __tests__/components/VProgressBar.test.tsx` | Wave 0 | ⬜ pending |
| 1-04-07 | 04 | 2 | FOUND-14 | snapshot | `npx jest __tests__/components/VProgressRing.test.tsx` | Wave 0 | ⬜ pending |
| 1-04-08 | 04 | 2 | FOUND-15 | snapshot | `npx jest __tests__/components/VMetricCard.test.tsx` | Wave 0 | ⬜ pending |
| 1-04-09 | 04 | 2 | FOUND-16 | snapshot | `npx jest __tests__/components/VChip.test.tsx` | Wave 0 | ⬜ pending |
| 1-04-10 | 04 | 2 | FOUND-17 | snapshot | `npx jest __tests__/components/VBottomSheet.test.tsx` | Wave 0 | ⬜ pending |
| 1-04-11 | 04 | 2 | FOUND-18 | snapshot | `npx jest __tests__/components/VEmptyState.test.tsx` | Wave 0 | ⬜ pending |
| 1-04-12 | 04 | 2 | FOUND-19 | snapshot | `npx jest __tests__/components/VSkeleton.test.tsx` | Wave 0 | ⬜ pending |
| 1-05-01 | 05 | 2 | FOUND-21 | snapshot | `npx jest __tests__/navigation/tabs.test.ts` | Wave 0 | ⬜ pending |
| 1-05-02 | 05 | 2 | FOUND-20 | type-check | `npx tsc --noEmit` | Wave 0 (same) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `jest.config.js` — jest with `@testing-library/react-native` preset
- [ ] `jest.setup.js` — mock `react-native-reanimated`, `react-native-gesture-handler`, `react-native-svg`
- [ ] `__tests__/lib/theme.test.ts` — stub covering FOUND-08
- [ ] `__tests__/auth/email.test.ts` — stub covering FOUND-04 (mock supabase client)
- [ ] `__tests__/auth/session.test.ts` — stub covering FOUND-07 (mock localStorage polyfill)
- [ ] `__tests__/components/VCard.test.tsx` — stub covering FOUND-09
- [ ] `__tests__/components/VButton.test.tsx` — stub covering FOUND-10
- [ ] `__tests__/components/VBadge.test.tsx` — stub covering FOUND-11
- [ ] `__tests__/components/VInput.test.tsx` — stub covering FOUND-12
- [ ] `__tests__/components/VProgressBar.test.tsx` — stub covering FOUND-13
- [ ] `__tests__/components/VProgressRing.test.tsx` — stub covering FOUND-14
- [ ] `__tests__/components/VMetricCard.test.tsx` — stub covering FOUND-15
- [ ] `__tests__/components/VChip.test.tsx` — stub covering FOUND-16
- [ ] `__tests__/components/VBottomSheet.test.tsx` — stub covering FOUND-17
- [ ] `__tests__/components/VEmptyState.test.tsx` — stub covering FOUND-18
- [ ] `__tests__/components/VSkeleton.test.tsx` — stub covering FOUND-19
- [ ] `__tests__/navigation/tabs.test.ts` — stub covering FOUND-21

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google Sign-In flow completes | FOUND-05 | Native module, requires EAS Build or `npx expo run:ios` | Build with `npx expo run:ios`, tap Google sign-in, confirm Supabase session created |
| Apple Sign-In flow completes | FOUND-06 | iOS device + developer account required | Run on physical iPhone, tap Apple sign-in, confirm email/name stored in profiles table |
| Auth session survives app restart | FOUND-07 (supplemental) | Simulator kill/relaunch needed | Kill app in simulator, relaunch, confirm still logged in without login screen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
