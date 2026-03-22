---
phase: 5
slug: polish-launch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo (jest 29.x) |
| **Config file** | `jest.config.js` (exists from Phase 1) |
| **Quick run command** | `npx jest --testPathPattern="onboarding\|notification\|offline\|queue" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="onboarding\|notification\|offline\|queue" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | PLSH-01 | unit | `npx jest --testPathPattern="onboarding" --no-coverage` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | PLSH-01 | manual | See Manual-Only | — | ⬜ pending |
| 05-02-01 | 02 | 1 | PLSH-02,03 | unit | `npx jest --testPathPattern="notification" --no-coverage` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | PLSH-02,03 | manual | See Manual-Only | — | ⬜ pending |
| 05-03-01 | 03 | 2 | PLSH-08 | unit | `npx jest --testPathPattern="offline\|queue" --no-coverage` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | PLSH-04,05 | manual | See Manual-Only | — | ⬜ pending |
| 05-04-01 | 04 | 2 | PLSH-06,07 | automated | `npx tsc --noEmit 2>&1 | grep -c "error"` | — | ⬜ pending |
| 05-05-01 | 05 | 2 | PLSH-04,05 | automated | `npx tsc --noEmit --no-coverage` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/hooks/useOnboarding.test.ts` — stubs for PLSH-01 (completion flag read/write, routing logic)
- [ ] `__tests__/hooks/useNotifications.test.ts` — stubs for PLSH-02, PLSH-03 (schedule daily reminder, streak notification trigger)
- [ ] `__tests__/hooks/useOfflineQueue.test.ts` — stubs for PLSH-08 (enqueue entry, flush on reconnect, sync count)

*Existing infrastructure (jest-expo, jest.config.js, jest.setup.js) covers all phase requirements — no new framework installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Onboarding carousel animation renders correctly | PLSH-01 | Requires visual inspection on device | Run app fresh install (clear AsyncStorage), verify 3-screen swipe with Reanimated animations |
| Onboarding shows only on first launch | PLSH-01 | Requires AsyncStorage state reset | Complete onboarding, force-close, reopen — verify onboarding does NOT show again |
| Daily reminder notification fires at scheduled time | PLSH-02 | Requires real device + time wait | Set reminder to 1 minute from now, background app, verify notification arrives |
| Streak notification fires at 3-day milestone | PLSH-03 | Requires real device + streak data | Manually set streak to 2 days in DB, log entry, verify "3-day streak" notification |
| Offline entry queues and syncs on reconnect | PLSH-08 | Requires airplane mode toggle | Enable airplane mode, log entry, verify offline banner + queue; disable airplane mode, verify sync |
| Cold start <3s on mid-range device | PLSH-04 | Requires device profiling | Profile with Xcode Instruments / Android Profiler on iPhone 12 equivalent |
| Navigation transitions <100ms | PLSH-05 | Requires device frame timing | Navigate between tabs 10x, verify no visible lag |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
