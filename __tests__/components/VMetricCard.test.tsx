import React from 'react';
import { render } from '@testing-library/react-native';
import { VMetricCard } from '@/components/ui/VMetricCard';

describe('VMetricCard', () => {
  it('renders value and unit', () => {
    const { getByText } = render(
      <VMetricCard value={12.5} unit="kg CO₂e" label="Today" />
    );
    expect(getByText('12.5')).toBeTruthy();
    expect(getByText('kg CO₂e')).toBeTruthy();
  });

  it('renders label', () => {
    const { getByText } = render(
      <VMetricCard value={0} unit="kg" label="This Week" />
    );
    expect(getByText('This Week')).toBeTruthy();
  });

  it('renders trend indicator when trendValue provided', () => {
    const { getByText } = render(
      <VMetricCard value={8} unit="kg" label="Daily" trend="down" trendValue="-15%" />
    );
    // Component renders trend as "↓ -15%" in a single Text node
    expect(getByText('↓ -15%')).toBeTruthy();
  });
});
