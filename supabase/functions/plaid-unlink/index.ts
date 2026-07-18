/**
 * supabase/functions/plaid-unlink/index.ts — Sprint D Stage 4
 *
 * POST { linked_item_id }, authenticated. Calls Plaid's /item/remove (so the
 * access_token is invalidated on Plaid's side and Plaid stops billing/
 * syncing the item), then HARD-DELETES the linked_items row.
 *
 * DESIGN DECISION — delete, not soft-revoke: linked_items.status supports a
 * 'revoked' value (see the Stage 2 migration's CHECK constraint), which
 * could have been used for a soft-unlink (UPDATE status='revoked', keep the
 * row). We deliberately do NOT do that here, because access_token is
 * NOT NULL — there is no way to redact the credential in place while keeping
 * the row, and the app's own trust copy on the link-bank screen promises
 * "unlink anytime" as a real deletion, not a soft flag. Hard-deleting the
 * row is also simply the safer default: a dead bearer credential should not
 * linger in the database once the user has asked to disconnect it.
 *
 * WHAT SURVIVES THE DELETE: bank_transactions.item_id references
 * linked_items(id) ON DELETE CASCADE, so this item's raw transaction rows
 * (staging data) are removed too. emission_entries has NO foreign key back
 * to linked_items or bank_transactions, so every emission_entries row this
 * item ever produced (source='transaction') remains in the ledger untouched
 * — matching SPRINT_D_SPEC.md Stage 5's exit script verbatim: "unlink ->
 * entries remain but no new syncs."
 *
 * AUTHORIZATION: the row is looked up scoped to auth.user.id (never trusting
 * a bare id from the request body alone) before any Plaid call or delete, so
 * one user can never unlink another user's linked_items row.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/authUser.ts';
import { plaidFetch, PlaidError } from '../_shared/plaid.ts';

interface RequestBody {
  linked_item_id?: string;
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
    if (!body.linked_item_id) {
      return new Response(JSON.stringify({ error: 'Missing linked_item_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Scoped to the caller's own user_id — never trust the id alone.
    const { data: item, error: fetchError } = await admin
      .from('linked_items')
      .select('id, access_token')
      .eq('id', body.linked_item_id)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!item) {
      return new Response(JSON.stringify({ error: 'Linked account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Best-effort against Plaid: if the item is already errored/revoked on
    // Plaid's side (e.g. ITEM_LOGIN_REQUIRED), /item/remove can itself 400 —
    // that must not block the user's local unlink, since the whole point of
    // "unlink anytime" is that it always works from the app's side.
    let plaidError: string | null = null;
    try {
      await plaidFetch('/item/remove', { access_token: item.access_token });
    } catch (e) {
      plaidError = e instanceof PlaidError ? e.message : e instanceof Error ? e.message : 'Unknown Plaid error';
    }

    const { error: deleteError } = await admin.from('linked_items').delete().eq('id', item.id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true, plaid_error: plaidError }), {
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
