-- Phase 6: Add baseline_kg column to profiles for carbon calculator result
-- baseline_kg stores the user's annual kg CO₂e calculated during onboarding
-- NULL means calculator was not completed

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS baseline_kg NUMERIC(10, 2);

COMMENT ON COLUMN profiles.baseline_kg IS
  'Annual kg CO₂e baseline from onboarding carbon calculator. NULL if not completed.';
