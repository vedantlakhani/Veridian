/**
 * supabase/functions/plaid-link-token/index.ts — Sprint D Stage 3
 *
 * POST, authenticated. Calls Plaid /link/token/create with the caller's own
 * user id as client_user_id and returns { link_token } for the mobile app's
 * react-native-plaid-link-sdk to open Plaid Link.
 */
import { corsHeaders } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/authUser.ts';
import { plaidFetch, PlaidError } from '../_shared/plaid.ts';

interface LinkTokenCreateResponse {
  link_token: string;
  expiration: string;
  request_id: string;
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

    const resp = await plaidFetch<LinkTokenCreateResponse>('/link/token/create', {
      client_name: 'Veridian',
      language: 'en',
      country_codes: ['US'],
      user: { client_user_id: auth.user.id },
      products: ['transactions'],
    });

    return new Response(JSON.stringify({ link_token: resp.link_token }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
