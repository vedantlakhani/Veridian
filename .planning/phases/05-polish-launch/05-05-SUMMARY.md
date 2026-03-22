---
phase: 05-polish-launch
plan: 05
subsystem: store-submission
tags: [eas, bundle-id, privacy-policy, store-metadata, green-gate]
dependency_graph:
  requires: [05-02, 05-03, 05-04]
  provides: [PLSH-06, PLSH-07]
  affects: [app.json, eas.json, docs/]
tech_stack:
  added: [eas-cli, GitHub Pages (docs/)]
  patterns: [EAS Build production profile, autoIncrement remote version source]
key_files:
  created:
    - eas.json
    - docs/privacy-policy.html
    - docs/store-metadata.md
  modified:
    - app.json
decisions:
  - "Bundle ID changed to com.vedantlakhani.veridian for both iOS and Android — com.veridian.app was placeholder"
  - "eas.json appVersionSource: remote required for autoIncrement to work correctly with EAS remote versioning"
  - "EAS submit section uses placeholder Apple credentials — developer fills in before running eas submit (EAS prompts interactively)"
  - "docs/privacy-policy.html uses -apple-system font stack for native feel on all platforms"
  - "Privacy policy covers Anthropic Claude API as third-party processor (server-side Edge Function only)"
metrics:
  duration: ~8min
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_changed: 4
requirements: [PLSH-06, PLSH-07]
---

# Phase 5 Plan 05: Store Assets + EAS Build + Final Green Gate Summary

**One-liner:** EAS Build production profile with autoIncrement, corrected bundle IDs to com.vedantlakhani.veridian, GitHub Pages privacy policy, App Store/Play Store copy-paste metadata, TypeScript + Jest green gate confirmed.

## What Was Built

### Task 1: app.json bundle ID fix + eas.json

**app.json changes:**
- `ios.bundleIdentifier`: `com.veridian.app` → `com.vedantlakhani.veridian`
- `android.package`: `com.veridian.app` → `com.vedantlakhani.veridian`
- `expo-notifications` plugin was already present from plan 05-03 — no change needed

**eas.json created** with three build profiles:
- `development`: developmentClient + internal distribution for local dev builds
- `preview`: internal distribution + iOS simulator support for team testing
- `production`: `autoIncrement: true`, iOS store distribution, Android AAB format, `appVersionSource: remote` at CLI level

Submit section includes placeholder Apple and Google credentials with correct structure for `eas submit`.

### Task 2: Privacy policy + store metadata + final green gate

**docs/privacy-policy.html:** Static HTML page styled with Forest Green (#1B7A4A) for GitHub Pages hosting at `vedantlakhani.github.io/veridian-privacy/`. Covers all App Store Review Guidelines requirements:
- Data collected (account, emission entries, usage, push tokens)
- How used (dashboard, AI insights via Anthropic Claude API server-side, social challenges, reminders)
- Data storage (Supabase PostgreSQL with RLS, EU-West)
- Third parties: Supabase, Anthropic, Expo/EAS — all with policy links
- Data retention and deletion rights
- User rights and contact (privacy@veridian.app)
- Children policy (13+)

**docs/store-metadata.md:** Copy-paste ready metadata for both stores:
- App Store: name "Veridian: Carbon Tracker", subtitle (30 chars), short description (exactly 170 chars), full description (~600 words covering all key features), keywords, privacy URL, support URL, category (Health & Fitness), age rating (4+)
- Play Store: name, short description (58 chars, under 80), full description reference, category, content rating, privacy URL
- Screenshot spec: iOS 6.7" (1290x2796, 5 min) + 6.1" (1179x2556, 5 min), Android portrait (1080x1920, 4 min)
- Screenshot order and captions for all 5 screens
- App icon spec (1024x1024 PNG, no alpha, no rounded corners)

**Final green gate:**
- `npx tsc --noEmit` → exit 0 (zero TypeScript errors project-wide)
- `npx jest --no-coverage` → exit 0 (all tests pass)

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 35f9a28 | feat(05-05): fix bundle IDs to com.vedantlakhani.veridian + create eas.json production profile |
| 2 | 57158d7 | feat(05-05): privacy policy HTML + App Store/Play Store metadata + final green gate |

## Deviations from Plan

None — plan executed exactly as written.

## Acceptance Criteria Verification

| Criterion | Result |
|-----------|--------|
| `grep "com.vedantlakhani.veridian" app.json` returns 2 matches | PASS (2) |
| `grep "com.veridian.app" app.json` returns empty | PASS (0) |
| `grep -c "autoIncrement" eas.json` returns 1 | PASS (1) |
| `grep "appVersionSource.*remote" eas.json` non-empty | PASS |
| `grep "expo-notifications" app.json` non-empty | PASS |
| `ls docs/privacy-policy.html` file exists | PASS |
| `grep "1B7A4A" docs/privacy-policy.html` non-empty | PASS |
| `grep "Anthropic" docs/privacy-policy.html` non-empty | PASS |
| `ls docs/store-metadata.md` file exists | PASS |
| `grep "vedantlakhani.github.io/veridian-privacy" docs/store-metadata.md` | PASS |
| `grep "170" docs/store-metadata.md` non-empty | PASS |
| `npx tsc --noEmit` exits 0 | PASS |
| `npx jest --no-coverage` exits 0 | PASS |

## Phase 5 Complete

All 5 plans of Phase 5 (Polish & Launch) are complete. The Veridian app is submission-ready:

- 05-01: Onboarding carousel + offline queue
- 05-02: Performance polish (memoization, lazy loading, skeleton states)
- 05-03: Push notifications (streak reminders, badge unlock)
- 05-04: App icon, adaptive icon, splash screen, accessibility audit
- 05-05: EAS Build config, bundle IDs, privacy policy, store metadata, green gate

## Self-Check: PASSED
