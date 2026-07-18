/**
 * lib/edgeFunction.ts — shared authenticated edge-function POST helper.
 *
 * Direct fetch, NOT supabase.functions.invoke(): invoke() internally
 * overwrites our Authorization header with its own accessToken() call (see
 * hooks/useAiInsight.ts, the existing precedent for this exact workaround).
 * Every Sprint D hook that calls a `plaid-*` edge function goes through this
 * one helper instead of re-deriving the same fetch boilerplate per call site.
 */
export class EdgeFunctionError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.status = status;
  }
}

export async function callEdgeFunction<TResponse>(
  functionName: string,
  accessToken: string,
  body?: Record<string, unknown>,
): Promise<TResponse> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body ?? {}),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof json?.error === 'string' ? json.error : `Edge function error ${response.status}`;
    throw new EdgeFunctionError(response.status, message);
  }
  return json as TResponse;
}
