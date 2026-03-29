import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Parent } from '@/types';

interface AuthState {
  parent: Parent | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  loadSession: () => Promise<void>;
  sendOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyOtp: (email: string, token: string, name?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Parent>) => Promise<void>;
}

function rowToParent(profile: any): Parent {
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone ?? '',
    email: profile.email,
    avatar: profile.avatar,
    isPremium: profile.is_premium ?? false,
    createdAt: profile.created_at,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  parent: null,
  isAuthenticated: false,
  isLoading: true,

  loadSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          set({ parent: rowToParent(profile), isAuthenticated: true });
        }
      }
    } catch (_) {
    } finally {
      set({ isLoading: false });
    }
  },

  sendOtp: async (email) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Ошибка отправки кода' };
    }
  },

  verifyOtp: async (email, token, name) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: 'email',
      });
      if (error || !data.user) return { ok: false, error: error?.message ?? 'Неверный код' };

      // Проверяем наличие профиля
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        set({ parent: rowToParent(profile), isAuthenticated: true });
      } else if (name) {
        // Новый пользователь — создаём профиль
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name,
            email: email.trim().toLowerCase(),
            is_premium: false,
          });
        if (profileError) return { ok: false, error: profileError.message };
        set({
          parent: {
            id: data.user.id,
            name,
            phone: '',
            email: email.trim().toLowerCase(),
            isPremium: false,
            createdAt: new Date().toISOString(),
          },
          isAuthenticated: true,
        });
      } else {
        return { ok: false, error: 'PROFILE_NOT_FOUND' };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Неизвестная ошибка' };
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ parent: null, isAuthenticated: false });
  },

  updateProfile: async (data) => {
    const current = get().parent;
    if (!current) return;
    const updated = { ...current, ...data };
    await supabase
      .from('profiles')
      .update({ name: updated.name, phone: updated.phone, avatar: updated.avatar })
      .eq('id', current.id);
    set({ parent: updated });
  },
}));
