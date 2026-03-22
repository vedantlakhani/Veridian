import { useEffect, useRef } from 'react';
import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import type { CreateEntryInput } from '@/hooks/useEmissionEntries';
import { ENTRY_KEYS } from '@/hooks/useEmissionEntries';

// UUID generation — crypto.randomUUID() available in RN 0.73+ / Hermes (this project: RN 0.81.5)
function generateId(): string {
  return crypto.randomUUID();
}

// Module-level singleton so DB is opened and table created at most once per process
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('offline_queue.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS offline_queue (
          id TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          synced_at INTEGER
        )
      `);
      return db;
    });
  }
  return dbPromise;
}

/**
 * Inserts one entry into the local SQLite offline_queue table.
 * Called instead of the Supabase mutation when the device is offline.
 */
export async function enqueueEntry(payload: CreateEntryInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO offline_queue (id, payload, created_at) VALUES (?, ?, ?)',
    [generateId(), JSON.stringify(payload), Date.now()]
  );
}

/**
 * Reads all un-synced rows from offline_queue, calls `mutate` for each,
 * and marks each row's synced_at on success.
 * Failures are left un-synced and will be retried on the next reconnect.
 */
export async function flushQueue(
  mutate: (input: CreateEntryInput) => Promise<unknown>
): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; payload: string }>(
    'SELECT id, payload FROM offline_queue WHERE synced_at IS NULL ORDER BY created_at ASC'
  );
  for (const row of rows) {
    try {
      const input = JSON.parse(row.payload) as CreateEntryInput;
      await mutate(input);
      await db.runAsync(
        'UPDATE offline_queue SET synced_at = ? WHERE id = ?',
        [Date.now(), row.id]
      );
    } catch {
      // Leave row un-synced — will retry on next reconnect
    }
  }
}

/**
 * Returns the number of entries that have not yet been synced to Supabase.
 */
export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_queue WHERE synced_at IS NULL'
  );
  return row?.count ?? 0;
}

/**
 * React hook — initialises the SQLite DB on mount, then subscribes to
 * NetInfo. When connectivity is restored, flushes the queue and
 * invalidates the React Query cache so the UI refreshes.
 *
 * Must be called inside a component that is a descendant of QueryClientProvider.
 */
export function useOfflineQueue(
  mutate: (input: CreateEntryInput) => Promise<unknown>
): void {
  const queryClient = useQueryClient();
  // Keep mutate stable across renders via ref to avoid re-subscribing
  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;

  useEffect(() => {
    // Initialise DB immediately on mount so it is ready before any entry is queued
    void getDb();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        void flushQueue(mutateRef.current).then(() => {
          queryClient.invalidateQueries({ queryKey: ENTRY_KEYS.all });
        });
      }
    });

    return () => unsubscribe();
  }, [queryClient]);
}
