import React, { useEffect, useRef } from 'react';
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

// Lazy-load native module
let ScreenTime: typeof import('screen-time') | null = null;
try {
  ScreenTime = require('screen-time');
} catch {
  ScreenTime = null;
}

const STRINGS = {
  ru: {
    title: 'Разрешите доступ к статистике',
    subtitle: 'Buvijon отслеживает время экрана вашего ребёнка и помогает соблюдать здоровый баланс.',
    hint: 'Для этого нужен доступ к статистике использования приложений. Ваши данные остаются на устройстве.',
    grantBtn: 'Разрешить доступ',
    skipBtn: 'Пропустить',
    waitingTitle: 'Ожидаем разрешения...',
    waitingHint: 'Включите "Buvijon" в списке и вернитесь в приложение',
  },
  'uz-cyrillic': {
    title: 'Статистикага рухсат беринг',
    subtitle: 'Buvijon фарзандингизнинг экран вақтини кузатиб, соғлом мувозанатни сақлашга ёрдам беради.',
    hint: 'Бунинг учун иловалар статистикасига кириш керак. Маълумотларингиз қурилмада сақланади.',
    grantBtn: 'Рухсат бериш',
    skipBtn: 'Кейинга қолдириш',
    waitingTitle: 'Рухсат кутилмоқда...',
    waitingHint: 'Рўйхатдан "Buvijon"ни ёқинг ва иловага қайтинг',
  },
  'uz-latin': {
    title: 'Statistikaga ruxsat bering',
    subtitle: "Buvijon farzandingizning ekran vaqtini kuzatib, sog'lom muvozanatni saqlashga yordam beradi.",
    hint: "Buning uchun ilovalar statistikasiga kirish kerak. Ma'lumotlaringiz qurilmada saqlanadi.",
    grantBtn: 'Ruxsat berish',
    skipBtn: "Keyinga qoldirish",
    waitingTitle: 'Ruxsat kutilmoqda...',
    waitingHint: "Ro'yxatdan \"Buvijon\"ni yoqing va ilovaga qayting",
  },
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { complete } = useOnboardingStore();
  const language = useSettingsStore(s => s.language);
  const s = STRINGS[language] ?? STRINGS.ru;

  const waitingRef = useRef(false);

  // If platform doesn't support screen time, skip directly
  useEffect(() => {
    if (Platform.OS !== 'android' || !ScreenTime) {
      complete().then(() => router.replace('/(tabs)'));
    }
  }, []);

  // Listen for app coming back to foreground after user granted permission in Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && waitingRef.current) {
        waitingRef.current = false;
        complete().then(() => router.replace('/(tabs)'));
      }
    });
    return () => sub.remove();
  }, []);

  const handleGrant = () => {
    if (!ScreenTime) return;
    waitingRef.current = true;
    ScreenTime.requestPermission();
  };

  const handleSkip = async () => {
    await complete();
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#F5F0FF', '#FFFFFF']} style={styles.container}>
      <View style={styles.content}>

        {/* Illustration */}
        <View style={styles.iconWrap}>
          <View style={styles.iconCircleOuter}>
            <View style={styles.iconCircleInner}>
              <Ionicons name="bar-chart" size={ms(44)} color={Colors.primary} />
            </View>
          </View>
          {/* Decorative dots */}
          <View style={[styles.dot, styles.dotTL]} />
          <View style={[styles.dot, styles.dotTR]} />
          <View style={[styles.dot, styles.dotBL]} />
        </View>

        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.subtitle}>{s.subtitle}</Text>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={ms(20)} color={Colors.primary} />
          <Text style={styles.infoText}>{s.hint}</Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsCard}>
          <StepRow number="1" text={s.grantBtn === 'Разрешить доступ'
            ? 'Нажмите "Разрешить доступ"'
            : s.grantBtn === 'Ruxsat berish' ? '"Ruxsat berish" tugmasini bosing'
            : '"Рухсат бериш" тугмасини босинг'} />
          <View style={styles.stepDivider} />
          <StepRow number="2" text={s.waitingHint} />
          <View style={styles.stepDivider} />
          <StepRow number="3" text={language === 'ru' ? 'Вернитесь в Buvijon'
            : language === 'uz-latin' ? "Buvijonga qayting"
            : 'Buvijonga qaytinг'} />
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleGrant} activeOpacity={0.85}>
          <Ionicons name="lock-open-outline" size={ms(18)} color="#fff" />
          <Text style={styles.primaryBtnText}>{s.grantBtn}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>{s.skipBtn}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function StepRow({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{number}</Text>
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
  iconWrap: {
    width: ms(130), height: ms(130),
    alignItems: 'center', justifyContent: 'center',
    marginBottom: ms(28), position: 'relative',
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
  dot: {
    position: 'absolute',
    width: ms(10), height: ms(10),
    borderRadius: ms(5), backgroundColor: Colors.primary + '40',
  },
  dotTL: { top: ms(8), left: ms(10) },
  dotTR: { top: ms(4), right: ms(14), width: ms(7), height: ms(7) },
  dotBL: { bottom: ms(8), left: ms(4), width: ms(6), height: ms(6) },
  title: {
    fontSize: fs(22), fontWeight: FontWeight.semibold,
    color: Colors.textPrimary, textAlign: 'center',
    marginBottom: ms(10),
  },
  subtitle: {
    fontSize: fs(14), color: Colors.textSecondary,
    textAlign: 'center', lineHeight: ms(22),
    marginBottom: ms(20),
  },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: ms(10),
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.md,
    padding: ms(14),
    borderWidth: 1, borderColor: Colors.primaryLight,
    marginBottom: ms(16), width: '100%',
  },
  infoText: {
    flex: 1, fontSize: fs(13), color: Colors.primary,
    lineHeight: ms(20),
  },
  stepsCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: ms(16),
    borderWidth: 0.5, borderColor: Colors.border,
    marginBottom: ms(24),
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: ms(12), paddingVertical: ms(8) },
  stepDivider: { height: 0.5, backgroundColor: Colors.borderLight },
  stepBadge: {
    width: ms(26), height: ms(26), borderRadius: ms(13),
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBadgeText: { color: '#fff', fontSize: fs(12), fontWeight: FontWeight.semibold },
  stepText: { flex: 1, fontSize: fs(13), color: Colors.textSecondary, lineHeight: ms(18) },
  primaryBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: ms(8), backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingVertical: ms(15),
    marginBottom: ms(12),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#fff', fontSize: fs(16), fontWeight: FontWeight.semibold,
  },
  skipBtn: { paddingVertical: ms(8), paddingHorizontal: ms(16) },
  skipBtnText: {
    fontSize: fs(14), color: Colors.textMuted,
  },
});
