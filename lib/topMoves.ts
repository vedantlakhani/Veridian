import type { EmissionCategory, EmissionEntryWithFactor, EmissionFactor } from '@/types/emission';

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface TopMove {
  id: string;
  rank: 1 | 2 | 3;
  category: EmissionCategory;
  title: string;
  detail: string;
  weeklySavingKg: number;
  weeklyPercent: number | null;
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface SubcatProfile {
  weeklyQty: number;
  weeklyCount: number;
  weeklyKg: number;
}

interface Candidate {
  rule: SwapRule;
  matched: string[];
  weeklySavingKg: number;
  weeklyCount: number;
  weeklyQty: number;
  weeklyKg: number;
}

interface SwapRule {
  id: string;
  sourceSubcats: string[];
  targetSubcat: string | null;
  fraction: number;
  action: 'swap' | 'reduce' | 'switch';
  category: EmissionCategory;
  buildTitle: (c: Candidate) => string;
  buildDetail: (c: Candidate) => string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(isoString: string): number {
  return (Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sumArr(arr: number[]): number {
  let total = 0;
  for (const n of arr) total += n;
  return total;
}

function weightedAvg(pairs: [number, number][]): number {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [v, w] of pairs) {
    totalWeight += w;
    weightedSum += v * w;
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

// ─── SWAP_RULES ───────────────────────────────────────────────────────────────
// Source subcats match the subcategory column in emission_factors (seeded from
// DEFRA 2025). Fractions represent a realistic adoptable share — not asking
// users to quit entirely.

export const SWAP_RULES: SwapRule[] = [
  {
    id: 'beef_chicken',
    sourceSubcats: ['beef', 'lamb'],
    targetSubcat: 'chicken',
    fraction: 0.5,
    action: 'swap',
    category: 'food',
    buildTitle: (c) =>
      c.weeklyCount >= 2
        ? `Swap ${Math.ceil(c.weeklyCount * 0.5)} of your ${Math.round(c.weeklyCount)} beef meals for chicken`
        : 'Swap half your beef for chicken',
    buildDetail: (c) => `Beef is your top source at ${c.weeklyKg.toFixed(1)} kg/wk.`,
  },
  {
    id: 'beef_lentils',
    sourceSubcats: ['beef', 'lamb'],
    targetSubcat: 'lentils',
    fraction: 0.5,
    action: 'swap',
    category: 'food',
    buildTitle: (c) =>
      c.weeklyCount >= 2
        ? `Swap ${Math.ceil(c.weeklyCount * 0.5)} of your ${Math.round(c.weeklyCount)} beef meals for lentils`
        : 'Swap half your beef for lentils',
    buildDetail: (c) => `Beef is your top source at ${c.weeklyKg.toFixed(1)} kg/wk.`,
  },
  {
    id: 'cheese_yoghurt',
    sourceSubcats: ['cheese', 'butter'],
    targetSubcat: 'yoghurt',
    fraction: 0.33,
    action: 'swap',
    category: 'food',
    buildTitle: (c) =>
      c.weeklyCount >= 2
        ? `Swap ${Math.ceil(c.weeklyCount * 0.33)} of your ${Math.round(c.weeklyCount)} dairy servings for yoghurt`
        : 'Switch some cheese & butter for yoghurt',
    buildDetail: (c) => `Dairy at ${c.weeklyKg.toFixed(1)} kg/wk — yoghurt has far lower emissions.`,
  },
  {
    id: 'prawns_fish',
    sourceSubcats: ['prawns'],
    targetSubcat: 'fish',
    fraction: 0.5,
    action: 'swap',
    category: 'food',
    buildTitle: (c) =>
      c.weeklyCount >= 2
        ? `Swap ${Math.ceil(c.weeklyCount * 0.5)} of your ${Math.round(c.weeklyCount)} prawn meals for white fish`
        : 'Swap half your prawns for white fish',
    buildDetail: (c) =>
      `Prawns carry ${c.weeklyKg.toFixed(1)} kg/wk — white fish cuts that significantly.`,
  },
  {
    id: 'chocolate_less',
    sourceSubcats: ['chocolate'],
    targetSubcat: null,
    fraction: 0.25,
    action: 'reduce',
    category: 'food',
    buildTitle: (c) =>
      c.weeklyCount >= 2
        ? `Cut ${Math.ceil(c.weeklyCount * 0.25)} of your ${Math.round(c.weeklyCount)} chocolate servings`
        : 'Reduce chocolate consumption by a quarter',
    buildDetail: (c) => `Chocolate adds ${c.weeklyKg.toFixed(1)} kg/wk — small cuts add up.`,
  },
  {
    id: 'car_cycle',
    sourceSubcats: ['car_petrol', 'car_diesel', 'car_lpg', 'taxi_petrol'],
    targetSubcat: 'cycling',
    fraction: 0.2,
    action: 'swap',
    category: 'transport',
    buildTitle: (c) =>
      `Cycle ${Math.round(c.weeklyQty * 0.2)} km of your ${Math.round(c.weeklyQty)} km of driving`,
    buildDetail: () => 'Short trips are your biggest lever.',
  },
  {
    id: 'car_transit',
    sourceSubcats: ['car_petrol', 'car_diesel', 'car_lpg', 'taxi_petrol'],
    targetSubcat: 'train_national',
    fraction: 0.3,
    action: 'swap',
    category: 'transport',
    buildTitle: (c) =>
      `Replace ${Math.round(c.weeklyQty * 0.3)} km of driving with public transport`,
    buildDetail: () => 'Train or bus for regular routes cuts most of the emissions.',
  },
  {
    id: 'flight_train',
    sourceSubcats: ['flight_domestic'],
    targetSubcat: 'train_national',
    fraction: 1.0,
    action: 'swap',
    category: 'transport',
    buildTitle: (c) => {
      const n = Math.max(1, Math.round(c.weeklyCount));
      return `Replace ${n} domestic flight${n !== 1 ? 's' : ''} per week with the train`;
    },
    buildDetail: () => 'Rail is 80–90% cleaner than flying on the same route.',
  },
  {
    id: 'grid_renewable',
    sourceSubcats: ['electricity_uk'],
    targetSubcat: 'electricity_wind',
    fraction: 1.0,
    action: 'switch',
    category: 'energy',
    buildTitle: () => 'Switch to a renewable electricity tariff',
    buildDetail: () => 'One-time change, saves every week after.',
  },
  {
    id: 'gas_thermostat',
    sourceSubcats: ['gas_natural', 'gas_natural_m3'],
    targetSubcat: null,
    fraction: 0.08,
    action: 'reduce',
    category: 'energy',
    buildTitle: () => 'Turn the thermostat down 1°C',
    buildDetail: (c) => `≈8% off your ${c.weeklyKg.toFixed(1)} kg/wk of gas heating.`,
  },
];

// ─── buildProfile ─────────────────────────────────────────────────────────────
// Groups windowed entries by subcategory and scales counts/quantities/emissions
// to a weekly rate. windowDays is clamped between 7 and 28 days.

export function buildProfile(
  windowed: EmissionEntryWithFactor[],
): Record<string, SubcatProfile> {
  if (windowed.length === 0) return {};

  // Find the oldest entry's timestamp without spread to avoid stack limits
  let oldestMs = Date.now();
  for (const e of windowed) {
    const ms = new Date(e.logged_at).getTime();
    if (ms < oldestMs) oldestMs = ms;
  }
  const daysSinceOldest = (Date.now() - oldestMs) / (1000 * 60 * 60 * 24);
  const windowDays = Math.max(7, Math.min(28, daysSinceOldest));

  // Aggregate raw totals per subcategory
  const groups: Record<string, { qty: number; count: number; kg: number }> = {};
  for (const e of windowed) {
    const sub = e.emission_factors.subcategory;
    const existing = groups[sub];
    if (existing === undefined) {
      groups[sub] = { qty: e.quantity, count: 1, kg: e.kg_co2e_total };
    } else {
      existing.qty += e.quantity;
      existing.count += 1;
      existing.kg += e.kg_co2e_total;
    }
  }

  // Scale to weekly rate
  const scale = 7 / windowDays;
  const profile: Record<string, SubcatProfile> = {};
  for (const sub of Object.keys(groups)) {
    const g = groups[sub];
    profile[sub] = {
      weeklyQty: g.qty * scale,
      weeklyCount: g.count * scale,
      weeklyKg: g.kg * scale,
    };
  }
  return profile;
}

// ─── computeTopMoves ──────────────────────────────────────────────────────────
// Pure function: no I/O, no side effects. Safe to wrap in useMemo.

export function computeTopMoves(
  entries: EmissionEntryWithFactor[],
  factors: EmissionFactor[],
  weeklyTotalKg: number | null,
): TopMove[] {
  const windowed = entries.filter((e) => daysAgo(e.logged_at) < 28);
  if (windowed.length === 0) return [];

  const profile = buildProfile(windowed);

  // Build subcategory → average kg_co2e lookup from the factor table
  const factorGroups: Record<string, number[]> = {};
  for (const f of factors) {
    const existing = factorGroups[f.subcategory];
    if (existing === undefined) {
      factorGroups[f.subcategory] = [f.kg_co2e];
    } else {
      existing.push(f.kg_co2e);
    }
  }
  const factorIndex: Record<string, number> = {};
  for (const sub of Object.keys(factorGroups)) {
    const kgs = factorGroups[sub];
    factorIndex[sub] = sumArr(kgs) / kgs.length;
  }

  // Evaluate each rule against the user's profile
  const candidates: Candidate[] = [];

  for (const rule of SWAP_RULES) {
    const matched = rule.sourceSubcats.filter((s) => (profile[s]?.weeklyQty ?? 0) > 0);
    if (matched.length === 0) continue;

    const weeklyQty = sumArr(matched.map((s) => profile[s].weeklyQty));
    const weeklyKg = sumArr(matched.map((s) => profile[s].weeklyKg));
    const weeklyCount = sumArr(matched.map((s) => profile[s].weeklyCount));

    // Weighted-average kg_co2e/unit for source subcats (by weekly usage volume)
    const srcPairs = matched
      .filter((s) => factorIndex[s] !== undefined)
      .map((s): [number, number] => [factorIndex[s], profile[s].weeklyQty]);

    if (srcPairs.length === 0) continue;
    const srcKgPerUnit = weightedAvg(srcPairs);

    // Alternative factor: 0 for 'reduce' rules (no replacement)
    const altKgPerUnit =
      rule.targetSubcat !== null ? (factorIndex[rule.targetSubcat] ?? 0) : 0;

    const weeklySavingKg = weeklyQty * rule.fraction * (srcKgPerUnit - altKgPerUnit);
    if (weeklySavingKg < 0.3) continue; // noise floor — not worth showing

    candidates.push({ rule, matched, weeklySavingKg, weeklyCount, weeklyQty, weeklyKg });
  }

  // Dedupe: keep the highest-saving move per distinct source-behavior key
  // (e.g. car_cycle vs car_transit both fire on the same car subcats — keep the bigger one)
  const deduped = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = [...c.matched].sort().join('+');
    const existing = deduped.get(key);
    if (existing === undefined || c.weeklySavingKg > existing.weeklySavingKg) {
      deduped.set(key, c);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.weeklySavingKg - a.weeklySavingKg)
    .slice(0, 3)
    .map((c, i) => ({
      id: c.rule.id,
      rank: (i + 1) as 1 | 2 | 3,
      category: c.rule.category,
      title: c.rule.buildTitle(c),
      detail: c.rule.buildDetail(c),
      weeklySavingKg: round1(c.weeklySavingKg),
      weeklyPercent:
        weeklyTotalKg !== null && weeklyTotalKg > 0
          ? Math.round((c.weeklySavingKg / weeklyTotalKg) * 100)
          : null,
    }));
}
