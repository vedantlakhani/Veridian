import { useEmissionStore } from '@/stores/emissionStore';

describe('emissionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEmissionStore.getState().reset();
  });

  it('setCategory updates selectedCategory and clears factor/quantity', () => {
    const store = useEmissionStore.getState();
    store.setQuantity('5');
    store.setCategory('food');
    expect(useEmissionStore.getState().selectedCategory).toBe('food');
    expect(useEmissionStore.getState().quantity).toBe('');
    expect(useEmissionStore.getState().selectedFactor).toBeNull();
  });

  it('reset clears all state fields', () => {
    useEmissionStore.getState().setCategory('transport');
    useEmissionStore.getState().setQuantity('10');
    useEmissionStore.getState().reset();
    const state = useEmissionStore.getState();
    expect(state.selectedCategory).toBeNull();
    expect(state.selectedFactor).toBeNull();
    expect(state.quantity).toBe('');
  });
});
