// FOUND-04: Email/password auth signs in + returns session
// Mocks Supabase client — no network calls in tests

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(() =>
        Promise.resolve({ error: null, data: { session: { user: { id: 'test-user-id' } } } }),
      ),
      signUp: jest.fn(() =>
        Promise.resolve({ error: null, data: { user: { id: 'test-user-id' } } }),
      ),
      resetPasswordForEmail: jest.fn(() => Promise.resolve({ error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      signInWithIdToken: jest.fn(() =>
        Promise.resolve({ error: null, data: { user: { id: 'test-user-id' }, session: {} } }),
      ),
    },
    from: jest.fn(() => ({ upsert: jest.fn(() => Promise.resolve({ error: null })) })),
  },
}));

import { useAuthStore } from '@/stores/authStore';

describe('auth / email', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, user: null, isLoading: false, authError: null });
  });

  it('signInWithEmail calls supabase.auth.signInWithPassword', async () => {
    const { supabase } = require('@/lib/supabase');
    await useAuthStore.getState().signInWithEmail('test@example.com', 'password123');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('signUpWithEmail calls supabase.auth.signUp', async () => {
    const { supabase } = require('@/lib/supabase');
    await useAuthStore.getState().signUpWithEmail('new@example.com', 'password123');
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
    });
  });

  it('signOut clears session state', async () => {
    useAuthStore.setState({ session: { user: { id: 'test' } } as any });
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
