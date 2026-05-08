// Formatting utilities for Veridian

// ─── Subcategory name formatter ───────────────────────────────────────────────

const OVERRIDES: Record<string, string> = {
  BUS_COACH:         'Bus & Coach',
  BUS_LOCAL:         'Local Bus',
  DISTRICT_HEAT:     'District Heat',
  NATURAL_GAS:       'Natural Gas',
  ELECTRIC_VEHICLE:  'Electric Vehicle',
  PLUG_IN_HYBRID:    'Plug-in Hybrid',
  SHORT_HAUL:        'Short-Haul Flight',
  LONG_HAUL:         'Long-Haul Flight',
  DOMESTIC_RAIL:     'Domestic Rail',
  LIGHT_RAIL:        'Light Rail',
  CAR_DIESEL:        'Diesel Car',
  CAR_PETROL:        'Petrol Car',
  CAR_EV:            'Electric Car',
  BIOMASS:           'Biomass',
  COAL:              'Coal',
  RED_MEAT:          'Red Meat',
};

export function humanizeSubcategory(raw: string): string {
  const upper = raw.toUpperCase();
  if (OVERRIDES[upper]) return OVERRIDES[upper];
  // Generic: lowercase, split on _, title-case each word
  return raw
    .toLowerCase()
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Display name ─────────────────────────────────────────────────────────────

export function resolveDisplayName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (displayName?.trim()) return displayName.trim();
  if (email) {
    const prefix = email.split('@')[0];
    // Strip trailing digits, replace separators with spaces, title-case
    const cleaned = prefix
      .replace(/[0-9]+$/, '')
      .replace(/[._-]+/g, ' ')
      .trim();
    if (cleaned) {
      return cleaned
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }
  return 'You';
}

export function resolveFirstName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  return resolveDisplayName(displayName, email).split(' ')[0];
}

// ─── Kg / tons formatting ─────────────────────────────────────────────────────

export function formatKg(kg: number, decimals = 1): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toFixed(decimals)} kg`;
}

export function formatKgCompact(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  if (kg >= 1) return `${kg.toFixed(1)} kg`;
  return `${(kg * 1000).toFixed(0)} g`;
}

// ─── Monthly delta ────────────────────────────────────────────────────────────

export type DeltaTone = 'good' | 'bad' | 'neutral';

export function formatMonthlyDelta(
  current: number,
  previous: number,
): { label: string; tone: DeltaTone } {
  if (current === 0 && previous === 0) return { label: '—', tone: 'neutral' };
  if (previous === 0) return { label: 'New', tone: 'neutral' };

  const pct = ((current - previous) / previous) * 100;

  let label: string;
  if (Math.abs(pct) > 999) {
    label = pct > 0 ? '+999%+' : '-99%+';
  } else {
    label = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }

  // Lower CO₂ = good
  const tone: DeltaTone = pct < 0 ? 'good' : pct > 0 ? 'bad' : 'neutral';
  return { label, tone };
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export function formatStreak(days: number): string {
  const d = Math.floor(days);
  return `${d} day${d === 1 ? '' : 's'}`;
}

// ─── Time-aware greeting ──────────────────────────────────────────────────────

export function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
