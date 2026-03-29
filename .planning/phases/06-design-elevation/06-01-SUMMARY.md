---
phase: 06-design-elevation
plan: "01"
subsystem: design-system
tags: [dark-theme, tokens, color, status-bar, splash, hex-sweep]
dependency_graph:
  requires: []
  provides: [dark-token-set, wave-0-stubs-06]
  affects: [all-screens, auth-screens, tab-navigator, ui-components]
tech_stack:
  added: []
  patterns: [color-token-pattern, dark-theme-tokens]
key_files:
  created:
    - __tests__/06/theme.test.ts
    - __tests__/06/calculator.test.ts
    - __tests__/06/useBaseline.test.ts
  modified:
    - lib/theme.ts
    - __tests__/lib/theme.test.ts
    - __tests__/navigation/tabs.test.ts
    - app/_layout.tsx
    - app.json
    - app/(auth)/login.tsx
    - app/(auth)/signup.tsx
    - app/(auth)/forgot-password.tsx
    - app/(tabs)/_layout.tsx
    - app/+not-found.tsx
    - components/ui/VButton.tsx
    - components/ui/VBadge.tsx
    - components/ui/VInput.tsx
    - components/ui/VOfflineBanner.tsx
    - components/themed-text.tsx
    - components/social/AchievementBadge.tsx
decisions:
  - "Replaced '#FFFBEB' warning chip bg with colors.energyBg (#1F1A00) — no dedicated warningBg token; energyBg is visually appropriate dark amber context"
  - "AchievementBadge earned circle changed to colors.primaryContainer (#1B7A4A) — provides better contrast vs new colors.primary (#006036) at small badge sizes"
  - "Removed unreachable '#9CA3AF' fallback in AchievementBadge — colors.textTertiary is always defined in theme const"
metrics:
  duration: "~15min"
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_modified: 16
---

# Phase 6 Plan 01: Dark Theme Foundation Summary

Dark token replacement across `lib/theme.ts` + global hex sweep across all auth/component files, with three Wave 0 test stubs and cold-start dark splash config.

## What Was Built

**Task 1 — Wave 0 stubs + dark token replacement**

Updated `lib/theme.ts` with the full Veridian dark token set: `background: '#191C1C'`, `surface: '#1E2120'`, `primary: '#006036'`, `textPrimary: '#FFFFFF'`, `border: 'transparent'`. Added 8 new tokens: `primaryContainer`, `secondary`, `surfaceElevated`, `foodBg`, `transportBg`, `energyBg`, `successBg`. Updated existing `__tests__/lib/theme.test.ts` assertions from light to dark values.

Created three `__tests__/06/` Wave 0 stub files using the established beforeAll async-import + `if (!fn) return` guard pattern so they pass immediately before their source modules exist.

**Task 2 — StatusBar + app.json + hardcoded hex sweep**

- `app/_layout.tsx`: `<StatusBar style="dark" />` → `<StatusBar style="light" />` (white icons on dark bg)
- `app.json`: `userInterfaceStyle: "light"` → `"dark"`, splash `backgroundColor: "#191C1C"` (no white flash on cold start)
- **Auth screens** (login, signup, forgot-password): replaced all 50+ hardcoded hex values with `colors.*` tokens
- **Tab navigator** `_layout.tsx`: `tabBarActiveTintColor`, `tabBarStyle` → `colors.primary`, `colors.surface`, `colors.divider`
- `app/+not-found.tsx`: background, text, link → tokens
- **UI components**: VButton `'#FFFFFF'` → `colors.textPrimary`; VBadge light pastel chip bgs → `colors.foodBg/transportBg/energyBg/successBg`; VInput label `'#374151'` → `colors.textPrimary`; VOfflineBanner banner/text → `colors.primary/textPrimary`
- `components/themed-text.tsx`: link color `'#0a7ea4'` → `colors.primary`
- `components/social/AchievementBadge.tsx`: removed `'#9CA3AF'` fallback, earned circle → `colors.primaryContainer`

## Verification Results

- `npx tsc --noEmit`: exits 0
- `npx jest --passWithNoTests`: 95 passed, 18 todo, 0 failed (30 suites)
- All `__tests__/06/` stubs pass immediately with guards

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale navigation test assertion**
- **Found during:** Task 2 verification (jest run after sweep)
- **Issue:** `__tests__/navigation/tabs.test.ts` line 32 asserted `content.toContain('#1B7A4A')` in `_layout.tsx` — the old hardcoded primary color that the plan explicitly required us to sweep
- **Fix:** Updated assertion to `content.toContain('colors.primary')` — preserves intent (verify primary color is applied to tabs) with token-based reference
- **Files modified:** `__tests__/navigation/tabs.test.ts`
- **Commit:** 6b2ddb7

## Self-Check: PASSED
