import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { useTranslation, type Lang } from '@/i18n';

const LANGUAGES: { value: Lang; label: string; sublabel: string }[] = [
  { value: 'uz-cyrillic', label: 'Ўзбекча',   sublabel: 'Кирилл' },
  { value: 'uz-latin',    label: "O'zbekcha",  sublabel: 'Lotin'  },
  { value: 'ru',          label: 'Русский',    sublabel: 'Кириллица' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const parent = useAuthStore(s => s.parent);
  const logout = useAuthStore(s => s.logout);
  const { notificationsEnabled, soundEnabled, language, updateSettings } = useSettingsStore();

  const handleLogout = () => {
    Alert.alert(t.settings.logoutAlertTitle, t.settings.logoutAlertMsg, [
      { text: t.settings.logoutCancel, style: 'cancel' },
      { text: t.settings.logoutConfirm, style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t.settings.title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Профиль */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{parent?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{parent?.name}</Text>
            <Text style={styles.profileEmail}>{parent?.email}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="pencil" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Уведомления */}
        <SectionTitle title={t.settings.sectionNotif} />
        <View style={styles.group}>
          <SettingSwitch
            icon="notifications-outline"
            label={t.settings.notifications}
            value={notificationsEnabled}
            onToggle={v => updateSettings({ notificationsEnabled: v })}
          />
          <Separator />
          <SettingSwitch
            icon="volume-medium-outline"
            label={t.settings.sound}
            value={soundEnabled}
            onToggle={v => updateSettings({ soundEnabled: v })}
          />
        </View>

        {/* Язык */}
        <SectionTitle title={t.settings.sectionLang} />
        <View style={styles.group}>
          {LANGUAGES.map((lang, i) => (
            <React.Fragment key={lang.value}>
              {i > 0 && <Separator />}
              <LangOption
                label={lang.label}
                sublabel={lang.sublabel}
                value={lang.value}
                current={language}
                onSelect={v => updateSettings({ language: v as Lang })}
              />
            </React.Fragment>
          ))}
        </View>

        {/* О приложении */}
        <SectionTitle title={t.settings.sectionAbout} />
        <View style={styles.group}>
          <SettingRow icon="information-circle-outline" label={t.settings.version} />
          <Separator />
          <SettingRow icon="shield-checkmark-outline" label={t.settings.privacy} />
          <Separator />
          <SettingRow icon="document-text-outline" label={t.settings.terms} />
        </View>

        {/* Выход */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.wilting} />
          <Text style={styles.logoutText}>{t.settings.logout}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Separator() {
  return <View style={styles.separator} />;
}

function SettingSwitch({ icon, label, value, onToggle }: {
  icon: any; label: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={20} color={Colors.textSecondary} />
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: Colors.primary }} />
    </View>
  );
}

function SettingRow({ icon, label }: { icon: any; label: string }) {
  return (
    <TouchableOpacity style={styles.settingRow}>
      <Ionicons name={icon} size={20} color={Colors.textSecondary} />
      <Text style={styles.settingLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

function LangOption({ label, sublabel, value, current, onSelect }: {
  label: string; sublabel: string; value: string; current: string; onSelect: (v: string) => void;
}) {
  const active = value === current;
  return (
    <TouchableOpacity style={styles.settingRow} onPress={() => onSelect(value)}>
      <View style={[styles.langDot, active && styles.langDotActive]}>
        {active && <View style={styles.langDotInner} />}
      </View>
      <View style={styles.langTextWrap}>
        <Text style={[styles.settingLabel, active && styles.settingLabelActive]}>{label}</Text>
        <Text style={styles.langSublabel}>{sublabel}</Text>
      </View>
      {active && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundDeep,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  scroll: { padding: Spacing.md, gap: Spacing.xs },

  profileCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, borderWidth: 0.5, borderColor: Colors.border,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryPale, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.medium, color: Colors.primary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSize.lg, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  profileEmail: { fontSize: FontSize.sm, color: Colors.textMuted },
  editBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryPale, alignItems: 'center', justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: FontWeight.medium,
    color: Colors.textLabel, marginTop: Spacing.md, marginBottom: Spacing.label,
    paddingHorizontal: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  group: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  settingLabel: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  settingLabelActive: { color: Colors.primary, fontWeight: FontWeight.medium },
  separator: { height: 0.5, backgroundColor: Colors.borderLight, marginLeft: Spacing.xl + Spacing.md },

  langDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  langDotActive: { borderColor: Colors.primary },
  langDotInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  langTextWrap: { flex: 1 },
  langSublabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    justifyContent: 'center', padding: Spacing.md,
    marginTop: Spacing.xl, backgroundColor: Colors.wiltingLight,
    borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.wilting + '40',
  },
  logoutText: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.wilting },
});
