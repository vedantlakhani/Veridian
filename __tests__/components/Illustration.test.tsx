import React from 'react';
import { render } from '@testing-library/react-native';
import { Illustration, type IllustrationName } from '@/components/illustrations';

// The v1 set required by DESIGN_DIRECTION.md — Illustration: categories,
// states, and moments. This list is the contract; if a name here stops
// resolving to a glyph, Phase 0's illustration set is incomplete.
const REQUIRED_NAMES: IllustrationName[] = [
  'transport.car',
  'transport.bike',
  'transport.walk',
  'transport.transit',
  'food.omnivore',
  'food.vegetarian',
  'food.vegan',
  'food.pescatarian',
  'food.flexitarian',
  'energy.grid',
  'energy.solar',
  'energy.gas',
  'energy.wind',
  'shopping.minimal',
  'shopping.moderate',
  'shopping.heavy',
  'state.emptyFeed',
  'state.noConnection',
  'state.allConfirmed',
  'state.firstRun',
  'moment.passport',
  'moment.recap',
  'moment.bankLink',
  'moment.receiptImport',
];

describe('Illustration', () => {
  it('covers the full v1 set (4 transport + 5 food + 4 energy + 3 shopping + 4 states + 4 moments = 24)', () => {
    expect(REQUIRED_NAMES).toHaveLength(24);
  });

  it.each(REQUIRED_NAMES)('renders %s without crashing', (name) => {
    const { toJSON } = render(<Illustration name={name} />);
    expect(toJSON()).toBeTruthy();
  });

  it('sizes on the 24/48/96 artboard grid', () => {
    for (const size of [24, 48, 96] as const) {
      const { toJSON } = render(<Illustration name="moment.passport" size={size} />);
      expect(toJSON()).toBeTruthy();
    }
  });
});
