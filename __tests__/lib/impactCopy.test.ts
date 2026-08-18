import { drivingComparisonCaption, globalAverageComparisonCaption } from '@/lib/impactCopy';
import { CAR_KG_PER_KM } from '@/lib/tripEngine';

describe('drivingComparisonCaption', () => {
  it('reads as a small amount for near-zero kg', () => {
    expect(drivingComparisonCaption(0)).toBe('A small amount');
    expect(drivingComparisonCaption(0.005)).toBe('A small amount');
  });

  it('gives a one-decimal km equivalent under 1 km', () => {
    // 0.05 kg / 0.168 kg-per-km ≈ 0.3 km
    expect(drivingComparisonCaption(0.05)).toBe('About a 0.3 km drive');
  });

  it('gives a whole-number km equivalent for a medium value', () => {
    const kg = CAR_KG_PER_KM * 6; // exactly a 6 km drive
    expect(drivingComparisonCaption(kg)).toBe('About a 6 km drive');
  });

  it('scales the same pattern for a large value', () => {
    const kg = CAR_KG_PER_KM * 800; // exactly an 800 km drive
    expect(drivingComparisonCaption(kg)).toBe('About a 800 km drive');
  });

  it('never spells out "kg CO2e" inside the sentence', () => {
    expect(drivingComparisonCaption(12)).not.toMatch(/co2e/i);
    expect(drivingComparisonCaption(12)).not.toMatch(/kg/i);
  });
});

describe('globalAverageComparisonCaption', () => {
  it('reports below the global average', () => {
    // 3.44 vs 4.0 -> 14% below
    expect(globalAverageComparisonCaption(3.44, 4.0)).toBe('14% below the global average');
  });

  it('reports above the global average', () => {
    // 4.32 vs 4.0 -> 8% above
    expect(globalAverageComparisonCaption(4.32, 4.0)).toBe('8% above the global average');
  });

  it('treats values within 2% as the same', () => {
    expect(globalAverageComparisonCaption(4.05, 4.0)).toBe('About the same as the global average');
    expect(globalAverageComparisonCaption(3.96, 4.0)).toBe('About the same as the global average');
    expect(globalAverageComparisonCaption(4.0, 4.0)).toBe('About the same as the global average');
  });

  it('guards against a zero or negative global average', () => {
    expect(globalAverageComparisonCaption(5, 0)).toBe('About the same as the global average');
  });
});
