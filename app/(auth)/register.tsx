import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';

export default function RegisterScreen() {
  const router = useRouter();
  const t = useTranslation();
  const sendOtp = useAuthStore(s => s.sendOtp);
  const signInWithGoogle = useAuthStore(s => s.signInWithGoogle);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!name.trim()) { setError(t.register.errName); return; }
    if (!email.trim()) { setError(t.register.errEmail); return; }
    if (!email.includes('@')) { setError(t.register.errInvalidEmail); return; }
    setError('');
    setLoading(true);

    // Проверяем, не зарегистрирован ли уже этот email
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    if (existing) {
      setLoading(false);
      setError(t.register.errExists);
      return;
    }

    const result = await sendOtp(email);
    setLoading(false);
    if (result.ok) {
      router.push({ pathname: '/(auth)/otp', params: { email, name: name.trim(), mode: 'register' } });
    } else {
      setError(result.error ?? t.register.errSend);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#F5F0FF', '#FFFFFF']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              <Text style={styles.backText}>{t.register.back}</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{t.register.title}</Text>
            <Text style={styles.subtitle}>{t.register.subtitle}</Text>

            <Text style={styles.label}>{t.register.nameLabel}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.register.namePlaceholder}
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.label}>{t.register.emailLabel}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="example@mail.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button title={t.register.submit} onPress={handleContinue} loading={loading} size="lg" style={styles.btn} />

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

            <TouchableOpacity onPress={() => router.back()} style={styles.link}>
              <Text style={styles.linkText}>
                {t.register.hasAccount}{'  '}
                <Text style={styles.linkBold}>{t.register.loginLink}</Text>
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
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  backText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.lg },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textLabel, marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.8 },
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
  error: { color: Colors.wilting, fontSize: FontSize.sm, marginTop: Spacing.sm },
  btn: { marginTop: Spacing.xl },
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
