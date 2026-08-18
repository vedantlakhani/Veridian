import { supabase } from './supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WaitlistResult = { ok: true } | { ok: false, error: string };

export async function submitToWaitlist(email: string): Promise<WaitlistResult> {
  const trimmed = email.trim();

  if (!EMAIL_REGEX.test(trimmed)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const { error } = await supabase.from('waitlist_signups').insert({ email: trimmed });

  if (error) {
    // Postgres unique_violation
    if (error.code === '23505') {
      return { ok: false, error: "You're already on the list!" };
    }
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }

  return { ok: true };
}
