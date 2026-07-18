/**
 * supabase/functions/plaid-webhook/index.ts — Sprint D Stage 3
 *
 * Plaid POSTs here on TRANSACTIONS webhooks (SYNC_UPDATES_AVAILABLE,
 * INITIAL_UPDATE, HISTORICAL_UPDATE, DEFAULT_UPDATE, etc). Unlike every
 * other Sprint D function, the caller is Plaid itself, not our app, so there
 * is no Supabase Auth JWT to check — instead the request is authenticated by
 * verifying Plaid's own JWT signature (see _shared/plaidWebhookVerify.ts) and
 * this function is deployed with verify_jwt = false (supabase/config.toml)
 * so the Supabase gateway doesn't also demand a Supabase JWT it can never
 * receive.
 *
 * Anything that fails verification, or isn't a transactions-relevant
 * webhook_code, is ignored (2xx, so Plaid doesn't retry forever) rather than
 * acted on — this endpoint deliberately does the LEAST it can with an
 * unverified or irrelevant request.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyPlaidWebhook } from '../_shared/plaidWebhookVerify.ts';
import { syncLinkedItem } from '../_shared/plaidSync.ts';

// The TRANSACTIONS webhook_codes that mean "there is new data to sync" (per
// Plaid's documented webhook_code list). HISTORICAL_UPDATE/INITIAL_UPDATE
// fire once per newly-linked item as Plaid backfills history;
// DEFAULT_UPDATE/SYNC_UPDATES_AVAILABLE fire on new activity thereafter.
const RELEVANT_WEBHOOK_CODES = new Set([
  'SYNC_UPDATES_AVAILABLE',
  'INITIAL_UPDATE',
  'HISTORICAL_UPDATE',
  'DEFAULT_UPDATE',
]);

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

  // Read the RAW body text first — verification covers the exact bytes, and
  // re-serializing parsed JSON would silently break the hash check.
  const rawBody = await req.text();

  const verification = await verifyPlaidWebhook(req, rawBody);
  if (!verification.valid) {
    // Do not leak WHY verification failed to the caller beyond a generic
    // rejection — reject rather than process anything unverified.
    return new Response(JSON.stringify({ error: 'Webhook verification failed' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const payload = verification.payload as {
    webhook_type?: string;
    webhook_code?: string;
    item_id?: string;
  };

  if (payload.webhook_type !== 'TRANSACTIONS' || !payload.webhook_code || !RELEVANT_WEBHOOK_CODES.has(payload.webhook_code)) {
    // Verified but irrelevant (e.g. ITEM/AUTH webhooks) — acknowledge and
    // ignore.
    return new Response(JSON.stringify({ ignored: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!payload.item_id) {
    return new Response(JSON.stringify({ error: 'Missing item_id in webhook payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: item, error: findError } = await admin
      .from('linked_items')
      .select('id')
      .eq('plaid_item_id', payload.item_id)
      .maybeSingle();
    if (findError) throw findError;
    if (!item) {
      // Unknown item — nothing to sync (may be a stale/unlinked item).
      return new Response(JSON.stringify({ ignored: true, reason: 'Unknown item_id' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await syncLinkedItem(admin, item.id as string);

    return new Response(JSON.stringify({ synced: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // Plaid retries on failure responses — a 500 here is appropriate for a
    // genuine transient error (DB/Plaid API blip), unlike the verification
    // failures above which are deliberately final.
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
