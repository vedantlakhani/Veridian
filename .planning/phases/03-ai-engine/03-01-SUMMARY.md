---
phase: 03-ai-engine
plan: 01
subsystem: api
tags: [supabase, edge-functions, deno, anthropic, claude, ai, cors]

# Dependency graph
requires:
  - phase: 02-core-tracking
    provides: ai_insights table (migration 20260315000009_create_ai_insights.sql), user JWT auth flow
provides:
  - supabase/functions/_shared/cors.ts — shared CORS headers for all Edge Functions
  - supabase/functions/analyze-emissions — Sonnet 4.5 deep-analysis endpoint writing to ai_insights
  - supabase/functions/generate-suggestions — Haiku 4.5 fast-suggestion endpoint writing to ai_insights
affects: [03-02-client-hook, 03-03-ui-card, home-screen ai card]

# Tech tracking
tech-stack:
  added: [npm:@anthropic-ai/sdk (Deno npm import), npm:@supabase/supabase-js@2 (Deno npm import), Supabase Edge Functions (Deno)]
  patterns:
    - OPTIONS preflight handled before auth logic in every Edge Function
    - JWT verified via user client (anon key), INSERT executed via admin client (service role key)
    - ANTHROPIC_API_KEY read from Deno.env — never in client bundle
    - Markdown fence stripping before JSON.parse to handle Claude formatting variance

key-files:
  created:
    - supabase/functions/_shared/cors.ts
    - supabase/functions/analyze-emissions/index.ts
    - supabase/functions/generate-suggestions/index.ts
  modified: []

key-decisions:
  - "OPTIONS preflight handled before auth — ensures CORS works even for unauthenticated pre-flight requests from browsers"
  - "user_id sourced from verified JWT (getUser), never from request body — prevents privilege escalation (Pitfall 6)"
  - "Admin client (service role) used only for INSERT to ai_insights — bypasses RLS safely server-side"
  - "Markdown fence regex (.replace(/^```json\\s*|```\\s*$/g)) strips Claude formatting variance before JSON.parse"
  - "analyze-emissions uses claude-sonnet-4-5-20250929 (512 max_tokens); generate-suggestions uses claude-haiku-4-5-20251001 (256 max_tokens)"

patterns-established:
  - "Edge Function auth pattern: OPTIONS first, then Authorization header check (401 if missing), then getUser JWT verification"
  - "Two-client pattern: userClient (anon key, JWT verification) + supabaseAdmin (service role, DB writes)"
  - "Shared _shared/ module for cross-function utilities (cors.ts)"

requirements-completed: [AI-01, AI-02, AI-03, AI-06, AI-07]

# Metrics
duration: 6min
completed: 2026-03-22
---

# Phase 03 Plan 01: AI Engine Edge Functions Summary

**Two Deno Edge Functions calling Anthropic's Claude API server-side (Sonnet 4.5 for deep analysis, Haiku 4.5 for fast suggestions), writing insights to ai_insights via service-role admin client, with ANTHROPIC_API_KEY never leaving the server**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-22T04:21:09Z
- **Completed:** 2026-03-22T04:27:48Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created shared CORS module (`_shared/cors.ts`) imported by both functions, handling wildcard origin and standard Supabase headers
- Built `analyze-emissions` Edge Function using `claude-sonnet-4-5-20250929` for deep weekly emission analysis with 512-token budget
- Built `generate-suggestions` Edge Function using `claude-haiku-4-5-20251001` for fast daily Home screen suggestions with 256-token budget
- Implemented two-client auth pattern: JWT verification via anon key, DB writes via service-role key (RLS bypassed server-side only)
- Added markdown fence stripping before JSON.parse to handle Claude formatting variance

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared CORS module** - `e825234` (feat)
2. **Task 2: Create analyze-emissions Edge Function (Sonnet 4.5)** - `64238d7` (feat)
3. **Task 3: Create generate-suggestions Edge Function (Haiku 4.5)** - `76f6197` (feat)

## Files Created/Modified

- `supabase/functions/_shared/cors.ts` — Shared CORS headers (`Access-Control-Allow-Origin: *`) used by both functions
- `supabase/functions/analyze-emissions/index.ts` — Sonnet 4.5 deep-analysis function; verifies JWT, calls Claude, inserts ai_insights row, returns full row as JSON
- `supabase/functions/generate-suggestions/index.ts` — Haiku 4.5 fast-suggestion function; same auth/insert pattern with smaller token budget for Home screen daily card

## Decisions Made

- OPTIONS preflight handled as the very first check (before auth) — ensures CORS works for unauthenticated browser pre-flight requests from the React Native WebView and future web clients
- `user_id` sourced exclusively from `getUser(token)` response, never from request body — prevents any client from inserting rows as another user
- Service-role admin client created inside the request handler (not at module level) to avoid accidental reuse across requests in shared Deno isolates
- Markdown fence regex applied before `JSON.parse` as a defensive measure — Claude occasionally wraps JSON in ` ```json ``` ` despite explicit instructions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — supabase/functions/ directory did not exist yet; directories were created as part of task execution (expected for a new phase).

## User Setup Required

**External services require manual configuration before these functions can be deployed or tested locally.**

To deploy and use these Edge Functions:

1. Set the `ANTHROPIC_API_KEY` secret in Supabase:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Deploy the functions:
   ```bash
   supabase functions deploy analyze-emissions
   supabase functions deploy generate-suggestions
   ```

3. For local testing, create `supabase/functions/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   Then run: `supabase functions serve generate-suggestions --env-file supabase/functions/.env`

## Next Phase Readiness

- Both Edge Functions are code-complete and ready for client integration (Plan 03-02)
- Plan 03-02 will create the `useAIInsight` TanStack Query hook that calls `generate-suggestions`
- No blockers — functions follow the exact interface shape (`{ id, user_id, content, suggestion, generated_at, expires_at }`) the client hook will consume

---
*Phase: 03-ai-engine*
*Completed: 2026-03-22*
