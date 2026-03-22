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
  return `You are a personal carbon coach. Analyze the user's recent emissions and provide one specific, actionable insight.

User's emissions this week:
- Total: ${ctx.weeklyTotalKg.toFixed(2)} kg CO₂e
- Food: ${ctx.foodKg.toFixed(2)} kg CO₂e
- Transport: ${ctx.transportKg.toFixed(2)} kg CO₂e
- Energy: ${ctx.energyKg.toFixed(2)} kg CO₂e

Top emission sources:
${items}

Return ONLY a JSON object (no markdown, no code fences, no explanation) in this exact format:
{
  "content": "One sentence describing what the data shows about their highest-impact category (mention the actual kg number)",
  "suggestion": "One specific action they can take to reduce emissions, with a quantified estimate e.g. 'Switch to oat milk: save ~0.6 kg CO₂e/week'"
}

Rules:
- content must reference their actual data (top item name and kg value)
- suggestion must name a specific product/behaviour change and a CO₂e saving estimate
- Both fields must be 1 sentence only
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

    // JWT is already verified by the Supabase gateway before this function runs.
    // Decode the payload locally — JWTs use base64url (not base64), so fix chars + padding first.
    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
      const payload = JSON.parse(atob(padded));
      userId = payload.sub as string;
      if (!userId) throw new Error('missing sub');
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client: service-role key bypasses RLS for INSERT — stays server-side only
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const ctx = await req.json() as EmissionContext;

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // AI-03: Haiku 4.5 for fast daily suggestions
      max_tokens: 256,
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
        user_id: userId, // from JWT sub claim — gateway already verified the signature
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
