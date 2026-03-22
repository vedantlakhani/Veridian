# Phase 3: AI Engine - Research

**Researched:** 2026-03-21
**Domain:** Supabase Edge Functions (Deno) + Anthropic Claude API + React Query caching
**Confidence:** HIGH

---

## Summary

Phase 3 integrates Claude AI into the Veridian app via Supabase Edge Functions, keeping all API credentials server-side. Two functions are needed: `analyze-emissions` (Sonnet 4.5 for richer analysis) and `generate-suggestions` (Haiku 4.5 for speed). Both live under `supabase/functions/<name>/index.ts`, use `Deno.serve()`, import the Anthropic SDK via `npm:@anthropic-ai/sdk`, and return JSON to the React Native client via `supabase.functions.invoke()`.

The `ai_insights` table already exists with a 24-hour TTL (`expires_at` column). The caching strategy is: query Supabase for a fresh row first; only call the Edge Function if no fresh row is found. React Query orchestrates this with a custom `queryFn` that implements the two-step check. The default `staleTime` for insight queries should be long (e.g. 23 hours) so React Query does not re-execute the queryFn on mount when a fresh row already exists.

The model IDs to use are confirmed from official Anthropic docs: `claude-sonnet-4-5-20250929` for AI-02 and `claude-haiku-4-5-20251001` for AI-03. Note that Sonnet 4.5 is listed as a "legacy" model — it still works and is the version mandated by the requirements. Haiku 4.5 is the current latest fast model.

**Primary recommendation:** Keep logic simple: one Edge Function per requirement (`analyze-emissions`, `generate-suggestions`), call the correct Claude model, write the result to `ai_insights`, and return it. The client hook reads from the table first; if expired, it calls `generate-suggestions` for speed, passing emission context in the request body.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | All Claude API calls via Supabase Edge Functions — zero direct client calls | Edge Functions run server-side; `ANTHROPIC_API_KEY` set via `supabase secrets set`; client only calls `supabase.functions.invoke()` |
| AI-02 | `analyze-emissions` Edge Function uses `claude-sonnet-4-5` for complex analysis | Model ID `claude-sonnet-4-5-20250929` confirmed in Anthropic official docs |
| AI-03 | `generate-suggestions` Edge Function uses `claude-haiku-4-5` for fast suggestions | Model ID `claude-haiku-4-5-20251001` confirmed in Anthropic official docs |
| AI-04 | Home screen shows AI-generated insight card based on recent emissions (updated daily) | `useAiInsight` hook checks `expires_at`, calls `generate-suggestions` when stale, React Query caches result |
| AI-05 | Insight card includes one specific, quantified reduction action | Prompt engineering: instruct model to output JSON `{ content, suggestion }` where suggestion MUST contain a kg CO₂e value |
| AI-06 | AI suggestions personalized to user's emission profile | Pass last 7 days of entries grouped by category + top 3 items with quantities in the Edge Function request body |
| AI-07 | API key stored in Edge Function secrets, never in client bundle | `supabase secrets set ANTHROPIC_API_KEY=...`; read via `Deno.env.get('ANTHROPIC_API_KEY')` inside function |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | latest (via `npm:`) | Anthropic Claude API client for Deno | Official SDK; handles auth headers, retry logic, TypeScript types |
| `@supabase/supabase-js` | `npm:@supabase/supabase-js@2` | Supabase client inside Edge Function | Access DB with service-role key to bypass RLS for insert |
| `supabase.functions.invoke()` | `@supabase/supabase-js` v2 | Call Edge Function from React Native | Automatically attaches `Authorization: Bearer <access_token>` header |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | v5 (already in project) | Cache/coordinate AI insight fetching | `useAiInsight` hook; manage loading/error states |
| Supabase CLI | latest | `supabase functions serve`, `supabase secrets set`, `supabase functions deploy` | Local dev and CI/CD deploy |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `npm:@anthropic-ai/sdk` | Raw `fetch` to `api.anthropic.com` | SDK gives TypeScript types, retries, error handling for free — do not use raw fetch |
| `generate-suggestions` for daily insight | `analyze-emissions` + cron | Haiku is fast enough for on-demand; Sonnet adds cost and latency without visible benefit for daily card |
| Custom in-memory cache | React Query + Supabase `expires_at` | Supabase table survives app restarts; multiple devices get the same insight |

**Installation (Edge Function — Deno, no npm install needed):**
```bash
# In supabase/functions/analyze-emissions/index.ts and generate-suggestions/index.ts:
# Import directly with npm: specifier — Deno downloads at serve/deploy time
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
```

**CLI setup:**
```bash
supabase functions new analyze-emissions
supabase functions new generate-suggestions
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## Architecture Patterns

### Recommended Project Structure

```
supabase/
└── functions/
    ├── _shared/
    │   └── cors.ts              # shared CORS headers (if SDK import not available)
    ├── analyze-emissions/
    │   └── index.ts             # claude-sonnet-4-5-20250929
    └── generate-suggestions/
        └── index.ts             # claude-haiku-4-5-20251001
hooks/
└── useAiInsight.ts              # React Query hook: check DB → call Edge Function
components/
└── ui/
    └── VAiInsightCard.tsx       # AI insight display card (custom, no UI lib)
app/
└── (tabs)/
    └── index.tsx                # Home screen: add <VAiInsightCard /> section
```

### Pattern 1: Edge Function Structure (Deno.serve)

**What:** The standard Supabase Edge Function shape. Every function uses `Deno.serve()`, handles CORS preflight, reads the user JWT from the `Authorization` header, creates a Supabase admin client using service-role key, and returns JSON.

**When to use:** All Edge Functions in this phase.

```typescript
// Source: https://supabase.com/docs/guides/functions/auth
// supabase/functions/generate-suggestions/index.ts
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

// CORS headers — import from SDK (v2.95.0+) or define inline
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight FIRST — before any business logic
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Extract and verify the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');

    // 2. Supabase admin client (service role) — bypasses RLS for insert
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 3. Verify user via JWT claims
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Parse request body (emission context sent from client)
    const body = await req.json() as EmissionContext;

    // 5. Call Claude
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: buildPrompt(user.id, body) }],
    });

    // 6. Parse response — expect JSON from Claude
    const rawText = (message.content[0] as { type: string; text: string }).text;
    const parsed = JSON.parse(rawText) as { content: string; suggestion: string };

    // 7. Upsert into ai_insights (service role bypasses RLS)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: insight, error: dbError } = await supabaseAdmin
      .from('ai_insights')
      .insert({
        user_id: user.id,
        content: parsed.content,
        suggestion: parsed.suggestion,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify(insight), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Pattern 2: Client-Side Cache-First Pattern (React Query hook)

**What:** The `useAiInsight` hook first checks Supabase for a non-expired row. If found, returns it immediately (no Claude call). If missing or expired, calls the `generate-suggestions` Edge Function, which generates and persists a new insight, then returns it.

**When to use:** Home screen AI insight card.

```typescript
// Source: React Query v5 docs + Supabase patterns
// hooks/useAiInsight.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AiInsight {
  id: string;
  user_id: string;
  content: string;
  suggestion: string;
  generated_at: string;
  expires_at: string;
}

export interface EmissionContext {
  weeklyTotalKg: number;
  foodKg: number;
  transportKg: number;
  energyKg: number;
  topItems: Array<{ item: string; category: string; totalKg: number }>;
}

export function useAiInsight(
  userId: string | undefined,
  context: EmissionContext | null
) {
  return useQuery({
    queryKey: ['ai_insight', userId],
    queryFn: async (): Promise<AiInsight | null> => {
      if (!userId) return null;

      // Step 1: Check for a fresh cached insight in Supabase
      const now = new Date().toISOString();
      const { data: cached } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', now)        // only non-expired rows
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) return cached as AiInsight;

      // Step 2: No fresh insight — call Edge Function (only if we have context)
      if (!context || context.weeklyTotalKg === 0) return null;

      const { data, error } = await supabase.functions.invoke('generate-suggestions', {
        body: context,
      });
      if (error) throw error;
      return data as AiInsight;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60 * 23, // 23 hours — don't re-fetch if already fresh
    retry: 1,                         // only one retry on failure (cold start recovery)
  });
}
```

### Pattern 3: Prompt Template for Quantified, Personalized Suggestions

**What:** The system prompt structure that instructs Claude to return parseable JSON with a personalized, quantified suggestion tied to the user's actual data.

**When to use:** Inside `generate-suggestions/index.ts` `buildPrompt()` function.

```typescript
// Prompt engineering for emissions insight
function buildPrompt(userId: string, ctx: EmissionContext): string {
  const topItemsList = ctx.topItems
    .map(i => `  - ${i.item} (${i.category}): ${i.totalKg.toFixed(2)} kg CO₂e`)
    .join('\n');

  return `You are a personal carbon coach. Analyze the user's recent emissions and provide one specific, actionable insight.

User's emissions this week:
- Total: ${ctx.weeklyTotalKg.toFixed(2)} kg CO₂e
- Food: ${ctx.foodKg.toFixed(2)} kg CO₂e
- Transport: ${ctx.transportKg.toFixed(2)} kg CO₂e
- Energy: ${ctx.energyKg.toFixed(2)} kg CO₂e

Top emission sources:
${topItemsList}

Return ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "content": "One sentence describing what the data shows about their highest-impact category (mention the actual kg number)",
  "suggestion": "One specific action they can take to reduce emissions, with a quantified estimate e.g. 'Switch to oat milk: save ~0.6 kg CO₂e/week'"
}

Rules:
- content must reference their actual data (e.g. top item name and kg value)
- suggestion must name a specific product/behavior change and a CO₂e saving estimate
- Both fields must be 1 sentence only
- Do not use markdown or formatting
- Do not invent data not in the context above`;
}
```

### Anti-Patterns to Avoid

- **Calling Anthropic API directly from React Native client:** API key would be in the bundle. NEVER do this — always go through Edge Function.
- **Using `SUPABASE_ANON_KEY` to insert into `ai_insights`:** The anon key respects RLS. The INSERT policy requires `auth.uid() = user_id`. Use service-role key in the Edge Function for the insert operation.
- **Streaming responses for the insight card:** The card shows a static text result; streaming adds complexity without UX benefit. Use standard (non-streaming) `messages.create()`.
- **Not handling the CORS preflight before parsing the request body:** `req.json()` will fail on OPTIONS requests. Always check `req.method === 'OPTIONS'` first.
- **Blocking the queryFn on context data availability:** If the user has no emissions logged, pass `null` for context and guard with an early `return null` to avoid a pointless Claude call.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Anthropic API auth + retries | Custom fetch wrapper | `npm:@anthropic-ai/sdk` | SDK handles `x-api-key`, `anthropic-version`, overloaded-error retries, type-safe response |
| JWT verification in Edge Function | Manual JWT decode | `supabase.auth.getUser(token)` via user client | Supabase handles key rotation and expiry validation |
| Cache coordination | Custom timestamp comparison | React Query `staleTime` + Supabase `expires_at` check in `queryFn` | Race condition safety, background refetch semantics, devtools visibility |
| CORS headers | Custom header object | Import from `@supabase/supabase-js/cors` (v2.95.0+) | SDK keeps headers in sync as Supabase adds new required headers |
| Edge Function secrets | `.env` committed to git | `supabase secrets set` CLI + `Deno.env.get()` | Secrets encrypted at rest, never in codebase |

**Key insight:** The two most error-prone areas in this phase are (1) JWT/auth flow between client and Edge Function and (2) the cache invalidation pattern. Both are solved cleanly by the Supabase SDK's built-in auth passthrough and the Supabase `expires_at` column check in the queryFn — do not over-engineer either.

---

## Common Pitfalls

### Pitfall 1: Claude returns non-JSON text
**What goes wrong:** `JSON.parse(rawText)` throws, crashing the Edge Function with a 500 error on the client side.
**Why it happens:** Claude sometimes prepends a markdown code fence (` ```json `) or adds a clarifying sentence before the JSON object.
**How to avoid:** Add a strip step before parsing: `rawText.replace(/^```json\s*|```\s*$/g, '').trim()`. Also use `response_format` if available or include explicit instruction "Return ONLY a JSON object, no markdown" in the prompt.
**Warning signs:** Edge Function logs showing `SyntaxError: Unexpected token` on JSON.parse.

### Pitfall 2: Service-role key used on the client side
**What goes wrong:** A `SUPABASE_SERVICE_ROLE_KEY` check in client code would bypass all RLS policies, exposing any user's data.
**Why it happens:** Copy-paste from Edge Function code into a React Native hook.
**How to avoid:** The service-role key lives ONLY inside `supabase/functions/*/index.ts`. React Native code only ever uses the anon key (via `lib/supabase.ts`).
**Warning signs:** Any `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` outside `supabase/functions/`.

### Pitfall 3: 24h TTL check done only in React Query staleTime
**What goes wrong:** React Query's staleTime is reset when the app restarts. A user who re-opens the app within 24h but after `staleTime` would trigger a fresh Claude call even though a valid cached row exists in Supabase.
**Why it happens:** Confusing React Query's in-memory stale state with the durable DB-based TTL.
**How to avoid:** Always check `expires_at > now()` in the Supabase query inside the `queryFn` first. The `staleTime: 23h` is an optimization to avoid redundant Supabase reads within a session, NOT the authoritative TTL.
**Warning signs:** Multiple `ai_insights` rows being created within 24h for the same user.

### Pitfall 4: Edge Function cold start on first render
**What goes wrong:** The Edge Function takes ~400ms extra on the first call in an hourly window; combined with Claude API latency (~500-800ms for Haiku), the total can be ~1.2s on a cold first load.
**Why it happens:** Deno isolate cold start.
**How to avoid:** (1) Show a skeleton while loading (already the pattern in the Home screen). (2) Set `retry: 1` in the React Query hook so transient errors (503) retry once. (3) Do NOT block the whole screen render on this — render the rest of the Home screen and let the insight card load in place.
**Warning signs:** User sees the whole screen blank waiting for AI response.

### Pitfall 5: CORS error blocking Edge Function invocations
**What goes wrong:** Browser/React Native client gets blocked before the function even runs.
**Why it happens:** Missing or incorrect CORS headers; OPTIONS preflight not handled first.
**How to avoid:** Handle `if (req.method === 'OPTIONS')` as the very first branch in `Deno.serve`. Include CORS headers on ALL responses (success, error, and preflight). For `supabase.functions.invoke()` from React Native (non-browser), CORS is less critical but should be set for web compatibility.
**Warning signs:** `FunctionsFetchError` or network error in client before any function logic runs.

### Pitfall 6: Passing user_id in request body for trust
**What goes wrong:** Malicious client passes a different `user_id` in the body, generating insights attributed to another user.
**Why it happens:** Trusting client-supplied identity.
**How to avoid:** Always derive `user_id` from the verified JWT (`user.id` from `supabase.auth.getUser(token)`) inside the Edge Function. Never use a `user_id` from the request body.

---

## Code Examples

### Edge Function: Full analyze-emissions (Sonnet 4.5)

```typescript
// Source: Anthropic SDK docs + Supabase Edge Function auth pattern
// supabase/functions/analyze-emissions/index.ts
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmissionContext {
  weeklyTotalKg: number;
  foodKg: number;
  transportKg: number;
  energyKg: number;
  topItems: Array<{ item: string; category: string; totalKg: number }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const ctx = await req.json() as EmissionContext;
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',  // AI-02 requirement
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: buildPrompt(ctx),
      }],
    });

    const rawText = (message.content[0] as { type: string; text: string }).text
      .replace(/^```json\s*|```\s*$/g, '')
      .trim();
    const parsed = JSON.parse(rawText) as { content: string; suggestion: string };

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: insight, error: dbError } = await supabaseAdmin
      .from('ai_insights')
      .insert({
        user_id: user.id,
        content: parsed.content,
        suggestion: parsed.suggestion,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (dbError) throw dbError;
    return new Response(JSON.stringify(insight), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildPrompt(ctx: EmissionContext): string {
  const items = ctx.topItems
    .map(i => `  - ${i.item} (${i.category}): ${i.totalKg.toFixed(2)} kg CO₂e`)
    .join('\n');
  return `You are a personal carbon coach. Analyze the user's recent emissions.

Weekly emissions: ${ctx.weeklyTotalKg.toFixed(2)} kg CO₂e total
- Food: ${ctx.foodKg.toFixed(2)} kg
- Transport: ${ctx.transportKg.toFixed(2)} kg
- Energy: ${ctx.energyKg.toFixed(2)} kg

Top sources:
${items}

Return ONLY valid JSON (no markdown, no extra text):
{
  "content": "One sentence insight referencing their actual highest-impact item and kg value",
  "suggestion": "One specific action with a quantified CO₂e saving estimate"
}`;
}
```

### Client Hook: useAiInsight with cache-first logic

```typescript
// Source: TanStack Query v5 docs + Supabase JS client
// hooks/useAiInsight.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { FunctionsHttpError } from '@supabase/supabase-js';

export interface AiInsight {
  id: string;
  user_id: string;
  content: string;
  suggestion: string;
  generated_at: string;
  expires_at: string;
}

export interface EmissionContext {
  weeklyTotalKg: number;
  foodKg: number;
  transportKg: number;
  energyKg: number;
  topItems: Array<{ item: string; category: string; totalKg: number }>;
}

export function useAiInsight(
  userId: string | undefined,
  context: EmissionContext | null,
) {
  return useQuery<AiInsight | null, Error>({
    queryKey: ['ai_insight', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Cache-first: check for fresh insight in Supabase
      const now = new Date().toISOString();
      const { data: cached, error: selectError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', now)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) throw selectError;
      if (cached) return cached as AiInsight;

      // No fresh cache — need to generate. Guard: don't call with no data.
      if (!context || context.weeklyTotalKg === 0) return null;

      const { data, error } = await supabase.functions.invoke<AiInsight>(
        'generate-suggestions',
        { body: context },
      );
      if (error) {
        // Distinguish cold-start (transient) from auth/logic errors
        if ((error as FunctionsHttpError).context?.status === 401) {
          throw new Error('AI service unauthorized');
        }
        throw new Error(`AI service error: ${error.message}`);
      }
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60 * 23,  // 23h — avoids repeat DB check within same session
    retry: 1,
    retryDelay: 2000,                  // 2s delay covers cold-start 503
  });
}
```

### VAiInsightCard component skeleton

```typescript
// components/ui/VAiInsightCard.tsx
// Uses VCard, VSkeleton from existing component library; no external UI libraries
import { View, Text, StyleSheet } from 'react-native';
import { VCard } from '@/components/ui/VCard';
import { VSkeleton } from '@/components/ui/VSkeleton';
import { colors, spacing, typography, radii } from '@/lib/theme';
import type { AiInsight } from '@/hooks/useAiInsight';

interface VAiInsightCardProps {
  insight: AiInsight | null | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function VAiInsightCard({ insight, isLoading, error }: VAiInsightCardProps) {
  if (isLoading) {
    return (
      <VCard elevation="md" style={styles.card}>
        <VSkeleton width={120} height={14} style={{ marginBottom: spacing.sm }} />
        <VSkeleton width={'100%' as `${number}%`} height={40} style={{ marginBottom: spacing.sm }} />
        <VSkeleton width={'85%' as `${number}%`} height={32} />
      </VCard>
    );
  }

  if (error || !insight) {
    // Graceful degradation — card simply absent, no crash
    return null;
  }

  return (
    <VCard elevation="md" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.aiDot} />
        <Text style={styles.label}>AI Insight</Text>
      </View>
      <Text style={styles.content}>{insight.content}</Text>
      <View style={styles.suggestionRow}>
        <Text style={styles.suggestionLabel}>Try this:</Text>
        <Text style={styles.suggestion}>{insight.suggestion}</Text>
      </View>
    </VCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  aiDot: { width: 8, height: 8, borderRadius: radii.full, backgroundColor: colors.primary },
  label: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: '600', letterSpacing: 0.5 },
  content: { fontSize: typography.sizes.sm, color: colors.textPrimary, lineHeight: typography.sizes.sm * 1.5, marginBottom: spacing.sm },
  suggestionRow: { backgroundColor: colors.background, borderRadius: radii.sm, padding: spacing.sm },
  suggestionLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: 2 },
  suggestion: { fontSize: typography.sizes.sm, color: colors.primaryDark, fontWeight: '600' },
});
```

### Local development: serve with secrets

```bash
# supabase/functions/.env (gitignored)
ANTHROPIC_API_KEY=sk-ant-...

# Run locally
supabase functions serve --env-file supabase/functions/.env

# Deploy to production
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy analyze-emissions
supabase functions deploy generate-suggestions
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Streaming responses for all AI | Non-streaming for card text | Stable | Simpler code; streaming only needed for chat UI |
| Raw `fetch` to Anthropic | `npm:@anthropic-ai/sdk` in Deno | SDK Deno support ~2024 | Type safety, auto-retry, proper error handling |
| Global CORS headers object | Import from `@supabase/supabase-js/cors` | v2.95.0 (late 2024) | Auto-syncs with SDK changes |
| `auth.getClaims(token)` | `auth.getUser(token)` | Still valid in 2025 | `getUser` does a network round-trip but validates the token against Supabase Auth; use for sensitive operations |

**Model clarification (IMPORTANT for requirements):**
- `claude-sonnet-4-5` alias and `claude-sonnet-4-5-20250929` snapshot both work; the snapshot ID is safer for production consistency
- `claude-sonnet-4-5-20250929` is now marked "legacy" in Anthropic docs but remains available and working
- `claude-sonnet-4-6` is the newer equivalent — requirements mandate `claude-sonnet-4-5`, so use the snapshot ID `claude-sonnet-4-5-20250929`
- `claude-haiku-4-5-20251001` is the current latest Haiku and is the model mandated by AI-03

---

## Open Questions

1. **analyze-emissions vs generate-suggestions: different roles?**
   - What we know: AI-02 uses Sonnet for "complex analysis", AI-03 uses Haiku for "fast suggestions". The daily insight card (AI-04) is the main deliverable.
   - What's unclear: Should `analyze-emissions` feed into `generate-suggestions` in a pipeline, or are they independent? The requirements do not specify a pipeline.
   - Recommendation: Implement both as independent functions. `generate-suggestions` handles the Home screen daily card (Haiku, fast). `analyze-emissions` can be used for deeper reports if needed later (Sonnet, richer output). The `useAiInsight` hook calls `generate-suggestions` only.

2. **Multiple ai_insights rows per user**
   - What we know: The table has no UNIQUE constraint on `(user_id, date)`. Old rows are kept.
   - What's unclear: Should old expired rows be cleaned up?
   - Recommendation: Add `ORDER BY generated_at DESC LIMIT 1` in all queries (already in code above). Cleanup is a future migration concern, not a Phase 3 blocker.

3. **What happens if the user has zero emissions logged?**
   - What we know: `context.weeklyTotalKg === 0` is the guard condition.
   - Recommendation: `useAiInsight` returns `null` when context is zero; `VAiInsightCard` renders `null` (no card shown). Add a comment in the component explaining this deliberate behavior.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | No automated test framework detected in project |
| Config file | None — Wave 0 gap |
| Quick run command | Manual: `supabase functions serve` + `curl` tests |
| Full suite command | Manual UAT per `03-VALIDATION.md` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | No API key in client bundle | smoke | `npx expo export --platform ios && grep -r "sk-ant" dist/` | Wave 0 gap |
| AI-02 | analyze-emissions deploys and uses Sonnet 4.5 | smoke | `curl -X POST http://localhost:54321/functions/v1/analyze-emissions -H "Authorization: Bearer TOKEN" -d '{...}'` | Wave 0 gap |
| AI-03 | generate-suggestions uses Haiku 4.5 and responds | smoke | `curl -X POST http://localhost:54321/functions/v1/generate-suggestions -H "Authorization: Bearer TOKEN" -d '{...}'` | Wave 0 gap |
| AI-04 | Home screen shows insight card | manual | Visual inspection in Expo Go | N/A |
| AI-05 | Suggestion contains CO₂e quantity | manual | Inspect card text for "kg CO₂e" | N/A |
| AI-06 | Personalization differs per user | manual | Log in as two test accounts | N/A |
| AI-07 | API key not in bundle | smoke | grep for key in exported bundle | Wave 0 gap |

### Sampling Rate
- **Per task commit:** `supabase functions serve` + manual curl smoke test for changed function
- **Per wave merge:** Full UAT per `03-VALIDATION.md`
- **Phase gate:** All 7 UAT scenarios pass before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `supabase/functions/generate-suggestions/index.ts` — core deliverable
- [ ] `supabase/functions/analyze-emissions/index.ts` — core deliverable
- [ ] `supabase/functions/.env` (gitignored) — local secrets file
- [ ] `hooks/useAiInsight.ts` — cache-first React Query hook
- [ ] `components/ui/VAiInsightCard.tsx` — insight display component
- [ ] Bundle security check script (grep for API key in `npx expo export` output)

---

## Sources

### Primary (HIGH confidence)
- [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) — Confirmed model IDs: `claude-sonnet-4-5-20250929`, `claude-haiku-4-5-20251001`
- [Anthropic API Getting Started](https://platform.claude.com/docs/en/api/getting-started) — Messages API structure, authentication headers
- [Supabase Edge Functions Quickstart](https://supabase.com/docs/guides/functions/quickstart) — File structure, `Deno.serve`, local dev workflow
- [Supabase Edge Function Secrets](https://supabase.com/docs/guides/functions/secrets) — `Deno.env.get()`, `supabase secrets set`, `.env` local file
- [Supabase Edge Function Auth](https://supabase.com/docs/guides/functions/auth) — JWT verification pattern with `supabase.auth.getUser(token)`
- [Supabase CORS Guide](https://supabase.com/docs/guides/functions/cors) — CORS headers, OPTIONS preflight pattern
- [Supabase functions.invoke() Reference](https://supabase.com/docs/reference/javascript/functions-invoke) — Client invocation, error types (`FunctionsHttpError`, `FunctionsRelayError`, `FunctionsFetchError`)
- [Supabase Edge Function Status Codes](https://supabase.com/docs/guides/functions/status-codes) — 503 = boot error, 500 = worker error, 504 = timeout
- [TanStack Query v5 Caching Docs](https://tanstack.com/query/v5/docs/react/guides/caching) — `staleTime`, `gcTime`, cache-first behavior

### Secondary (MEDIUM confidence)
- Anthropic SDK npm page + WebSearch results confirming `npm:@anthropic-ai/sdk` works as Deno import specifier
- Supabase GitHub discussions confirming cold-start median 400ms, hot latency 125ms
- WebSearch confirming `supabase.functions.invoke()` auto-attaches Bearer token from active session

### Tertiary (LOW confidence)
- Prompt engineering structure for CO₂ insights (based on general LLM prompting best practices, not a verified authoritative source — validate with actual Claude responses during implementation)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library imports and Supabase APIs verified against official docs
- Architecture: HIGH — Edge Function pattern, auth flow, and CORS handling verified via official Supabase docs
- Model IDs: HIGH — confirmed from Anthropic official models overview page; snapshot IDs are stable
- Caching: HIGH — React Query staleTime + Supabase expires_at pattern verified
- Prompt engineering: MEDIUM — structure is sound but exact Claude output format needs validation during Wave 1 implementation
- Pitfalls: HIGH — CORS, JWT trust, service-role misuse, and cold-start all confirmed via official docs and Supabase GitHub discussions

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (30 days) — Supabase Edge Function APIs are stable; Anthropic SDK is fast-moving but npm specifier will pin to latest compatible version
