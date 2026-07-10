export type EmissionCategory = 'food' | 'transport' | 'energy' | 'shopping';

export type EntrySource = 'manual' | 'sensor' | 'transaction' | 'receipt';
export type EntryStatus = 'pending' | 'auto_confirmed' | 'user_confirmed' | 'dismissed';
export type TripMode = 'walk' | 'cycling' | 'car' | 'bus' | 'train' | 'unknown';
export type TripStatus = 'needs_confirmation' | 'auto_confirmed' | 'confirmed' | 'dismissed';

export interface EmissionFactor {
  id: string;
  category: EmissionCategory;
  subcategory: string;
  item: string;
  unit: string;
  kg_co2e: number;
  source: string;
  year: number;
  created_at: string;
}

export interface EmissionEntry {
  id: string;
  user_id: string;
  factor_id: string;
  quantity: number;
  kg_co2e_total: number;
  logged_at: string;
  notes: string | null;
  created_at: string;
  source: EntrySource;
  confidence: number | null;
  status: EntryStatus;
  trip_id: string | null;
  metadata: Record<string, unknown> | null;
}

// Denormalized for display — joins entry with its factor
export interface EmissionEntryWithFactor extends EmissionEntry {
  emission_factors: EmissionFactor;
}

// Mirrors the detected_trips table — durable server-side trip records a
// smarter classifier can re-read and re-verdict (see NORTH_STAR.md §7).
export interface DetectedTrip {
  id: string;
  user_id: string;
  client_trip_key: string;
  started_at: string;
  ended_at: string;
  distance_km: number;
  avg_speed_kmh: number | null;
  mode: TripMode;
  confidence: number;
  status: TripStatus;
  features: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  id: string;
  user_id: string;
  date: string;                 // DATE as ISO date string "2026-03-15"
  total_kg_co2e: number;
  food_kg: number;
  transport_kg: number;
  energy_kg: number;
  shopping_kg: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyBreakdown {
  food: number;
  transport: number;
  energy: number;
  shopping: number;
}

export interface WeeklySummary {
  id: string;
  user_id: string;
  week_start: string;           // DATE as ISO date string
  total_kg_co2e: number;
  breakdown: WeeklyBreakdown;
  created_at: string;
  updated_at: string;
}

// Standard UK average daily carbon budget: 22 kg CO₂e/day
export const DAILY_CARBON_BUDGET_KG = 22;
// 1.5°C-aligned target: 7 kg CO₂e/day (aspirational)
export const TARGET_CARBON_BUDGET_KG = 7;
