import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { FlowerSVG } from '@/components/flower/FlowerSVG';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { ms, fs } from '@/utils/responsive';
import { useTranslation } from '@/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const t = useTranslation();
  const sendOtp = useAuthStore(s => s.sendOtp);
  const signInWithGoogle = useAuthStore(s => s.signInWithGoogle);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!email.trim()) { setError(t.login.errEmpty); return; }
    if (!email.includes('@')) { setError(t.login.errInvalid); return; }
    setError('');
    setLoading(true);
    const result = await sendOtp(email, false);
    setLoading(false);
    if (result.ok) {
      router.push({ pathname: '/(auth)/otp', params: { email, mode: 'login' } });
    } else {
      const msg = result.error?.includes('Signups not allowed')
        ? t.login.errNotFound
        : (result.error ?? t.login.errSend);
      setError(msg);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#F5F0FF', '#FFFFFF']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoSection}>
            <View style={styles.flowersRow}>
              <FlowerSVG variant="tulip"    state="blooming" color="#E91E63" size={70} />
              <FlowerSVG variant="sunflower" state="blooming" color="#FF9800" size={90} />
              <FlowerSVG variant="daisy"    state="blooming" color="#4CAF50" size={70} />
            </View>
            <Text style={styles.appName}>Buvijon</Text>
            <Text style={styles.tagline}>{t.tagline}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>{t.login.title}</Text>
            <Text style={styles.formSubtitle}>{t.login.subtitle}</Text>

            <Text style={styles.label}>{t.login.emailLabel}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.login.emailPlaceholder}
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button title={t.login.submit} onPress={handleSendOtp} loading={loading} size="lg" style={styles.btn} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.login.orDivider}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, googleLoading && styles.googleBtnDisabled]}
              onPress={async () => {
                setGoogleLoading(true);
                setError('');
                const result = await signInWithGoogle();
                setGoogleLoading(false);
                if (result.ok) {
                  router.replace('/(tabs)');
                } else {
                  setError(result.error ?? 'Google error');
                }
              }}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              <View style={styles.googleIconWrap}>
                <GoogleIcon size={18} />
              </View>
              <Text style={styles.googleBtnText}>
                {googleLoading ? '...' : t.login.google}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.link}>
              <Text style={styles.linkText}>
                {t.login.noAccount}{'  '}
                <Text style={styles.linkBold}>{t.login.registerLink}</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: ms(16) },
  logoSection: { alignItems: 'center', marginBottom: ms(20) },
  flowersRow: { flexDirection: 'row', alignItems: 'flex-end', gap: ms(4), marginBottom: ms(12) },
  appName: { fontSize: fs(38), fontWeight: FontWeight.medium, color: Colors.primary, letterSpacing: -0.5 },
  tagline: { fontSize: fs(15), color: Colors.textMuted, fontWeight: FontWeight.regular },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.xs,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  formTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  formSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textLabel, marginTop: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: Radius.md, backgroundColor: Colors.surfaceSecondary,
    marginTop: 4,
  },
  inputIcon: { paddingLeft: Spacing.md },
  input: {
    flex: 1, padding: Spacing.md,
    fontSize: FontSize.md, color: Colors.textPrimary,
  },
  error: { color: Colors.wilting, fontSize: FontSize.sm, marginTop: Spacing.xs },
  btn: { marginTop: Spacing.md },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: Colors.border },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: FontSize.sm, color: Colors.textMuted,
  },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#dadce0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3,
    elevation: 2,
  },
  googleBtnDisabled: { opacity: 0.6 },
  googleIconWrap: {
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  googleBtnText: {
    fontSize: FontSize.md, fontWeight: FontWeight.medium,
    color: '#3c4043',
  },
  link: { alignItems: 'center', marginTop: Spacing.md },
  linkText: { fontSize: FontSize.sm, color: Colors.textMuted },
  linkBold: { color: Colors.primary, fontWeight: FontWeight.medium },
});
