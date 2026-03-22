import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@veridian/onboarding_complete';

interface OnboardingState {
  onboardingComplete: boolean;
  isChecked: boolean;
  initialize: () => Promise<void>;
  complete: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  onboardingComplete: false,
  isChecked: false,
  initialize: async () => {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    set({ onboardingComplete: value === 'true', isChecked: true });
  },
  complete: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    set({ onboardingComplete: true });
  },
}));

// Convenience exports for non-hook contexts (tests, background tasks)
export const initialize = () => useOnboardingStore.getState().initialize();
export const complete = () => useOnboardingStore.getState().complete();
