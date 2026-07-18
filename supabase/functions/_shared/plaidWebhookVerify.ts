/**
 * supabase/functions/_shared/plaidWebhookVerify.ts — Plaid webhook JWT
 * verification (Sprint D Stage 3).
 *
 * Plaid signs every webhook POST with a JWT carried in the `Plaid-Verification`
 * header (ES256 / ECDSA P-256). Verification steps (per Plaid's published
 * webhook-verification scheme — this environment has no live webhook to test
 * against, so this is implemented strictly from Plaid's documented schema,
 * not a captured example; flagged again in the final report):
 *
 *   1. Decode the JWT header (without trusting it yet) to read `alg` (must
 *      be ES256) and `kid`.
 *   2. Fetch the verification key for that `kid` via POST
 *      /webhook_verification_key/get — response is a JWK (kty=EC, crv=P-256,
 *      x/y coordinates, plus created_at/expired_at). Cache by kid; refetch
 *      if the cached key's expired_at has passed (key rotation).
 *   3. Verify the JWT's ES256 signature against that JWK using WebCrypto
 *      (Deno's global `crypto.subtle`, no external dependency needed — the
 *      JOSE ES256 signature encoding, raw r||s concatenated, is exactly the
 *      format WebCrypto's ECDSA verify expects, so no DER conversion is
 *      needed).
 *   4. Check payload claims: `iat` must be within the last 5 minutes (Plaid's
 *      documented replay-attack guard), and `request_body_sha256` must match
 *      the SHA-256 of the EXACT raw request body bytes (must be computed
 *      before any JSON.parse/reserialization, since whitespace is
 *      significant) — compared in constant time.
 *
 * Anything that fails any of these steps is treated as UNVERIFIED and must
 * be rejected by the caller; this module never returns a "probably fine"
 * partial-success state.
 */
import { plaidFetch } from './plaid.ts';

interface PlaidWebhookJwk {
  alg: string;
  created_at: number;
  expired_at: number | null;
  kid: string;
  kty: string;
  crv: string;
  use: string;
  x: string;
  y: string;
}

const keyCache = new Map<string, PlaidWebhookJwk>();

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function getVerificationKey(kid: string): Promise<PlaidWebhookJwk> {
  const cached = keyCache.get(kid);
  const now = Math.floor(Date.now() / 1000);
  if (cached && (cached.expired_at === null || cached.expired_at > now)) {
    return cached;
  }
  const resp = await plaidFetch<{ key: PlaidWebhookJwk }>('/webhook_verification_key/get', { key_id: kid });
  keyCache.set(kid, resp.key);
  return resp.key;
}

export interface WebhookVerifyResult {
  valid: boolean;
  reason?: string;
  payload?: Record<string, unknown>;
}

const MAX_IAT_AGE_SECONDS = 5 * 60; // Plaid's documented replay-attack window

/**
 * Verifies a Plaid webhook. `rawBody` MUST be the exact, unmodified request
 * body text (read via req.text() before any JSON.parse) — the signature and
 * request_body_sha256 claim both cover the raw bytes.
 */
export async function verifyPlaidWebhook(req: Request, rawBody: string): Promise<WebhookVerifyResult> {
  const jwt = req.headers.get('Plaid-Verification') ?? req.headers.get('plaid-verification');
  if (!jwt) return { valid: false, reason: 'Missing Plaid-Verification header' };

  const parts = jwt.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'Malformed JWT' };
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(headerB64)));
  } catch {
    return { valid: false, reason: 'Unparseable JWT header' };
  }
  if (header.alg !== 'ES256' || !header.kid) {
    return { valid: false, reason: `Unexpected JWT header (alg=${header.alg})` };
  }

  let jwk: PlaidWebhookJwk;
  try {
    jwk = await getVerificationKey(header.kid);
  } catch (e) {
    return { valid: false, reason: `Could not fetch verification key: ${e instanceof Error ? e.message : e}` };
  }
  if (jwk.expired_at !== null && jwk.expired_at <= Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'Verification key expired' };
  }

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
  } catch (e) {
    return { valid: false, reason: `Invalid JWK: ${e instanceof Error ? e.message : e}` };
  }

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToBytes(signatureB64);
  const sigOk = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, signature as BufferSource, signingInput);
  if (!sigOk) return { valid: false, reason: 'Signature verification failed' };

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
  } catch {
    return { valid: false, reason: 'Unparseable JWT payload' };
  }

  const iat = typeof payload.iat === 'number' ? payload.iat : null;
  if (iat === null || Math.floor(Date.now() / 1000) - iat > MAX_IAT_AGE_SECONDS) {
    return { valid: false, reason: 'iat too old or missing (possible replay)' };
  }

  const expectedHash = typeof payload.request_body_sha256 === 'string' ? payload.request_body_sha256 : null;
  if (!expectedHash) return { valid: false, reason: 'Missing request_body_sha256 claim' };
  const actualHash = await sha256Hex(new TextEncoder().encode(rawBody));
  if (!constantTimeEqual(expectedHash, actualHash)) {
    return { valid: false, reason: 'Body hash mismatch' };
  }

  return { valid: true, payload };
}
