import React from 'react';
import { render } from '@testing-library/react-native';
import { VSkeleton } from '@/components/ui/VSkeleton';

describe('VSkeleton', () => {
  it('renders without crashing with numeric width', () => {
    const { toJSON } = render(<VSkeleton width={200} height={20} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing with percentage width', () => {
    const { toJSON } = render(<VSkeleton width="100%" height={16} />);
    expect(toJSON()).toBeTruthy();
  });
});
