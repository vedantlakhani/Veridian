/**
 * lib/emissions.ts — Emission Calculation Engine
 *
 * ARCHITECTURE NOTE: This file is split into two sections:
 *   1. Pure functions (no Supabase) — testable in isolation
 *   2. Async helpers (with Supabase) — called from mutation hooks
 *
 * Tests import only pure functions; the Supabase import is in this file
 * but only executed when the async helpers are called.
 *
 * Source: DEFRA 2025 specification
 */

import type { EmissionEntryWithFactor } from '@/types/emission';

// ─── Pure Calculation Functions (no Supabase) ────────────────────────────────

/**
 * Core formula: DEFRA 2025 specification
 * quantity × kg_co2e_per_unit = total kg CO₂e
 * NEVER pass hardcoded kg_co2e values — always read from EmissionFactor.kg_co2e
 */
export function calcEmission(factorKgCo2e: number, quantity: number): number {
  return factorKgCo2e * quantity;
}

/**
 * Returns today's date as a local-timezone ISO date string "YYYY-MM-DD".
 * CRITICAL: Do NOT use toISOString() — that returns UTC, causing date drift for non-UTC users.
 * Use toLocaleDateString('en-CA') which returns ISO format using device local timezone.
 */
export function getLocalDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA');
}

/**
 * Returns the ISO week start (Monday) for a given date as "YYYY-MM-DD".
 * ISO weeks start on Monday (day index 1). Sunday (0) is treated as day 7.
 *
 * Example: 2026-03-18 (Wednesday) → '2026-03-16' (Monday)
 *          2026-03-22 (Sunday)    → '2026-03-16' (Monday)
 */
export function getISOWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  d.setDate(diff);
  return d.toLocaleDateString('en-CA');
}

export interface DailyCategoryTotals {
  food: number;
  transport: number;
  energy: number;
  total: number;
}

/**
 * Aggregates emission entries by category.
 * Used to compute daily_summaries fields from raw emission_entries rows.
 * ALWAYS recompute from all entries — never apply deltas (avoids summary drift on edit/delete).
 */
export function computeDailyCategoryTotals(
  entries: EmissionEntryWithFactor[]
): DailyCategoryTotals {
  const totals: DailyCategoryTotals = { food: 0, transport: 0, energy: 0, total: 0 };
  for (const entry of entries) {
    const category = entry.emission_factors.category;
    totals[category] = (totals[category] ?? 0) + entry.kg_co2e_total;
    totals.total += entry.kg_co2e_total;
  }
  return totals;
}

/**
 * Builds the upsert payload for daily_summaries.
 * Caller must pass pre-computed totals from computeDailyCategoryTotals.
 */
export function buildDailySummaryPayload(
  userId: string,
  date: string,
  totals: DailyCategoryTotals
) {
  return {
    user_id: userId,
    date,                           // "YYYY-MM-DD" from getLocalDateString()
    total_kg_co2e: totals.total,
    food_kg: totals.food,
    transport_kg: totals.transport,
    energy_kg: totals.energy,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Builds the upsert payload for weekly_summaries.
 * week_start must be the ISO Monday from getISOWeekStart().
 */
export function buildWeeklySummaryPayload(
  userId: string,
  weekStart: string,
  totals: DailyCategoryTotals
) {
  return {
    user_id: userId,
    week_start: weekStart,
    total_kg_co2e: totals.total,
    breakdown: {
      food: totals.food,
      transport: totals.transport,
      energy: totals.energy,
    },
    updated_at: new Date().toISOString(),
  };
}

// ─── Async Summary Helpers (with Supabase) ───────────────────────────────────

import { supabase } from '@/lib/supabase';

/**
 * Fetches all emission_entries for a user on a given date, computes totals,
 * and upserts daily_summaries. Called after every INSERT/UPDATE/DELETE on emission_entries.
 *
 * PATTERN: Always recompute from all entries — never delta-update.
 * PITFALL GUARD: date must be getLocalDateString() output, not toISOString().
 */
export async function upsertDailySummary(userId: string, date: string): Promise<void> {
  // Filter by date string directly for DATE column comparison
  const { data: entries, error: fetchError } = await supabase
    .from('emission_entries')
    .select('*, emission_factors(id, category, subcategory, item, unit, kg_co2e, source, year, created_at)')
    .eq('user_id', userId)
    .gte('logged_at', `${date}T00:00:00.000Z`)
    .lte('logged_at', `${date}T23:59:59.999Z`);

  if (fetchError) throw fetchError;

  const totals = computeDailyCategoryTotals(
    (entries ?? []) as EmissionEntryWithFactor[]
  );
  const payload = buildDailySummaryPayload(userId, date, totals);

  const { error: upsertError } = await supabase
    .from('daily_summaries')
    .upsert(payload, { onConflict: 'user_id,date' });

  if (upsertError) throw upsertError;
}

/**
 * Fetches all emission_entries for a user in a given ISO week (Mon–Sun),
 * computes totals, and upserts weekly_summaries.
 */
export async function upsertWeeklySummary(userId: string, weekStart: string): Promise<void> {
  // Calculate week end: weekStart + 6 days
  const weekStartDate = new Date(`${weekStart}T12:00:00`);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const weekEnd = weekEndDate.toLocaleDateString('en-CA');

  const { data: entries, error: fetchError } = await supabase
    .from('emission_entries')
    .select('*, emission_factors(id, category, subcategory, item, unit, kg_co2e, source, year, created_at)')
    .eq('user_id', userId)
    .gte('logged_at', `${weekStart}T00:00:00.000Z`)
    .lte('logged_at', `${weekEnd}T23:59:59.999Z`);

  if (fetchError) throw fetchError;

  const totals = computeDailyCategoryTotals(
    (entries ?? []) as EmissionEntryWithFactor[]
  );
  const payload = buildWeeklySummaryPayload(userId, weekStart, totals);

  const { error: upsertError } = await supabase
    .from('weekly_summaries')
    .upsert(payload, { onConflict: 'user_id,week_start' });

  if (upsertError) throw upsertError;
}
