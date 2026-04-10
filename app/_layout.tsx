import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text, Animated, LogBox } from 'react-native';

// Suppress SplashScreen errors in Expo Go
LogBox.ignoreLogs(['SplashModule', 'internalPreventAutoHideAsync', 'internalMaybeHideAsync']);

const SPLASH_MSGS = ['internalPreventAutoHideAsync', 'internalMaybeHideAsync', 'SplashModule'];
const isSplashError = (v: unknown) =>
  typeof v === 'string' && SPLASH_MSGS.some(m => v.includes(m));

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
import { usePostsStore } from '@/store/postsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { BuvijonLogo } from '@/components/ui/BuvijonLogo';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/theme';

function SplashView() {
  const language = useSettingsStore(s => s.language);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();
  }, []);

  const loadingText = language === 'ru' ? 'Загрузка...'
    : language === 'uz-cyrillic' ? 'Юкланмоқда...'
    : 'Yuklanmoqda...';

  return (
    <Animated.View style={[splashStyles.container, { opacity: fadeAnim }]}>
      <BuvijonLogo size={80} />
      <Text style={splashStyles.title}>Buvijon</Text>
      <Text style={splashStyles.loading}>{loadingText}</Text>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  loading: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 8,
  },
});

export default function RootLayout() {
  const { loadSession, isLoading, isAuthenticated } = useAuthStore();
  const { loadChildren } = useChildrenStore();
  const { loadPosts, loadCachedPosts } = usePostsStore();
  const { loadSettings } = useSettingsStore();
  const { load: loadOnboarding } = useOnboardingStore();

  useEffect(() => {
    async function init() {
      await Promise.all([loadSession(), loadSettings(), loadOnboarding(), loadCachedPosts()]);
      await Promise.all([loadChildren(), loadPosts()]);
    }
    init();
  }, []);

  // Reload children whenever auth state changes (e.g. after login)
  useEffect(() => {
    if (isAuthenticated) {
      loadChildren();
      loadPosts();
    }
  }, [isAuthenticated]);

  if (isLoading) return <SplashView />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="child/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
