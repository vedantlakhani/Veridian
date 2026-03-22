---
phase: 4
slug: social-challenges
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo (jest 29.x) |
| **Config file** | `jest.config.js` (exists from Phase 1) |
| **Quick run command** | `npx jest --testPathPattern="social\|challenge\|achievement\|profile\|leaderboard" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="social\|challenge\|achievement\|profile\|leaderboard" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SOCL-01 | unit | `npx jest useProfile --no-coverage` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | SOCL-01 | unit | `npx jest useProfile --no-coverage` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | SOCL-01 | manual | See Manual-Only | — | ⬜ pending |
| 04-02-01 | 02 | 1 | SOCL-02 | unit | `npx jest useChallenges --no-coverage` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | SOCL-03 | unit | `npx jest useChallenges --no-coverage` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 1 | SOCL-02 | manual | See Manual-Only | — | ⬜ pending |
| 04-03-01 | 03 | 2 | SOCL-04 | unit | `npx jest useLeaderboard --no-coverage` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | SOCL-04 | unit | `npx jest useChallengeRealtime --no-coverage` | ❌ W0 | ⬜ pending |
| 04-03-03 | 03 | 2 | SOCL-06 | manual | See Manual-Only | — | ⬜ pending |
| 04-04-01 | 04 | 2 | SOCL-05 | unit | `npx jest useAchievements --no-coverage` | ❌ W0 | ⬜ pending |
| 04-04-02 | 04 | 2 | SOCL-05 | unit | `npx jest useAchievements --no-coverage` | ❌ W0 | ⬜ pending |
| 04-04-03 | 04 | 2 | SOCL-05 | manual | See Manual-Only | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/hooks/useProfile.test.ts` — stubs for SOCL-01 (profile fetch, update display name, update avatar URL)
- [ ] `__tests__/hooks/useChallenges.test.ts` — stubs for SOCL-02, SOCL-03 (create challenge, join by invite code, list my challenges)
- [ ] `__tests__/hooks/useLeaderboard.test.ts` — stubs for SOCL-04 (leaderboard query, sorting by reduction_pct)
- [ ] `__tests__/hooks/useChallengeRealtime.test.ts` — stubs for SOCL-04 (Realtime subscription setup/teardown)
- [ ] `__tests__/hooks/useAchievements.test.ts` — stubs for SOCL-05 (fetch achievements, unlock mutation, criteria check)

*Existing infrastructure (jest-expo, jest.config.js, jest.setup.js) covers all phase requirements — no new framework installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Avatar image picker opens and uploads | SOCL-01 | Requires native camera roll access | Open Profile, tap edit, tap avatar circle, select image, save — verify avatar appears |
| Invite code copy to clipboard works | SOCL-02 | Requires native clipboard access | Create challenge, tap Copy — paste elsewhere and verify 8-char code |
| iOS/Android share sheet opens with invite text | SOCL-02 | Native share sheet untestable in Jest | Create challenge, tap Share — verify native sheet opens with join message |
| Leaderboard updates live when entry logged | SOCL-04 | Requires two concurrent sessions | Log entry as user A, verify leaderboard updates for user B on same challenge in <2s |
| Achievement toast appears after first log | SOCL-05 | Requires full app integration | Log first emission entry — verify '🏆 Badge unlocked: First Log' toast slides in and dismisses |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
