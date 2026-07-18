import {
  buildFeedSentence,
  buildImpactChip,
  buildTripConfirmSentence,
  formatClockTime,
  formatKgChip,
  pickFeedIcon,
  relativeDayLabel,
  type FeedEntryInput,
  type FeedTripInput,
} from '@/lib/feedCopy';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function entry(overrides: Partial<FeedEntryInput>): FeedEntryInput {
  return {
    kind: 'entry',
    item: 'Beef',
    subcategory: 'RED_MEAT',
    category: 'food',
    unit: 'kg',
    quantity: 0.5,
    kgCo2e: 6,
    at: new Date(2026, 0, 6, 8, 12),
    ...overrides,
  };
}

function trip(overrides: Partial<FeedTripInput>): FeedTripInput {
  return {
    kind: 'trip',
    mode: 'walk',
    distanceKm: 1.6,
    savedKg: 0.27,
    at: new Date(2026, 0, 6, 8, 12),
    ...overrides,
  };
}

// ─── buildFeedSentence — emission entries ──────────────────────────────────────

describe('buildFeedSentence · entries', () => {
  it('phrases a sensor/car transport entry as a drive with distance', () => {
    expect(
      buildFeedSentence(
        entry({ category: 'transport', subcategory: 'CAR_PETROL', item: 'Petrol Car Medium', unit: 'km', quantity: 12.4 }),
      ),
    ).toBe('Drove 12.4 km');
  });

  it('drops a trailing .0 on whole-km distances', () => {
    expect(
      buildFeedSentence(
        entry({ category: 'transport', subcategory: 'CAR_PETROL', item: 'Petrol Car', unit: 'km', quantity: 10 }),
      ),
    ).toBe('Drove 10 km');
  });

  it('detects bus and train transport modes from the factor', () => {
    expect(
      buildFeedSentence(entry({ category: 'transport', subcategory: 'BUS_LOCAL', item: 'Local Bus', unit: 'km', quantity: 5 })),
    ).toBe('Traveled 5 km by bus');
    expect(
      buildFeedSentence(entry({ category: 'transport', subcategory: 'DOMESTIC_RAIL', item: 'Domestic Rail', unit: 'km', quantity: 30 })),
    ).toBe('Traveled 30 km by train');
  });

  it('phrases a cycling transport entry as cycled, not driven', () => {
    expect(
      buildFeedSentence(entry({ category: 'transport', subcategory: 'BICYCLE', item: 'Bicycle', unit: 'km', quantity: 4.2 })),
    ).toBe('Cycled 4.2 km');
  });

  it('logs food with a subcategory qualifier when it adds information', () => {
    expect(buildFeedSentence(entry({ item: 'Beef', subcategory: 'RED_MEAT', category: 'food' }))).toBe(
      'Logged Beef — Red Meat',
    );
  });

  it('omits the qualifier when the subcategory just repeats the item', () => {
    expect(buildFeedSentence(entry({ item: 'Coffee', subcategory: 'COFFEE', category: 'food' }))).toBe(
      'Logged Coffee',
    );
  });

  it('logs energy and shopping entries by item', () => {
    expect(buildFeedSentence(entry({ item: 'Electricity', subcategory: 'ELECTRICITY', category: 'energy', unit: 'kWh', quantity: 5 }))).toBe(
      'Logged Electricity',
    );
    expect(buildFeedSentence(entry({ item: 'Clothing', subcategory: 'APPAREL', category: 'shopping', unit: 'item', quantity: 1 }))).toBe(
      'Logged Clothing — Apparel',
    );
  });

  it('never emits the "kg CO₂e" jargon in a sentence', () => {
    const s = buildFeedSentence(entry({ category: 'transport', subcategory: 'CAR_PETROL', item: 'Car', unit: 'km', quantity: 8 }));
    expect(s).not.toMatch(/CO₂|CO2/);
  });
});

// ─── buildFeedSentence — transaction-sourced entries (Sprint D) ────────────────

describe('buildFeedSentence · transaction entries', () => {
  it('leads with the merchant name when the entry is a bank-linked estimate', () => {
    expect(
      buildFeedSentence(
        entry({
          item: 'Grocery Stores',
          subcategory: 'GROCERIES',
          category: 'shopping',
          unit: 'USD',
          quantity: 1,
          source: 'transaction',
          merchantName: "Trader Joe's",
        }),
      ),
    ).toBe("Grocery Stores at Trader Joe's");
  });

  it('falls back to the normal "Logged X" sentence when no merchant name is present', () => {
    expect(
      buildFeedSentence(
        entry({
          item: 'Grocery Stores',
          subcategory: 'GROCERIES',
          category: 'shopping',
          unit: 'USD',
          quantity: 1,
          source: 'transaction',
          merchantName: null,
        }),
      ),
    ).toBe('Logged Grocery Stores — Groceries');
  });

  it('does not apply merchant phrasing to non-transaction entries even if merchantName were somehow set', () => {
    expect(
      buildFeedSentence(entry({ item: 'Beef', subcategory: 'RED_MEAT', category: 'food', source: 'manual' })),
    ).toBe('Logged Beef — Red Meat');
  });
});

// ─── buildFeedSentence — zero-emission trips ───────────────────────────────────

describe('buildFeedSentence · trips', () => {
  it('celebrates a walk with the amount saved vs driving', () => {
    expect(buildFeedSentence(trip({ mode: 'walk', distanceKm: 1.6, savedKg: 0.27 }))).toBe(
      'Walked 1.6 km — saved 0.3 kg vs driving',
    );
  });

  it('celebrates a cycle trip', () => {
    expect(buildFeedSentence(trip({ mode: 'cycling', distanceKm: 4.2, savedKg: 0.7 }))).toBe(
      'Cycled 4.2 km — saved 0.7 kg vs driving',
    );
  });

  it('omits the saved clause when nothing was saved', () => {
    expect(buildFeedSentence(trip({ mode: 'walk', distanceKm: 1.6, savedKg: 0 }))).toBe('Walked 1.6 km');
  });
});

// ─── buildImpactChip ───────────────────────────────────────────────────────────

describe('buildImpactChip', () => {
  it('marks trip chips positive with a "saved" prefix', () => {
    expect(buildImpactChip(trip({ savedKg: 0.3 }))).toEqual({ label: 'saved 0.3 kg', positive: true });
  });

  it('renders entry chips as a plain, non-positive kg value', () => {
    expect(buildImpactChip(entry({ kgCo2e: 0.9 }))).toEqual({ label: '0.9 kg', positive: false });
  });

  it('rounds large values to whole kg and floors tiny ones', () => {
    expect(formatKgChip(12.4)).toBe('12 kg');
    expect(formatKgChip(0.9)).toBe('0.9 kg');
    expect(formatKgChip(0.05)).toBe('<0.1 kg');
    expect(formatKgChip(0)).toBe('0.0 kg');
  });

  it('marks a transaction-sourced entry chip as estimated with a "~" prefix', () => {
    expect(buildImpactChip(entry({ kgCo2e: 4.2, source: 'transaction' }))).toEqual({
      label: '~4.2 kg',
      positive: false,
      estimated: true,
    });
  });

  it('never renders a transaction-sourced chip identically to a sensor/manual chip', () => {
    const sensorChip = buildImpactChip(entry({ kgCo2e: 4.2, source: 'sensor' }));
    const transactionChip = buildImpactChip(entry({ kgCo2e: 4.2, source: 'transaction' }));
    expect(transactionChip).not.toEqual(sensorChip);
    expect(transactionChip.estimated).toBe(true);
    expect(sensorChip.estimated).toBeUndefined();
  });
});

// ─── pickFeedIcon ──────────────────────────────────────────────────────────────

describe('pickFeedIcon', () => {
  it('maps a cycling transport entry to bike, not car', () => {
    expect(
      pickFeedIcon(entry({ category: 'transport', subcategory: 'BICYCLE', item: 'Bicycle', unit: 'km', quantity: 5 })),
    ).toBe('bike');
  });

  it('maps an e-bike transport entry to bike', () => {
    expect(
      pickFeedIcon(entry({ category: 'transport', subcategory: 'E_BIKE', item: 'E-Bike', unit: 'km', quantity: 5 })),
    ).toBe('bike');
  });

  it('maps a walking transport entry to walk', () => {
    expect(
      pickFeedIcon(entry({ category: 'transport', subcategory: 'FOOT', item: 'Walking', unit: 'km', quantity: 2 })),
    ).toBe('walk');
  });

  it('falls back to car for bus/train transport entries — no closer VIcon glyph exists', () => {
    expect(
      pickFeedIcon(entry({ category: 'transport', subcategory: 'BUS_LOCAL', item: 'Local Bus', unit: 'km', quantity: 5 })),
    ).toBe('car');
    expect(
      pickFeedIcon(entry({ category: 'transport', subcategory: 'CAR_PETROL', item: 'Petrol Car', unit: 'km', quantity: 5 })),
    ).toBe('car');
  });

  it('keeps non-transport categories on their existing category icons', () => {
    expect(pickFeedIcon(entry({ category: 'food', item: 'Beef', subcategory: 'RED_MEAT' }))).toBe('fork');
    expect(pickFeedIcon(entry({ category: 'energy', item: 'Electricity', subcategory: 'ELECTRICITY' }))).toBe('bolt');
  });

  it('keeps mode-based icons for zero-emission trip rows', () => {
    expect(pickFeedIcon(trip({ mode: 'cycling' }))).toBe('bike');
    expect(pickFeedIcon(trip({ mode: 'walk' }))).toBe('walk');
  });
});

// ─── formatClockTime ───────────────────────────────────────────────────────────

describe('formatClockTime', () => {
  it('formats morning, afternoon, noon and midnight', () => {
    expect(formatClockTime(new Date(2026, 0, 6, 8, 12))).toBe('8:12 AM');
    expect(formatClockTime(new Date(2026, 0, 6, 13, 9))).toBe('1:09 PM');
    expect(formatClockTime(new Date(2026, 0, 6, 12, 0))).toBe('12:00 PM');
    expect(formatClockTime(new Date(2026, 0, 6, 0, 5))).toBe('12:05 AM');
  });
});

// ─── relativeDayLabel ──────────────────────────────────────────────────────────

describe('relativeDayLabel', () => {
  const now = new Date(2026, 0, 6, 10, 0); // Tuesday 6 Jan 2026

  it('returns Today / Yesterday for the nearest days', () => {
    expect(relativeDayLabel(new Date(2026, 0, 6, 8, 12), now)).toBe('Today');
    expect(relativeDayLabel(new Date(2026, 0, 5, 23, 59), now)).toBe('Yesterday');
  });

  it('falls back to the weekday name for older dates', () => {
    // 3 Jan 2026 is a Saturday
    expect(relativeDayLabel(new Date(2026, 0, 3, 8, 12), now)).toBe('Saturday');
  });
});

// ─── buildTripConfirmSentence ──────────────────────────────────────────────────

describe('buildTripConfirmSentence', () => {
  const now = new Date(2026, 0, 6, 10, 0);

  it('opens with distance, mode noun, relative day and clock time', () => {
    expect(
      buildTripConfirmSentence({ mode: 'car', distanceKm: 12.4, startedAt: new Date(2026, 0, 5, 8, 12) }, now),
    ).toBe('Looks like a 12.4 km drive, Yesterday 8:12 AM');
  });

  it('uses friendly nouns per mode', () => {
    const started = new Date(2026, 0, 6, 8, 12);
    expect(buildTripConfirmSentence({ mode: 'cycling', distanceKm: 4, startedAt: started }, now)).toBe(
      'Looks like a 4 km bike ride, Today 8:12 AM',
    );
    expect(buildTripConfirmSentence({ mode: 'bus', distanceKm: 6.5, startedAt: started }, now)).toBe(
      'Looks like a 6.5 km bus ride, Today 8:12 AM',
    );
  });
});
