---
phase: 2
slug: core-tracking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo 54.0.17 (pinned to Expo 54) |
| **Config file** | jest.config.js (root) |
| **Quick run command** | `npx jest --testPathPattern="lib/emissions" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="lib/emissions" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | TRACK-01,02,03 | manual | n/a (UI) | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | TRACK-04 | unit | `npx jest __tests__/lib/emissions.test.ts -t "calcEmission" --no-coverage` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | TRACK-01,02,03 | unit | `npx jest __tests__/lib/emissions.test.ts --no-coverage` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | TRACK-05,06 | unit | `npx jest __tests__/lib/emissions.test.ts -t "daily summary" --no-coverage` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 2 | TRACK-07,08,09 | unit | `npx jest __tests__/components/EmissionBarChart.test.tsx --no-coverage` | ❌ W0 | ⬜ pending |
| 2-04-02 | 04 | 2 | TRACK-08 | unit | `npx jest __tests__/hooks/useEmissionEntries.test.ts --no-coverage` | ❌ W0 | ⬜ pending |
| 2-05-01 | 05 | 3 | TRACK-10,11 | unit | `npx jest __tests__/lib/emissions.test.ts -t "update\|delete" --no-coverage` | ❌ W0 | ⬜ pending |
| 2-05-02 | 05 | 3 | TRACK-12 | manual | Manual: two devices, log entry, observe sync | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/lib/emissions.test.ts` — stubs for TRACK-01 through TRACK-07, TRACK-10, TRACK-11 (calcEmission, daily/weekly summary upsert logic)
- [ ] `__tests__/components/EmissionBarChart.test.tsx` — covers TRACK-09 (bar chart renders correct number of bars)
- [ ] `__tests__/hooks/useEmissionEntries.test.ts` — covers TRACK-08 (history query with date filter)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Realtime sync across devices | TRACK-12 | Requires two live devices/simulators with Supabase subscription | Log an entry on Device A; verify entry appears on Device B within 2 seconds without reload |
| Log screen category selector UI | TRACK-01,02,03 | Category chip selection and form rendering is visual | Open Log tab; tap Food/Transport/Energy chips; verify correct sub-form appears with appropriate fields |
| Dashboard today total display | TRACK-05 | Requires live Supabase query and display rendering | Log a food entry; return to Home; verify today's total updates immediately |
| Chart renders at 60fps | TRACK-09 | Frame rate only verifiable on device | Scroll through history/chart view on physical device; verify no jank via Flipper or visual inspection |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
