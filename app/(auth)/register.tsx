import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
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

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function RegisterScreen() {
  const router = useRouter();
  const t = useTranslation();
  const sendOtp = useAuthStore(s => s.sendOtp);
  const signInWithGoogle = useAuthStore(s => s.signInWithGoogle);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setUsernameAvailable(null);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!USERNAME_RE.test(cleaned)) return;
    setUsernameChecking(true);
    checkTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleaned)
        .maybeSingle();
      setUsernameAvailable(!data);
      setUsernameChecking(false);
    }, 500);
  };

  const handleContinue = async () => {
    if (!name.trim()) { setError(t.register.errName); return; }
    if (!USERNAME_RE.test(username)) { setError(t.register.errUsernameFormat); return; }
    if (usernameAvailable === false) { setError(t.register.errUsernameTaken); return; }
    if (!email.trim()) { setError(t.register.errEmail); return; }
    if (!email.includes('@')) { setError(t.register.errInvalidEmail); return; }
    setError('');
    setLoading(true);

    // Final uniqueness check (race condition guard)
    const { data: takenUser } = await supabase
      .from('profiles').select('id').eq('username', username).maybeSingle();
    if (takenUser) {
      setLoading(false);
      setError(t.register.errUsernameTaken);
      setUsernameAvailable(false);
      return;
    }

    // Check duplicate email
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
      router.push({
        pathname: '/(auth)/otp',
        params: { email, name: name.trim(), username, mode: 'register' },
      });
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

            {/* Name */}
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

            {/* Username */}
            <Text style={styles.label}>{t.register.usernameLabel}</Text>
            <View style={[styles.inputWrap, usernameAvailable === false && styles.inputWrapError]}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                style={styles.input}
                placeholder={t.register.usernamePlaceholder}
                placeholderTextColor={Colors.textMuted}
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameChecking && (
                <ActivityIndicator size="small" color={Colors.primary} style={styles.inputSuffix} />
              )}
              {!usernameChecking && usernameAvailable === true && (
                <Ionicons name="checkmark-circle" size={18} color={Colors.blooming} style={styles.inputSuffix} />
              )}
              {!usernameChecking && usernameAvailable === false && (
                <Ionicons name="close-circle" size={18} color={Colors.wilting} style={styles.inputSuffix} />
              )}
            </View>

            {/* Email */}
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
                  if (result.isNewUser) router.replace('/onboarding');
                  else router.replace('/(tabs)');
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
  inputWrapError: { borderColor: Colors.wilting },
  inputIcon: { paddingLeft: Spacing.md },
  atSign: {
    paddingLeft: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  input: {
    flex: 1, padding: Spacing.md,
    fontSize: FontSize.md, color: Colors.textPrimary,
  },
  inputSuffix: { marginRight: Spacing.md },
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
