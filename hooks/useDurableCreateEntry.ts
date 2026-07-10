import { useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useCreateEntry, type CreateEntryInput } from '@/hooks/useEmissionEntries';
import { enqueueEntry } from '@/hooks/useOfflineQueue';
import type { EmissionEntryWithFactor } from '@/types/emission';

// Purpose: durable wrapper around useCreateEntry. A write that fails because
// the device is offline or the request never reached the server (fetch-level
// failure) is queued into the SQLite offline_queue instead of being lost; a
// genuine server rejection (RLS, validation — anything carrying a Supabase
// error `code`) still throws so callers keep their existing error handling.
// CreateEntryInput already carries `loggedAt`, so a queued entry replays with
// its original timestamp once flushed and lands on the correct day's summary,
// not the day the flush happens to run.

export type DurableCreateResult = EmissionEntryWithFactor | { queued: true };

/**
 * True for a network-level failure: `fetch()` throws a bare TypeError when it
 * can't reach the server at all, and RN reports the same case as a
 * 'Network request failed' message. A Supabase/Postgrest error always carries
 * a `code`, so anything with one is a genuine server rejection, not a network
 * failure, regardless of its message text.
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error && typeof error === 'object') {
    const e = error as { code?: unknown; message?: unknown };
    if (e.code !== undefined) return false;
    if (typeof e.message === 'string' && /network request failed/i.test(e.message)) return true;
  }
  return false;
}

/**
 * Exported for testing — the queue-or-throw decision, decoupled from the
 * useCreateEntry hook so it can be exercised without rendering one.
 */
export async function createDurableEntry(
  mutateAsync: (input: CreateEntryInput) => Promise<EmissionEntryWithFactor>,
  input: CreateEntryInput,
): Promise<DurableCreateResult> {
  try {
    return await mutateAsync(input);
  } catch (error) {
    const state = await NetInfo.fetch();
    const offline = state.isConnected === false || state.isInternetReachable === false;
    if (offline || isNetworkError(error)) {
      await enqueueEntry(input);
      return { queued: true };
    }
    throw error;
  }
}

export function useDurableCreateEntry() {
  const createEntry = useCreateEntry();
  const createDurable = useCallback(
    (input: CreateEntryInput) => createDurableEntry(createEntry.mutateAsync, input),
    [createEntry.mutateAsync],
  );
  return { ...createEntry, createDurable };
}
