---
phase: 06-design-elevation
plan: 03
subsystem: home-screen
tags: [hero, imagebackground, linear-gradient, typography, dark-theme]
dependency_graph:
  requires: [06-01, 06-02]
  provides: [home-hero-layout]
  affects: [app/(tabs)/index.tsx]
tech_stack:
  added: [expo-linear-gradient@~13.0.2]
  patterns: [full-bleed-hero, absoluteFillObject-layering, gradient-overlay]
key_files:
  created:
    - assets/images/hero-forest.jpg
    - assets/images/hero-ocean.jpg
    - assets/images/hero-mountain.jpg
    - assets/images/hero-field.jpg
    - assets/images/hero-sky.jpg
    - assets/images/PHOTO_CREDITS.md
  modified:
    - app/(tabs)/index.tsx
    - package.json
decisions:
  - "LinearGradient top set to '35%' as unknown as number — RN StyleSheet top accepts string percentages at runtime but TS type expects number; cast avoids ts error without breaking layout"
  - "HERO_IMAGES array defined at module level (not inside component) — avoids new require() calls on every render"
  - "VMetricCard removed from layout — hero section replaces its function with larger 80sp display at top"
  - "SafeAreaView has no backgroundColor — required for full-bleed photo to show under status bar"
metrics:
  duration: ~3min
  completed: "2026-03-29"
  tasks_completed: 2
  files_modified: 8
requirements_satisfied: [DSGN-06, DSGN-10]
---

# Phase 6 Plan 3: Home Hero Redesign Summary

Home screen elevated from standard card layout to immersive Klima-style full-bleed nature photography hero with 80sp JetBrains Mono metric centered over a dark gradient overlay.

## What Was Built

- **5 hero placeholder photos** downloaded from Unsplash and stored in `assets/images/` (forest, ocean, mountain, field, sky)
- **expo-linear-gradient@~13.0.2** installed (SDK 54 compatible)
- **Photo credits** documented in `assets/images/PHOTO_CREDITS.md`
- **Home screen completely redesigned** with 3-layer View stack:
  1. `ImageBackground` with `absoluteFillObject` fills full screen edge-to-edge
  2. `LinearGradient` overlay fades transparent → dark starting at 35% from top
  3. `SafeAreaView` (no `backgroundColor`) hosts scrollable content on top

## Layout Architecture

```
<View flex:1 backgroundColor:#191C1C>          ← base container
  <ImageBackground absoluteFillObject cover>   ← Layer 1: full-bleed photo
  <LinearGradient absoluteFillObject top:35%>  ← Layer 2: dark gradient fade
  <SafeAreaView flex:1>                         ← Layer 3: content (no bg)
    <ScrollView>
      heroSection (80sp metric, "Today" label, unit, budget %)
      ringCard (VProgressRing + weekly category breakdown side-by-side)
      VAiInsightCard
      "Recent Entries" + entry VCards
```

## Decisions Made

- `LinearGradient top: '35%' as unknown as number` — TypeScript StyleSheet types expect number but RN accepts percentage strings at runtime; cast avoids error without breaking layout behavior
- `HERO_IMAGES` array defined at module scope — prevents new require() allocations on re-renders
- `VMetricCard` removed — 80sp hero metric replaces its function entirely; import removed
- `SafeAreaView` has `style={{ flex: 1 }}` with no `backgroundColor` — critical for photo to bleed under status bar on iOS

## Deviations from Plan

None - plan executed exactly as written.

## Checkpoint (Auto-approved)

Task 3 was `checkpoint:human-verify`. Auto-advanced per `workflow.auto_advance: true` in config.json.

## Self-Check: PASSED

- app/(tabs)/index.tsx: FOUND
- assets/images/hero-forest.jpg: FOUND
- assets/images/hero-ocean.jpg: FOUND
- .planning/phases/06-design-elevation/06-03-SUMMARY.md: FOUND
- commit 5ef3c09 (Task 1): FOUND
- commit 89abc8b (Task 2): FOUND
