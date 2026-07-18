/**
 * supabase/functions/plaid-sync-now/index.ts — Sprint D Stage 3
 *
 * POST, authenticated, no body needed. Sandbox/demo convenience per
 * SPRINT_D_SPEC.md Stage 3's explicit allowance: lets a signed-in user force
 * a sync of ALL of their own active linked_items without waiting for a
 * Plaid webhook (sandbox transactions are seeded instantly server-side, but
 * nothing pushes a webhook to a local/dev environment on demand, so this is
 * how the app/demo drives "link bank -> see entries appear" in one session).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/authUser.ts';
import { syncAllItemsForUser } from '../_shared/plaidSync.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const auth = await verifyUser(req);
    if (auth.errorResponse) return auth.errorResponse;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results = await syncAllItemsForUser(admin, auth.user.id);

    return new Response(JSON.stringify({ synced: results }), {
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
