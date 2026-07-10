// Tests for hooks/useDurableCreateEntry — the durable wrapper around
// useCreateEntry: offline/network-level failures enqueue via the SQLite
// offline queue instead of being lost; genuine server rejections (RLS/
// validation errors, which always carry a Supabase error `code`) still throw.

import { renderHook } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { createDurableEntry, useDurableCreateEntry } from '@/hooks/useDurableCreateEntry';
import { enqueueEntry } from '@/hooks/useOfflineQueue';
import { useCreateEntry } from '@/hooks/useEmissionEntries';
import type { CreateEntryInput } from '@/hooks/useEmissionEntries';
import type { EmissionFactor } from '@/types/emission';

// Mock NetInfo — createDurableEntry calls NetInfo.fetch() imperatively, only
// on the mutateAsync failure path.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

// Mock the offline queue — this test exercises the queue-or-throw decision,
// not the SQLite persistence itself (covered in useOfflineQueue.test.ts).
jest.mock('@/hooks/useOfflineQueue', () => ({
  enqueueEntry: jest.fn(),
}));

// Mock useCreateEntry — isolates useDurableCreateEntry from the real
// Supabase-backed mutation (and its onSuccess side effects), following the
// mock-the-direct-dependency pattern used elsewhere in __tests__/hooks/.
jest.mock('@/hooks/useEmissionEntries', () => ({
  useCreateEntry: jest.fn(),
}));

const mockFetch = NetInfo.fetch as jest.Mock;
const mockEnqueueEntry = enqueueEntry as jest.Mock;
const mockUseCreateEntry = useCreateEntry as jest.Mock;

const factor: EmissionFactor = {
  id: 'factor-1',
  category: 'transport',
  subcategory: 'car',
  item: 'Petrol car (medium)',
  unit: 'km',
  kg_co2e: 0.17,
} as EmissionFactor;

const input: CreateEntryInput = {
  userId: 'user-1',
  factor,
  quantity: 10,
  source: 'sensor',
  status: 'auto_confirmed',
  confidence: 0.8,
  tripId: 'trip-1',
  loggedAt: '2026-07-01T08:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createDurableEntry', () => {
  it('returns the mutation result on success and never touches NetInfo or the queue', async () => {
    const entry = { id: 'entry-1', kg_co2e_total: 1.7 };
    const mutateAsync = jest.fn().mockResolvedValue(entry);

    const result = await createDurableEntry(mutateAsync, input);

    expect(result).toBe(entry);
    expect(mutateAsync).toHaveBeenCalledWith(input);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockEnqueueEntry).not.toHaveBeenCalled();
  });

  it('enqueues durably when NetInfo reports the device offline', async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error('some failure'));
    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });

    const result = await createDurableEntry(mutateAsync, input);

    expect(result).toEqual({ queued: true });
    expect(mockEnqueueEntry).toHaveBeenCalledWith(input);
  });

  it('enqueues on a network-level failure (fetch TypeError) even when NetInfo reports connected', async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });

    const result = await createDurableEntry(mutateAsync, input);

    expect(result).toEqual({ queued: true });
    expect(mockEnqueueEntry).toHaveBeenCalledWith(input);
  });

  it('enqueues on a "Network request failed" message even without a TypeError instance', async () => {
    const mutateAsync = jest.fn().mockRejectedValue({ message: 'Network request failed' });
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });

    const result = await createDurableEntry(mutateAsync, input);

    expect(result).toEqual({ queued: true });
    expect(mockEnqueueEntry).toHaveBeenCalledWith(input);
  });

  it('rethrows a genuine server rejection (Supabase error code) and does not enqueue', async () => {
    const rlsError = { code: '42501', message: 'new row violates row-level security policy' };
    const mutateAsync = jest.fn().mockRejectedValue(rlsError);
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });

    await expect(createDurableEntry(mutateAsync, input)).rejects.toBe(rlsError);
    expect(mockEnqueueEntry).not.toHaveBeenCalled();
  });

  it('rethrows a server error even if its message mentions "network" — a Supabase `code` always wins', async () => {
    const validationError = { code: '23514', message: 'Network request failed (coincidental wording)' };
    const mutateAsync = jest.fn().mockRejectedValue(validationError);
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });

    await expect(createDurableEntry(mutateAsync, input)).rejects.toBe(validationError);
    expect(mockEnqueueEntry).not.toHaveBeenCalled();
  });
});

describe('useDurableCreateEntry', () => {
  it('wires createDurable to the underlying useCreateEntry().mutateAsync', async () => {
    const entry = { id: 'entry-2', kg_co2e_total: 0.5 };
    const mutateAsync = jest.fn().mockResolvedValue(entry);
    mockUseCreateEntry.mockReturnValue({ mutateAsync, isPending: false });

    const { result } = renderHook(() => useDurableCreateEntry());
    const outcome = await result.current.createDurable(input);

    expect(outcome).toBe(entry);
    expect(mutateAsync).toHaveBeenCalledWith(input);
  });

  it('exposes the underlying mutation state (isPending) alongside createDurable', () => {
    mockUseCreateEntry.mockReturnValue({ mutateAsync: jest.fn(), isPending: true });

    const { result } = renderHook(() => useDurableCreateEntry());

    expect(result.current.isPending).toBe(true);
    expect(typeof result.current.createDurable).toBe('function');
  });
});
