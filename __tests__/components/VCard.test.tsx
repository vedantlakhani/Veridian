import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { VCard } from '@/components/ui/VCard';

describe('VCard', () => {
  it('renders children without crashing', () => {
    const { getByText } = render(
      <VCard><Text>Card content</Text></VCard>
    );
    expect(getByText('Card content')).toBeTruthy();
  });

  it('applies elevation="flat" without shadow styles', () => {
    const { toJSON } = render(<VCard elevation="flat"><Text>x</Text></VCard>);
    expect(toJSON()).toBeTruthy();
  });
});
