import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { VProgressRing } from '@/components/ui/VProgressRing';

describe('VProgressRing', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<VProgressRing progress={0.5} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders children in center slot', () => {
    const { getByText } = render(
      <VProgressRing progress={0.75}>
        <Text>75%</Text>
      </VProgressRing>
    );
    expect(getByText('75%')).toBeTruthy();
  });
});
