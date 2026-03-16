import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { VBottomSheet } from '@/components/ui/VBottomSheet';

describe('VBottomSheet', () => {
  it('renders children when isOpen=true', () => {
    const { getByText } = render(
      <VBottomSheet isOpen={true} onClose={jest.fn()}>
        <Text>Sheet content</Text>
      </VBottomSheet>
    );
    expect(getByText('Sheet content')).toBeTruthy();
  });

  it('renders title when provided', () => {
    const { getByText } = render(
      <VBottomSheet isOpen={true} onClose={jest.fn()} title="Select Category">
        <Text>Content</Text>
      </VBottomSheet>
    );
    expect(getByText('Select Category')).toBeTruthy();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <VBottomSheet isOpen={true} onClose={onClose} title="Test Sheet">
        <Text>Content</Text>
      </VBottomSheet>
    );
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
