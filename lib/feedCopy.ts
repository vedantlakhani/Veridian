/**
 * lib/feedCopy.ts — Feed sentence-template library
 *
 * ARCHITECTURE NOTE: PURE functions only — no React, no Supabase, no
 * AsyncStorage, no native imports. Turns a feed item (an emission entry joined
 * with its factor, or a zero-emission detected trip) into the plain-language
 * sentence the "Today" feed reads out, plus the compact impact chip and the
 * clock/relative-time strings the review cards use. Fully unit-testable in
 * isolation (see __tests__/lib/feedCopy.test.ts).
 *
 * VOICE RULES (NORTH_STAR.md §8.1 "Today, Auto-Written", §8.4 "Anti-Guilt"):
 *   - Plain human language, never jargon. Sentences read like "Drove 12.4 km",
 *     "Walked 1.6 km — saved 0.3 kg vs driving", "Logged lunch — vegetarian".
 *   - "kg" is allowed only as a compact chip value ("0.9 kg"), never as
 *     "kg CO₂e" inside a sentence.
 *   - Zero-emission trips celebrate ("saved X kg vs driving"); nothing shames.
 */

import type { EmissionCategory, EntrySource, TripMode } from '@/types/emission';
import { humanizeSubcategory } from '@/lib/format';
import type { VIconName } from '@/components/ui/VIcon';

// ─── Feed item shapes ─────────────────────────────────────────────────────────
// Declared here structurally (not imported from useTrips/useEmissionEntries) so
// this module stays free of the stateful hook graph — mirrors the purity
// discipline of lib/tripEngine.ts and lib/activityFusion.ts. Home maps its
// query data onto these before calling in.

export interface FeedEntryInput {
  kind: 'entry';
  /** emission_factors.item */
  item: string;
  /** emission_factors.subcategory (raw, e.g. "RED_MEAT") */
  subcategory: string;
  category: EmissionCategory;
  /** emission_factors.unit (e.g. "km", "kg", "kWh") */
  unit: string;
  /** emission_entries.quantity — the distance for a transport/km entry */
  quantity: number;
  /** emission_entries.kg_co2e_total */
  kgCo2e: number;
  /** logged_at, as a Date */
  at: Date;
  /** emission_entries.source — 'transaction' entries get the spend-estimate
   *  sentence + chip treatment below. Optional/undefined for callers that
   *  predate Sprint D (treated identically to 'manual'/'sensor'). */
  source?: EntrySource;
  /** emission_entries.metadata.merchant_name (transaction entries only) */
  merchantName?: string | null;
  /** emission_entries.metadata.item_count (receipt entries only — Stage R4) */
  itemCount?: number | null;
  /** emission_entries.metadata.receipt_id (receipt entries only — Stage R4) */
  receiptId?: string | null;
  /** emission_entries.metadata.matched_transaction_id (receipt entries only —
   *  Stage R4). Present only when this receipt superseded a bank_transactions
   *  spend-estimate; drives the one-time "upgraded" chip animation. */
  matchedTransactionId?: string | null;
  /** emission_entries.created_at, as a Date — DB write time, distinct from
   *  `at` (logged_at, which for receipts is the backdated order date). Used
   *  only to decide whether the supersede animation is "fresh" (Stage R4). */
  createdAt?: Date;
}

export interface FeedTripInput {
  kind: 'trip';
  mode: TripMode;
  distanceKm: number;
  /** kg CO₂ avoided vs driving the same distance */
  savedKg: number;
  /** ended_at, as a Date */
  at: Date;
}

export type FeedItem = FeedEntryInput | FeedTripInput;

export interface ImpactChip {
  label: string;
  /** true for celebratory "saved" chips (positive accent), false for a plain kg */
  positive: boolean;
  /** true for spend-based estimates (source: 'transaction') — renders as a
   *  distinct muted pill, never identical to a sensor-measured plain kg
   *  value (NORTH_STAR.md §5: false precision is a documented churn cause). */
  estimated?: boolean;
}

// ─── Number formatting ──────────────────────────────────────────────────────

/** "12" for 12.0, "12.4" for 12.4, "1.6" for 1.6 — one decimal, trailing .0 dropped. */
function formatDistance(km: number): string {
  const rounded = Math.round(km * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Compact kg for chips: "0.9 kg", "12 kg", "<0.1 kg". Never "kg CO₂e". */
export function formatKgChip(kg: number): string {
  if (kg > 0 && kg < 0.1) return '<0.1 kg';
  if (kg >= 10) return `${kg.toFixed(0)} kg`;
  return `${kg.toFixed(1)} kg`;
}

// ─── Clock + relative day ─────────────────────────────────────────────────────

/** "8:12 AM", "12:00 PM", "12:05 AM" — locale-independent, deterministic. */
export function formatClockTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function startOfDayMs(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "Today" / "Yesterday" / weekday name ("Tuesday"). `now` injectable for tests. */
export function relativeDayLabel(date: Date, now: Date = new Date()): string {
  const diffDays = Math.round((startOfDayMs(now) - startOfDayMs(date)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return WEEKDAYS[date.getDay()];
}

// ─── Transport phrasing ─────────────────────────────────────────────────────

const DISTANCE_UNIT = /^(km|kilomet(er|re)s?|mi|mile|miles)$/i;

function isDistanceUnit(unit: string): boolean {
  return DISTANCE_UNIT.test(unit.trim());
}

/** Maps a transport factor to a natural verb phrase including distance. */
function transportPhrase(item: string, subcategory: string, distanceKm: number): string {
  const hay = `${item} ${subcategory}`.toLowerCase();
  const d = formatDistance(distanceKm);
  if (/(cycl|bike|bicycle)/.test(hay)) return `Cycled ${d} km`;
  if (/(walk|on foot|foot)/.test(hay)) return `Walked ${d} km`;
  if (/(bus|coach)/.test(hay)) return `Traveled ${d} km by bus`;
  if (/(train|rail|metro|subway|tram)/.test(hay)) return `Traveled ${d} km by train`;
  if (/(flight|flew|plane|aviation|air|haul)/.test(hay)) return `Flew ${d} km`;
  return `Drove ${d} km`; // car is the default for a transport/km entry
}

/** Appends a humanized subcategory only when it adds information the item lacks. */
function withQualifier(item: string, subcategory: string): string {
  const qualifier = humanizeSubcategory(subcategory);
  if (!qualifier) return item;
  const q = qualifier.toLowerCase();
  const i = item.toLowerCase();
  if (i.includes(q) || q.includes(i)) return item;
  return `${item} — ${qualifier}`;
}

// ─── Public: the feed sentence ─────────────────────────────────────────────────

/**
 * The one line the feed reads for a row. Transport distances lead the sentence
 * (the salient human fact); the kg lives in the chip, never the sentence.
 */
export function buildFeedSentence(item: FeedItem): string {
  if (item.kind === 'trip') {
    const d = formatDistance(item.distanceKm);
    const verb =
      item.mode === 'cycling' ? `Cycled ${d} km`
      : item.mode === 'walk' ? `Walked ${d} km`
      : `Traveled ${d} km`;
    return item.savedKg > 0 ? `${verb} — saved ${formatKgChip(item.savedKg)} vs driving` : verb;
  }

  if (item.category === 'transport' && isDistanceUnit(item.unit)) {
    return transportPhrase(item.item, item.subcategory, item.quantity);
  }

  // Transaction-sourced entries (Sprint D "money layer"): lead with the
  // merchant when we have one — "Grocery Stores at Trader Joe's" — the
  // plain-language fact a spend-based estimate actually knows, rather than
  // the generic subcategory qualifier used for manually-logged items.
  if (item.source === 'transaction' && item.merchantName) {
    return `${item.item} at ${item.merchantName}`;
  }

  // Receipt-sourced entries (Sprint E Stage R4): one emission_entries row per
  // item, but the feed reads at the receipt/order level — "Amazon order — 3
  // items" — not a separate line per item. itemCount comes from
  // metadata.item_count (Stage 1 wrote metadata per-item; Stage R4 added the
  // denormalized count — see receipt-parse/index.ts). Falls back to the plain
  // "Logged X" sentence if a merchant or count is missing (e.g. older rows
  // parsed before this field existed).
  if (item.source === 'receipt' && item.merchantName && item.itemCount && item.itemCount > 0) {
    const noun = item.itemCount === 1 ? 'item' : 'items';
    return `${item.merchantName} order — ${item.itemCount} ${noun}`;
  }

  // Food / energy / shopping (and non-distance transport): describe the thing;
  // the impact lands in the chip.
  return `Logged ${withQualifier(item.item, item.subcategory)}`;
}

// ─── Public: the impact chip ────────────────────────────────────────────────

export function buildImpactChip(item: FeedItem): ImpactChip {
  if (item.kind === 'trip') {
    return { label: `saved ${formatKgChip(item.savedKg)}`, positive: true };
  }
  if (item.source === 'transaction') {
    // "~" prefix + estimated:true drive a visually distinct muted chip —
    // never a plain confident kg value like a sensor-measured entry gets.
    return { label: `~${formatKgChip(item.kgCo2e)}`, positive: false, estimated: true };
  }
  return { label: formatKgChip(item.kgCo2e), positive: false };
}

// ─── Public: the supersede "upgraded" moment (Stage R4) ────────────────────
//
// SIMPLIFICATION (documented per task spec): a true live in-place morph of
// the OLD transaction row's "~4.2 kg est." chip into the new receipt-based
// number would require realtime push timing this repo doesn't have wired for
// this case, AND the old row may not even be mounted when the swap happens
// (receipt-parse deletes the old emission_entries row server-side in the same
// request that creates the new one — see index.ts's supersede-matching
// block). Instead: the NEW receipt-sourced row, on its first appearance in
// the feed, plays a one-time "upgraded" micro-animation (FadeIn + scale pulse
// in index.tsx) if it is both receipt-sourced, references a superseded
// transaction, and was created recently enough that the user plausibly still
// has the feed open from when the estimate first landed.

const SUPERSEDE_ANIMATION_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

/**
 * True when a receipt-sourced entry just upgraded a coarse transaction
 * estimate AND is fresh enough to treat as "the user is probably watching
 * this happen right now" rather than a receipt parsed hours/days later.
 * `now` injectable for deterministic tests.
 */
export function isFreshSupersedeUpgrade(item: FeedItem, now: Date = new Date()): boolean {
  if (item.kind !== 'entry') return false;
  if (item.source !== 'receipt') return false;
  if (!item.matchedTransactionId) return false;
  if (!item.createdAt) return false;
  const ageMs = now.getTime() - item.createdAt.getTime();
  return ageMs >= 0 && ageMs < SUPERSEDE_ANIMATION_WINDOW_MS;
}

// ─── Public: feed row icon ──────────────────────────────────────────────────
// A transport *entry* only carries a generic `category: 'transport'` — unlike
// a zero-emission detected trip, it has no `mode`. Without inspecting the
// underlying factor, every transport entry (a cycling/e-bike factor included)
// rendered the car glyph. VIcon (components/ui/VIcon.tsx) has no dedicated
// bus/train glyph, so those — and anything else transport — fall back to 'car'.

const BIKE_HINT = /bike|cycl|e-bike/i;
const WALK_HINT = /walk|foot/i;

/** Which VIconName a feed row should show. */
export function pickFeedIcon(item: FeedItem): VIconName {
  if (item.kind === 'trip') {
    return item.mode === 'cycling' ? 'bike' : 'walk';
  }
  switch (item.category) {
    case 'food':
      return 'fork';
    case 'energy':
      return 'bolt';
    case 'shopping':
      return 'sparkle';
    case 'transport': {
      const hay = `${item.item} ${item.subcategory}`;
      if (BIKE_HINT.test(hay)) return 'bike';
      if (WALK_HINT.test(hay)) return 'walk';
      return 'car'; // bus/train/rail/transit/car — no closer VIcon glyph exists
    }
  }
}

// ─── Public: the review-card sentence ──────────────────────────────────────────

const MODE_NOUN: Record<TripMode, string> = {
  car: 'drive',
  walk: 'walk',
  cycling: 'bike ride',
  bus: 'bus ride',
  train: 'train ride',
  unknown: 'trip',
};

/**
 * The confirm-card opener: "Looks like a 12.4 km drive, Tuesday 8:12 AM".
 * `now` injectable for deterministic tests.
 */
export function buildTripConfirmSentence(
  trip: { mode: TripMode; distanceKm: number; startedAt: Date },
  now: Date = new Date(),
): string {
  const d = formatDistance(trip.distanceKm);
  const noun = MODE_NOUN[trip.mode] ?? MODE_NOUN.unknown;
  const day = relativeDayLabel(trip.startedAt, now);
  const time = formatClockTime(trip.startedAt);
  return `Looks like a ${d} km ${noun}, ${day} ${time}`;
}
