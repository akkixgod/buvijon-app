import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  AppState, Platform, AppStateStatus, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { ms, fs } from '@/utils/responsive';
import { useSettingsStore } from '@/store/settingsStore';
import { supabase } from '@/lib/supabase';
import { getMissingBlockingPermissions } from '@/utils/blockingPermissions';

let ScreenTime: typeof import('screen-time') | null = null;
try { ScreenTime = require('screen-time'); } catch { ScreenTime = null; }

type Step = 'usage' | 'overlay' | 'accessibilityDisclosure' | 'accessibility' | 'battery';

type StepCopy = {
  title: string;
  subtitle: string;
  hint: string;
  steps: string[];
  button: string;
};

const COPY: Record<string, Record<Step, StepCopy> & { skip: string; waiting: string; waitingHint: string; done: string }> = {
  ru: {
    usage: {
      title: 'Статистика экрана',
      subtitle: 'Buvijon отслеживает экранное время ребёнка, чтобы помогать соблюдать здоровый баланс.',
      hint: 'Данные остаются на устройстве и используются для отчётов и лимитов.',
      steps: ['Нажмите "Разрешить доступ"', 'Включите Buvijon в списке', 'Вернитесь в приложение'],
      button: 'Разрешить доступ',
    },
    overlay: {
      title: 'Отображение поверх',
      subtitle: 'Когда ребёнок открывает заблокированное приложение, Buvijon показывает экран PIN или блокировки.',
      hint: 'Это работает только для приложений, которые вы выбрали для блокировки.',
      steps: ['Нажмите "Разрешить"', 'Включите Buvijon в списке', 'Вернитесь в приложение'],
      button: 'Разрешить',
    },
    accessibilityDisclosure: {
      title: 'Согласие на доступность',
      subtitle: 'Buvijon будет замечать, какое приложение стало активным, чтобы мгновенно блокировать выбранные приложения и считать экранное время ребёнка.',
      hint: 'Buvijon не читает сообщения, пароли или содержимое экрана. Данные используются только для выбранных вами правил блокировки.',
      steps: ['Прочитайте это объяснение', 'Подтвердите согласие', 'Затем включите службу Buvijon'],
      button: 'Я согласен',
    },
    accessibility: {
      title: 'Служба доступности',
      subtitle: 'Этот шаг делает блокировку почти мгновенной при открытии выбранного приложения.',
      hint: 'В настройках выберите Buvijon и включите службу.',
      steps: ['Откройте настройки', 'Найдите Buvijon', 'Включите службу и вернитесь'],
      button: 'Открыть настройки',
    },
    battery: {
      title: 'Работа в фоне',
      subtitle: 'Чтобы Android не останавливал блокировку, разрешите Buvijon работать без ограничений батареи.',
      hint: 'Если настройка уже включена или недоступна на устройстве, можно завершить onboarding.',
      steps: ['Откройте настройки батареи', 'Разрешите работу без ограничений', 'Вернитесь в приложение'],
      button: 'Открыть настройки',
    },
    skip: 'Пропустить',
    waiting: 'Ожидаем разрешения...',
    waitingHint: 'Включите Buvijon и вернитесь',
    done: 'Готово',
  },
  'uz-cyrillic': {
    usage: {
      title: 'Ekran statistikasi',
      subtitle: "Buvijon farzandingizning ekran vaqtini kuzatib, sog'lom muvozanatni saqlashga yordam beradi.",
      hint: "Ma'lumotlar qurilmada saqlanadi va hisobot hamda limitlar uchun ishlatiladi.",
      steps: ['"Ruxsat berish" tugmasini bosing', 'Ro\'yxatdan Buvijonni yoqing', 'Ilovaga qayting'],
      button: 'Ruxsat berish',
    },
    overlay: {
      title: "Ustidan ko'rsatish",
      subtitle: "Bola bloklangan ilovani ochganda, Buvijon PIN yoki bloklash ekranini ko'rsatadi.",
      hint: "Bu faqat siz tanlagan ilovalar uchun ishlaydi.",
      steps: ['"Ruxsat berish" tugmasini bosing', 'Ro\'yxatdan Buvijonni yoqing', 'Ilovaga qayting'],
      button: 'Ruxsat berish',
    },
    accessibilityDisclosure: {
      title: 'Maxsus imkoniyat roziligi',
      subtitle: "Buvijon qaysi ilova faollashganini sezib, tanlangan ilovalarni darhol bloklaydi va bolaning ekran vaqtini hisoblaydi.",
      hint: "Buvijon xabarlar, parollar yoki ekran matnini o'qimaydi. Ma'lumot faqat bloklash qoidalari uchun ishlatiladi.",
      steps: ["Tushuntirishni o'qing", 'Rozilik bering', 'Keyin Buvijon xizmatini yoqing'],
      button: 'Roziman',
    },
    accessibility: {
      title: 'Maxsus imkoniyat xizmati',
      subtitle: "Bu tanlangan ilova ochilganda bloklashni deyarli darhol ishga tushiradi.",
      hint: 'Sozlamalarda Buvijonni tanlang va xizmatni yoqing.',
      steps: ['Sozlamalarni oching', 'Buvijonni toping', 'Xizmatni yoqing va qayting'],
      button: 'Sozlamalarni ochish',
    },
    battery: {
      title: 'Fondagi ish',
      subtitle: "Android bloklash xizmatini to'xtatmasligi uchun Buvijon uchun batareya cheklovlarini olib tashlang.",
      hint: "Agar sozlama allaqachon yoqilgan yoki qurilmada mavjud bo'lmasa, onboardingni yakunlash mumkin.",
      steps: ['Batareya sozlamalarini oching', 'Cheklovsiz ishlashni yoqing', 'Ilovaga qayting'],
      button: 'Sozlamalarni ochish',
    },
    skip: "O'tkazib yuborish",
    waiting: 'Ruxsat kutilmoqda...',
    waitingHint: 'Buvijonni yoqing va qayting',
    done: 'Tayyor',
  },
  'uz-latin': {
    usage: {
      title: 'Ekran statistikasi',
      subtitle: "Buvijon farzandingizning ekran vaqtini kuzatib, sog'lom muvozanatni saqlashga yordam beradi.",
      hint: "Ma'lumotlar qurilmada saqlanadi va hisobot hamda limitlar uchun ishlatiladi.",
      steps: ['"Ruxsat berish" tugmasini bosing', "Ro'yxatdan Buvijonni yoqing", 'Ilovaga qayting'],
      button: 'Ruxsat berish',
    },
    overlay: {
      title: "Ustidan ko'rsatish",
      subtitle: "Bola bloklangan ilovani ochganda, Buvijon PIN yoki bloklash ekranini ko'rsatadi.",
      hint: "Bu faqat siz tanlagan ilovalar uchun ishlaydi.",
      steps: ['"Ruxsat berish" tugmasini bosing', "Ro'yxatdan Buvijonni yoqing", 'Ilovaga qayting'],
      button: 'Ruxsat berish',
    },
    accessibilityDisclosure: {
      title: 'Maxsus imkoniyat roziligi',
      subtitle: "Buvijon qaysi ilova faollashganini sezib, tanlangan ilovalarni darhol bloklaydi va bolaning ekran vaqtini hisoblaydi.",
      hint: "Buvijon xabarlar, parollar yoki ekran matnini o'qimaydi. Ma'lumot faqat bloklash qoidalari uchun ishlatiladi.",
      steps: ["Tushuntirishni o'qing", 'Rozilik bering', 'Keyin Buvijon xizmatini yoqing'],
      button: 'Roziman',
    },
    accessibility: {
      title: 'Maxsus imkoniyat xizmati',
      subtitle: "Bu tanlangan ilova ochilganda bloklashni deyarli darhol ishga tushiradi.",
      hint: 'Sozlamalarda Buvijonni tanlang va xizmatni yoqing.',
      steps: ['Sozlamalarni oching', 'Buvijonni toping', 'Xizmatni yoqing va qayting'],
      button: 'Sozlamalarni ochish',
    },
    battery: {
      title: 'Fondagi ish',
      subtitle: "Android bloklash xizmatini to'xtatmasligi uchun Buvijon uchun batareya cheklovlarini olib tashlang.",
      hint: "Agar sozlama allaqachon yoqilgan yoki qurilmada mavjud bo'lmasa, onboardingni yakunlash mumkin.",
      steps: ['Batareya sozlamalarini oching', 'Cheklovsiz ishlashni yoqing', 'Ilovaga qayting'],
      button: 'Sozlamalarni ochish',
    },
    skip: "O'tkazib yuborish",
    waiting: 'Ruxsat kutilmoqda...',
    waitingHint: 'Buvijonni yoqing va qayting',
    done: 'Tayyor',
  },
};

const ORDER: Step[] = ['usage', 'overlay', 'accessibilityDisclosure', 'accessibility', 'battery'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completePermissions } = useOnboardingStore();
  const language = useSettingsStore(s => s.language);
  const lang = COPY[language] ?? COPY['uz-latin'];
  const [step, setStep] = useState<Step>('usage');
  const [waiting, setWaiting] = useState(false);
  const waitingRef = useRef(false);
  const stepRef = useRef<Step>('usage');

  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !ScreenTime) {
      finish();
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active' || !waitingRef.current) return;
      waitingRef.current = false;
      setWaiting(false);
      advanceAfterReturn(stepRef.current);
    });
    return () => sub.remove();
  }, []);

  const finish = async () => {
    await completePermissions();
    const missingPermissions = getMissingBlockingPermissions();
    if (missingPermissions.length > 0) {
      router.replace('/(tabs)/oila');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(tabs)');
        return;
      }

      const { data: children } = await supabase
        .from('children')
        .select('id')
        .eq('parent_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (!children || children.length === 0) {
        router.replace('/(tabs)/oila');
        return;
      }

      const { data: familyMembership } = await supabase
        .from('family_members')
        .select('id')
        .eq('parent_id', user.id)
        .limit(1);

      if (!familyMembership || familyMembership.length === 0) {
        router.replace('/(tabs)/messages');
        return;
      }
    } catch {}

    router.replace('/(tabs)');
  };

  const nextStep = (current: Step) => {
    const idx = ORDER.indexOf(current);
    if (idx >= ORDER.length - 1) finish();
    else setStep(ORDER[idx + 1]);
  };

  const advanceAfterReturn = (current: Step) => {
    if (!ScreenTime) return finish();
    if (current === 'usage' && !ScreenTime.hasPermission()) return;
    if (current === 'overlay' && !ScreenTime.hasOverlayPermission()) return;
    if (current === 'accessibility' && !ScreenTime.hasAccessibilityPermission()) return;
    nextStep(current);
  };

  const handlePrimary = () => {
    if (!ScreenTime) return finish();
    if (step === 'accessibilityDisclosure') {
      setStep('accessibility');
      return;
    }
    if (step === 'battery' && ScreenTime.hasBatteryOptimizationBypass()) {
      finish();
      return;
    }

    waitingRef.current = true;
    setWaiting(true);
    if (step === 'usage') ScreenTime.requestPermission();
    else if (step === 'overlay') ScreenTime.requestOverlayPermission();
    else if (step === 'accessibility') ScreenTime.requestAccessibilityPermission();
    else if (step === 'battery') ScreenTime.requestBatteryOptimizationSettings();
  };

  const copy = lang[step];
  const progress = ORDER.indexOf(step) + 1;
  const icon = step === 'usage'
    ? 'bar-chart'
    : step === 'overlay'
      ? 'layers-outline'
      : step === 'battery'
        ? 'battery-charging-outline'
        : 'accessibility-outline';

  return (
    <LinearGradient colors={['#FFFFFF', '#F5F0FF', '#FFFFFF']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progress}>
          {ORDER.map(item => (
            <View key={item} style={[styles.dot, item === step && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.iconWrap}>
          <View style={styles.iconCircleOuter}>
            <View style={styles.iconCircleInner}>
              <Ionicons name={icon as any} size={ms(42)} color={Colors.primary} />
            </View>
          </View>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{progress} / {ORDER.length}</Text>
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={ms(18)} color={Colors.primary} />
          <Text style={styles.infoText}>{copy.hint}</Text>
        </View>

        <View style={styles.stepsCard}>
          {copy.steps.map((text, index) => (
            <React.Fragment key={text}>
              {index > 0 && <View style={styles.stepDivider} />}
              <StepRow number={String(index + 1)} text={text} />
            </React.Fragment>
          ))}
        </View>

        {waiting ? (
          <View style={styles.waitingBox}>
            <Ionicons name="time-outline" size={ms(20)} color={Colors.primary} />
            <Text style={styles.waitingText}>{lang.waiting}</Text>
            <Text style={styles.waitingHint}>{lang.waitingHint}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handlePrimary} activeOpacity={0.85}>
            <Ionicons name="lock-open-outline" size={ms(18)} color="#fff" />
            <Text style={styles.primaryBtnText}>
              {step === 'battery' && ScreenTime?.hasBatteryOptimizationBypass() ? lang.done : copy.button}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>{lang.skip}</Text>
        </TouchableOpacity>
      </ScrollView>
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(24),
    paddingVertical: ms(36),
  },
  progress: { flexDirection: 'row', gap: ms(8), marginBottom: ms(22) },
  dot: {
    width: ms(8), height: ms(8), borderRadius: ms(4),
    backgroundColor: Colors.borderLight,
  },
  dotActive: { backgroundColor: Colors.primary, width: ms(24) },
  iconWrap: {
    width: ms(118), height: ms(118),
    alignItems: 'center', justifyContent: 'center',
    marginBottom: ms(14),
  },
  iconCircleOuter: {
    width: ms(104), height: ms(104), borderRadius: ms(52),
    backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  iconCircleInner: {
    width: ms(74), height: ms(74), borderRadius: ms(37),
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
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
    borderWidth: 0.5, borderColor: Colors.border, marginBottom: ms(22),
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
  },
  primaryBtnText: { color: '#fff', fontSize: fs(16), fontWeight: FontWeight.semibold },
  skipBtn: { paddingVertical: ms(8), paddingHorizontal: ms(16) },
  skipBtnText: { fontSize: fs(14), color: Colors.textMuted },
});
