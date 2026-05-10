import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedFlower } from '@/components/flower/AnimatedFlower';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { ParentPinModal } from '@/components/parent-pin/ParentPinModal';
import { useChildrenStore } from '@/store/childrenStore';
import { useParentPinStore } from '@/store/parentPinStore';
import { Colors, FlowerColors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { getFlowerState, getUsagePercent, getRemainingMinutes } from '@/utils/screenTime';
import { useTranslation, formatDurationT } from '@/i18n';
import { useScreenTime } from '@/hooks/useScreenTime';

let ScreenTime: typeof import('screen-time') | null = null;
try {
  ScreenTime = require('screen-time');
} catch {
  ScreenTime = null;
}

// Event emitter for native module events
let eventEmitter: any = null;
try {
  eventEmitter = new NativeEventEmitter(NativeModules.ScreenTime);
} catch {
  eventEmitter = null;
}

// Map well-known package names to icons/colors
const KNOWN_APPS: Record<string, { icon: string; color: string; bg: string }> = {
  'com.google.android.youtube': { icon: 'logo-youtube', color: '#FF0000', bg: '#FEE2E2' },
  'com.zhiliaoapp.musically':   { icon: 'musical-notes', color: '#000000', bg: '#F3F4F6' },
  'com.ss.android.ugc.trill':   { icon: 'musical-notes', color: '#000000', bg: '#F3F4F6' },
  'org.telegram.messenger':     { icon: 'paper-plane', color: '#0088CC', bg: '#DBEAFE' },
  'com.instagram.android':      { icon: 'logo-instagram', color: '#E1306C', bg: '#FCE7F3' },
  'com.whatsapp':               { icon: 'logo-whatsapp', color: '#25D366', bg: '#ECFDF5' },
  'com.android.chrome':         { icon: 'logo-chrome', color: '#4285F4', bg: '#DBEAFE' },
  'com.google.android.gm':      { icon: 'mail', color: '#EA4335', bg: '#FEE2E2' },
  'com.facebook.katana':        { icon: 'logo-facebook', color: '#1877F2', bg: '#DBEAFE' },
  'com.discord':                { icon: 'chatbubbles', color: '#5865F2', bg: '#EDE9FE' },
  'com.spotify.music':          { icon: 'musical-note', color: '#1DB954', bg: '#ECFDF5' },
  'com.roblox.client':          { icon: 'game-controller', color: '#E2231A', bg: '#FEE2E2' },
  'com.mojang.minecraftpe':     { icon: 'cube', color: '#62B47A', bg: '#ECFDF5' },
};

const DEFAULT_APP_STYLE = { icon: 'apps', color: Colors.textSecondary, bg: Colors.borderLight };

function getAppStyle(packageName: string) {
  return KNOWN_APPS[packageName] || DEFAULT_APP_STYLE;
}

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslation();
  const getChildById = useChildrenStore(s => s.getChildById);
  const removeChild = useChildrenStore(s => s.removeChild);
  const child = getChildById(id);
  const screenTime = useScreenTime(id);
  const { isUnlocked } = useParentPinStore();
  const [showPinModal, setShowPinModal] = useState(false);

  if (!child) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>{t.childDetail.notFound}</Text>
        <Button title={t.childDetail.back} onPress={() => router.back()} variant="ghost" />
      </SafeAreaView>
    );
  }

  // Use real screen time from native module when available, otherwise 0
  const usedMinutes = screenTime.hasPermission ? screenTime.totalMinutes : 0;
  const blockerStarted = useRef(false);

  // Auto-start/stop blocker when limit is reached
  useEffect(() => {
    if (Platform.OS !== 'android' || !ScreenTime || !child) return;
    const hasBlocked = child.blockedApps.length > 0;
    const overLimit = usedMinutes >= child.dailyLimitMinutes;

    if (hasBlocked && overLimit && !blockerStarted.current) {
      if (ScreenTime.hasOverlayPermission()) {
        ScreenTime.startAppBlocker(child.blockedApps, child.name, child.id, child.pin);
        blockerStarted.current = true;
      } else {
        Alert.alert(
          'Ruxsat kerak',
          'Bloklash ishlashi uchun "Boshqa ilovalar ustidan ko\'rsatish" ruxsatini bering.',
          [
            { text: 'Bekor qilish', style: 'cancel' },
            { text: 'Sozlamalarga o\'tish', onPress: () => ScreenTime?.requestOverlayPermission() },
          ]
        );
      }
    } else if (!overLimit && blockerStarted.current) {
      ScreenTime.stopAppBlocker();
      blockerStarted.current = false;
    }
  }, [usedMinutes, child?.blockedApps, child?.dailyLimitMinutes, child?.id, child?.pin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blockerStarted.current && ScreenTime) {
        ScreenTime.stopAppBlocker();
      }
    };
  }, []);

  const periodStats = useMemo(() => {
    if (!ScreenTime || !screenTime.hasPermission) return null;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const periods = [
      { key: 'night',   label: t.childDetail.periodNight   ?? 'Ночь',  icon: '🌙', start: 0,  end: 6  },
      { key: 'morning', label: t.childDetail.periodMorning ?? 'Утро',  icon: '🌅', start: 6,  end: 12 },
      { key: 'day',     label: t.childDetail.periodDay     ?? 'День',  icon: '☀️', start: 12, end: 18 },
      { key: 'evening', label: t.childDetail.periodEvening ?? 'Вечер', icon: '🌆', start: 18, end: 24 },
    ];
    return periods.map(p => {
      const startMs = todayStart + p.start * 3600_000;
      const endMs   = Math.min(todayStart + p.end * 3600_000, now.getTime());
      if (endMs <= startMs) return { ...p, minutes: 0 };
      const apps = ScreenTime!.getUsageStatsForChild(id, startMs, endMs);
      const minutes = apps.reduce((sum, a) => sum + a.totalMinutes, 0);
      return { ...p, minutes };
    });
  }, [screenTime.hasPermission, screenTime.totalMinutes]);

  const state = getFlowerState(usedMinutes, child.dailyLimitMinutes);
  const percent = getUsagePercent(usedMinutes, child.dailyLimitMinutes);
  const remaining = getRemainingMinutes(usedMinutes, child.dailyLimitMinutes);
  const stateColor = FlowerColors[state];

  const handleDelete = () => {
    Alert.alert(
      t.childDetail.deleteTitle(child.name),
      t.childDetail.deleteMsg,
      [
        { text: t.childDetail.deleteCancel, style: 'cancel' },
        { text: t.childDetail.deleteConfirm, style: 'destructive', onPress: async () => {
          await removeChild(child.id);
          router.back();
        }},
      ],
    );
  };

  const handleParentPinSuccess = () => {
    setShowPinModal(false);
  };

  const today = new Date().getDay();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[stateColor.light, Colors.background]}
          style={styles.heroSection}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={Colors.wilting} />
          </TouchableOpacity>

          <AnimatedFlower
            variant={child.flowerVariant}
            color={child.flowerColor}
            usedMinutes={usedMinutes}
            limitMinutes={child.dailyLimitMinutes}
            size={160}
          />

          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.childAge}>{t.childDetail.ageLabel(child.age)}</Text>

          <View style={[styles.stateBadge, { backgroundColor: stateColor.primary }]}>
            <Text style={styles.stateBadgeText}>{t.flowerStates[state]}</Text>
          </View>
        </LinearGradient>

        {/* Сегодня */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.childDetail.today}</Text>
          <View style={styles.todayCard}>
            <View style={styles.timeStats}>
              <View style={styles.timeStat}>
                <Text style={styles.timeValue}>{formatDurationT(usedMinutes, t)}</Text>
                <Text style={styles.timeLabel}>{t.childDetail.used}</Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeStat}>
                <Text style={[styles.timeValue, { color: stateColor.primary }]}>
                  {state === 'wilting'
                    ? `+${formatDurationT(usedMinutes - child.dailyLimitMinutes, t)}`
                    : formatDurationT(remaining, t)}
                </Text>
                <Text style={styles.timeLabel}>
                  {state === 'wilting' ? t.childDetail.over : t.childDetail.remaining}
                </Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeStat}>
                <Text style={styles.timeValue}>{formatDurationT(child.dailyLimitMinutes, t)}</Text>
                <Text style={styles.timeLabel}>{t.childDetail.limit}</Text>
              </View>
            </View>
            <ProgressBar progress={percent} state={state} height={10} style={styles.progress} />
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
        </View>

        {/* Неделя */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.childDetail.week}</Text>
          <View style={styles.weekCard}>
            {Array.from({ length: 7 }, (_, i) => {
              const dayIndex = (today - 6 + i + 7) % 7;
              const val = child.screenTimeWeek[i];
              const maxVal = Math.max(...child.screenTimeWeek, child.dailyLimitMinutes, 1);
              const h = Math.max(4, (val / maxVal) * 80);
              const s = getFlowerState(val, child.dailyLimitMinutes);
              const c = FlowerColors[s].primary;
              const isToday = i === 6;
              return (
                <View key={i} style={styles.dayBar}>
                  <Text style={styles.dayBarValue}>
                    {val > 0 ? `${Math.round(val / 60)}${t.childDetail.hourSuffix}` : ''}
                  </Text>
                  <View style={styles.dayBarTrack}>
                    <View style={[styles.dayBarFill, { height: h, backgroundColor: c }]} />
                  </View>
                  <Text style={[styles.dayBarName, isToday && styles.dayBarNameToday]}>
                    {t.dayNames[dayIndex]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Приложения — реальные данные с UsageStatsManager */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.childDetail.appsSection}</Text>
          <View style={styles.appsCard}>
            {!screenTime.isSupported ? (
              <Text style={styles.noApps}>{t.childDetail.noApps}</Text>
            ) : !screenTime.hasPermission ? (
              <View style={styles.permissionBlock}>
                <Ionicons name="shield-checkmark-outline" size={32} color={Colors.primary} />
                <Text style={styles.permissionHint}>{t.childDetail.permissionHint}</Text>
                <TouchableOpacity
                  style={styles.permissionBtn}
                  onPress={screenTime.openPermissionSettings}
                >
                  <Text style={styles.permissionBtnText}>{t.childDetail.grantPermission}</Text>
                </TouchableOpacity>
              </View>
            ) : screenTime.loading ? (
              <Text style={styles.noApps}>...</Text>
            ) : screenTime.apps.length === 0 ? (
              <Text style={styles.noApps}>{t.childDetail.noApps}</Text>
            ) : (
              screenTime.apps.map((app, i) => {
                const style = getAppStyle(app.packageName);
                const maxMin = screenTime.apps[0]?.totalMinutes || 1;
                const barW = Math.max(8, (app.totalMinutes / maxMin) * 100);
                return (
                  <View key={app.packageName}>
                    {i > 0 && <View style={styles.appDivider} />}
                    <View style={styles.appRow}>
                      <View style={[styles.appIcon, { backgroundColor: style.bg }]}>
                        <Ionicons name={style.icon as any} size={18} color={style.color} />
                      </View>
                      <View style={styles.appInfo}>
                        <View style={styles.appNameRow}>
                          <Text style={styles.appName}>{app.appName}</Text>
                          <Text style={styles.appTime}>{formatDurationT(app.totalMinutes, t)}</Text>
                        </View>
                        <View style={styles.appBarTrack}>
                          <View style={[styles.appBarFill, { width: `${barW}%`, backgroundColor: style.color + '60' }]} />
                        </View>
                        <Text style={styles.appLaunches}>
                          {app.launchCount} {t.childDetail.launches}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Действия */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.childDetail.settingsSection}</Text>
          <View style={styles.actionsCard}>
            <ActionRow icon="time-outline" label={t.childDetail.changeLimit} onPress={() => {
              if (!isUnlocked) {
                setShowPinModal(true);
              }
              // TODO: Add limit change modal
            }} />
            <ActionRow
              icon="ban-outline"
              label={t.childDetail.blockApps}
              badge={child.blockedApps.length > 0 ? `${child.blockedApps.length}` : undefined}
              onPress={() => {
                if (Platform.OS === 'android' && ScreenTime && !ScreenTime.hasOverlayPermission()) {
                  Alert.alert(
                    t.blockedApps.overlayTitle,
                    t.blockedApps.overlayMsg,
                    [
                      { text: t.childDetail.deleteCancel, style: 'cancel' },
                      { text: t.blockedApps.overlayGrant, onPress: () => ScreenTime!.requestOverlayPermission() },
                    ],
                  );
                  return;
                }
                router.push({ pathname: '/child/blocked-apps', params: { childId: child.id } });
              }}
            />
            <ActionRow icon="location-outline" label={t.childDetail.geolocation} onPress={() => {}} />
          </View>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Modals */}
      <ParentPinModal visible={showPinModal} onClose={() => setShowPinModal(false)} onSuccess={handleParentPinSuccess} />
    </SafeAreaView>
  );
}

function ActionRow({ icon, label, badge, onPress }: { icon: any; label: string; badge?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      {badge && (
        <View style={styles.actionBadge}>
          <Text style={styles.actionBadgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { padding: Spacing.xl, fontSize: FontSize.lg, textAlign: 'center', color: Colors.textMuted },
  heroSection: {
    alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: {
    position: 'absolute', top: Spacing.md, left: Spacing.md,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: Colors.border,
  },
  deleteBtn: {
    position: 'absolute', top: Spacing.md, right: Spacing.md,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: Colors.border,
  },
  childName: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  childAge: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.sm },
  stateBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  stateBadgeText: { color: Colors.textOnDark, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textLabel,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.label,
  },
  todayCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  timeStats: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  timeStat: { flex: 1, alignItems: 'center' },
  timeValue: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  timeLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  timeDivider: { width: 0.5, height: 40, backgroundColor: Colors.borderLight },
  progress: {},
  percentText: { textAlign: 'right', fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textMuted, marginTop: 4 },
  weekCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between',
    borderWidth: 0.5, borderColor: Colors.border,
  },
  dayBar: { alignItems: 'center', gap: 4 },
  dayBarValue: { fontSize: 9, color: Colors.textMuted },
  dayBarTrack: {
    width: 24, height: 80, justifyContent: 'flex-end',
    backgroundColor: Colors.borderLight, borderRadius: Radius.sm, overflow: 'hidden',
  },
  dayBarFill: { width: '100%', borderRadius: Radius.sm },
  dayBarName: { fontSize: 10, color: Colors.textMuted },
  dayBarNameToday: { color: Colors.primary, fontWeight: FontWeight.medium },
  appsCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  noApps: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 8 },
  appDivider: { height: 0.5, backgroundColor: Colors.borderLight },
  appIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  appInfo: { flex: 1 },
  appNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  appName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  appTime: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  appBarTrack: {
    height: 4, backgroundColor: Colors.borderLight, borderRadius: 2,
    overflow: 'hidden', marginBottom: 3,
  },
  appBarFill: { height: 4, borderRadius: 2 },
  appLaunches: { fontSize: FontSize.xs, color: Colors.textMuted },
  permissionBlock: {
    alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm,
  },
  permissionHint: {
    fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center',
    paddingHorizontal: Spacing.md, lineHeight: 20,
  },
  permissionBtn: {
    marginTop: Spacing.sm, backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  permissionBtnText: {
    color: Colors.textOnDark, fontWeight: FontWeight.semibold, fontSize: FontSize.sm,
  },
  actionsCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  actionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryPale, alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  actionBadge: {
    backgroundColor: Colors.wiltingLight, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2, marginRight: 4,
  },
  actionBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.wilting },
});
