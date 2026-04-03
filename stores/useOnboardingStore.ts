import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@veridian/onboarding_complete';
const PENDING_BASELINE_KEY = '@veridian/pending_baseline_kg';

interface OnboardingState {
  onboardingComplete: boolean;
  isChecked: boolean;
  pendingBaselineKg: number | null;
  initialize: () => Promise<void>;
  complete: () => Promise<void>;
  setPendingBaseline: (kg: number) => Promise<void>;
  clearPendingBaseline: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  onboardingComplete: false,
  isChecked: false,
  pendingBaselineKg: null,
  initialize: async () => {
    const [onboardingValue, baselineValue] = await Promise.all([
      AsyncStorage.getItem(ONBOARDING_KEY),
      AsyncStorage.getItem(PENDING_BASELINE_KEY),
    ]);
    set({
      onboardingComplete: onboardingValue === 'true',
      isChecked: true,
      pendingBaselineKg: baselineValue ? Number(baselineValue) : null,
    });
  },
  complete: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    set({ onboardingComplete: true });
  },
  setPendingBaseline: async (kg: number) => {
    await AsyncStorage.setItem(PENDING_BASELINE_KEY, String(kg));
    set({ pendingBaselineKg: kg });
  },
  clearPendingBaseline: async () => {
    await AsyncStorage.removeItem(PENDING_BASELINE_KEY);
    set({ pendingBaselineKg: null });
  },
}));

// Convenience exports for non-hook contexts (tests, background tasks)
export const initialize = () => useOnboardingStore.getState().initialize();
export const complete = () => useOnboardingStore.getState().complete();
