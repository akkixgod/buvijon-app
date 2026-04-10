import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PARENT_PIN_KEY = 'buvijon_parent_pin';
const PARENT_BIOMETRIC_KEY = 'buvijon_parent_biometric';

interface ParentPinState {
  isUnlocked: boolean;
  isBiometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  lock: () => void;
  setupPin: (pin: string) => Promise<boolean>;
  hasSetupPin: () => Promise<boolean>;
  removePin: () => Promise<void>;
}

export const useParentPinStore = create<ParentPinState>((set) => ({
  isUnlocked: false,
  isBiometricEnabled: false,

  setBiometricEnabled: (enabled) => {
    set({ isBiometricEnabled: enabled });
    SecureStore.setItemAsync(PARENT_BIOMETRIC_KEY, enabled ? 'true' : 'false');
  },

  unlockWithPin: async (pin: string) => {
    try {
      const savedPin = await SecureStore.getItemAsync(PARENT_PIN_KEY);
      if (savedPin === pin) {
        set({ isUnlocked: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  unlockWithBiometric: async () => {
    try {
      // Check if biometric is set up
      const biometricEnabled = await SecureStore.getItemAsync(PARENT_BIOMETRIC_KEY);
      if (biometricEnabled !== 'true') {
        return false;
      }

      // Check if PIN is set up
      const savedPin = await SecureStore.getItemAsync(PARENT_PIN_KEY);
      if (!savedPin) {
        return false;
      }

      // Perform biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Подтвердите, что вы родитель',
        fallbackLabel: 'Использовать PIN',
        cancelLabel: 'Отмена',
      });

      if (result.success) {
        set({ isUnlocked: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  lock: () => {
    set({ isUnlocked: false });
  },

  setupPin: async (pin: string) => {
    try {
      await SecureStore.setItemAsync(PARENT_PIN_KEY, pin);
      return true;
    } catch {
      return false;
    }
  },

  hasSetupPin: async () => {
    try {
      const pin = await SecureStore.getItemAsync(PARENT_PIN_KEY);
      return pin !== null;
    } catch {
      return false;
    }
  },

  removePin: async () => {
    try {
      await SecureStore.deleteItemAsync(PARENT_PIN_KEY);
      await SecureStore.deleteItemAsync(PARENT_BIOMETRIC_KEY);
    } catch {}
  },
}));
