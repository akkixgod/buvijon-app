import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Parent } from '@/types';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

interface AuthState {
  parent: Parent | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  loadSession: () => Promise<void>;
  sendOtp: (email: string, shouldCreateUser?: boolean) => Promise<{ ok: boolean; error?: string }>;
  verifyOtp: (email: string, token: string, name?: string, username?: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean; isNewUser?: boolean; error?: string }>;
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
    username: profile.username,
    isPremium: profile.is_premium ?? false,
    createdAt: profile.created_at,
  };
}

async function generateUniqueUsername(baseName: string): Promise<string> {
  let base = baseName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 16);
  if (base.length < 3) base = 'user';

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt}`;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}${Math.random().toString(16).slice(2, 6)}`;
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

  sendOtp: async (email, shouldCreateUser = true) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Ошибка отправки кода' };
    }
  },

  verifyOtp: async (email, token, name, username) => {
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
        const resolvedUsername = username || await generateUniqueUsername(name);
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name,
            email: email.trim().toLowerCase(),
            username: resolvedUsername,
            is_premium: false,
          });
        if (profileError) return { ok: false, error: profileError.message };
        // Save first-install timestamp so screen time counts from registration, not midnight
        const existing = await AsyncStorage.getItem('@buvijon_install_time');
        if (!existing) await AsyncStorage.setItem('@buvijon_install_time', Date.now().toString());
        set({
          parent: {
            id: data.user.id,
            name,
            phone: '',
            email: email.trim().toLowerCase(),
            username: resolvedUsername,
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

  signInWithGoogle: async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        return { ok: false, error: 'Вход отменён' };
      }

      const idToken = response.data?.idToken;
      if (!idToken) {
        return { ok: false, error: 'Не удалось получить токен Google. Проверьте Web Client ID.' };
      }

      const authPromise = supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 20_000)
      );
      const { data, error } = await Promise.race([authPromise, timeoutPromise]);
      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: 'Пользователь не найден' };

      // Check/create profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        set({ parent: rowToParent(profile), isAuthenticated: true });
        return { ok: true, isNewUser: false };
      } else {
        const name = data.user.user_metadata?.full_name ?? data.user.email?.split('@')[0] ?? '';
        const email = data.user.email ?? '';
        const username = await generateUniqueUsername(name);
        const { error: insertErr } = await supabase.from('profiles').insert({
          id: data.user.id,
          name,
          email,
          username,
          is_premium: false,
        });
        if (insertErr) return { ok: false, error: insertErr.message };
        // Save first-install timestamp
        const existing = await AsyncStorage.getItem('@buvijon_install_time');
        if (!existing) await AsyncStorage.setItem('@buvijon_install_time', Date.now().toString());
        set({
          parent: {
            id: data.user.id,
            name,
            phone: '',
            email,
            username,
            isPremium: false,
            createdAt: new Date().toISOString(),
          },
          isAuthenticated: true,
        });
        return { ok: true, isNewUser: true };
      }
    } catch (e: any) {
      const code = e?.code ?? '';
      const msg = code === 'SIGN_IN_CANCELLED' || e.message === 'SIGN_IN_CANCELLED'
        ? 'SIGN_IN_CANCELLED'
        : e.message === 'TIMEOUT'
        ? 'TIMEOUT'
        : (e.message ?? 'Ошибка входа через Google');
      return { ok: false, error: msg };
    }
  },

  logout: async () => {
    set({ parent: null, isAuthenticated: false });
    await supabase.auth.signOut().catch(() => {});
  },

  updateProfile: async (data) => {
    const current = get().parent;
    if (!current) return;
    const updated = { ...current, ...data };
    await supabase
      .from('profiles')
      .update({ name: updated.name, phone: updated.phone, avatar: updated.avatar, username: updated.username })
      .eq('id', current.id);
    set({ parent: updated });
  },
}));
