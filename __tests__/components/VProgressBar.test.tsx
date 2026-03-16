import React from 'react';
import { render } from '@testing-library/react-native';
import { VProgressBar } from '@/components/ui/VProgressBar';

describe('VProgressBar', () => {
  it('renders without crashing at 0 progress', () => {
    const { toJSON } = render(<VProgressBar progress={0} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing at full progress', () => {
    const { toJSON } = render(<VProgressBar progress={1} />);
    expect(toJSON()).toBeTruthy();
  });

  it('clamps progress values outside 0-1 range', () => {
    // Should not throw for out-of-range values
    expect(() => render(<VProgressBar progress={1.5} />)).not.toThrow();
    expect(() => render(<VProgressBar progress={-0.5} />)).not.toThrow();
  });
});
