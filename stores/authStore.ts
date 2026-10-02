import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

// Google Sign-In: native module — only works in EAS Build / local dev build, NOT Expo Go
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const hasRealGoogleClientId = !!googleWebClientId && !googleWebClientId.startsWith('placeholder-');

let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  if (hasRealGoogleClientId) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    GoogleSignin!.configure({ webClientId: googleWebClientId });
  } else {
    // No real client ID configured yet — leave the module unconfigured so
    // signInWithGoogle() can surface a clear error instead of the native
    // module throwing at import time.
    GoogleSignin = null;
  }
} catch {
  // Module not available in Expo Go — Google Sign-In will be disabled at runtime
  GoogleSignin = null;
}

/**
 * Whether each social sign-in can actually work in this build. The login screen
 * only renders a button when its provider is configured, so users never meet a
 * dead button or a developer message.
 *  - Google needs a real EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and the native module.
 *  - Apple needs the Sign in with Apple capability (app.json ios.usesAppleSignIn)
 *    compiled into the build, which in turn needs a paid Apple Developer team.
 */
export const isGoogleSignInAvailable = GoogleSignin !== null;
export const isAppleSignInAvailable =
  Platform.OS === 'ios' && Constants.expoConfig?.ios?.usesAppleSignIn === true;

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  authError: string | null;

  setSession: (session: Session | null) => void;
  setAuthError: (error: string | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  authError: null,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setAuthError: (authError) => set({ authError }),

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      isLoading: false,
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, authError: null });
  },

  signInWithEmail: async (email, password) => {
    set({ authError: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ authError: error.message });
  },

  signUpWithEmail: async (email, password) => {
    set({ authError: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) set({ authError: error.message });
  },

  resetPassword: async (email) => {
    set({ authError: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'veridian://reset-password',
    });
    if (error) set({ authError: error.message });
  },

  signInWithGoogle: async () => {
    set({ authError: null });
    if (!GoogleSignin) {
      set({ authError: 'Google Sign-In is not configured yet — add a real EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.' });
      return;
    }
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.data?.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });
        if (error) set({ authError: error.message });
      } else {
        set({ authError: 'Google Sign-In did not return an ID token.' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google Sign-In failed.';
      set({ authError: message });
    }
  },

  signInWithApple: async () => {
    set({ authError: null });
    if (Platform.OS !== 'ios') {
      set({ authError: 'Apple Sign-In is only available on iOS.' });
      return;
    }
    try {
      const AppleAuthentication = await import('expo-apple-authentication');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) {
          set({ authError: error.message });
          return;
        }
        // CRITICAL: Apple only provides name/email on FIRST sign-in
        // Store immediately before navigating away
        if (data.user && (credential.fullName?.givenName || credential.email)) {
          const displayName = credential.fullName?.givenName
            ? `${credential.fullName.givenName} ${credential.fullName.familyName ?? ''}`.trim()
            : null;
          await supabase.from('profiles').upsert({
            id: data.user.id,
            display_name: displayName,
          });
        }
      } else {
        set({ authError: 'Apple Sign-In did not return an identity token.' });
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'ERR_REQUEST_CANCELED') return; // user dismissed — not an error
      const message = err instanceof Error ? err.message : 'Apple Sign-In failed.';
      set({ authError: message });
    }
  },
}));
