// Human-readable group labels for the raw 6-digit NAICS codes used as the
// 'subcategory' column on 'shopping', 'food', 'energy', and (some) 'transport'
// emission_factors rows seeded by
// supabase/migrations/20260718000023_seed_shopping_factors.sql.
//
// Those rows are one-per-sector (EPA USEEIO spend-based factors), so grouping
// the factor-picker UI by raw 'subcategory' would produce ~69 one-item groups
// each headed by a literal NAICS number (e.g. "443142") instead of a category
// a user recognizes. This table maps every NAICS code from that migration —
// all 69 rows, across all four categories the migration seeds (shopping,
// food, energy, and the handful of transport rows that also use a NAICS code
// instead of a DEFRA-style slug) — to one of 11 human-readable groups.
// (car_petrol, bus_coach, etc. from supabase/seed.sql are untouched by this
// file — those already have sensible subcategory names).
//
// KEEP IN SYNC with supabase/migrations/20260718000023_seed_shopping_factors.sql:
// if that migration is ever extended with new NAICS codes, add them here too.
// As of the last sync, all 69 NAICS-coded rows the migration seeds
// (58 shopping/transport + 7 food + 4 energy) are mapped below.

export const NAICS_GROUP: Record<string, string> = {
  // ─── Home, Electronics & Hardware ────────────────────────────────────────
  '442110': 'Home, Electronics & Hardware', // Furniture Stores
  '443142': 'Home, Electronics & Hardware', // Electronics Stores
  '444110': 'Home, Electronics & Hardware', // Home Centers
  '444130': 'Home, Electronics & Hardware', // Hardware Stores

  // ─── Clothing & General Merchandise ──────────────────────────────────────
  '448140': 'Clothing & General Merchandise', // Family Clothing Stores
  '452210': 'Clothing & General Merchandise', // Department Stores
  '452311': 'Clothing & General Merchandise', // Warehouse Clubs and Supercenters
  '452319': 'Clothing & General Merchandise', // All Other General Merchandise Stores
  '453220': 'Clothing & General Merchandise', // Gift, Novelty, and Souvenir Stores

  // ─── Specialty & Online Retail ───────────────────────────────────────────
  '451110': 'Specialty & Online Retail', // Sporting Goods Stores
  '451211': 'Specialty & Online Retail', // Book Stores
  '453210': 'Specialty & Online Retail', // Office Supplies and Stationery Stores
  '453910': 'Specialty & Online Retail', // Pet and Pet Supplies Stores
  '453991': 'Specialty & Online Retail', // Tobacco Stores
  '454110': 'Specialty & Online Retail', // Electronic Shopping and Mail-Order Houses

  // ─── Shipping & Delivery ─────────────────────────────────────────────────
  '492110': 'Shipping & Delivery', // Couriers and Express Delivery Services
  '493110': 'Shipping & Delivery', // General Warehousing and Storage

  // ─── Digital & Subscriptions ─────────────────────────────────────────────
  '511210': 'Digital & Subscriptions', // Software Publishers
  '512131': 'Digital & Subscriptions', // Motion Picture Theaters (except Drive-Ins)
  '512250': 'Digital & Subscriptions', // Record Production and Distribution
  '517311': 'Digital & Subscriptions', // Wired Telecommunications Carriers
  '517312': 'Digital & Subscriptions', // Wireless Telecommunications Carriers (except Satellite)

  // ─── Professional & Financial Services ───────────────────────────────────
  '524210': 'Professional & Financial Services', // Insurance Agencies and Brokerages
  '541110': 'Professional & Financial Services', // Offices of Lawyers
  '541211': 'Professional & Financial Services', // Offices of Certified Public Accountants
  '561621': 'Professional & Financial Services', // Security Systems Services (except Locksmiths)
  '561990': 'Professional & Financial Services', // All Other Support Services
  '813219': 'Professional & Financial Services', // Other Grantmaking and Giving Services
  '813990': 'Professional & Financial Services', // Other Similar Organizations

  // ─── Health & Personal Care ──────────────────────────────────────────────
  '446110': 'Health & Personal Care', // Pharmacies and Drug Stores
  '541940': 'Health & Personal Care', // Veterinary Services
  '621111': 'Health & Personal Care', // Offices of Physicians (except Mental Health Specialists)
  '621210': 'Health & Personal Care', // Offices of Dentists
  '621320': 'Health & Personal Care', // Offices of Optometrists
  '621399': 'Health & Personal Care', // Offices of All Other Miscellaneous Health Practitioners
  '623110': 'Health & Personal Care', // Nursing Care Facilities (Skilled Nursing Facilities)
  '624410': 'Health & Personal Care', // Child Day Care Services
  '812112': 'Health & Personal Care', // Beauty Salons
  '812199': 'Health & Personal Care', // Other Personal Care Services

  // ─── Leisure, Travel & Education ─────────────────────────────────────────
  '561520': 'Leisure, Travel & Education', // Tour Operators
  '611310': 'Leisure, Travel & Education', // Colleges, Universities, and Professional Schools
  '713110': 'Leisure, Travel & Education', // Amusement and Theme Parks
  '713290': 'Leisure, Travel & Education', // Other Gambling Industries
  '713940': 'Leisure, Travel & Education', // Fitness and Recreational Sports Centers
  '713990': 'Leisure, Travel & Education', // All Other Amusement and Recreation Industries
  '721110': 'Leisure, Travel & Education', // Hotels (except Casino Hotels) and Motels

  // ─── Repairs & Maintenance ───────────────────────────────────────────────
  '811111': 'Repairs & Maintenance', // General Automotive Repair
  '811490': 'Repairs & Maintenance', // Other Personal and Household Goods Repair and Maintenance
  '812320': 'Repairs & Maintenance', // Drycleaning and Laundry Services (except Coin-Operated)

  // ─── Groceries & Dining (food-category NAICS rows) ───────────────────────
  '445110': 'Groceries & Dining', // Supermarkets and Other Grocery (except Convenience) Stores
  '445120': 'Groceries & Dining', // Convenience Stores
  '445310': 'Groceries & Dining', // Beer, Wine, and Liquor Stores
  '454210': 'Groceries & Dining', // Vending Machine Operators
  '722511': 'Groceries & Dining', // Full-Service Restaurants
  '722513': 'Groceries & Dining', // Limited-Service Restaurants
  '722515': 'Groceries & Dining', // Snack and Nonalcoholic Beverage Bars

  // ─── Utilities & Home Services (energy-category NAICS rows) ─────────────
  '221210': 'Utilities & Home Services', // Natural Gas Distribution
  '221310': 'Utilities & Home Services', // Water Supply and Irrigation Systems
  '221330': 'Utilities & Home Services', // Steam and Air-Conditioning Supply
  '562111': 'Utilities & Home Services', // Solid Waste Collection

  // ─── Rides, Transit & Travel Spending (transport-category NAICS rows) ────
  '447110': 'Rides, Transit & Travel Spending', // Gasoline Stations with Convenience Stores
  '481111': 'Rides, Transit & Travel Spending', // Scheduled Passenger Air Transportation
  '485113': 'Rides, Transit & Travel Spending', // Bus and Other Motor Vehicle Transit Systems
  '485310': 'Rides, Transit & Travel Spending', // Taxi Service
  '485999': 'Rides, Transit & Travel Spending', // All Other Transit and Ground Passenger Transportation
  '488490': 'Rides, Transit & Travel Spending', // Other Support Activities for Road Transportation
  '532111': 'Rides, Transit & Travel Spending', // Passenger Car Rental
  '532284': 'Rides, Transit & Travel Spending', // Recreational Goods Rental
  '812930': 'Rides, Transit & Travel Spending', // Parking Lots and Garages
};

/**
 * Returns the human-readable group label for a NAICS-code subcategory, or
 * null if `subcategory` is not one of the codes in NAICS_GROUP (e.g. a
 * DEFRA-style slug like 'car_petrol'). Callers should fall back to their own
 * existing humanizer (see lib/format.ts's humanizeSubcategory) when this
 * returns null.
 */
export function groupLabelForFactor(subcategory: string): string | null {
  return NAICS_GROUP[subcategory] ?? null;
}
