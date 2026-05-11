import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSIONS_KEY = '@buvijon_onboarding_permissions_done';
const TOUR_KEY = '@buvijon_onboarding_garden_tour_done';

interface OnboardingState {
  hasCompletedPermissions: boolean;
  hasCompletedGardenTour: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  completePermissions: () => Promise<void>;
  completeGardenTour: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasCompletedPermissions: false,
  hasCompletedGardenTour: false,
  loaded: false,

  load: async () => {
    try {
      const [permissions, tour] = await Promise.all([
        AsyncStorage.getItem(PERMISSIONS_KEY),
        AsyncStorage.getItem(TOUR_KEY),
      ]);
      set({
        hasCompletedPermissions: permissions === 'true',
        hasCompletedGardenTour: tour === 'true',
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  completePermissions: async () => {
    try {
      await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
    } catch {}
    set({ hasCompletedPermissions: true });
  },

  completeGardenTour: async () => {
    try {
      await AsyncStorage.setItem(TOUR_KEY, 'true');
    } catch {}
    set({ hasCompletedGardenTour: true });
  },

  reset: async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(PERMISSIONS_KEY),
        AsyncStorage.removeItem(TOUR_KEY),
      ]);
    } catch {}
    set({ hasCompletedPermissions: false, hasCompletedGardenTour: false });
  },
}));
