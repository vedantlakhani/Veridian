import React from 'react';
import { render } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { VCountUp } from '@/components/ui/VCountUp';

function getInput(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_getByType(TextInput);
}

describe('VCountUp', () => {
  it('renders the initial value on mount', () => {
    const tree = render(<VCountUp value={0} decimals={1} />);
    expect(getInput(tree).props.value).toBe('0.0');
  });

  it('re-animates to a new value after a prop update post-mount', () => {
    // Regression test: todayKg on the Home ring starts at 0 while React
    // Query's today-entries fetch is in flight, then jumps to the real
    // total once it resolves. VCountUp must reflect that later value, not
    // just whatever it had at first mount.
    const tree = render(<VCountUp value={0} decimals={1} />);
    expect(getInput(tree).props.value).toBe('0.0');

    tree.rerender(<VCountUp value={2} decimals={1} />);
    expect(getInput(tree).props.value).toBe('2.0');
  });

  it('applies the suffix to the animated display text', () => {
    const tree = render(<VCountUp value={0} decimals={1} suffix=" kg" />);
    tree.rerender(<VCountUp value={5} decimals={1} suffix=" kg" />);
    expect(getInput(tree).props.value).toBe('5.0 kg');
  });

  it('respects the decimals prop', () => {
    const tree = render(<VCountUp value={0} decimals={0} />);
    tree.rerender(<VCountUp value={7} decimals={0} />);
    expect(getInput(tree).props.value).toBe('7');
  });
});
