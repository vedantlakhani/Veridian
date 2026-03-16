import { create } from 'zustand';
import type { EmissionCategory, EmissionFactor } from '@/types/emission';

interface EmissionState {
  selectedCategory: EmissionCategory | null;
  selectedFactor: EmissionFactor | null;
  quantity: string; // kept as string for text input binding; parse to number on submit
  setCategory: (cat: EmissionCategory | null) => void;
  setFactor: (factor: EmissionFactor | null) => void;
  setQuantity: (q: string) => void;
  reset: () => void;
}

export const useEmissionStore = create<EmissionState>((set) => ({
  selectedCategory: null,
  selectedFactor: null,
  quantity: '',
  setCategory: (selectedCategory) => set({ selectedCategory, selectedFactor: null, quantity: '' }),
  setFactor: (selectedFactor) => set({ selectedFactor }),
  setQuantity: (quantity) => set({ quantity }),
  reset: () => set({ selectedCategory: null, selectedFactor: null, quantity: '' }),
}));
