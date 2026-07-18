/**
 * supabase/functions/_shared/plaid.ts — shared Plaid API client (Sprint D Stage 3)
 *
 * Every Plaid call in this repo goes through `plaidFetch` so the base URL,
 * client_id/secret injection, and error shape are handled in exactly one
 * place. PLAID_CLIENT_ID / PLAID_SECRET / PLAID_ENV are Supabase edge-function
 * secrets (confirmed already set — never read from request bodies or the
 * client, and never logged).
 */

// Plaid's environments each have a fixed, dedicated host. 'development' is
// Plaid's legacy (now retired for new apps) third tier — kept here only as a
// harmless fallback so a misconfigured PLAID_ENV fails loudly via Plaid's own
// error response rather than silently hitting the wrong host.
const PLAID_BASE_URLS: Record<string, string> = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

function plaidBaseUrl(): string {
  const env = Deno.env.get('PLAID_ENV') ?? 'sandbox';
  const base = PLAID_BASE_URLS[env];
  if (!base) {
    throw new Error(`Unknown PLAID_ENV "${env}" — expected one of ${Object.keys(PLAID_BASE_URLS).join(', ')}`);
  }
  return base;
}

/**
 * Typed error for any non-2xx Plaid response. Plaid's error body is a stable,
 * documented shape (error_type/error_code/error_message/display_message/
 * request_id) — surface it verbatim rather than a generic HTTP error so
 * callers (and logs) can distinguish e.g. ITEM_LOGIN_REQUIRED from a network
 * fault.
 */
export class PlaidError extends Error {
  readonly errorType?: string;
  readonly errorCode?: string;
  readonly displayMessage?: string | null;
  readonly requestId?: string;
  readonly httpStatus: number;

  constructor(httpStatus: number, body: Record<string, unknown>) {
    const errorMessage = typeof body.error_message === 'string' ? body.error_message : 'Unknown Plaid error';
    super(`Plaid error (${body.error_code ?? httpStatus}): ${errorMessage}`);
    this.name = 'PlaidError';
    this.httpStatus = httpStatus;
    this.errorType = typeof body.error_type === 'string' ? body.error_type : undefined;
    this.errorCode = typeof body.error_code === 'string' ? body.error_code : undefined;
    this.displayMessage = (body.display_message as string | null | undefined) ?? null;
    this.requestId = typeof body.request_id === 'string' ? body.request_id : undefined;
  }
}

/**
 * POSTs { client_id, secret, ...body } as JSON to `${plaidBaseUrl()}${path}`.
 * Throws PlaidError on any non-2xx response. Generic on the parsed success
 * response shape so each call site stays typed without duplicating fetch
 * plumbing.
 */
export async function plaidFetch<TResponse>(path: string, body: Record<string, unknown>): Promise<TResponse> {
  const clientId = Deno.env.get('PLAID_CLIENT_ID');
  const secret = Deno.env.get('PLAID_SECRET');
  if (!clientId || !secret) {
    throw new Error('PLAID_CLIENT_ID / PLAID_SECRET are not configured in edge-function secrets');
  }

  const res = await fetch(`${plaidBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new PlaidError(res.status, json);
  }

  return json as TResponse;
}
