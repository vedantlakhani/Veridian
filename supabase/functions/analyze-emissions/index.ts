import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface EmissionContext {
  weeklyTotalKg: number;
  foodKg: number;
  transportKg: number;
  energyKg: number;
  topItems: Array<{ item: string; category: string; totalKg: number }>;
}

function buildPrompt(ctx: EmissionContext): string {
  const items = ctx.topItems
    .map((i) => `  - ${i.item} (${i.category}): ${i.totalKg.toFixed(2)} kg CO₂e`)
    .join('\n');
  return `You are a personal carbon coach. Analyse the user's recent emissions and produce a deep insight.

Weekly emissions: ${ctx.weeklyTotalKg.toFixed(2)} kg CO₂e total
- Food: ${ctx.foodKg.toFixed(2)} kg
- Transport: ${ctx.transportKg.toFixed(2)} kg
- Energy: ${ctx.energyKg.toFixed(2)} kg

Top emission sources:
${items}

Return ONLY valid JSON (no markdown, no code fences, no extra text):
{
  "content": "One sentence insight referencing their actual highest-impact item and its kg value",
  "suggestion": "One specific action they can take, with a quantified CO₂e saving estimate e.g. 'Switch to oat milk: save ~0.6 kg CO₂e/week'"
}

Rules:
- content must name the top item and its kg value
- suggestion must name a specific product or behaviour change and include a CO₂e saving number
- Both fields: 1 sentence only
- Do not use markdown or formatting
- Do not invent data not in the context above`;
}

Deno.serve(async (req) => {
  // CORS preflight MUST be handled before any auth or body parsing
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // User client: verifies the JWT against Supabase Auth (network round-trip validates expiry)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client: bypasses RLS for INSERT — service role key stays server-side only
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const ctx = await req.json() as EmissionContext;

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', // AI-02: Sonnet 4.5 for complex analysis
      max_tokens: 512,
      messages: [{ role: 'user', content: buildPrompt(ctx) }],
    });

    // Strip markdown fences Claude may add despite instructions (Pitfall 1)
    const rawText = (message.content[0] as { type: string; text: string }).text
      .replace(/^```json\s*|```\s*$/g, '')
      .trim();
    const parsed = JSON.parse(rawText) as { content: string; suggestion: string };

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: insight, error: dbError } = await supabaseAdmin
      .from('ai_insights')
      .insert({
        user_id: user.id, // always from verified JWT, never from request body (Pitfall 6)
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
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
