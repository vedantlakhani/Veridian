---
phase: 02-core-tracking
plan: "01"
subsystem: ui
tags: [zustand, react-query, react-native, emission-tracking, bottom-sheet, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: VBottomSheet, VChip, VButton, VInput, VSkeleton UI components, authStore Zustand pattern, types/emission.ts
provides:
  - Wave 0 test stubs for all Phase 2 test files (emissions, EmissionBarChart, useEmissionEntries)
  - emissionStore Zustand store with selectedCategory, selectedFactor, quantity ephemeral UI state
  - CategorySelector component rendering Food/Transport/Energy VChip row
  - useEmissionFactors hook with staleTime: Infinity for seed data
  - FoodForm, TransportForm, EnergyForm sub-forms inside VBottomSheet
  - Log tab screen orchestrating CategorySelector + conditional sub-form sheets
affects:
  - 02-02-PLAN.md (useCreateEntry mutation wires into handleSubmit placeholder in log.tsx)
  - 02-03-PLAN.md (history screen will read from emissionStore or TanStack Query)
  - 02-04-PLAN.md (EmissionBarChart component stub exists at __tests__/components/EmissionBarChart.test.tsx)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 test stubs: graceful try/catch async import so tests skip cleanly before source module exists"
    - "Zustand store for ephemeral UI state (not persisted) — setCategory clears downstream state (factor, quantity)"
    - "useEmissionFactors with staleTime: Infinity — emission_factors is seed data, never needs refetch"
    - "Sub-form pattern: FoodForm/TransportForm/EnergyForm are structurally identical, differ only in useEmissionFactors argument"

key-files:
  created:
    - __tests__/lib/emissions.test.ts
    - __tests__/components/EmissionBarChart.test.tsx
    - __tests__/hooks/useEmissionEntries.test.ts
    - __tests__/stores/emissionStore.test.ts
    - stores/emissionStore.ts
    - components/log/CategorySelector.tsx
    - components/log/FoodForm.tsx
    - components/log/TransportForm.tsx
    - components/log/EnergyForm.tsx
    - hooks/useEmissionFactors.ts
  modified:
    - app/(tabs)/log.tsx

key-decisions:
  - "emissionStore setCategory clears selectedFactor and quantity — prevents stale factor from previous category being submitted"
  - "quantity kept as string in store for TextInput binding — parsed to float only at submit time"
  - "staleTime: Infinity for emission_factors — DEFRA seed data is immutable; avoids redundant Supabase fetches on every sheet open"
  - "unit label in VInput derived from factor.unit — never hardcoded; handles all category units (kg, km, kWh, m3, litre, tonne)"
  - "handleSubmit in log.tsx is a no-op placeholder closing the sheet — useCreateEntry mutation wired in Plan 02"

patterns-established:
  - "Wave 0 test stub pattern: beforeAll async import with try/catch; individual tests guard with if (!fn) return — compile without source"
  - "Sub-form trio pattern: identical structure for food/transport/energy, only useEmissionFactors argument differs"

requirements-completed: [TRACK-01, TRACK-02, TRACK-03]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 2 Plan 01: Log Screen + Wave 0 Test Stubs Summary

**Zustand emissionStore for ephemeral log UI state, Wave 0 test stubs for all Phase 2 test files, and a complete Log tab with CategorySelector and three category sub-forms (Food/Transport/Energy) inside VBottomSheet using useEmissionFactors(staleTime: Infinity)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T15:48:20Z
- **Completed:** 2026-03-16T15:51:20Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Wave 0 test stubs created for all Phase 2 files — 10 todo stubs + 10 passing emissionStore tests, all 19 test suites pass
- emissionStore Zustand store exports selectedCategory, selectedFactor, quantity, setCategory, setFactor, setQuantity, reset
- Log tab screen: CategorySelector VChip row + VBottomSheet opening the correct sub-form per category
- useEmissionFactors hook with staleTime: Infinity caches seed data for 24h — no redundant Supabase fetches
- All unit labels dynamic from factor.unit — zero hardcoded strings

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 test stubs + emissionStore** - `038da46` (feat)
2. **Task 2: Log screen components** - `6a78a25` (feat)

## Files Created/Modified
- `__tests__/lib/emissions.test.ts` - Wave 0 stubs for calcEmission, getLocalDateString, getISOWeekStart, computeDailyCategoryTotals
- `__tests__/components/EmissionBarChart.test.tsx` - 3 todo stubs for Plan 04 chart component
- `__tests__/hooks/useEmissionEntries.test.ts` - 3 todo stubs for Plan 02 history hook
- `__tests__/stores/emissionStore.test.ts` - 2 passing tests for emissionStore
- `stores/emissionStore.ts` - Ephemeral UI state: selectedCategory, selectedFactor, quantity + actions
- `components/log/CategorySelector.tsx` - Food/Transport/Energy VChip row
- `hooks/useEmissionFactors.ts` - TanStack Query hook with staleTime: Infinity for seed data
- `components/log/FoodForm.tsx` - Factor picker, VSkeleton loading, VInput (unit from factor), VButton submit
- `components/log/TransportForm.tsx` - Same pattern with useEmissionFactors('transport')
- `components/log/EnergyForm.tsx` - Same pattern with useEmissionFactors('energy')
- `app/(tabs)/log.tsx` - Full Log screen replacing stub: CategorySelector + VBottomSheet with sub-forms

## Decisions Made
- `setCategory` clears `selectedFactor` and `quantity` to prevent stale cross-category state leaking into submit
- `quantity` stored as string in Zustand for direct TextInput binding; `parseFloat` on submit only
- `staleTime: Infinity` for emission_factors — DEFRA 2025 seed data is immutable, no revalidation needed
- Sub-form `handleSubmit` in log.tsx is a placeholder no-op closing the sheet — `useCreateEntry` wired in Plan 02

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- Jest CLI flag renamed: `--testPathPattern` deprecated, replaced by `--testPathPatterns` in jest@30. Updated test commands accordingly. No code changes required.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- emissionStore and Log screen ready for Plan 02 to wire in `useCreateEntry` mutation
- Wave 0 test stubs provide Nyquist coverage scaffolding for Plans 02-04
- `handleSubmit` in log.tsx accepts `(factor, quantity)` — Plan 02 replaces with `createEntry.mutate()`

---
*Phase: 02-core-tracking*
*Completed: 2026-03-16*

## Self-Check: PASSED

All 11 implementation files verified present on disk. Both task commits (038da46, 6a78a25) confirmed in git log. 19/19 test suites pass, 0 TypeScript errors.
