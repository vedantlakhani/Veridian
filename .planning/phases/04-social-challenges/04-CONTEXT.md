# Phase 4: Social & Challenges - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

User profiles with lifetime carbon stats, challenge create/join flows with invite codes, challenge leaderboard with Supabase Realtime updates, and achievement badges. All delivered within the existing tab navigator — Profile tab is the hub. No individual emission data exposed to other users.

</domain>

<decisions>
## Implementation Decisions

### Profile screen layout
- Stats-first layout: lifetime carbon stats lead the screen, challenges and achievements are secondary sections below
- Top stats: 3 VMetricCards — total kg CO₂e logged (all-time), best week kg, current streak days. JetBrains Mono for all numbers.
- Edit profile via VBottomSheet — tap edit icon → sheet slides up with display name field and avatar picker. Consistent with Log tab sheet pattern.
- Below stats: 'My Challenges' section card with active challenges list and '+' button
- Below challenges: 'Achievements' section card with horizontal scroll row of badge circles

### Challenge navigation
- Challenge list lives in 'My Challenges' section on Profile tab — no new tab added to nav bar
- Tapping a challenge navigates to `app/challenge/[id].tsx` via Expo Router push — full-screen leaderboard with back button, deep-linkable
- '+' button on 'My Challenges' section opens VBottomSheet with two options: 'Create challenge' and 'Join with code' — two separate forms within the same sheet
- After creating: show the 8-char invite code large and readable, with a 'Copy' button (clipboard) and 'Share' button (iOS share sheet / Android share intent)

### Achievement badge style
- Horizontal scroll row of badge circles — earned = full color with custom SVG icon, locked = grayscale with lock overlay
- Custom SVG icons for each badge type (not emoji, not SF Symbols)
- When a badge is earned for the first time: toast notification slides in ('🏆 Badge unlocked: [Name]'), dismisses after 3s, non-blocking
- Achievement detection runs after each emission entry is created/updated

### Leaderboard data & privacy
- Per participant shows: rank number, avatar, display name, reduction % from baseline only — no raw kg numbers visible to others (respects SOCL-06 privacy requirement)
- New participants without any entries during challenge period show at the bottom with '--' reduction % (not hidden, not 0%)
- Leaderboard uses Supabase Realtime subscription on `challenge_participants` table — updates in <2s as required by ROADMAP success criteria. Same pattern as `useEmissionRealtime`.

### Claude's Discretion
- Exact avatar upload implementation (Supabase Storage bucket configuration, image picker library)
- Loading skeleton design for leaderboard rows
- Challenge form validation error styling
- Exact VBottomSheet snap points for create/join forms

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project constraints
- `.planning/PROJECT.md` — Design identity (calm/premium/data-forward), animation rule (Reanimated 3 only), no custom UI libraries, tech stack constraints
- `.planning/REQUIREMENTS.md` — SOCL-01 through SOCL-06 acceptance criteria

### Existing patterns to replicate
- `hooks/useEmissionRealtime.ts` — Supabase Realtime subscription pattern (replicate for leaderboard)
- `app/(tabs)/index.tsx` — Screen layout pattern: VCard sections, VSkeleton loading, VEmptyState
- `stores/authStore.ts` — Auth session access pattern for user ID
- `components/ui/VBottomSheet.tsx` — Sheet pattern used in Log tab for forms
- `types/challenge.ts` — Challenge, ChallengeParticipant, ChallengeParticipantWithProfile, LeaderboardEntry types
- `types/achievement.ts` — Achievement, UserAchievement, UserAchievementWithDetails types
- `types/user.ts` — UserProfile type

### DB schema decisions
- `.planning/STATE.md` — `challenges.invite_code` uses `upper(substr(md5(random()::text), 1, 8))` (8-char uppercase), RLS patterns, `(select auth.uid())` for per-statement UID caching

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VCard`: surface container for all section cards (My Challenges, Achievements sections)
- `VMetricCard`: JetBrains Mono number display — use for lifetime stats row
- `VButton`: primary/secondary/ghost/destructive — use for create/join/copy/share actions
- `VInput`: text input with label and error — use for display name edit and join code input
- `VBottomSheet`: gesture-driven sheet — use for edit profile, create challenge, join challenge flows
- `VEmptyState`: illustration + CTA — use for empty challenge list state
- `VSkeleton`: shimmer placeholder — use for leaderboard loading state
- `VProgressBar`: animated horizontal progress — could show challenge progress toward target reduction %
- `useEmissionRealtime`: Supabase Realtime pattern to replicate for leaderboard subscriptions

### Established Patterns
- React Query for all data fetching (TanStack v5, `useQuery`/`useMutation`)
- Zustand store for cross-component state (see `authStore`, `emissionStore`)
- `getLocalDateString()` in `lib/emissions.ts` for timezone-safe date handling
- All screens use `colors`, `spacing`, `typography` from `lib/theme.ts`
- JetBrains Mono (`fontFamily: 'JetBrainsMono'`) for all numeric data

### Integration Points
- `app/(tabs)/profile.tsx` — stub to be replaced with full Profile screen
- `app/(tabs)/_layout.tsx` — tab navigator (no new tabs added, Profile tab stays)
- New route: `app/challenge/[id].tsx` for leaderboard/detail screen
- Achievement detection hooks into emission entry create/update mutations (Phase 2 hooks in `hooks/useEmissionEntries.ts`)

</code_context>

<specifics>
## Specific Ideas

- Custom SVG badge icons for each achievement type — should feel premium, not emoji-casual
- Invite code displayed large and readable after challenge creation (8 uppercase chars)
- Leaderboard rows: rank # | avatar circle | display name | reduction % — clean, scannable

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-social-challenges*
*Context gathered: 2026-03-22*
