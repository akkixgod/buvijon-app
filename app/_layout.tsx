import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, NativeModules, LogBox } from 'react-native';

// Подавляем ошибки SplashScreen в Expo Go (несовместимость нативного модуля)
LogBox.ignoreLogs(['SplashModule', 'internalPreventAutoHideAsync', 'internalMaybeHideAsync']);

const SPLASH_MSGS = ['internalPreventAutoHideAsync', 'internalMaybeHideAsync', 'SplashModule'];
const isSplashError = (v: unknown) =>
  typeof v === 'string' && SPLASH_MSGS.some(m => v.includes(m));

// Silence console.error for these (LogBox doesn't cover console.error)
const _origError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (args.some(isSplashError)) return;
  _origError(...args);
};

if (typeof ErrorUtils !== 'undefined') {
  const prev = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isSplashError(error?.message)) return;
    prev?.(error, isFatal);
  });
}
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useOnboardingStore } from '@/store/onboardingStore';

export default function RootLayout() {
  const { loadSession, isLoading } = useAuthStore();
  const { loadChildren } = useChildrenStore();
  const { loadSettings } = useSettingsStore();
  const { load: loadOnboarding } = useOnboardingStore();

  useEffect(() => {
    async function init() {
      await Promise.all([loadSession(), loadSettings(), loadOnboarding()]);
      await loadChildren();
    }
    init();
  }, []);

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="child/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
