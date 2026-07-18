/**
 * supabase/functions/plaid-exchange/index.ts — Sprint D Stage 3
 *
 * POST { public_token, institution_name? }, authenticated. Exchanges the
 * Plaid Link public_token for a long-lived access_token + item_id, stores
 * the new linked_items row via the service-role client (bypasses RLS — see
 * the migration's own note: authenticated has zero policies on this table,
 * by design), and kicks off the first sync in-process before responding.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/authUser.ts';
import { plaidFetch, PlaidError } from '../_shared/plaid.ts';
import { syncLinkedItem } from '../_shared/plaidSync.ts';

interface ExchangeResponse {
  access_token: string;
  item_id: string;
  request_id: string;
}

interface RequestBody {
  public_token?: string;
  institution_name?: string;
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
    if (!body.public_token) {
      return new Response(JSON.stringify({ error: 'Missing public_token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const exchanged = await plaidFetch<ExchangeResponse>('/item/public_token/exchange', {
      public_token: body.public_token,
    });

    // Service-role client: bypasses RLS to write access_token, which has NO
    // policy for `authenticated` at all (see linked_items migration).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: linkedItem, error: insertError } = await admin
      .from('linked_items')
      .insert({
        user_id: auth.user.id, // always from the verified JWT, never the request body
        plaid_item_id: exchanged.item_id,
        access_token: exchanged.access_token,
        institution_name: body.institution_name ?? null,
        status: 'active',
      })
      .select('id, institution_name, status, created_at')
      .single();
    if (insertError) throw insertError;

    // Kick the first sync in-process (see plaidSync.ts header for why
    // in-process rather than a self-invoking HTTP call). If the first sync
    // throws, the link itself already succeeded — surface a 200 with
    // sync_error so the app can still show the linked account and let a
    // later plaid-sync-now retry, rather than making linking itself fail.
    let syncError: string | null = null;
    let syncResult = null;
    try {
      syncResult = await syncLinkedItem(admin, linkedItem.id as string);
    } catch (e) {
      syncError = e instanceof Error ? e.message : 'Unknown sync error';
    }

    return new Response(
      JSON.stringify({
        linked_item: linkedItem,
        sync: syncResult,
        sync_error: syncError,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    if (err instanceof PlaidError) {
      return new Response(
        JSON.stringify({ error: err.message, error_code: err.errorCode }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
