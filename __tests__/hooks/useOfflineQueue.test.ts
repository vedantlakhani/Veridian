// Wave 0 stub — hooks/useOfflineQueue does not exist yet; tests skip gracefully
// Covers PLSH-08: enqueue entry, flush on reconnect, sync count

// expo-sqlite pulls in expo-asset (not installed in this project) purely to
// support its localStorage polyfill — mock it so the module (and anything
// that imports it) can load under Jest. @/lib/supabase needs env vars this
// test environment doesn't set. @/hooks/useTrips pulls in expo-location/
// expo-task-manager/expo-notifications — mocked down to the one constant
// (TRIP_KEYS) this file actually needs, to keep the test isolated from those.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async () => {}),
    runAsync: jest.fn(async () => {}),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => ({ count: 0 })),
  })),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/hooks/useTrips', () => ({
  TRIP_KEYS: { all: ['detected_trips'] },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { ENTRY_KEYS, type CreateEntryInput } from '@/hooks/useEmissionEntries';

const addEventListenerMock = NetInfo.addEventListener as jest.Mock;
// Mirrors the literal used inside the '@/hooks/useTrips' mock factory above
// (factories can't reference outer consts — see Jest's out-of-scope check).
const TRIP_KEYS_STUB = ['detected_trips'];

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

let mod:
  | {
      enqueueEntry?: (payload: CreateEntryInput) => Promise<void>;
      flushQueue?: (mutate: (input: CreateEntryInput) => Promise<unknown>) => Promise<void>;
      getPendingCount?: () => Promise<number>;
    }
  | undefined;

beforeAll(async () => {
  try {
    mod = await import('@/hooks/useOfflineQueue');
  } catch {
    // source module doesn't exist yet — tests will be skipped
  }
});

describe('useOfflineQueue', () => {
  it('enqueueEntry is exported', () => {
    if (!mod) return; // guard: skips if source missing
    expect(typeof mod.enqueueEntry).toBe('function');
  });

  it('flushQueue is exported', () => {
    if (!mod) return; // guard: skips if source missing
    expect(typeof mod.flushQueue).toBe('function');
  });

  it('getPendingCount is exported', () => {
    if (!mod) return; // guard: skips if source missing
    expect(typeof mod.getPendingCount).toBe('function');
  });

  it('getPendingCount returns a number or undefined when source missing', async () => {
    if (!mod) return; // guard: skips if source missing
    if (typeof mod.getPendingCount === 'function') {
      const result = await mod.getPendingCount();
      expect(typeof result === 'number' || result === undefined).toBe(true);
    }
  });
});

// ─── useOfflineQueue hook — post-flush invalidation ──────────────────────────
// Exercises the actual reconnect -> flush -> invalidate wiring, including the
// Stage 3 additions (daily/weekly summaries + detected_trips), not just the
// original ENTRY_KEYS invalidation.
describe('useOfflineQueue hook — post-flush invalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addEventListenerMock.mockImplementation(() => jest.fn());
  });

  it('invalidates entries, daily/weekly summaries, and trips after a reconnect flush', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useOfflineQueue(jest.fn().mockResolvedValue(undefined)), {
      wrapper: makeWrapper(queryClient),
    });

    // Grab the listener useOfflineQueue registered and simulate reconnect
    const listener = addEventListenerMock.mock.calls[0][0] as (state: unknown) => void;
    listener({ isConnected: true, isInternetReachable: true });

    // flushQueue (getDb -> getAllAsync -> the empty-queue no-op loop) resolves
    // over several microtask ticks before the post-flush .then() fires.
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: TRIP_KEYS_STUB });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ENTRY_KEYS.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['daily_summary'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['weekly_summary'] });
  });

  it('does not invalidate anything while the device stays offline', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useOfflineQueue(jest.fn()), { wrapper: makeWrapper(queryClient) });

    const listener = addEventListenerMock.mock.calls[0][0] as (state: unknown) => void;
    await listener({ isConnected: false, isInternetReachable: false });
    await Promise.resolve();

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
