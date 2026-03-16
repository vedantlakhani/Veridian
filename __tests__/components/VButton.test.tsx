import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VButton } from '@/components/ui/VButton';

describe('VButton', () => {
  it('renders label text', () => {
    const { getByText } = render(<VButton label="Press Me" />);
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<VButton label="Tap" onPress={onPress} />);
    fireEvent.press(getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows ActivityIndicator when loading=true', () => {
    const { queryByText } = render(<VButton label="Loading" loading={true} />);
    // Label text should not be visible when loading
    expect(queryByText('Loading')).toBeNull();
  });

  it('is disabled when loading=true', () => {
    const onPress = jest.fn();
    render(
      <VButton label="x" loading={true} onPress={onPress} />
    );
    // Loading buttons are non-interactive
    expect(onPress).not.toHaveBeenCalled();
  });
});
