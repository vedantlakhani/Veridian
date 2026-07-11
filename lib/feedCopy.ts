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

import type { EmissionCategory, TripMode } from '@/types/emission';
import { humanizeSubcategory } from '@/lib/format';

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

  // Food / energy / shopping (and non-distance transport): describe the thing;
  // the impact lands in the chip.
  return `Logged ${withQualifier(item.item, item.subcategory)}`;
}

// ─── Public: the impact chip ────────────────────────────────────────────────

export function buildImpactChip(item: FeedItem): ImpactChip {
  if (item.kind === 'trip') {
    return { label: `saved ${formatKgChip(item.savedKg)}`, positive: true };
  }
  return { label: formatKgChip(item.kgCo2e), positive: false };
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
