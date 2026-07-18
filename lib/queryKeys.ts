/**
 * lib/queryKeys.ts — shared React Query cache keys.
 *
 * Lives outside the hook files so cross-hook invalidation (offline queue →
 * entries/trips/summaries, entry deletion → trips) never needs a
 * hook-to-hook import, keeping the module graph cycle-free.
 */

export const ENTRY_KEYS = {
  all: ['emission_entries'] as const,
  list: (userId: string, dateFrom?: string, dateTo?: string) =>
    ['emission_entries', userId, dateFrom, dateTo] as const,
};

export const TRIP_KEYS = {
  all: ['detected_trips'] as const,
  needsConfirmation: (userId: string) => ['detected_trips', userId, 'needs_confirmation'] as const,
  recentAutoLogs: (userId: string) => ['detected_trips', userId, 'auto_confirmed'] as const,
};

export const LINKED_ITEMS_KEYS = {
  all: ['linked_items'] as const,
  list: (userId: string) => ['linked_items', userId] as const,
};
