---
phase: 03-ai-engine
verified: 2026-03-22T05:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 3: AI Engine Verification Report

**Phase Goal:** Claude API integrated server-side via Edge Functions, delivering personalized insights on the Home screen.
**Verified:** 2026-03-22T05:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | analyze-emissions Edge Function accepts a POST with emission context and returns a JSON insight row | VERIFIED | `supabase/functions/analyze-emissions/index.ts` — `Deno.serve` handles POST, parses `req.json() as EmissionContext`, returns `Response.json(insight)` with `{ id, user_id, content, suggestion, generated_at, expires_at }` |
| 2  | generate-suggestions Edge Function accepts a POST with emission context and returns a JSON insight row | VERIFIED | `supabase/functions/generate-suggestions/index.ts` — identical POST/parse/return pattern |
| 3  | Both functions reject unauthenticated requests with 401 | VERIFIED | Both functions check `req.headers.get('Authorization')` before any logic; missing header returns `status: 401`; failed `getUser` returns `status: 401` |
| 4  | Both functions handle OPTIONS preflight and return CORS headers on every response | VERIFIED | `if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })` is the first check in both handlers; all subsequent responses spread `...corsHeaders` |
| 5  | ANTHROPIC_API_KEY is read from Deno.env — never hardcoded | VERIFIED | `Deno.env.get('ANTHROPIC_API_KEY')!` confirmed at line 79 (analyze-emissions) and line 80 (generate-suggestions); grep for `sk-ant` in `supabase/functions/` returned nothing |
| 6  | Insights are written to ai_insights table by the admin client (service role) | VERIFIED | `supabaseAdmin` is constructed with `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!`; `supabaseAdmin.from('ai_insights').insert(...)` confirmed in both functions |
| 7  | Hook returns a cached insight from ai_insights without calling the Edge Function when a fresh row exists | VERIFIED | `useAiInsight` queries with `.gt('expires_at', now)` and returns the cached row immediately (`if (cached) return cached as AiInsight`) before any `functions.invoke` call |
| 8  | Hook calls generate-suggestions Edge Function only when no non-expired row exists in ai_insights | VERIFIED | `supabase.functions.invoke('generate-suggestions', ...)` appears only after `if (cached) return` — never called when cache hits |
| 9  | Hook returns null (not an error) when the user has no emission data (weeklyTotalKg === 0) | VERIFIED | `if (!context \|\| context.weeklyTotalKg === 0) return null` at line 69 of `hooks/useAiInsight.ts` |
| 10 | React Query staleTime is 23 hours so the queryFn is not re-run on every mount within a session | VERIFIED | `staleTime: 1000 * 60 * 60 * 23` confirmed at line 89 of `hooks/useAiInsight.ts` |
| 11 | Home screen renders a skeleton while the AI insight is loading | VERIFIED | `VAiInsightCard` renders three `VSkeleton` blocks when `isLoading === true`; `insightLoading` from `useAiInsight` passed as `isLoading` prop |
| 12 | Home screen renders the VAiInsightCard with content and suggestion when insight is available | VERIFIED | `VAiInsightCard` renders `insight.content` and `insight.suggestion` when `!isLoading && !error && insight` is truthy |
| 13 | Home screen renders nothing when insight is null or errors | VERIFIED | `if (error \|\| !insight) { return null; }` at line 26-28 of `VAiInsightCard.tsx` |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/_shared/cors.ts` | Shared CORS headers object | VERIFIED | Exports `corsHeaders` as `const`, 4 lines, no other exports |
| `supabase/functions/analyze-emissions/index.ts` | Sonnet 4.5 deep-analysis Edge Function | VERIFIED | Uses `claude-sonnet-4-5-20250929`, 117 lines, substantive implementation |
| `supabase/functions/generate-suggestions/index.ts` | Haiku 4.5 fast-suggestion Edge Function | VERIFIED | Uses `claude-haiku-4-5-20251001`, 118 lines, substantive implementation |
| `hooks/useAiInsight.ts` | Cache-first React Query hook for AI insight | VERIFIED | Exports `useAiInsight`, `AiInsight`, `EmissionContext`; 93 lines; substantive |
| `components/ui/VAiInsightCard.tsx` | AI insight display card component | VERIFIED | Exports `VAiInsightCard`; 89 lines; three distinct render states |
| `components/ui/index.ts` | Barrel re-export updated with VAiInsightCard | VERIFIED | Line 12: `export { VAiInsightCard } from './VAiInsightCard';` |
| `app/(tabs)/index.tsx` | Home screen with AI insight card wired to useAiInsight | VERIFIED | Imports `useAiInsight`, builds `emissionContext`, renders `<VAiInsightCard>` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `generate-suggestions/index.ts` | Anthropic API | `new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })` | WIRED | Line 80; `anthropic.messages.create` called with model and prompt |
| `generate-suggestions/index.ts` | `ai_insights` table | `supabaseAdmin.from('ai_insights').insert()` | WIRED | Lines 94-103; insert + `.select().single()` returns the persisted row |
| `analyze-emissions/index.ts` | Anthropic API | `new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })` | WIRED | Line 79; `anthropic.messages.create` called with model and prompt |
| `hooks/useAiInsight.ts` | `ai_insights` table | `supabase.from('ai_insights').select().gt('expires_at', now).maybeSingle()` | WIRED | Lines 56-63; result checked and returned immediately on cache hit |
| `hooks/useAiInsight.ts` | `generate-suggestions` Edge Function | `supabase.functions.invoke('generate-suggestions', { body: context })` | WIRED | Lines 73-76; invoked only on cache miss with non-zero context |
| `app/(tabs)/index.tsx` | `hooks/useAiInsight.ts` | `useAiInsight(user?.id, emissionContext)` | WIRED | Lines 17-18 (imports), lines 61-65 (invocation), lines 42-59 (context built from live hook data) |
| `app/(tabs)/index.tsx` | `components/ui/VAiInsightCard.tsx` | `<VAiInsightCard insight={insight} isLoading={insightLoading} error={insightError} />` | WIRED | Lines 126-130; all three props passed from `useAiInsight` destructure |
| `VAiInsightCard.tsx` | `AiInsight` type | `import type { AiInsight } from '@/hooks/useAiInsight'` | WIRED | Line 5; type used in `VAiInsightCardProps.insight` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AI-01 | 03-01 | All Claude API calls are made via Supabase Edge Functions — zero direct client calls | SATISFIED | `useAiInsight` only calls `supabase.functions.invoke`; no direct Anthropic SDK import anywhere in `hooks/`, `app/`, or `components/` |
| AI-02 | 03-01 | `analyze-emissions` uses `claude-sonnet-4-5-20250929` | SATISFIED | `analyze-emissions/index.ts` line 81: `model: 'claude-sonnet-4-5-20250929'` |
| AI-03 | 03-01 | `generate-suggestions` uses `claude-haiku-4-5-20251001` | SATISFIED | `generate-suggestions/index.ts` line 82: `model: 'claude-haiku-4-5-20251001'` |
| AI-04 | 03-02, 03-03 | Home screen shows AI-generated insight card based on recent emissions (updated daily) | SATISFIED | `useAiInsight` drives the `VAiInsightCard` on the Home screen; 24h `expires_at` TTL enforces daily refresh |
| AI-05 | 03-02, 03-03 | Insight card includes one specific, quantified reduction action | SATISFIED | Both Edge Function prompts require `suggestion` to name a specific action with a CO₂e saving estimate; `VAiInsightCard` renders `insight.suggestion` |
| AI-06 | 03-01, 03-02 | AI suggestions are personalized to user's emission profile (not generic) | SATISFIED | `EmissionContext` carries `weeklyTotalKg`, per-category breakdowns, and top 3 items by kg; passed verbatim to Edge Function prompt |
| AI-07 | 03-01 | API key stored in Edge Function secrets, never in client bundle or environment | SATISFIED | `ANTHROPIC_API_KEY` only read via `Deno.env.get()` in Deno functions; confirmed absent from all `hooks/`, `app/`, and `components/` files |

No orphaned requirements: every AI-0x ID declared in plan frontmatter is accounted for and satisfied.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | None found |

- No `TODO`, `FIXME`, `PLACEHOLDER`, or `coming soon` comments in any Phase 3 file
- No hardcoded API keys (`sk-ant` pattern returned no matches)
- No `SUPABASE_SERVICE_ROLE_KEY` in client code
- No `ANTHROPIC_API_KEY` in client code
- No prohibited UI libraries (NativeBase, React Native Paper, UI Kitten)
- No stub implementations (`return null`, `return {}`, `return []`, empty arrow bodies) in non-null-intentional positions

---

### Human Verification Required

#### 1. Edge Function live invocation

**Test:** Deploy `generate-suggestions` locally via `supabase functions serve` with a valid `ANTHROPIC_API_KEY`. Send a POST request with a populated `EmissionContext` body and a valid Supabase access token.
**Expected:** HTTP 200 response with a JSON body matching `{ id, user_id, content, suggestion, generated_at, expires_at }`. The `content` field names the top emission item and its kg value. The `suggestion` field names a specific behaviour change with a CO₂e saving estimate.
**Why human:** Requires a live Anthropic API key and a running Supabase project. Cannot be verified by static analysis.

#### 2. Cache-hit behaviour across app restart

**Test:** Invoke `generate-suggestions` once to populate `ai_insights`. Force-close and reopen the app within the 24h window. Observe whether the Home screen AI card populates without a new Edge Function call.
**Expected:** Card shows the cached insight immediately; no new Claude API call is made (verifiable in Supabase Edge Function invocation logs).
**Why human:** Requires running the app on a device/simulator; React Query cache is not inspectable by static analysis.

#### 3. AI Insight Card visual position in Home screen

**Test:** Run the app with emission data loaded. Observe the Home screen scroll order.
**Expected:** AI Insight card appears below the Today Metric Card and above the "This Week" section title.
**Why human:** Layout ordering requires visual inspection; JSX order is correct in code but rendering depends on runtime.

#### 4. Empty-state graceful degradation

**Test:** Log in with a new account that has zero emission entries. Navigate to the Home screen.
**Expected:** No AI Insight card appears and no error is shown — the card section is simply absent.
**Why human:** Requires a clean test account with no data; the `weeklyTotalKg === 0` guard is verified in code but end-to-end behaviour needs manual confirmation.

---

### Summary

All 13 must-have truths are verified. All 7 required artifacts exist, are substantive (not stubs), and are wired. All 8 key links are confirmed active. All 7 AI requirements (AI-01 through AI-07) are satisfied with direct code evidence. No anti-patterns were found. Security invariants hold: `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` exist only inside Deno Edge Functions, never in the client bundle.

Four items are flagged for human verification: they require a live Supabase/Anthropic deployment and cannot be resolved by static analysis. None of them represent missing implementation — they are runtime behaviour confirmations.

The phase goal is achieved: Claude API is integrated server-side via Edge Functions and personalized insights are delivered on the Home screen.

---

_Verified: 2026-03-22T05:00:00Z_
_Verifier: Claude (gsd-verifier)_
