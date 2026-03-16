import React from 'react';
import { render } from '@testing-library/react-native';
import { EmissionBarChart } from '@/components/charts/EmissionBarChart';

const mockData = [
  { label: 'Food', value: 5.2, color: '#F97316' },
  { label: 'Transport', value: 2.1, color: '#3B82F6' },
  { label: 'Energy', value: 0, color: '#A855F7' },
];

describe('EmissionBarChart', () => {
  it('renders without crashing with valid data', () => {
    const { toJSON } = render(
      <EmissionBarChart data={mockData} width={300} height={200} />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders title when provided', () => {
    const { getByText } = render(
      <EmissionBarChart data={mockData} width={300} height={200} title="Weekly Breakdown" />
    );
    expect(getByText('Weekly Breakdown')).toBeTruthy();
  });

  it('renders empty state message when data is empty', () => {
    const { getByText } = render(
      <EmissionBarChart data={[]} width={300} height={200} />
    );
    expect(getByText('No data')).toBeTruthy();
  });

  it('does not render empty state when data is provided', () => {
    const { queryByText } = render(
      <EmissionBarChart data={mockData} width={300} height={200} />
    );
    expect(queryByText('No data')).toBeNull();
  });
});
