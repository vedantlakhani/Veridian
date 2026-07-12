/**
 * lib/momentum.ts — Momentum, not streaks (pure calculation engine)
 *
 * ARCHITECTURE NOTE: PURE functions only — no React, no Supabase, no
 * AsyncStorage, no native imports. Mirrors the purity discipline of
 * lib/recap.ts / lib/tripEngine.ts / lib/feedCopy.ts. Fully unit-testable in
 * isolation (see __tests__/lib/momentum.test.ts).
 *
 * VOICE + MODEL RULES (NORTH_STAR.md §8 pattern 5 "Momentum, Not Streaks"):
 *   - No breakable chains, ever. A missed day nudges the score down via gentle
 *     exponential decay — it never hard-resets to 0 the way a streak counter
 *     would. There is no "streak broken" state, only a quieter one.
 *   - The score RISES on days the user logged something (or a trip
 *     auto-confirmed), with an extra nudge on "light" days (today's total at
 *     or under half the daily budget) — consistency AND lighter footprints
 *     both feed momentum, never guilt about a heavier day.
 *   - Decays continuously even across days with no input, so opening the app
 *     after a quiet stretch shows a lower-but-never-zero-cliff number.
 */

import { DAILY_CARBON_BUDGET_KG } from '@/types/emission';

// ─── Model constants ────────────────────────────────────────────────────────

/** Days for the score to decay to half its value with zero activity. */
const HALF_LIFE_DAYS = 4;

/** Per-day multiplicative decay implied by the half-life above. */
const DECAY_PER_DAY = Math.pow(0.5, 1 / HALF_LIFE_DAYS);

/** Points added (after that day's decay) for any logged day. */
const LOG_BOOST = 16;

/** Extra points added on top of LOG_BOOST for a "light" logged day. */
const LIGHT_BOOST = 8;

/** A day counts as "light" at or under this fraction of the daily budget. */
const LIGHT_THRESHOLD_RATIO = 0.5;

const SCORE_MIN = 0;
const SCORE_MAX = 100;

/** Score thresholds for the band labels — tuned so a single logged week
 *  (~7 consecutive days, see momentum.test.ts) lands in 'strong'. */
const STRONG_THRESHOLD = 70;
const STEADY_THRESHOLD = 35;

// ─── Public types ───────────────────────────────────────────────────────────

export interface MomentumDayInput {
  /** "YYYY-MM-DD" (local) — informational only, not read by the model. */
  date: string;
  /** True if the user logged an entry or had a trip auto-confirmed that day. */
  logged: boolean;
  /** That day's total_kg_co2e. Ignored when `logged` is false. */
  totalKg: number;
}

export type MomentumBand = 'building' | 'steady' | 'strong';

export interface MomentumResult {
  /** 0–100 */
  score: number;
  band: MomentumBand;
}

// ─── Band label ─────────────────────────────────────────────────────────────

export function momentumBand(score: number): MomentumBand {
  if (score >= STRONG_THRESHOLD) return 'strong';
  if (score >= STEADY_THRESHOLD) return 'steady';
  return 'building';
}

function clampScore(score: number): number {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
}

// ─── The model ──────────────────────────────────────────────────────────────

/**
 * Forward-simulates the momentum score across `days` (oldest first — pass
 * the last ~14 calendar days, one entry per day, contiguous). Every day
 * decays the running score by a fixed multiplicative factor (gentle, never a
 * cliff) and then, only on a logged day, adds a boost — larger when that
 * day's footprint was light relative to `dailyBudgetKg`.
 *
 * Starts from 0 — a brand-new user has no momentum yet, not a penalty.
 */
export function computeMomentum(
  days: MomentumDayInput[],
  dailyBudgetKg: number = DAILY_CARBON_BUDGET_KG,
): MomentumResult {
  let score = 0;

  for (const day of days) {
    score = clampScore(score * DECAY_PER_DAY);
    if (day.logged) {
      score += LOG_BOOST;
      if (dailyBudgetKg > 0 && day.totalKg <= dailyBudgetKg * LIGHT_THRESHOLD_RATIO) {
        score += LIGHT_BOOST;
      }
      score = clampScore(score);
    }
  }

  return { score, band: momentumBand(score) };
}
