// __tests__/06/calculator.test.ts
// Wave 0 stub — carbon calculator logic (calcFootprint)
// Stubs for: calcFootprint, per-category calculations
// Source module: app/onboarding/calculator.tsx (created in 06-02)

// @ts-ignore — module created in 06-02
let calcFootprint: ((answers: Record<string, string>) => number) | undefined;

beforeAll(async () => {
  try {
    // @ts-ignore
    const mod = await import('@/app/onboarding/calculator');
    calcFootprint = mod.calcFootprint;
  } catch {
    calcFootprint = undefined;
  }
});

describe('Phase 6 — carbon calculator logic', () => {
  it('calcFootprint returns a positive number for any answer set', () => {
    if (!calcFootprint) return;
    const result = calcFootprint({
      transport: 'transit',
      transport_km: 'under_50',
      diet: 'omnivore',
      meat_freq: 'weekly',
      home_energy: 'gas',
      home_size: 'medium',
      shopping_clothes: 'seasonal',
      shopping_electronics: 'occasional',
    });
    expect(result).toBeGreaterThan(0);
  });

  it('calcFootprint returns higher value for high-impact answers', () => {
    if (!calcFootprint) return;
    const low = calcFootprint({
      transport: 'walk_cycle',
      transport_km: 'under_50',
      diet: 'vegan',
      meat_freq: 'never',
      home_energy: 'heat_pump',
      home_size: 'small',
      shopping_clothes: 'secondhand',
      shopping_electronics: 'rarely',
    });
    const high = calcFootprint({
      transport: 'flights',
      transport_km: 'over_500',
      diet: 'meat_daily',
      meat_freq: 'daily',
      home_energy: 'oil',
      home_size: 'large',
      shopping_clothes: 'frequent',
      shopping_electronics: 'frequently',
    });
    expect(high).toBeGreaterThan(low);
  });
});
