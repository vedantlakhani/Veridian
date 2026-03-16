import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VChip } from '@/components/ui/VChip';

describe('VChip', () => {
  it('renders label', () => {
    const { getByText } = render(<VChip label="Food" />);
    expect(getByText('Food')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<VChip label="Food" onPress={onPress} />);
    fireEvent.press(getByText('Food'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<VChip label="Food" onPress={onPress} disabled={true} />);
    fireEvent.press(getByText('Food'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
