/**
 * supabase/functions/plaid-items/index.ts — Sprint D Stage 4
 *
 * POST, authenticated, no body needed. Returns the caller's own linked_items
 * rows (id, institution_name, status, created_at) for the Profile screen's
 * "Linked accounts" section.
 *
 * WHY THIS FUNCTION EXISTS (rather than a direct client-side
 * `supabase.from('linked_items').select(...)`): the Stage 2 migration
 * (20260718000021_create_linked_items.sql) deliberately creates ZERO RLS
 * policies for `authenticated`/`anon` on this table — not even for the
 * non-secret columns — because Postgres RLS restricts which ROWS a role
 * sees, not which COLUMNS, so "let the owner read institution_name/status
 * but never access_token" cannot be expressed as a row policy at all. That
 * migration's own comment says as much: "even the non-secret columns are
 * served to the client only via an edge function response... never via
 * direct PostgREST table access." A direct client SELECT against this table
 * always returns zero rows (RLS denies everything for `authenticated`), so
 * this function is the only way the app can list a user's linked accounts.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/authUser.ts';

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

    const { data, error } = await admin
      .from('linked_items')
      .select('id, institution_name, status, created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return new Response(JSON.stringify({ linked_items: data ?? [] }), {
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
