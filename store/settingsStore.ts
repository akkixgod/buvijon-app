import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '@/types';

interface SettingsState extends AppSettings {
  updateSettings: (data: Partial<AppSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const STORAGE_KEY = '@buvijon_settings';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'uz-latin',
  theme: 'light',
  notificationsEnabled: true,
  soundEnabled: true,
  weekStartsOn: 1,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_SETTINGS,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrate old language values to uz-latin
        if (parsed.language === 'uz') parsed.language = 'uz-latin';
        // v1.0.1: one-time migration from cyrillic default to latin
        if (!parsed._v101) {
          if (parsed.language === 'uz-cyrillic') parsed.language = 'uz-latin';
          parsed._v101 = true;
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        set(parsed);
      }
    } catch (_) {}
  },

  updateSettings: async (data) => {
    set((prev) => {
      const updated = { ...prev, ...data };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  },
}));
