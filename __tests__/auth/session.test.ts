// FOUND-07: Auth session persists via Supabase localStorage polyfill

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: {
            session: { user: { id: 'persisted-user', email: 'test@example.com' }, access_token: 'tok' },
          },
        }),
      ),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ error: null, data: { session: null } })),
      signUp: jest.fn(() => Promise.resolve({ error: null, data: {} })),
      resetPasswordForEmail: jest.fn(() => Promise.resolve({ error: null })),
      signInWithIdToken: jest.fn(() => Promise.resolve({ error: null, data: { session: null, user: null } })),
    },
    from: jest.fn(() => ({ upsert: jest.fn(() => Promise.resolve({ error: null })) })),
  },
}));

import { useAuthStore } from '@/stores/authStore';

describe('auth / session persistence', () => {
  it('initialize loads existing session from Supabase client', async () => {
    useAuthStore.setState({ session: null, user: null, isLoading: true });
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().session).not.toBeNull();
    expect(useAuthStore.getState().user?.id).toBe('persisted-user');
  });
});
