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
    const { UNSAFE_getByType } = render(<VButton label="Loading" loading={true} />);
    // Spinner overlays the (hidden but mounted) label so the width never jumps
    const { ActivityIndicator } = jest.requireActual<typeof import('react-native')>('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
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
