/**
 * supabase/functions/_shared/emissions.ts — Deno port of lib/emissions.ts's
 * summary recompute helpers (Sprint D Stage 3).
 *
 * lib/emissions.ts's upsertDailySummary/upsertWeeklySummary are not pure —
 * they close over the app's module-level `@/lib/supabase` client, which is
 * built with the anon key and is subject to RLS (and, like lib/spendFactors,
 * imported via the `@/` alias Deno can't resolve). plaid-sync runs as the
 * service role and must recompute summaries for potentially many users'
 * rows, so this port takes the SupabaseClient as an explicit parameter
 * instead of importing a singleton. The aggregation math itself
 * (computeDailyCategoryTotals / payload shape) is copied verbatim from
 * lib/emissions.ts — do not let the two drift if the category set or
 * payload shape ever changes there.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

interface FactorLike {
  category: 'food' | 'transport' | 'energy' | 'shopping';
}
interface EntryLike {
  kg_co2e_total: number;
  emission_factors: FactorLike;
}

interface DailyCategoryTotals {
  food: number;
  transport: number;
  energy: number;
  shopping: number;
  total: number;
}

function computeDailyCategoryTotals(entries: EntryLike[]): DailyCategoryTotals {
  const totals: DailyCategoryTotals = { food: 0, transport: 0, energy: 0, shopping: 0, total: 0 };
  for (const entry of entries) {
    const category = entry.emission_factors.category;
    totals[category] = (totals[category] ?? 0) + entry.kg_co2e_total;
    totals.total += entry.kg_co2e_total;
  }
  return totals;
}

// Local-date-string helper — edge functions have no device timezone, so
// "local" here means the date string already stored on the row (txn_date is
// a DATE column, already timezone-free) rather than any Date-object
// conversion. Callers pass an already-resolved "YYYY-MM-DD" string.

/**
 * Recomputes daily_summaries for one user/date from all of that day's
 * emission_entries. Mirrors lib/emissions.ts's upsertDailySummary exactly,
 * parameterized on the caller's SupabaseClient (service role here).
 */
export async function upsertDailySummary(
  admin: SupabaseClient,
  userId: string,
  date: string
): Promise<void> {
  const [dy, dm, dd] = date.split('-').map(Number);
  const localStart = new Date(dy, dm - 1, dd, 0, 0, 0, 0);
  const localEnd = new Date(dy, dm - 1, dd, 23, 59, 59, 999);

  const { data: entries, error: fetchError } = await admin
    .from('emission_entries')
    .select('*, emission_factors(id, category, subcategory, item, unit, kg_co2e, source, year, created_at)')
    .eq('user_id', userId)
    .gte('logged_at', localStart.toISOString())
    .lte('logged_at', localEnd.toISOString());
  if (fetchError) throw fetchError;

  const totals = computeDailyCategoryTotals((entries ?? []) as unknown as EntryLike[]);

  const { error: upsertError } = await admin
    .from('daily_summaries')
    .upsert(
      {
        user_id: userId,
        date,
        total_kg_co2e: totals.total,
        food_kg: totals.food,
        transport_kg: totals.transport,
        energy_kg: totals.energy,
        shopping_kg: totals.shopping,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    );
  if (upsertError) throw upsertError;
}

/**
 * Recomputes weekly_summaries for one user/ISO-week (Mon start) from all of
 * that week's emission_entries. Mirrors lib/emissions.ts's
 * upsertWeeklySummary exactly.
 */
export async function upsertWeeklySummary(
  admin: SupabaseClient,
  userId: string,
  weekStart: string
): Promise<void> {
  const weekStartDate = new Date(`${weekStart}T12:00:00`);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const weekEnd = weekEndDate.toLocaleDateString('en-CA');

  const [wsy, wsm, wsd] = weekStart.split('-').map(Number);
  const [wey, wem, wed] = weekEnd.split('-').map(Number);
  const weekLocalStart = new Date(wsy, wsm - 1, wsd, 0, 0, 0, 0);
  const weekLocalEnd = new Date(wey, wem - 1, wed, 23, 59, 59, 999);

  const { data: entries, error: fetchError } = await admin
    .from('emission_entries')
    .select('*, emission_factors(id, category, subcategory, item, unit, kg_co2e, source, year, created_at)')
    .eq('user_id', userId)
    .gte('logged_at', weekLocalStart.toISOString())
    .lte('logged_at', weekLocalEnd.toISOString());
  if (fetchError) throw fetchError;

  const totals = computeDailyCategoryTotals((entries ?? []) as unknown as EntryLike[]);

  const { error: upsertError } = await admin
    .from('weekly_summaries')
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        total_kg_co2e: totals.total,
        breakdown: {
          food: totals.food,
          transport: totals.transport,
          energy: totals.energy,
          shopping: totals.shopping,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start' }
    );
  if (upsertError) throw upsertError;
}

/**
 * getISOWeekStart port (lib/emissions.ts) — needed here so plaidSync.ts can
 * compute the affected week from a txn_date string without importing the
 * app's lib/ (same `@/`-alias problem as spendFactors.ts).
 */
export function getISOWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toLocaleDateString('en-CA');
}
