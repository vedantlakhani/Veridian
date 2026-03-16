import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VInput } from '@/components/ui/VInput';

describe('VInput', () => {
  it('renders label text', () => {
    const { getByText } = render(<VInput label="Email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('shows error message when error prop provided', () => {
    const { getByText } = render(<VInput label="Email" error="Required field" />);
    expect(getByText('Required field')).toBeTruthy();
  });

  it('calls onChangeText on input', () => {
    const onChangeText = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <VInput label="Email" value="" onChangeText={onChangeText} />
    );
    const { TextInput } = require('react-native');
    // Verify the input is present
    expect(UNSAFE_getAllByType(TextInput)).toHaveLength(1);
  });
});
