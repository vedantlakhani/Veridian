// CRITICAL: expo-sqlite localStorage install MUST be the first import
import 'expo-sqlite/localStorage/install';
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// expo-sqlite localStorage polyfill only available on native; web uses default
const authStorage = Platform.OS !== 'web'
  ? (typeof localStorage !== 'undefined' ? localStorage : undefined)
  : undefined;

// Force native fetch — prevents whatwg-fetch polyfill from intercepting requests
const nativeFetch = global.fetch;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,      // CRITICAL: must be false for React Native
  },
  global: {
    fetch: nativeFetch,
  },
});

// Refresh token when app returns to foreground (native only)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
