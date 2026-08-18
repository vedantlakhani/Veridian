/**
 * lib/impactCopy.ts — Comparison caption library
 *
 * ARCHITECTURE NOTE: PURE functions only — no React, no Supabase, no
 * AsyncStorage, no native imports. Turns a raw kg CO2e (or annual tonnage)
 * number into the single muted caption line shown under a prominent kg
 * figure, so a first-time user has one plain-language anchor for whether a
 * number is a lot or a little. Fully unit-testable in isolation (see
 * __tests__/lib/impactCopy.test.ts).
 *
 * VOICE RULES (mirrors lib/feedCopy.ts's discipline):
 *   - State a fact, then give one plain equivalent. Nothing more.
 *   - "kg CO2e" appears only as a compact chip value elsewhere in the UI —
 *     never spelled out inside a caption sentence here.
 *   - Read like a photo caption: calm, stated once, never a tooltip or an
 *     info-icon explainer.
 *   - Never explain what the unit "means." Never say "beginner," "simple,"
 *     or "don't worry." No exclamation points. No emoji.
 */

import { CAR_KG_PER_KM } from '@/lib/tripEngine';

// ─── Driving comparison ─────────────────────────────────────────────────────

const SMALL_AMOUNT_KM_THRESHOLD = 0.1;

/** "6" for 6.0, "1.6" for 1.6 — whole km at 1+, one decimal under 1. */
function formatComparisonKm(km: number): string {
  if (km < 1) {
    const rounded = Math.round(km * 10) / 10;
    return rounded.toFixed(1);
  }
  return String(Math.round(km));
}

/**
 * "About a 6 km drive" for a given kg CO2e value, using the same
 * DEFRA petrol-car factor tripEngine uses to price/credit trips. Very small
 * values (under a ~0.1 km-equivalent) read as "A small amount" rather than
 * an oddly precise fraction.
 */
export function drivingComparisonCaption(kg: number): string {
  if (kg <= 0) return 'A small amount';
  const km = kg / CAR_KG_PER_KM;
  if (km < SMALL_AMOUNT_KM_THRESHOLD) return 'A small amount';
  return `About a ${formatComparisonKm(km)} km drive`;
}

// ─── Global average comparison ──────────────────────────────────────────────

const NEAR_EQUAL_PCT_THRESHOLD = 2;

/**
 * "14% below the global average" / "8% above the global average" for a
 * user's annual tonnage against a supplied global average. Within 2% either
 * way reads as "About the same as the global average" rather than a
 * near-zero percentage that reads as noise.
 */
export function globalAverageComparisonCaption(
  tonnesPerYear: number,
  globalAvgTonnesPerYear: number,
): string {
  if (globalAvgTonnesPerYear <= 0) return 'About the same as the global average';

  const pctDiff = ((tonnesPerYear - globalAvgTonnesPerYear) / globalAvgTonnesPerYear) * 100;
  const rounded = Math.round(Math.abs(pctDiff));

  if (Math.abs(pctDiff) <= NEAR_EQUAL_PCT_THRESHOLD) return 'About the same as the global average';

  return pctDiff > 0
    ? `${rounded}% above the global average`
    : `${rounded}% below the global average`;
}
