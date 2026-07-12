// Pure-function tests for lib/tripNotifications' selectNewlyNotifiableKeys — the
// set-difference behind the batched "trips spotted" needs_confirmation
// notification. Guards the one-shot-per-trip guarantee: refresh() re-detects the
// same real-world trip via its stable client_trip_key on every foreground, and
// without this dedupe the user would get a fresh ping each pass.

import { selectNewlyNotifiableKeys } from '@/lib/tripNotifications';

describe('selectNewlyNotifiableKeys', () => {
  it('returns all candidates when none were previously notified', () => {
    const result = selectNewlyNotifiableKeys(['a', 'b', 'c'], new Set());
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('filters out keys already notified in a prior pass', () => {
    const result = selectNewlyNotifiableKeys(['a', 'b', 'c'], new Set(['a', 'c']));
    expect(result).toEqual(['b']);
  });

  it('returns empty when every candidate was already notified — no re-ping', () => {
    const result = selectNewlyNotifiableKeys(['a', 'b'], new Set(['a', 'b']));
    expect(result).toEqual([]);
  });

  it('returns empty for no candidates', () => {
    expect(selectNewlyNotifiableKeys([], new Set(['a']))).toEqual([]);
  });

  it('de-duplicates repeated keys within a single pass (one notification each)', () => {
    const result = selectNewlyNotifiableKeys(['a', 'a', 'b', 'b', 'a'], new Set());
    expect(result).toEqual(['a', 'b']);
  });

  it('preserves candidate order', () => {
    const result = selectNewlyNotifiableKeys(['c', 'a', 'b'], new Set());
    expect(result).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate the alreadyNotified set', () => {
    const notified = new Set(['a']);
    selectNewlyNotifiableKeys(['a', 'b'], notified);
    expect([...notified]).toEqual(['a']);
  });
});
