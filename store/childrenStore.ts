import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Child, FlowerVariant } from '@/types';
import type { BlockerChildConfig } from 'screen-time';

let ScreenTime: typeof import('screen-time') | null = null;
try {
  ScreenTime = require('screen-time');
} catch {
  ScreenTime = null;
}

const CHILDREN_CACHE_KEY = 'buvijon_children_cache';

interface ChildrenState {
  children: Child[];
  isLoading: boolean;
  currentActiveChildId: string | null;  // Tracks which child is currently active (via PIN)

  loadCachedChildren: () => Promise<void>;
  loadChildren: () => Promise<void>;
  addChild: (data: Omit<Child, 'id' | 'createdAt' | 'screenTimeToday' | 'screenTimeWeek' | 'blockedApps' | 'isActive'>) => Promise<void>;
  updateChild: (id: string, data: Partial<Child>) => Promise<void>;
  removeChild: (id: string) => Promise<void>;
  addScreenTime: (childId: string, minutes: number) => Promise<void>;
  resetDailyTime: (childId: string) => Promise<void>;
  getChildById: (id: string) => Child | undefined;
  setActiveChildId: (id: string | null) => void;
  syncActiveChildFromNative: () => void;
  logoutActiveChild: () => void;
  syncBlockerConfigsToNative: () => void;
}

function syncBlockerConfigs(children: Child[]) {
  if (Platform.OS !== 'android' || !ScreenTime) return;
  const configs: BlockerChildConfig[] = children
    .filter(c => c.isActive && c.blockedApps.length > 0)
    .map(c => ({
      childId: c.id,
      childName: c.name,
      childPin: c.pin,
      dailyLimitMinutes: c.dailyLimitMinutes,
      blockedPackages: c.blockedApps,
    }));
  try {
    ScreenTime.syncBlockerConfigs(configs);
  } catch {}
}

function rowToChild(row: any): Child {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    avatar: row.avatar,
    flowerVariant: row.flower_variant as FlowerVariant,
    flowerColor: row.flower_color,
    pin: row.pin ?? '0000',
    dailyLimitMinutes: row.daily_limit_minutes,
    screenTimeToday: row.screen_time_today,
    screenTimeWeek: row.screen_time_week ?? [0, 0, 0, 0, 0, 0, 0],
    blockedApps: row.blocked_apps ?? [],
    isActive: row.is_active,
    lastSeen: row.last_seen,
    createdAt: row.created_at,
  };
}

export const useChildrenStore = create<ChildrenState>((set, get) => ({
  children: [],
  isLoading: false,
  currentActiveChildId: null,

  loadCachedChildren: async () => {
    try {
      const cached = await AsyncStorage.getItem(CHILDREN_CACHE_KEY);
      if (cached) {
        const children = JSON.parse(cached) as Child[];
        if (Array.isArray(children) && children.length > 0) {
          set({ children });
        }
      }
    } catch (_) {}
  },

  loadChildren: async () => {
    const hasCached = get().children.length > 0;
    if (!hasCached) set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (!error && data) {
        const children = data.map(rowToChild);
        set({ children });
        AsyncStorage.setItem(CHILDREN_CACHE_KEY, JSON.stringify(children)).catch(() => {});
        syncBlockerConfigs(children);
      }
    } catch (_) {
    } finally {
      set({ isLoading: false });
    }
  },

  addChild: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: inserted, error } = await supabase
      .from('children')
      .insert({
        parent_id: user.id,
        name: data.name,
        age: data.age,
        pin: data.pin,
        flower_variant: data.flowerVariant,
        flower_color: data.flowerColor,
        daily_limit_minutes: data.dailyLimitMinutes,
        screen_time_today: 0,
        screen_time_week: [0, 0, 0, 0, 0, 0, 0],
        blocked_apps: [],
        is_active: true,
      })
      .select()
      .single();

    if (!error && inserted) {
      const child = rowToChild(inserted);
      const children = [...get().children, child];
      set({ children });
      AsyncStorage.setItem(CHILDREN_CACHE_KEY, JSON.stringify(children)).catch(() => {});
      syncBlockerConfigs(children);
    }
  },

  updateChild: async (id, data) => {
    const updates: Record<string, any> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.age !== undefined) updates.age = data.age;
    if (data.pin !== undefined) updates.pin = data.pin;
    if (data.flowerVariant !== undefined) updates.flower_variant = data.flowerVariant;
    if (data.flowerColor !== undefined) updates.flower_color = data.flowerColor;
    if (data.dailyLimitMinutes !== undefined) updates.daily_limit_minutes = data.dailyLimitMinutes;
    if (data.screenTimeToday !== undefined) updates.screen_time_today = data.screenTimeToday;
    if (data.screenTimeWeek !== undefined) updates.screen_time_week = data.screenTimeWeek;
    if (data.blockedApps !== undefined) updates.blocked_apps = data.blockedApps;
    if (data.isActive !== undefined) updates.is_active = data.isActive;
    if (data.lastSeen !== undefined) updates.last_seen = data.lastSeen;

    const { error } = await supabase.from('children').update(updates).eq('id', id);
    if (!error) {
      const children = get().children.map(c => c.id === id ? { ...c, ...data } : c);
      set({ children });
      AsyncStorage.setItem(CHILDREN_CACHE_KEY, JSON.stringify(children)).catch(() => {});
      syncBlockerConfigs(children);
    }
  },

  removeChild: async (id) => {
    // Soft delete
    const { error } = await supabase
      .from('children')
      .update({ is_active: false })
      .eq('id', id);
    if (!error) {
      const children = get().children.filter(c => c.id !== id);
      set({ children });
      AsyncStorage.setItem(CHILDREN_CACHE_KEY, JSON.stringify(children)).catch(() => {});
      syncBlockerConfigs(children);
    }
  },

  addScreenTime: async (childId, minutes) => {
    const child = get().children.find(c => c.id === childId);
    if (!child) return;

    const newTotal = child.screenTimeToday + minutes;
    const { error } = await supabase
      .from('children')
      .update({
        screen_time_today: newTotal,
        last_seen: new Date().toISOString(),
      })
      .eq('id', childId);

    if (!error) {
      set(s => ({
        children: s.children.map(c =>
          c.id === childId
            ? { ...c, screenTimeToday: newTotal, lastSeen: new Date().toISOString() }
            : c
        ),
      }));
    }
  },

  resetDailyTime: async (childId) => {
    const child = get().children.find(c => c.id === childId);
    if (!child) return;

    const newWeek = [...child.screenTimeWeek.slice(1), child.screenTimeToday];
    const { error } = await supabase
      .from('children')
      .update({ screen_time_today: 0, screen_time_week: newWeek })
      .eq('id', childId);

    if (!error) {
      set(s => ({
        children: s.children.map(c =>
          c.id === childId
            ? { ...c, screenTimeToday: 0, screenTimeWeek: newWeek }
            : c
        ),
      }));
    }
  },

  getChildById: (id) => get().children.find(c => c.id === id),
  setActiveChildId: (id) => set({ currentActiveChildId: id }),

  syncActiveChildFromNative: () => {
    if (Platform.OS !== 'android' || !ScreenTime) return;
    try {
      const id = ScreenTime.getActiveChildId();
      set({ currentActiveChildId: id });
    } catch {
      // Native module may not be linked (Expo Go) — ignore
    }
  },

  logoutActiveChild: () => {
    set({ currentActiveChildId: null });
    if (Platform.OS === 'android' && ScreenTime) {
      try {
        ScreenTime.logoutChild();
      } catch {
        // best-effort: state already cleared above
      }
    }
  },

  syncBlockerConfigsToNative: () => {
    syncBlockerConfigs(get().children);
  },
}));
