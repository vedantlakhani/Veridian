export type EmissionCategory = 'food' | 'transport' | 'energy';

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
}

// Denormalized for display — joins entry with its factor
export interface EmissionEntryWithFactor extends EmissionEntry {
  emission_factors: EmissionFactor;
}

export interface DailySummary {
  id: string;
  user_id: string;
  date: string;                 // DATE as ISO date string "2026-03-15"
  total_kg_co2e: number;
  food_kg: number;
  transport_kg: number;
  energy_kg: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyBreakdown {
  food: number;
  transport: number;
  energy: number;
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
