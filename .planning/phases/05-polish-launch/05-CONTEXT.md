# Phase 5: Polish & Launch - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning
**Source:** Auto mode (--auto flag — Claude selected recommended defaults)

<domain>
## Phase Boundary

App-store-ready build: 3-screen onboarding carousel, Expo push notifications (daily reminders + streak milestones), offline entry caching with sync-on-reconnect, cold start and navigation performance targets met, App Store and Play Store assets prepared, EAS Build configured for TestFlight/internal track submission.

</domain>

<decisions>
## Implementation Decisions

### Onboarding flow
- Onboarding shown on first launch only — persisted via `AsyncStorage` key `onboarding_complete` (checked in root layout before routing to auth)
- Entry point: new route group `app/(onboarding)/index.tsx` — shows before `(auth)` on first launch, never after `onboarding_complete` is set
- 3 screens delivered as a single paginated ScrollView (paging enabled) or FlatList with `pagingEnabled: true`
- Carousel animation: Reanimated 3 `useSharedValue` + `interpolate` on translateX and opacity — never RN Animated API
- Skip button: top-right text button visible on all 3 screens — sets `onboarding_complete` and navigates to auth
- Screen content:
  1. "Track your impact" — hero text + animated VProgressRing preview (frozen, decorative)
  2. "AI-powered insights" — hero text + VAiInsightCard mockup (static, decorative)
  3. "Challenge friends" — hero text + leaderboard row mockups + notification permission CTA
- Notification permission requested on Screen 3 via `expo-notifications` `requestPermissionsAsync()` — better conversion than cold-ask in settings; non-blocking (user can skip)
- "Get Started" CTA on Screen 3 navigates to auth (login/signup)

### Push notifications
- Package: `expo-notifications` (not yet installed — `npx expo install expo-notifications`)
- Daily reminder: local scheduled notification using `notification_preferences.reminder_time` from Supabase (DB table already has `daily_reminder_enabled` + `reminder_time` columns per Phase 1 schema)
- Notification scheduling happens in a `useNotifications` hook called from root layout after auth — reschedules on app foreground
- Streak milestone notifications (3-day, 7-day, 30-day): fired locally in `checkAndUnlockAchievements` (already called in `useCreateEntry`/`useUpdateEntry` onSuccess) — piggybacks on existing achievement detection
- Push token stored in `push_tokens` table (already in DB schema from Phase 1) for future server-side push support
- No server-side push in Phase 5 — all local notifications only (simpler, sufficient for v1)

### Offline entry caching
- Package: `@react-native-community/netinfo` for network state detection
- expo-sqlite already installed — use it to create a local `offline_queue` table for pending emission entries
- Queue structure: `id`, `payload` (JSON of emission entry), `created_at`, `synced_at`
- Sync trigger: `NetInfo.addEventListener` — on reconnect flush queue via `useCreateEntry` mutation, then invalidate React Query cache
- UX: small fixed banner at top of screen when offline — "You're offline — entries will sync when connected" — Forest Green background, white text, dismisses automatically when reconnected
- Offline banner component: new `VOfflineBanner` in `components/ui/` — mounts in root layout

### App Store & EAS Build
- EAS Build config: `eas.json` with `production` profile, `autoIncrement: true` for both iOS and Android
- iOS: screenshots at 6.7" (iPhone 16 Pro Max) and 6.1" (iPhone 15) — 5 screens minimum per App Store guidelines
- Android: phone screenshots (standard portrait) — 4 screens minimum
- Privacy policy: simple static HTML page — host via GitHub Pages at `vedantlakhani.github.io/veridian-privacy`
- App Store description: 170-char short description + full description emphasising carbon tracking + AI insights + social challenges
- `app.json` metadata: bundle ID `com.vedantlakhani.veridian`, version `1.0.0`, build number managed by EAS

### Performance targets
- Cold start <3s: SplashScreen already managed by root layout (hideSplashScreen after auth init) — ensure font loading via `expo-font` is parallel with auth init, not sequential
- Navigation transitions <100ms: use Reanimated 3 `withTiming(1, { duration: 80 })` for any custom screen transitions — default Expo Router stack transitions are hardware-accelerated and typically sufficient
- No additional perf work needed beyond ensuring no blocking synchronous operations on startup

### Claude's Discretion
- Exact offline banner animation (slide-down vs fade)
- EAS project ID setup (run `eas init` interactively or use existing)
- Screenshot content (can use simulator screenshots of current app)
- Exact `eas.json` distribution channel naming

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project constraints
- `.planning/PROJECT.md` — Animation rule (Reanimated 3 only), no custom UI libraries, tech stack
- `.planning/REQUIREMENTS.md` — PLSH-01 through PLSH-08 acceptance criteria

### Existing patterns to replicate
- `app/_layout.tsx` — Root layout with SplashScreen, QueryClientProvider, auth guard routing — onboarding check goes here
- `stores/authStore.ts` — Auth session pattern; onboarding hook should mirror structure
- `components/ui/index.ts` — Barrel export to update when adding VOfflineBanner
- `hooks/useEmissionEntries.ts` — `checkAndUnlockAchievements` called in onSuccess — streak notification piggybacks here
- `supabase/migrations/` — `notification_preferences` and `push_tokens` tables already created in Phase 1

### DB schema (already exists)
- `.planning/STATE.md` — `notification_preferences` has `daily_reminder_enabled` (bool) + `reminder_time` (TIME) + `streak_notifications` (bool); `push_tokens` has `token`, `platform`, `user_id`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VCard`, `VButton`, `VInput`: use for onboarding screen cards and CTAs
- `VProgressRing`: decorative preview on onboarding Screen 1 (frozen/static)
- `VAiInsightCard`: decorative preview on onboarding Screen 2 (static mock data)
- `VSkeleton`: not needed for onboarding (static content)
- `expo-splash-screen`: already integrated in `app/_layout.tsx` — `preventAutoHideAsync` + `hideAsync` pattern established
- `expo-sqlite`: already installed (`expo-sqlite: ~16.0.10`) — use for offline queue
- `AsyncStorage`: available via `@react-native-async-storage/async-storage` (check if installed) or expo-secure-store

### Established Patterns
- Reanimated 3 `useSharedValue` + `withTiming` + `interpolate` for animations (VProgressRing, VBottomSheet, AchievementToast all use this pattern)
- React Query `useMutation` with `onSuccess` callback for side effects
- Zustand store for cross-component state (authStore, emissionStore pattern)
- `(auth)` route group with `Stack.Protected` guard in root layout — add `(onboarding)` group with same pattern

### Integration Points
- `app/_layout.tsx`: add onboarding completion check + `useNotifications` hook mount
- `hooks/useEmissionEntries.ts`: streak notification fires from existing `checkAndUnlockAchievements` call
- New: `app/(onboarding)/index.tsx` — full 3-screen paginated carousel
- New: `hooks/useNotifications.ts` — scheduling + token registration
- New: `hooks/useOfflineQueue.ts` — sqlite queue + NetInfo sync
- New: `components/ui/VOfflineBanner.tsx` — network status banner

</code_context>

<specifics>
## Specific Ideas

- Onboarding carousel uses decorative (non-interactive) versions of existing components to preview the app — gives users a real feel for the UI before signing up
- Notification permission requested on onboarding Screen 3 — contextually motivated after showing the challenge/streak features
- Offline queue uses expo-sqlite (already installed) rather than AsyncStorage — better for structured data with multiple pending entries
- EAS `autoIncrement: true` keeps build numbers managed automatically — no manual version bumping needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-polish-launch*
*Context gathered: 2026-03-22 via --auto mode*
