-- Seeds emission_factors with the spend-based (USD) factor rows the Sprint D
-- money layer needs, per SPRINT_D_SPEC.md Stage 2: "seed emission_factors
-- with one row per NAICS sector used (category 'shopping'/'food'/'transport'
-- as appropriate, unit 'USD', source 'EPA USEEIO vX')".
--
-- These rows are DISTINCT from the pre-existing manual-log catalog in
-- supabase/seed.sql (DEFRA 2025, unit = kg/km/litre/etc, one row per food
-- item or transport mode a user picks by hand). This migration instead seeds
-- one row per 2017 NAICS-6 sector that lib/spendFactors.ts's crosswalk
-- (data/category_to_naics.json) can resolve a Plaid transaction to, unit =
-- 'USD', so `kg_co2e` here means "kg CO2e per (CPI-adjusted) 2022 USD spent"
-- — the exact quantity lib/spendFactors.ts computes and the future
-- plaid-sync edge function (Stage 3) will look up by (source, subcategory)
-- to satisfy `emission_entries.factor_id NOT NULL`.
--
-- NOT PLACEHOLDER DATA: at the time this migration was written,
-- data/useeio_factors.json already existed in the repo as a checked-in,
-- cited snapshot of EPA Supply Chain GHG Emission Factors v1.3.0
-- ("with margins" / purchaser-price variant, kg CO2e per 2022 USD, 2017
-- NAICS-6). Every (category, subcategory=NAICS code, item=NAICS title,
-- kg_co2e) tuple below is copied verbatim from that file's `factors` object
-- — all 69 sectors it contains — so this migration is a direct, reconciled
-- mirror of the real factor engine's dataset, not an invented stand-in.
-- `category` is copied from that file's `appCategory` per sector, which is
-- one of 'food' | 'transport' | 'energy' | 'shopping' — all four already
-- permitted by emission_factors_category_check (see
-- 20260315000001_create_emission_factors.sql +
-- 20260710000020_add_shopping_category.sql).
--
-- Reconciliation note for whoever ships Stage 3: if data/useeio_factors.json
-- is ever regenerated with a new datasetVersion, updated factor values, or an
-- expanded sector list (its own header documents this is a CURATED SUBSET of
-- the full ~1,016-row EPA file), this seed must be re-derived from it in the
-- same migration-additive style (a new migration, never an edit to this one)
-- so the two stay in lockstep — the plaid-sync function's factor lookup and
-- lib/spendFactors.ts's in-app estimate must always resolve to the same
-- number for the same NAICS code.
INSERT INTO emission_factors (category, subcategory, item, unit, kg_co2e, source, year) VALUES
('energy', '221210', 'Natural Gas Distribution', 'USD', 0.532000, 'EPA USEEIO v1.3.0', 2022),
('energy', '221310', 'Water Supply and Irrigation Systems', 'USD', 0.578000, 'EPA USEEIO v1.3.0', 2022),
('energy', '221330', 'Steam and Air-Conditioning Supply', 'USD', 0.578000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '442110', 'Furniture Stores', 'USD', 0.111000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '443142', 'Electronics Stores', 'USD', 0.111000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '444110', 'Home Centers', 'USD', 0.087000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '444130', 'Hardware Stores', 'USD', 0.087000, 'EPA USEEIO v1.3.0', 2022),
('food', '445110', 'Supermarkets and Other Grocery (except Convenience) Stores', 'USD', 0.186000, 'EPA USEEIO v1.3.0', 2022),
('food', '445120', 'Convenience Stores', 'USD', 0.186000, 'EPA USEEIO v1.3.0', 2022),
('food', '445310', 'Beer, Wine, and Liquor Stores', 'USD', 0.186000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '446110', 'Pharmacies and Drug Stores', 'USD', 0.130000, 'EPA USEEIO v1.3.0', 2022),
('transport', '447110', 'Gasoline Stations with Convenience Stores', 'USD', 0.183000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '448140', 'Family Clothing Stores', 'USD', 0.138000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '451110', 'Sporting Goods Stores', 'USD', 0.111000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '451211', 'Book Stores', 'USD', 0.111000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '452210', 'Department Stores', 'USD', 0.164000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '452311', 'Warehouse Clubs and Supercenters', 'USD', 0.164000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '452319', 'All Other General Merchandise Stores', 'USD', 0.164000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '453210', 'Office Supplies and Stationery Stores', 'USD', 0.111000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '453220', 'Gift, Novelty, and Souvenir Stores', 'USD', 0.111000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '453910', 'Pet and Pet Supplies Stores', 'USD', 0.111000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '453991', 'Tobacco Stores', 'USD', 0.111000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '454110', 'Electronic Shopping and Mail-Order Houses', 'USD', 0.094000, 'EPA USEEIO v1.3.0', 2022),
('food', '454210', 'Vending Machine Operators', 'USD', 0.094000, 'EPA USEEIO v1.3.0', 2022),
('transport', '481111', 'Scheduled Passenger Air Transportation', 'USD', 0.644000, 'EPA USEEIO v1.3.0', 2022),
('transport', '485113', 'Bus and Other Motor Vehicle Transit Systems', 'USD', 0.566000, 'EPA USEEIO v1.3.0', 2022),
('transport', '485310', 'Taxi Service', 'USD', 0.566000, 'EPA USEEIO v1.3.0', 2022),
('transport', '485999', 'All Other Transit and Ground Passenger Transportation', 'USD', 0.566000, 'EPA USEEIO v1.3.0', 2022),
('transport', '488490', 'Other Support Activities for Road Transportation', 'USD', 0.162000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '492110', 'Couriers and Express Delivery Services', 'USD', 0.303000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '493110', 'General Warehousing and Storage', 'USD', 0.244000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '511210', 'Software Publishers', 'USD', 0.080000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '512131', 'Motion Picture Theaters (except Drive-Ins)', 'USD', 0.052000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '512250', 'Record Production and Distribution', 'USD', 0.044000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '517311', 'Wired Telecommunications Carriers', 'USD', 0.075000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '517312', 'Wireless Telecommunications Carriers (except Satellite)', 'USD', 0.096000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '524210', 'Insurance Agencies and Brokerages', 'USD', 0.029000, 'EPA USEEIO v1.3.0', 2022),
('transport', '532111', 'Passenger Car Rental', 'USD', 0.110000, 'EPA USEEIO v1.3.0', 2022),
('transport', '532284', 'Recreational Goods Rental', 'USD', 0.102000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '541110', 'Offices of Lawyers', 'USD', 0.041000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '541211', 'Offices of Certified Public Accountants', 'USD', 0.054000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '541940', 'Veterinary Services', 'USD', 0.127000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '561520', 'Tour Operators', 'USD', 0.088000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '561621', 'Security Systems Services (except Locksmiths)', 'USD', 0.074000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '561990', 'All Other Support Services', 'USD', 0.127000, 'EPA USEEIO v1.3.0', 2022),
('energy', '562111', 'Solid Waste Collection', 'USD', 0.988000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '611310', 'Colleges, Universities, and Professional Schools', 'USD', 0.140000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '621111', 'Offices of Physicians (except Mental Health Specialists)', 'USD', 0.083000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '621210', 'Offices of Dentists', 'USD', 0.056000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '621320', 'Offices of Optometrists', 'USD', 0.105000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '621399', 'Offices of All Other Miscellaneous Health Practitioners', 'USD', 0.105000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '623110', 'Nursing Care Facilities (Skilled Nursing Facilities)', 'USD', 0.159000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '624410', 'Child Day Care Services', 'USD', 0.215000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '713110', 'Amusement and Theme Parks', 'USD', 0.167000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '713290', 'Other Gambling Industries', 'USD', 0.174000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '713940', 'Fitness and Recreational Sports Centers', 'USD', 0.235000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '713990', 'All Other Amusement and Recreation Industries', 'USD', 0.235000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '721110', 'Hotels (except Casino Hotels) and Motels', 'USD', 0.145000, 'EPA USEEIO v1.3.0', 2022),
('food', '722511', 'Full-Service Restaurants', 'USD', 0.194000, 'EPA USEEIO v1.3.0', 2022),
('food', '722513', 'Limited-Service Restaurants', 'USD', 0.255000, 'EPA USEEIO v1.3.0', 2022),
('food', '722515', 'Snack and Nonalcoholic Beverage Bars', 'USD', 0.132000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '811111', 'General Automotive Repair', 'USD', 0.103000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '811490', 'Other Personal and Household Goods Repair and Maintenance', 'USD', 0.113000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '812112', 'Beauty Salons', 'USD', 0.125000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '812199', 'Other Personal Care Services', 'USD', 0.125000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '812320', 'Drycleaning and Laundry Services (except Coin-Operated)', 'USD', 0.158000, 'EPA USEEIO v1.3.0', 2022),
('transport', '812930', 'Parking Lots and Garages', 'USD', 0.111000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '813219', 'Other Grantmaking and Giving Services', 'USD', 0.059000, 'EPA USEEIO v1.3.0', 2022),
('shopping', '813990', 'Other Similar Organizations (except Business, Professional, Labor, and Political Organizations)', 'USD', 0.128000, 'EPA USEEIO v1.3.0', 2022);
