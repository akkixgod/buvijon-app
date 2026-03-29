import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@buvijon_onboarding_done';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  complete: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  loaded: false,

  load: async () => {
    try {
      const val = await AsyncStorage.getItem(KEY);
      set({ hasSeenOnboarding: val === 'true', loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  complete: async () => {
    try {
      await AsyncStorage.setItem(KEY, 'true');
    } catch {}
    set({ hasSeenOnboarding: true });
  },
}));
