import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  AppState, Platform, AppStateStatus,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { ms, fs } from '@/utils/responsive';
import { useSettingsStore } from '@/store/settingsStore';

let ScreenTime: typeof import('screen-time') | null = null;
try { ScreenTime = require('screen-time'); } catch { ScreenTime = null; }

type Step = 'usage' | 'overlay' | 'done';

const STRINGS = {
  ru: {
    usage: {
      title: 'Статистика экрана',
      subtitle: 'Buvijon отслеживает время экрана вашего ребёнка, чтобы помочь соблюдать здоровый баланс.',
      hint: 'Данные остаются на устройстве и не передаются третьим лицам.',
      step1: 'Нажмите "Разрешить доступ"',
      step2: 'Включите "Buvijon" в списке',
      step3: 'Вернитесь в приложение',
      btn: 'Разрешить доступ',
    },
    overlay: {
      title: 'Отображение поверх',
      subtitle: 'Когда ребёнок открывает заблокированное приложение, Buvijon показывает экран с запросом PIN.',
      hint: 'Это работает только для приложений, которые вы заблокируете.',
      step1: 'Нажмите "Разрешить"',
      step2: 'Включите "Buvijon" в списке',
      step3: 'Вернитесь в приложение',
      btn: 'Разрешить',
    },
    skip: 'Пропустить',
    waiting: 'Ожидаем разрешения...',
    waitingHint: 'Включите "Buvijon" и вернитесь',
  },
  'uz-cyrillic': {
    usage: {
      title: 'Экран статистикаси',
      subtitle: "Buvijon farzandingizning ekran vaqtini kuzatib, sog'lom muvozanatni saqlashga yordam beradi.",
      hint: "Ma'lumotlar qurilmada saqlanadi va uchinchi tomonlarga uzatilmaydi.",
      step1: '"Ruxsat berish" tugmasini bosing',
      step2: 'Ro\'yxatdan "Buvijon"ni yoqing',
      step3: "Ilovaga qaytining",
      btn: 'Ruxsat berish',
    },
    overlay: {
      title: 'Ustidan ko\'rsatish',
      subtitle: "Bola bloklangan ilovani ochganda, Buvijon PIN so'rash ekranini ko'rsatadi.",
      hint: "Bu faqat siz bloklagan ilovalar uchun ishlaydi.",
      step1: '"Ruxsat berish" tugmasini bosing',
      step2: 'Ro\'yxatdan "Buvijon"ni yoqing',
      step3: "Ilovaga qaytining",
      btn: 'Ruxsat berish',
    },
    skip: 'O\'tkazib yuborish',
    waiting: 'Ruxsat kutilmoqda...',
    waitingHint: '"Buvijon"ni yoqing va qaytib keling',
  },
  'uz-latin': {
    usage: {
      title: 'Ekran statistikasi',
      subtitle: "Buvijon farzandingizning ekran vaqtini kuzatib, sog'lom muvozanatni saqlashga yordam beradi.",
      hint: "Ma'lumotlar qurilmada saqlanadi va uchinchi tomonlarga uzatilmaydi.",
      step1: '"Ruxsat berish" tugmasini bosing',
      step2: "Ro'yxatdan \"Buvijon\"ni yoqing",
      step3: "Ilovaga qaytining",
      btn: 'Ruxsat berish',
    },
    overlay: {
      title: "Ustidan ko'rsatish",
      subtitle: "Bola bloklangan ilovani ochganda, Buvijon PIN so'rash ekranini ko'rsatadi.",
      hint: "Bu faqat siz bloklagan ilovalar uchun ishlaydi.",
      step1: '"Ruxsat berish" tugmasini bosing',
      step2: "Ro'yxatdan \"Buvijon\"ni yoqing",
      step3: "Ilovaga qaytining",
      btn: 'Ruxsat berish',
    },
    skip: "O'tkazib yuborish",
    waiting: 'Ruxsat kutilmoqda...',
    waitingHint: '"Buvijon"ni yoqing va qaytib keling',
  },
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { complete } = useOnboardingStore();
  const language = useSettingsStore(s => s.language);
  const lang = STRINGS[language] ?? STRINGS.ru;

  const [step, setStep] = useState<Step>('usage');
  const [waiting, setWaiting] = useState(false);
  const waitingRef = useRef(false);
  const currentStepRef = useRef<Step>('usage');

  useEffect(() => { currentStepRef.current = step; }, [step]);

  // Skip on non-Android
  useEffect(() => {
    if (Platform.OS !== 'android' || !ScreenTime) {
      complete().then(() => router.replace('/(tabs)'));
    }
  }, []);

  // When app comes back to foreground after user visits Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active' || !waitingRef.current) return;
      waitingRef.current = false;
      setWaiting(false);

      if (currentStepRef.current === 'usage') {
        // Check if usage permission was granted; if so, go to overlay step
        const hasUsage = ScreenTime?.hasPermission() ?? false;
        if (hasUsage) {
          const hasOverlay = ScreenTime?.hasOverlayPermission() ?? false;
          if (hasOverlay) {
            finish();
          } else {
            setStep('overlay');
          }
        }
        // If not granted, stay on usage step
      } else if (currentStepRef.current === 'overlay') {
        // Overlay step: proceed regardless (overlay is optional but recommended)
        finish();
      }
    });
    return () => sub.remove();
  }, []);

  const finish = async () => {
    await complete();
    router.replace('/(tabs)');
  };

  const handleGrant = () => {
    if (!ScreenTime) return;
    waitingRef.current = true;
    setWaiting(true);
    if (step === 'usage') {
      ScreenTime.requestPermission();
    } else {
      ScreenTime.requestOverlayPermission();
    }
  };

  const handleSkip = () => finish();

  const content = step === 'usage' ? lang.usage : lang.overlay;
  const icon = step === 'usage' ? 'bar-chart' : 'layers-outline';
  const progress = step === 'usage' ? 1 : 2;

  return (
    <LinearGradient colors={['#FFFFFF', '#F5F0FF', '#FFFFFF']} style={styles.container}>
      <View style={styles.content}>

        {/* Progress dots */}
        <View style={styles.progress}>
          <View style={[styles.dot, step === 'usage' && styles.dotActive]} />
          <View style={[styles.dot, step === 'overlay' && styles.dotActive]} />
        </View>

        {/* Icon */}
        <View style={styles.iconWrap}>
          <View style={styles.iconCircleOuter}>
            <View style={styles.iconCircleInner}>
              <Ionicons name={icon as any} size={ms(44)} color={Colors.primary} />
            </View>
          </View>
          <View style={[styles.decDot, styles.dotTL]} />
          <View style={[styles.decDot, styles.dotTR]} />
          <View style={[styles.decDot, styles.dotBL]} />
        </View>

        {/* Step badge */}
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{progress} / 2</Text>
        </View>

        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={ms(18)} color={Colors.primary} />
          <Text style={styles.infoText}>{content.hint}</Text>
        </View>

        <View style={styles.stepsCard}>
          <StepRow number="1" text={content.step1} />
          <View style={styles.stepDivider} />
          <StepRow number="2" text={content.step2} />
          <View style={styles.stepDivider} />
          <StepRow number="3" text={content.step3} />
        </View>

        {waiting ? (
          <View style={styles.waitingBox}>
            <Ionicons name="time-outline" size={ms(20)} color={Colors.primary} />
            <Text style={styles.waitingText}>{lang.waiting}</Text>
            <Text style={styles.waitingHint}>{lang.waitingHint}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleGrant} activeOpacity={0.85}>
            <Ionicons name="lock-open-outline" size={ms(18)} color="#fff" />
            <Text style={styles.primaryBtnText}>{content.btn}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>{lang.skip}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function StepRow({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: ms(24), paddingBottom: ms(40),
  },
  progress: { flexDirection: 'row', gap: ms(8), marginBottom: ms(24) },
  dot: {
    width: ms(8), height: ms(8), borderRadius: ms(4),
    backgroundColor: Colors.borderLight,
  },
  dotActive: { backgroundColor: Colors.primary, width: ms(24) },

  iconWrap: {
    width: ms(130), height: ms(130),
    alignItems: 'center', justifyContent: 'center',
    marginBottom: ms(16), position: 'relative',
  },
  iconCircleOuter: {
    width: ms(110), height: ms(110), borderRadius: ms(55),
    backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  iconCircleInner: {
    width: ms(78), height: ms(78), borderRadius: ms(39),
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  decDot: {
    position: 'absolute', borderRadius: ms(5),
    backgroundColor: Colors.primary + '40',
  },
  dotTL: { width: ms(10), height: ms(10), top: ms(8), left: ms(10) },
  dotTR: { width: ms(7), height: ms(7), top: ms(4), right: ms(14) },
  dotBL: { width: ms(6), height: ms(6), bottom: ms(8), left: ms(4) },

  stepBadge: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingHorizontal: ms(12), paddingVertical: ms(4),
    marginBottom: ms(12),
  },
  stepBadgeText: { fontSize: fs(12), color: Colors.primary, fontWeight: FontWeight.medium },

  title: {
    fontSize: fs(22), fontWeight: FontWeight.semibold,
    color: Colors.textPrimary, textAlign: 'center', marginBottom: ms(8),
  },
  subtitle: {
    fontSize: fs(14), color: Colors.textSecondary,
    textAlign: 'center', lineHeight: ms(22), marginBottom: ms(16),
  },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: ms(10),
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.md, padding: ms(14),
    borderWidth: 1, borderColor: Colors.primaryLight,
    marginBottom: ms(14), width: '100%',
  },
  infoText: { flex: 1, fontSize: fs(13), color: Colors.primary, lineHeight: ms(20) },

  stepsCard: {
    width: '100%', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: ms(16),
    borderWidth: 0.5, borderColor: Colors.border, marginBottom: ms(24),
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: ms(12), paddingVertical: ms(8) },
  stepDivider: { height: 0.5, backgroundColor: Colors.borderLight },
  stepNum: {
    width: ms(26), height: ms(26), borderRadius: ms(13),
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontSize: fs(12), fontWeight: FontWeight.semibold },
  stepText: { flex: 1, fontSize: fs(13), color: Colors.textSecondary, lineHeight: ms(18) },

  waitingBox: {
    width: '100%', alignItems: 'center', gap: ms(6),
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.lg, padding: ms(20),
    borderWidth: 1, borderColor: Colors.primaryLight,
    marginBottom: ms(12),
  },
  waitingText: { fontSize: fs(15), fontWeight: FontWeight.medium, color: Colors.primary },
  waitingHint: { fontSize: fs(13), color: Colors.textMuted, textAlign: 'center' },

  primaryBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: ms(8), backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingVertical: ms(15),
    marginBottom: ms(12),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: fs(16), fontWeight: FontWeight.semibold },
  skipBtn: { paddingVertical: ms(8), paddingHorizontal: ms(16) },
  skipBtnText: { fontSize: fs(14), color: Colors.textMuted },
});
