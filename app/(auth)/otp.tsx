import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Radius, FontWeight } from '@/constants/theme';
import { SCREEN_WIDTH, ms, fs } from '@/utils/responsive';
import { useTranslation } from '@/i18n';

const OTP_LENGTH = 6;

const CARD_H_PAD = ms(20) * 2;
const OUTER_H_PAD = ms(16) * 2;
const GAP = ms(10);
const BOX_SIZE = Math.floor((SCREEN_WIDTH - CARD_H_PAD - OUTER_H_PAD - GAP * (OTP_LENGTH - 1)) / OTP_LENGTH);
const BOX_HEIGHT = Math.floor(BOX_SIZE * 1.15);

export default function OTPScreen() {
  const router = useRouter();
  const t = useTranslation();
  const { email, name, username, mode } = useLocalSearchParams<{ email: string; name?: string; username?: string; mode: string }>();
  const verifyOtp = useAuthStore(s => s.verifyOtp);
  const sendOtp   = useAuthStore(s => s.sendOtp);

  const [digits, setDigits]     = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [timer, setTimer]       = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));
  const scrollRef = useRef<ScrollView>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 400);
  }, []);

  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const handleFocus = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (index: number, value: string) => {
    if (value.length === OTP_LENGTH) {
      const pasted = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      if (pasted.length === OTP_LENGTH) {
        setDigits(pasted);
        setError('');
        inputRefs.current[OTP_LENGTH - 1]?.focus();
        handleVerify(pasted.join(''));
        return;
      }
    }
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError('');
    if (cleaned && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (cleaned && index === OTP_LENGTH - 1) {
      const code = [...next.slice(0, OTP_LENGTH - 1), cleaned].join('');
      if (code.length === OTP_LENGTH) handleVerify(code);
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
    }
  };

  const handleVerify = async (code?: string) => {
    const token = code ?? digits.join('');
    if (token.length < OTP_LENGTH) { setError(t.otp.errIncomplete); return; }
    setLoading(true);
    const result = await verifyOtp(email, token, name, username);
    setLoading(false);
    if (result.ok) {
      // New registrations → onboarding (permission request), existing logins → directly to tabs
      if (mode === 'register') {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } else {
      const msg = result.error === 'PROFILE_NOT_FOUND'
        ? t.otp.errNotFound
        : (result.error === 'WRONG_CODE' ? t.otp.errWrong : (result.error ?? t.otp.errWrong));
      setError(msg);
      shake();
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setTimer(60);
    setDigits(Array(OTP_LENGTH).fill(''));
    setError('');
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
    await sendOtp(email);
  };

  const maskedEmail = (() => {
    const [local = '', domain = ''] = (email ?? '').split('@');
    return `${local.slice(0, 3)}***@${domain}`;
  })();

  const isFilled = digits.every(d => d !== '');

  return (
    <LinearGradient colors={['#FFFFFF', '#F5F0FF', '#FFFFFF']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.card}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={ms(20)} color={Colors.primary} />
              <Text style={styles.backText}>{t.otp.back}</Text>
            </TouchableOpacity>

            <View style={styles.iconWrap}>
              <Ionicons name="mail" size={ms(32)} color={Colors.primary} />
            </View>

            <Text style={styles.title}>
              {mode === 'register' ? t.otp.titleConfirm : t.otp.titleLogin}
            </Text>
            <Text style={styles.subtitle}>
              {t.otp.subtitle}{'\n'}
              <Text style={styles.emailText}>{maskedEmail}</Text>
            </Text>
            <Text style={styles.hint}>{t.otp.spamHint}</Text>

            <Animated.View style={[styles.otpWrap, { transform: [{ translateX: shakeAnim }] }]}>
              <View style={styles.otpRow}>
                {digits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={ref => { inputRefs.current[i] = ref; }}
                    style={[
                      styles.otpBox,
                      d !== '' && styles.otpBoxFilled,
                      !!error && styles.otpBoxError,
                    ]}
                    value={d}
                    onChangeText={v => handleDigit(i, v)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                    onFocus={handleFocus}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    selectTextOnFocus
                  />
                ))}
              </View>
            </Animated.View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.verifyBtn, (!isFilled || loading) && styles.verifyBtnDisabled]}
              onPress={() => handleVerify()}
              disabled={!isFilled || loading}
              activeOpacity={0.8}
            >
              <Text style={styles.verifyBtnText}>
                {loading ? t.otp.checking : t.otp.confirm}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendRow}>
              {canResend ? (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendActive}>{t.otp.resendBtn}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendTimer}>
                  {t.otp.resendIn} <Text style={styles.timerNum}>{timer}</Text> {t.otp.seconds}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: ms(16) },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: ms(20),
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginBottom: ms(16),
  },
  backText: { color: Colors.primary, fontSize: fs(14), fontWeight: FontWeight.medium },
  iconWrap: {
    width: ms(68), height: ms(68), borderRadius: ms(34),
    backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: ms(12),
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  title: {
    fontSize: fs(22), fontWeight: FontWeight.medium,
    color: Colors.textPrimary, marginBottom: ms(6), textAlign: 'center',
  },
  subtitle: {
    fontSize: fs(14), color: Colors.textSecondary,
    textAlign: 'center', lineHeight: ms(22), marginBottom: ms(4),
  },
  emailText: { fontWeight: FontWeight.medium, color: Colors.primary },
  hint: {
    fontSize: fs(12), color: Colors.textMuted,
    textAlign: 'center', marginBottom: ms(20),
  },
  otpWrap: { width: '100%' },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: GAP,
    marginBottom: GAP,
  },
  otpBox: {
    width: BOX_SIZE,
    height: BOX_HEIGHT,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontSize: fs(20),
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  otpBoxError:  { borderColor: Colors.wilting,  backgroundColor: '#FAE8E8' },
  error: {
    color: Colors.wilting, fontSize: fs(13),
    marginTop: ms(4), marginBottom: ms(8), textAlign: 'center',
  },
  verifyBtn: {
    width: '100%', backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingVertical: ms(14),
    alignItems: 'center', marginTop: ms(8),
  },
  verifyBtnDisabled: { opacity: 0.45 },
  verifyBtnText: { color: Colors.textOnDark, fontSize: fs(15), fontWeight: FontWeight.medium },
  resendRow: { marginTop: ms(16) },
  resendTimer: { fontSize: fs(13), color: Colors.textMuted },
  timerNum: { fontWeight: FontWeight.medium, color: Colors.primary },
  resendActive: { fontSize: fs(13), color: Colors.primary, fontWeight: FontWeight.medium },
});
