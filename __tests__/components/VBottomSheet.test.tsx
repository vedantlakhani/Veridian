import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VBottomSheet } from '@/components/ui/VBottomSheet';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderWithSafeArea(ui: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={initialMetrics}>{ui}</SafeAreaProvider>);
}

describe('VBottomSheet', () => {
  it('renders children when isOpen=true', () => {
    const { getByText } = renderWithSafeArea(
      <VBottomSheet isOpen={true} onClose={jest.fn()}>
        <Text>Sheet content</Text>
      </VBottomSheet>
    );
    expect(getByText('Sheet content')).toBeTruthy();
  });

  it('renders title when provided', () => {
    const { getByText } = renderWithSafeArea(
      <VBottomSheet isOpen={true} onClose={jest.fn()} title="Select Category">
        <Text>Content</Text>
      </VBottomSheet>
    );
    expect(getByText('Select Category')).toBeTruthy();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderWithSafeArea(
      <VBottomSheet isOpen={true} onClose={onClose} title="Test Sheet">
        <Text>Content</Text>
      </VBottomSheet>
    );
    fireEvent.press(getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
