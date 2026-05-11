import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useChildrenStore } from '@/store/childrenStore';
import { AiService, AppClassification, RiskLevel } from '@/services/aiService';
import { getMissingBlockingPermissions } from '@/utils/blockingPermissions';

const RISK_COLOR: Record<RiskLevel, string> = {
  low: Colors.blooming,
  medium: Colors.warning,
  high: Colors.wilting,
};

// Well-known apps shown at top (even if not installed)
const POPULAR_APPS: { packageName: string; appName: string; icon: string; color: string; bg: string }[] = [
  { packageName: 'com.google.android.youtube', appName: 'YouTube', icon: 'logo-youtube', color: '#FF0000', bg: '#FEE2E2' },
  { packageName: 'com.instagram.android', appName: 'Instagram', icon: 'logo-instagram', color: '#E1306C', bg: '#FCE7F3' },
  { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', icon: 'musical-notes', color: '#000000', bg: '#F3F4F6' },
  { packageName: 'org.telegram.messenger', appName: 'Telegram', icon: 'paper-plane', color: '#0088CC', bg: '#DBEAFE' },
  { packageName: 'com.whatsapp', appName: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366', bg: '#ECFDF5' },
  { packageName: 'com.facebook.katana', appName: 'Facebook', icon: 'logo-facebook', color: '#1877F2', bg: '#DBEAFE' },
  { packageName: 'com.discord', appName: 'Discord', icon: 'chatbubbles', color: '#5865F2', bg: '#EDE9FE' },
  { packageName: 'com.spotify.music', appName: 'Spotify', icon: 'musical-note', color: '#1DB954', bg: '#ECFDF5' },
  { packageName: 'com.roblox.client', appName: 'Roblox', icon: 'game-controller', color: '#E2231A', bg: '#FEE2E2' },
  { packageName: 'com.mojang.minecraftpe', appName: 'Minecraft', icon: 'cube', color: '#62B47A', bg: '#ECFDF5' },
  { packageName: 'com.android.chrome', appName: 'Chrome', icon: 'logo-chrome', color: '#4285F4', bg: '#DBEAFE' },
  { packageName: 'com.ss.android.ugc.trill', appName: 'TikTok Lite', icon: 'musical-notes', color: '#000000', bg: '#F3F4F6' },
];

interface AppItem {
  packageName: string;
  appName: string;
  icon?: string;
  color?: string;
  bg?: string;
  isPopular: boolean;
}

let ScreenTime: typeof import('screen-time') | null = null;
try {
  ScreenTime = require('screen-time');
} catch {
  ScreenTime = null;
}

export default function BlockedAppsScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const router = useRouter();
  const t = useTranslation();
  const getChildById = useChildrenStore(s => s.getChildById);
  const updateChild = useChildrenStore(s => s.updateChild);
  const child = getChildById(childId);

  const [selected, setSelected] = useState<Set<string>>(new Set(child?.blockedApps ?? []));
  const [installedApps, setInstalledApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [classifications, setClassifications] = useState<Map<string, AppClassification>>(new Map());

  useEffect(() => {
    loadApps();
  }, []);

  // Fetch AI classifications once apps are loaded.
  useEffect(() => {
    if (installedApps.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const names = installedApps.map(a => a.appName);
        const results = await AiService.classifyApps(names);
        if (cancelled) return;
        const map = new Map<string, AppClassification>();
        for (const r of results) {
          map.set(r.app_name.toLowerCase(), r);
        }
        setClassifications(map);
      } catch {
        // Silent fail — badges just won't show.
      }
    })();
    return () => { cancelled = true; };
  }, [installedApps]);

  const showReasoning = useCallback((appName: string, reasoning?: string) => {
    if (!reasoning) return;
    Alert.alert(appName, reasoning);
  }, []);

  const loadApps = () => {
    const installed: Map<string, string> = new Map();

    if (Platform.OS === 'android' && ScreenTime) {
      try {
        const apps = ScreenTime.getInstalledApps();
        for (const app of apps) {
          installed.set(app.packageName, app.appName);
        }
      } catch {}
    }

    const items: AppItem[] = [];
    const seen = new Set<string>();

    // Add popular apps first
    for (const app of POPULAR_APPS) {
      seen.add(app.packageName);
      items.push({ ...app, isPopular: true });
    }

    // Add remaining installed apps
    for (const [pkg, name] of installed) {
      if (!seen.has(pkg)) {
        items.push({ packageName: pkg, appName: name, isPopular: false });
      }
    }

    setInstalledApps(items);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return installedApps;
    const q = search.toLowerCase();
    return installedApps.filter(a => a.appName.toLowerCase().includes(q));
  }, [installedApps, search]);

  const toggle = (pkg: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  };

  const handleSave = async () => {
    if (!child) return;
    setSaving(true);
    await updateChild(child.id, { blockedApps: Array.from(selected) });
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (Platform.OS === 'android' && selected.size > 0 && getMissingBlockingPermissions().length > 0) {
      Alert.alert(
        t.blockedApps.overlayTitle,
        t.blockedApps.overlayMsg,
        [
          { text: t.childDetail.deleteCancel, style: 'cancel', onPress: () => router.back() },
          { text: t.blockedApps.overlayGrant, onPress: () => router.replace('/onboarding') },
        ],
      );
      return;
    }

    router.back();
  };

  if (!child) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>{t.childDetail.notFound}</Text>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: AppItem }) => {
    const isSelected = selected.has(item.packageName);
    const iconName = item.icon || 'apps';
    const iconColor = item.color || Colors.textSecondary;
    const iconBg = item.bg || Colors.borderLight;
    const classification = classifications.get(item.appName.toLowerCase());

    return (
      <TouchableOpacity
        style={[styles.appRow, isSelected && styles.appRowSelected]}
        onPress={() => toggle(item.packageName)}
        onLongPress={() => classification && showReasoning(item.appName, classification.reasoning)}
        activeOpacity={0.7}
      >
        <View style={[styles.appIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName as any} size={20} color={iconColor} />
        </View>
        <View style={styles.appInfo}>
          <View style={styles.appNameRow}>
            <Text style={styles.appName} numberOfLines={1}>{item.appName}</Text>
            {classification && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {t.blockedApps.categories[classification.category]}
                </Text>
                <View style={[styles.riskDot, { backgroundColor: RISK_COLOR[classification.risk_level] }]} />
              </View>
            )}
          </View>
          <Text style={styles.appPkg} numberOfLines={1}>{item.packageName}</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t.blockedApps.title}</Text>
          <Text style={styles.headerSub}>{child.name}</Text>
        </View>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          <Text style={styles.saveBtnText}>
            {saving ? '...' : t.blockedApps.save}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
        <Text style={styles.infoText}>{t.blockedApps.info}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t.blockedApps.searchPlaceholder}
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Selected count */}
      {selected.size > 0 && (
        <View style={styles.selectedBar}>
          <Ionicons name="ban" size={16} color={Colors.wilting} />
          <Text style={styles.selectedText}>
            {t.blockedApps.selectedCount(selected.size)}
          </Text>
        </View>
      )}

      {/* App list */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.packageName}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  saveBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, backgroundColor: Colors.primary,
  },
  saveBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#fff' },

  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    margin: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.primaryPale, borderRadius: Radius.md,
    borderWidth: 0.5, borderColor: Colors.primaryLight,
  },
  infoText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md, height: 44,
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },

  selectedBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  selectedText: { fontSize: FontSize.sm, color: Colors.wilting, fontWeight: FontWeight.medium },

  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },

  appRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  appRowSelected: {
    backgroundColor: Colors.wiltingLight,
  },
  appIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  appInfo: { flex: 1, gap: 2 },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appName: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  appPkg: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.wilting, borderColor: Colors.wilting,
  },
  separator: { height: 0.5, backgroundColor: Colors.borderLight, marginLeft: 56 + Spacing.md },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { padding: Spacing.xl, textAlign: 'center', color: Colors.textMuted },
});
