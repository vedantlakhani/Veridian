CREATE TABLE emission_factors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL CHECK (category IN ('food', 'transport', 'energy')),
  subcategory TEXT NOT NULL,
  item        TEXT NOT NULL,
  unit        TEXT NOT NULL,
  kg_co2e     NUMERIC(10, 6) NOT NULL CHECK (kg_co2e >= 0),
  source      TEXT NOT NULL DEFAULT 'DEFRA 2025',
  year        INTEGER NOT NULL DEFAULT 2025,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE emission_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on emission_factors"
  ON emission_factors FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE from client — data is seeded only

CREATE INDEX emission_factors_category_idx ON emission_factors(category);
CREATE INDEX emission_factors_subcategory_idx ON emission_factors(subcategory);
