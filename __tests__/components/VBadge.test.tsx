import React from 'react';
import { render } from '@testing-library/react-native';
import { VBadge } from '@/components/ui/VBadge';

describe('VBadge', () => {
  it('renders label text', () => {
    const { getByText } = render(<VBadge label="Food" variant="food" />);
    expect(getByText('Food')).toBeTruthy();
  });

  it('renders without variant (defaults to neutral)', () => {
    const { getByText } = render(<VBadge label="Neutral" />);
    expect(getByText('Neutral')).toBeTruthy();
  });
});
