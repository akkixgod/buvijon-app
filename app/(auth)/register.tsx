import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';

export default function RegisterScreen() {
  const router = useRouter();
  const t = useTranslation();
  const sendOtp = useAuthStore(s => s.sendOtp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!name.trim()) { setError(t.register.errName); return; }
    if (!email.trim()) { setError(t.register.errEmail); return; }
    if (!email.includes('@')) { setError(t.register.errInvalidEmail); return; }
    setError('');
    setLoading(true);
    const result = await sendOtp(email);
    setLoading(false);
    if (result.ok) {
      router.push({ pathname: '/(auth)/otp', params: { email, name: name.trim(), mode: 'register' } });
    } else {
      setError(result.error ?? t.register.errSend);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFF0F7', '#FFFFFF']} style={styles.container}>
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
  link: { alignItems: 'center', marginTop: Spacing.md },
  linkText: { fontSize: FontSize.sm, color: Colors.textMuted },
  linkBold: { color: Colors.primary, fontWeight: FontWeight.medium },
});
