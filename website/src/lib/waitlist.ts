import { supabase } from './supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WaitlistResult =
  | { ok: true }
  | { ok: false; code: 'invalid_email' | 'duplicate' | 'unknown'; error: string };

export async function submitToWaitlist(email: string): Promise<WaitlistResult> {
  // Normalize before the uniqueness check: the DB's UNIQUE constraint on
  // `email` is a plain btree index (not citext / lower(email)), so without
  // this, "Jane@Example.com" and "jane@example.com" would be treated as
  // distinct rows and the duplicate-signup message below would never fire.
  const trimmed = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(trimmed)) {
    return { ok: false, code: 'invalid_email', error: 'Please enter a valid email address.' };
  }

  const { error } = await supabase.from('waitlist_signups').insert({ email: trimmed });

  if (error) {
    // Postgres unique_violation
    if (error.code === '23505') {
      return { ok: false, code: 'duplicate', error: "You're already on the list!" };
    }
    return { ok: false, code: 'unknown', error: 'Something went wrong. Please try again.' };
  }

  return { ok: true };
}
