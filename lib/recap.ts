/**
 * lib/recap.ts — Weekly Recap pure calculation engine
 *
 * ARCHITECTURE NOTE: PURE functions only — no React, no Supabase, no
 * AsyncStorage, no native imports. Turns date-ranged emission entries and this
 * week's zero-emission trips into the numbers + copy the Weekly Recap story
 * reads (NORTH_STAR.md §8 pattern 9 "Weekly Recap"). Fully unit-testable in
 * isolation (see __tests__/lib/recap.test.ts), mirroring the purity discipline
 * of lib/feedCopy.ts / lib/tripEngine.ts.
 *
 * VOICE RULES (NORTH_STAR.md §8.4 "Anti-Guilt"): the delta line is NEVER framed
 * as shame — a heavier week reads forward-looking and neutral ("a fresh start
 * this week"), never red-as-verdict. The week's win is celebration-framed.
 *
 * SOURCE OF TRUTH: emission_entries (not weekly_summaries) — the ring fix
 * established that the aggregate rows lag their entry writes. The recap hook
 * feeds this module date-ranged entries straight from the entries query.
 */

import type { EmissionCategory, TripMode } from '@/types/emission';
import { getISOWeekStart, getLocalDateString } from '@/lib/emissions';
import { formatKg } from '@/lib/format';

// ─── Structural input shapes ──────────────────────────────────────────────────
// Declared here (not imported from the hook graph) so this module stays pure;
// the hook maps its query rows onto these before calling in.

export interface RecapEntryInput {
  category: EmissionCategory;
  /** emission_entries.kg_co2e_total */
  kgCo2e: number;
  /** logged_at, as a Date */
  at: Date;
}

export interface RecapTripInput {
  /** zero-emission modes only — walk | cycling */
  mode: TripMode;
  distanceKm: number;
  /** kg CO₂ avoided vs driving the same distance */
  savedKg: number;
  /** ended_at, as a Date */
  at: Date;
}

// ─── Week windowing ────────────────────────────────────────────────────────────

export interface WeekWindow {
  /** ISO Monday, "YYYY-MM-DD" (local) */
  start: string;
  /** ISO Sunday, "YYYY-MM-DD" (local) */
  end: string;
}

/** Parses a local "YYYY-MM-DD" into a local-midnight Date (no UTC drift). */
function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Adds n days to a "YYYY-MM-DD" string, returning "YYYY-MM-DD" (local). */
function addDays(ymd: string, n: number): string {
  const dt = ymdToDate(ymd);
  dt.setDate(dt.getDate() + n);
  return dt.toLocaleDateString('en-CA');
}

/** The ISO week (Mon–Sun) containing `date`. */
export function weekWindow(date: Date): WeekWindow {
  const start = getISOWeekStart(date);
  return { start, end: addDays(start, 6) };
}

/** The ISO week immediately before the one containing `date`. */
export function previousWeekWindow(date: Date): WeekWindow {
  const currStart = getISOWeekStart(date);
  const prevStart = addDays(currStart, -7);
  return { start: prevStart, end: addDays(prevStart, 6) };
}

/** "Mar 16 – 22" (same month) or "Mar 30 – Apr 5" (crossing months). */
export function formatWeekRange(window: WeekWindow): string {
  const s = ymdToDate(window.start);
  const e = ymdToDate(window.end);
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
  if (sMonth === eMonth) return `${sMonth} ${s.getDate()} – ${e.getDate()}`;
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`;
}

// ─── Category split ────────────────────────────────────────────────────────────

export interface CategorySplit {
  food: number;
  transport: number;
  energy: number;
  shopping: number;
  total: number;
}

export function sumByCategory(entries: RecapEntryInput[]): CategorySplit {
  const split: CategorySplit = { food: 0, transport: 0, energy: 0, shopping: 0, total: 0 };
  for (const e of entries) {
    split[e.category] = (split[e.category] ?? 0) + e.kgCo2e;
    split.total += e.kgCo2e;
  }
  return split;
}

export function sumTotal(entries: RecapEntryInput[]): number {
  let total = 0;
  for (const e of entries) total += e.kgCo2e;
  return total;
}

// ─── Delta math ─────────────────────────────────────────────────────────────────

export type DeltaDirection = 'down' | 'up' | 'flat' | 'first-week';

export interface WeekDelta {
  currentKg: number;
  previousKg: number;
  /** current − previous (negative = lighter week) */
  deltaKg: number;
  /** rounded absolute %; null on the first tracked week */
  percent: number | null;
  direction: DeltaDirection;
  /** false ONLY for a heavier week — drives neutral (never red) coloring */
  improved: boolean;
  sentence: string;
}

/**
 * Week-over-week comparison. Guards divide-by-zero / the first tracked week
 * (previousKg <= 0) so a brand-new user never sees a NaN% or a shaming line.
 */
export function computeWeekDelta(currentKg: number, previousKg: number): WeekDelta {
  const deltaKg = currentKg - previousKg;

  // First tracked week (or no prior data) — a baseline, never a comparison.
  if (previousKg <= 0) {
    return {
      currentKg,
      previousKg,
      deltaKg,
      percent: null,
      direction: 'first-week',
      improved: true,
      sentence:
        currentKg > 0
          ? 'Your first tracked week — this is your baseline'
          : 'Your first week starts here',
    };
  }

  const rawPercent = (deltaKg / previousKg) * 100;
  const absRounded = Math.round(Math.abs(rawPercent));

  if (absRounded < 1) {
    return {
      currentKg,
      previousKg,
      deltaKg,
      percent: 0,
      direction: 'flat',
      improved: true,
      sentence: 'About the same as last week',
    };
  }

  const display = Math.min(absRounded, 999);

  if (rawPercent < 0) {
    return {
      currentKg,
      previousKg,
      deltaKg,
      percent: display,
      direction: 'down',
      improved: true,
      sentence: `Down ${display}% from last week`,
    };
  }

  return {
    currentKg,
    previousKg,
    deltaKg,
    percent: display,
    direction: 'up',
    improved: false,
    sentence: `Up ${display}% from last week — a fresh start this week`,
  };
}

// ─── Daily aggregates + sparkline ────────────────────────────────────────────────

export interface DayAggregate {
  /** "YYYY-MM-DD" (local) */
  date: string;
  totalKg: number;
}

export function aggregateByDay(entries: RecapEntryInput[]): DayAggregate[] {
  const byDay = new Map<string, number>();
  for (const e of entries) {
    const key = getLocalDateString(e.at);
    byDay.set(key, (byDay.get(key) ?? 0) + e.kgCo2e);
  }
  return [...byDay.entries()]
    .map(([date, totalKg]) => ({ date, totalKg }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** 7 daily totals aligned Mon→Sun to the given window (0 for empty days). */
export function weekSparkline(entries: RecapEntryInput[], window: WeekWindow): number[] {
  const byDay = new Map<string, number>();
  for (const e of entries) {
    const key = getLocalDateString(e.at);
    byDay.set(key, (byDay.get(key) ?? 0) + e.kgCo2e);
  }
  const out: number[] = [];
  let cursor = window.start;
  for (let i = 0; i < 7; i++) {
    out.push(byDay.get(cursor) ?? 0);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Distinct local days touched by any entry or zero-emission trip this week. */
export function distinctActiveDays(
  entries: RecapEntryInput[],
  trips: RecapTripInput[],
): number {
  const days = new Set<string>();
  for (const e of entries) days.add(getLocalDateString(e.at));
  for (const t of trips) days.add(getLocalDateString(t.at));
  return days.size;
}

// ─── Top category insight ────────────────────────────────────────────────────────

export interface TopCategory {
  category: EmissionCategory;
  kg: number;
  /** 0–1 share of the week's total */
  share: number;
  insight: string;
}

// One doable, forward-looking swap per category — never guilt, always a next
// step (NORTH_STAR.md §8.4: guilt without efficacy = churn).
const CATEGORY_INSIGHT: Record<EmissionCategory, string> = {
  transport: 'Getting around led your week — one walk or transit swap trims it fastest.',
  food: 'Food led your week — a couple of plant-forward meals make the biggest dent.',
  energy: 'Home energy led your week — small standby and thermostat wins add up.',
  shopping: 'Shopping led your week — buying less, and better, is the swap that sticks.',
};

export function topCategoryInsight(split: CategorySplit): TopCategory | null {
  if (split.total <= 0) return null;
  const cats: [EmissionCategory, number][] = [
    ['food', split.food],
    ['transport', split.transport],
    ['energy', split.energy],
    ['shopping', split.shopping],
  ];
  const [category, kg] = cats.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (kg <= 0) return null;
  return { category, kg, share: kg / split.total, insight: CATEGORY_INSIGHT[category] };
}

// ─── The week's win ───────────────────────────────────────────────────────────────

export type WeekWin =
  | {
      kind: 'zero';
      walkKm: number;
      cycleKm: number;
      totalZeroKm: number;
      savedKg: number;
      bestTrip: { mode: TripMode; distanceKm: number; savedKg: number };
    }
  | { kind: 'light-day'; date: string; totalKg: number }
  | { kind: 'empty' };

/**
 * Picks the celebration for page 3: the week's zero-emission movement when any
 * exists (aggregated walk/cycling km + kg saved vs driving, plus the single
 * biggest-saving trip); otherwise falls back to the week's lightest day.
 */
export function selectWeekWin(
  trips: RecapTripInput[],
  dayTotals: DayAggregate[],
): WeekWin {
  if (trips.length > 0) {
    let walkKm = 0;
    let cycleKm = 0;
    let savedKg = 0;
    for (const t of trips) {
      if (t.mode === 'cycling') cycleKm += t.distanceKm;
      else walkKm += t.distanceKm;
      savedKg += t.savedKg;
    }
    const best = trips.reduce((a, b) => (b.savedKg > a.savedKg ? b : a));
    return {
      kind: 'zero',
      walkKm,
      cycleKm,
      totalZeroKm: walkKm + cycleKm,
      savedKg,
      bestTrip: { mode: best.mode, distanceKm: best.distanceKm, savedKg: best.savedKg },
    };
  }
  if (dayTotals.length > 0) {
    const lightest = dayTotals.reduce((a, b) => (b.totalKg < a.totalKg ? b : a));
    return { kind: 'light-day', date: lightest.date, totalKg: lightest.totalKg };
  }
  return { kind: 'empty' };
}

/** "12" for 12.0, "12.4" otherwise — one decimal, trailing .0 dropped. */
function fmtKm(km: number): string {
  const rounded = Math.round(km * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Celebration copy for the win page — derived from selectWeekWin's output. */
export function winCopy(win: WeekWin): { eyebrow: string; title: string; body: string } {
  if (win.kind === 'zero') {
    const parts: string[] = [];
    if (win.walkKm > 0) parts.push(`walked ${fmtKm(win.walkKm)} km`);
    if (win.cycleKm > 0) parts.push(`cycled ${fmtKm(win.cycleKm)} km`);
    const activity = parts.length > 0 ? parts.join(' and ') : 'moved car-free';
    return {
      eyebrow: "The week's win",
      title: `You ${activity}`,
      body: `That saved about ${formatKg(win.savedKg)} vs driving. Nice one.`,
    };
  }
  if (win.kind === 'light-day') {
    const day = ymdToDate(win.date).toLocaleDateString('en-US', { weekday: 'long' });
    return {
      eyebrow: 'Your lightest day',
      title: `${day} was your lightest`,
      body: `Just ${formatKg(win.totalKg)} — proof a lighter day is doable.`,
    };
  }
  return {
    eyebrow: 'The week ahead',
    title: 'A fresh week',
    body: 'Your first car-free trip will show up here.',
  };
}
