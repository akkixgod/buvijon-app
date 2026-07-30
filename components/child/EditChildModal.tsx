import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useChildrenStore } from '@/store/childrenStore';
import { useTranslation, formatDurationT } from '@/i18n';
import type { Child } from '@/types';
import {
  fetchTodayUsageByPackage,
  sortAppsByDailyUsage,
} from '@/services/appSortingService';

const LIMIT_PRESETS = [30, 60, 90, 120, 180, 240];

const POPULAR_APP_META: Record<string, { appName: string; icon: string; color: string; bg: string }> = {
  'com.google.android.youtube': { appName: 'YouTube', icon: 'logo-youtube', color: '#FF0000', bg: '#FEE2E2' },
  'com.instagram.android': { appName: 'Instagram', icon: 'logo-instagram', color: '#E1306C', bg: '#FCE7F3' },
  'com.zhiliaoapp.musically': { appName: 'TikTok', icon: 'musical-notes', color: '#000000', bg: '#F3F4F6' },
  'org.telegram.messenger': { appName: 'Telegram', icon: 'paper-plane', color: '#0088CC', bg: '#DBEAFE' },
  'com.whatsapp': { appName: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366', bg: '#ECFDF5' },
  'com.facebook.katana': { appName: 'Facebook', icon: 'logo-facebook', color: '#1877F2', bg: '#DBEAFE' },
  'com.discord': { appName: 'Discord', icon: 'chatbubbles', color: '#5865F2', bg: '#EDE9FE' },
  'com.roblox.client': { appName: 'Roblox', icon: 'game-controller', color: '#E2231A', bg: '#FEE2E2' },
  'com.mojang.minecraftpe': { appName: 'Minecraft', icon: 'cube', color: '#62B47A', bg: '#ECFDF5' },
  'com.ss.android.ugc.trill': { appName: 'TikTok Lite', icon: 'musical-notes', color: '#000000', bg: '#F3F4F6' },
};

type AppRow = {
  packageName: string;
  appName: string;
  icon?: string;
  color?: string;
  bg?: string;
};

let ScreenTime: typeof import('screen-time') | null = null;
try {
  ScreenTime = require('screen-time');
} catch {
  ScreenTime = null;
}

type Props = {
  visible: boolean;
  child: Child;
  onClose: () => void;
};

export function EditChildModal({ visible, child, onClose }: Props) {
  const t = useTranslation();
  const updateChild = useChildrenStore(s => s.updateChild);

  const [name, setName] = useState(child.name);
  const [pin, setPin] = useState(child.pin);
  const [limitMinutes, setLimitMinutes] = useState(child.dailyLimitMinutes);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set(child.blockedApps));
  const [apps, setApps] = useState<AppRow[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadApps = useCallback(() => {
    setAppsLoading(true);
    const installed = new Map<string, string>();
    if (Platform.OS === 'android' && ScreenTime) {
      try {
        for (const app of ScreenTime.getInstalledApps()) {
          installed.set(app.packageName, app.appName);
        }
      } catch {}
    }

    const usage = fetchTodayUsageByPackage();
    const rows: AppRow[] = [];
    const seen = new Set<string>();

    for (const [pkg, appName] of installed) {
      seen.add(pkg);
      const meta = POPULAR_APP_META[pkg];
      rows.push({
        packageName: pkg,
        appName: meta?.appName ?? appName,
        icon: meta?.icon,
        color: meta?.color,
        bg: meta?.bg,
      });
    }
    for (const [pkg, meta] of Object.entries(POPULAR_APP_META)) {
      if (seen.has(pkg)) continue;
      rows.push({
        packageName: pkg,
        appName: meta.appName,
        icon: meta.icon,
        color: meta.color,
        bg: meta.bg,
      });
    }

    setApps(sortAppsByDailyUsage(rows, usage));
    setAppsLoading(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setName(child.name);
    setPin(child.pin);
    setLimitMinutes(child.dailyLimitMinutes);
    setSelectedApps(new Set(child.blockedApps));
    setError('');
    loadApps();
  }, [visible, child, loadApps]);

  const toggleApp = (pkg: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedApps(prev => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t.childDetail.editErrName);
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError(t.childDetail.editErrPin);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await updateChild(child.id, {
        name: name.trim(),
        pin,
        dailyLimitMinutes: Math.max(1, limitMinutes),
        blockedApps: Array.from(selectedApps),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch {
      setError(t.addChild.errSave);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      avoidKeyboard
      propagateSwipe
    >
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t.childDetail.editTitle}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Text style={styles.label}>{t.addChild.nameLabel}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t.addChild.namePlaceholder}
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>{t.addChild.pinLabel}</Text>
          <TextInput
            style={[styles.input, styles.pinInput]}
            value={pin}
            onChangeText={v => setPin(v.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder={t.addChild.pinPlaceholder}
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.hint}>{t.addChild.pinHint}</Text>

          <Text style={styles.label}>{t.addChild.limitLabel}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            {LIMIT_PRESETS.map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLimitMinutes(p);
                }}
                style={[styles.preset, limitMinutes === p && styles.presetActive]}
              >
                <Text style={[styles.presetText, limitMinutes === p && styles.presetTextActive]}>
                  {formatDurationT(p, t)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={styles.input}
            value={String(limitMinutes)}
            onChangeText={v => setLimitMinutes(Math.max(1, parseInt(v.replace(/[^0-9]/g, ''), 10) || 1))}
            keyboardType="number-pad"
            maxLength={4}
          />

          <Text style={styles.label}>{t.childDetail.editAppsLabel}</Text>
          {appsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
          ) : (
            <View style={styles.appsList}>
              {apps.slice(0, 40).map(app => {
                const on = selectedApps.has(app.packageName);
                return (
                  <TouchableOpacity
                    key={app.packageName}
                    style={[styles.appRow, on && styles.appRowOn]}
                    onPress={() => toggleApp(app.packageName)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.appIcon, { backgroundColor: app.bg || Colors.borderLight }]}>
                      <Ionicons
                        name={(app.icon as any) || 'apps'}
                        size={18}
                        color={app.color || Colors.textSecondary}
                      />
                    </View>
                    <Text style={styles.appName} numberOfLines={1}>{app.appName}</Text>
                    <View style={[styles.checkbox, on && styles.checkboxOn]}>
                      {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={t.childDetail.editSave}
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
            size="lg"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    maxHeight: '94%',
  },
  handle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textLabel,
    marginBottom: Spacing.label,
    marginTop: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
  },
  pinInput: {
    letterSpacing: 12,
    textAlign: 'center',
    fontSize: FontSize.xl,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  presetScroll: { marginBottom: Spacing.sm },
  preset: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  presetActive: {
    backgroundColor: Colors.primaryPale,
    borderColor: Colors.primaryLight,
  },
  presetText: { fontSize: FontSize.sm, color: Colors.textMuted },
  presetTextActive: { color: Colors.primary, fontWeight: FontWeight.medium },
  appsList: { gap: 6 },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  appRowOn: {
    backgroundColor: Colors.primaryPale,
    borderColor: Colors.primaryLight,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  error: {
    color: Colors.wilting,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  saveBtn: { marginTop: Spacing.xl },
});
