---
phase: 6
slug: design-elevation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo@54 (existing) |
| **Config file** | jest.config.js |
| **Quick run command** | `npx jest --testPathPattern="__tests__/06" --passWithNoTests` |
| **Full suite command** | `npx jest --passWithNoTests` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="__tests__/06" --passWithNoTests`
- **After every plan wave:** Run `npx jest --passWithNoTests`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DSGN-01,02 | unit | `npx jest --testPathPattern="theme"` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | DSGN-08,09 | unit | `npx jest --passWithNoTests` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | DSGN-03,04 | unit | `npx jest --testPathPattern="calculator"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | DSGN-05,11 | unit | `npx jest --testPathPattern="useBaseline"` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | DSGN-06,10 | manual | visual check on device | N/A | ⬜ pending |
| 06-04-01 | 04 | 2 | DSGN-07,10 | manual | visual check on device | N/A | ⬜ pending |
| 06-05-01 | 05 | 2 | DSGN-09 | unit | `npx jest --passWithNoTests` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/06/theme.test.ts` — assert dark token values in lib/theme.ts (background, surface, primary, textPrimary)
- [ ] `__tests__/06/calculator.test.ts` — stubs for carbon calculator logic (calcFootprint, per-category functions)
- [ ] `__tests__/06/useBaseline.test.ts` — stub for useBaseline hook (baseline_kg save to profiles)

*Existing jest-expo infrastructure covers all test runner requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No flash of light theme on cold start | DSGN-02 | Requires physical device or simulator cold launch | Kill app, reopen, verify no white flash before dark UI renders |
| Full-bleed photo render on Home hero | DSGN-06 | Visual fidelity, notch handling | Open Home tab, verify photo fills screen edge-to-edge including under status bar |
| Animated counter increments on tap | DSGN-07 | Animation quality (60fps) | Go through calculator, tap each option, verify footer number animates smoothly |
| Klima-comparable visual quality | DSGN-10 | Subjective design quality | Compare Home screen side-by-side with Klima app screenshots |
| StatusBar icons legible | DSGN-08 | Device-specific rendering | Verify time/battery icons are white (not invisible) on dark backgrounds |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
