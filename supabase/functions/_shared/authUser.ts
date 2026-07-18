/**
 * supabase/functions/_shared/authUser.ts — shared caller-verification helper
 * (Sprint D Stage 3).
 *
 * Follows analyze-emissions/index.ts's pattern (the one SPRINT_D_SPEC.md
 * points at): verify the Authorization header's bearer token against
 * Supabase Auth via a network round-trip (auth.getUser), which validates
 * signature + expiry + revocation server-side rather than trusting a locally
 * decoded JWT payload. Returns the verified user or a ready-to-return 401
 * Response so every authenticated function has identical failure behavior.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

export interface VerifiedUser {
  id: string;
}

type AuthResult = { user: VerifiedUser; errorResponse?: undefined } | { user?: undefined; errorResponse: Response };

export async function verifyUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      errorResponse: new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) {
    return {
      errorResponse: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  return { user: { id: user.id } };
}
