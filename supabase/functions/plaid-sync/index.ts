/**
 * supabase/functions/plaid-sync/index.ts — Sprint D Stage 3
 *
 * HTTP entrypoint: POST { item_id }, authenticated. Syncs ONE linked_items
 * row (the caller must own it) via the shared syncLinkedItem() in
 * _shared/plaidSync.ts — the exact same function plaid-exchange (first
 * sync), plaid-webhook, and plaid-sync-now call. This file is intentionally
 * a thin wrapper: the reusable logic lives in _shared/plaidSync.ts rather
 * than here, because Deno.serve(...) in this file registers an HTTP
 * handler as a side effect of import — another function importing
 * `../plaid-sync/index.ts` to reuse its logic would also register a second,
 * unwanted request handler in its own isolate. Putting the callable in
 * _shared/ (no Deno.serve side effect) is the clean way to share it; this
 * file, plaid-webhook, and plaid-sync-now are all equally thin callers of it.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/authUser.ts';
import { syncLinkedItem } from '../_shared/plaidSync.ts';

interface RequestBody {
  item_id?: string;
}

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

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    if (!body.item_id) {
      return new Response(JSON.stringify({ error: 'Missing item_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Ownership check BEFORE syncing — linked_items has no client-readable
    // policy at all, so this is the only gate that prevents user A from
    // triggering a sync of user B's item by guessing an item_id.
    const { data: item, error: findError } = await admin
      .from('linked_items')
      .select('id, user_id')
      .eq('id', body.item_id)
      .maybeSingle();
    if (findError) throw findError;
    if (!item || item.user_id !== auth.user.id) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await syncLinkedItem(admin, item.id as string);

    return new Response(JSON.stringify({ sync: result }), {
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
