-- Adds the 'shopping' category (Signal Layer 2 — Money, Sprint D) to the
-- emission_factors catalog and to daily_summaries' per-category breakdown.
-- The inline CHECK on emission_factors.category was declared without an
-- explicit name, so Postgres auto-generated 'emission_factors_category_check'
-- (verified against 20260315000001_create_emission_factors.sql) — drop and
-- recreate it under that same name with 'shopping' added.
ALTER TABLE emission_factors
  DROP CONSTRAINT IF EXISTS emission_factors_category_check;

ALTER TABLE emission_factors
  ADD CONSTRAINT emission_factors_category_check
  CHECK (category IN ('food', 'transport', 'energy', 'shopping'));

ALTER TABLE daily_summaries
  ADD COLUMN shopping_kg NUMERIC(10, 4) NOT NULL DEFAULT 0;
