import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VEmptyState } from '@/components/ui/VEmptyState';

describe('VEmptyState', () => {
  it('renders title and body', () => {
    const { getByText } = render(
      <VEmptyState title="No entries yet" body="Log your first emission entry to get started." />
    );
    expect(getByText('No entries yet')).toBeTruthy();
    expect(getByText('Log your first emission entry to get started.')).toBeTruthy();
  });

  it('renders CTA button and fires callback', () => {
    const onCta = jest.fn();
    const { getByText } = render(
      <VEmptyState title="Empty" body="Nothing here" ctaLabel="Add Entry" onCta={onCta} />
    );
    fireEvent.press(getByText('Add Entry'));
    expect(onCta).toHaveBeenCalledTimes(1);
  });
});
