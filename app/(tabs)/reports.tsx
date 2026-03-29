import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useChildrenStore } from '@/store/childrenStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { getFlowerState } from '@/utils/screenTime';
import { useTranslation, formatDurationT } from '@/i18n';
import { Child, FlowerState } from '@/types';

type Period = 'today' | 'week';

const STATE_CFG: Record<FlowerState, {
  border: string; avatarBg: string; avatarText: string;
  badgeBg: string; badgeBorder: string; badgeText: string;
  trendColor: string; dot: string;
}> = {
  blooming: {
    border: '#1D9E75', avatarBg: '#EBF7F3', avatarText: '#085041',
    badgeBg: '#EBF7F3', badgeBorder: '#A8DDD0', badgeText: '#1D9E75',
    trendColor: '#1D9E75', dot: '#1D9E75',
  },
  warning: {
    border: '#BA7517', avatarBg: '#FEF5E4', avatarText: '#633806',
    badgeBg: '#FEF5E4', badgeBorder: '#EDCA84', badgeText: '#BA7517',
    trendColor: '#BA7517', dot: '#BA7517',
  },
  wilting: {
    border: '#E24B4A', avatarBg: '#FDECEA', avatarText: '#A32D2D',
    badgeBg: '#FDECEA', badgeBorder: '#F5AAAA', badgeText: '#D03030',
    trendColor: '#E24B4A', dot: '#E24B4A',
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function consecutiveOverDays(child: Child): number {
  let count = 0;
  for (let i = child.screenTimeWeek.length - 1; i >= 0; i--) {
    if (child.screenTimeWeek[i] > child.dailyLimitMinutes) count++;
    else break;
  }
  return count;
}

export default function ReportsScreen() {
  const t = useTranslation();
  const children = useChildrenStore(s => s.children);
  const [period, setPeriod] = useState<Period>('today');

  const now = new Date();
  const dateStr = `${t.analysis.fullDayNames[now.getDay()]} · ${now.getDate()} ${t.analysis.monthNames[now.getMonth()]}`;

  const getTime = (c: Child) =>
    period === 'today'
      ? c.screenTimeToday
      : Math.round(c.screenTimeWeek.reduce((a, b) => a + b, 0) / 7);

  const familyAvg = children.length
    ? Math.round(children.reduce((s, c) => s + getTime(c), 0) / children.length)
    : 0;
  const yesterdayAvg = children.length
    ? Math.round(children.reduce((s, c) => s + (c.screenTimeWeek[5] ?? 0), 0) / children.length)
    : 0;
  const familyDiff = familyAvg - yesterdayAvg;

  let mostImprovedChild: Child | null = null;
  let mostImprovedDiff = 0;
  for (const c of children) {
    const diff = (c.screenTimeWeek[5] ?? 0) - getTime(c);
    if (diff > mostImprovedDiff) { mostImprovedDiff = diff; mostImprovedChild = c; }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateSubtitle}>{dateStr}</Text>
          <Text style={styles.title}>{t.analysis.title}</Text>
        </View>
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'today' && styles.periodBtnActive]}
            onPress={() => setPeriod('today')}
          >
            <Text style={[styles.periodText, period === 'today' && styles.periodTextActive]}>
              {t.analysis.todayBtn}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'week' && styles.periodBtnActive]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.periodText, period === 'week' && styles.periodTextActive]}>
              {t.analysis.weekBtn}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* 3 stat cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statMain} numberOfLines={1}>{formatDurationT(familyAvg, t)}</Text>
            {familyDiff !== 0 && (
              <Text style={[styles.statTrend, { color: familyDiff > 0 ? '#E24B4A' : '#1D9E75' }]} numberOfLines={1}>
                {familyDiff > 0 ? '+' : ''}{familyDiff}{t.duration.min}
              </Text>
            )}
            <Text style={styles.statLabel}>{t.analysis.familyAvg}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statMain} numberOfLines={1}>YouTube</Text>
            <Text style={[styles.statTrend, { color: Colors.textMuted }]} numberOfLines={1}>Entertainment</Text>
            <Text style={styles.statLabel}>{t.analysis.topApp}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statMain} numberOfLines={1}>{mostImprovedChild?.name ?? '—'}</Text>
            {mostImprovedChild && mostImprovedDiff > 0 && (
              <Text style={[styles.statTrend, { color: '#1D9E75' }]} numberOfLines={1}>
                -{mostImprovedDiff}{t.duration.min}
              </Text>
            )}
            <Text style={styles.statLabel}>{t.analysis.mostImproved}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Children */}
        {children.length > 0 && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t.analysis.childrenLabel}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childScroll}
            >
              {children.map(child => (
                <ChildCard key={child.id} child={child} t={t} getTime={getTime} />
              ))}
            </ScrollView>

            <View style={styles.divider} />

            {/* Usage levels */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t.analysis.usageLevels}</Text>
              <LinearGradient
                colors={['#1D9E75', '#97C459', '#FAC775', '#F09595', '#E24B4A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBar}
              />
              <View style={styles.gradientLabels}>
                {[
                  { label: t.analysis.levelSafe, color: '#1D9E75' },
                  { label: t.analysis.levelFair, color: '#639922' },
                  { label: t.analysis.levelModerate, color: '#BA7517' },
                  { label: t.analysis.levelRisky, color: '#F09595' },
                  { label: t.analysis.levelDoctor, color: '#E24B4A' },
                ].map(({ label, color }) => (
                  <Text key={label} style={[styles.gradientLabel, { color }]}>{label}</Text>
                ))}
              </View>

              <View style={styles.chips}>
                {children.map(child => {
                  const state = getFlowerState(child.screenTimeToday, child.dailyLimitMinutes);
                  const cfg = STATE_CFG[state];
                  const overDays = state === 'wilting' ? consecutiveOverDays(child) : 0;
                  const label =
                    state === 'blooming' ? t.analysis.stateSafe
                    : state === 'warning' ? t.analysis.stateModerate
                    : overDays >= 3 ? t.analysis.stateDoctorMode : t.analysis.stateOverLimit;
                  return (
                    <View key={child.id} style={styles.chip}>
                      <View style={[styles.chipDot, { backgroundColor: cfg.dot }]} />
                      <Text style={styles.chipText}>{child.name} — {label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.divider} />
          </>
        )}

        {/* Explore */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.analysis.explore}</Text>
          <ExploreCard
            iconName="trending-up-outline"
            title={t.analysis.improvement}
            subtitle={t.analysis.improvementSub}
          />
          <ExploreCard
            iconName="heart-outline"
            title={t.analysis.mentalCase}
            subtitle={t.analysis.mentalCaseSub}
          />
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Child card (fixed-width horizontal scroll item) ─────────────────────────

function ChildCard({
  child, t, getTime,
}: {
  child: Child;
  t: ReturnType<typeof useTranslation>;
  getTime: (c: Child) => number;
}) {
  const state = getFlowerState(child.screenTimeToday, child.dailyLimitMinutes);
  const cfg = STATE_CFG[state];
  const overDays = state === 'wilting' ? consecutiveOverDays(child) : 0;
  const isDoctorMode = overDays >= 3;
  const initials = getInitials(child.name);

  const badgeLabel =
    state === 'blooming' ? t.analysis.stateSafe
    : state === 'warning' ? t.analysis.stateModerate
    : t.analysis.stateOverLimit;

  const trend = getTime(child) - (child.screenTimeWeek[5] ?? 0);

  return (
    <View style={[styles.childCard, { borderColor: cfg.border + '40' }]}>
      {/* Avatar + status dot */}
      <View style={styles.childCardTop}>
        <View style={[styles.avatar, { backgroundColor: cfg.avatarBg, borderColor: cfg.border }]}>
          <Text style={[styles.avatarText, { color: cfg.avatarText }]}>{initials}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
      </View>

      {/* Name */}
      <Text style={styles.childCardName} numberOfLines={1}>{child.name}</Text>

      {/* Badge */}
      <View style={[styles.childBadge, { backgroundColor: cfg.badgeBg, borderColor: cfg.badgeBorder }]}>
        <Text style={[styles.childBadgeText, { color: cfg.badgeText }]}>{badgeLabel}</Text>
      </View>

      {/* Time */}
      <Text style={styles.childCardTime}>{formatDurationT(getTime(child), t)}</Text>

      {/* Trend or doctor info */}
      {isDoctorMode ? (
        <>
          <Text style={[styles.childCardSub, { color: cfg.badgeText }]}>
            {t.analysis.doctorDay(overDays)}
          </Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL('tel:112')}
          >
            <Ionicons name="call-outline" size={11} color="white" />
            <Text style={styles.contactBtnText}>{t.analysis.contactDoctor}</Text>
          </TouchableOpacity>
        </>
      ) : trend !== 0 ? (
        <Text style={[styles.childCardSub, { color: cfg.trendColor }]}>
          {trend > 0 ? '+' : ''}{trend}{t.duration.min}
        </Text>
      ) : (
        <View style={{ height: 16 }} />
      )}
    </View>
  );
}

// ─── Explore card ─────────────────────────────────────────────────────────────

function ExploreCard({ iconName, title, subtitle }: { iconName: string; title: string; subtitle: string }) {
  return (
    <TouchableOpacity style={styles.exploreCard}>
      <View style={styles.exploreIconWrap}>
        <Ionicons name={iconName as any} size={20} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.exploreTitle}>{title}</Text>
        <Text style={styles.exploreSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textLabel} />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  dateSubtitle: { fontSize: 11, color: Colors.textLabel, marginBottom: 2 },
  title: { fontSize: 22, fontWeight: FontWeight.medium, color: Colors.textPrimary },

  periodRow: { flexDirection: 'row', gap: 6 },
  periodBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: Colors.surfaceSecondary,
  },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { fontSize: 12, color: Colors.textMuted },
  periodTextActive: { color: '#fff', fontWeight: FontWeight.medium },

  scroll: { paddingBottom: Spacing.xl },

  statsGrid: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  statCard: {
    flex: 1, backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md, padding: 12, alignItems: 'center', minHeight: 76,
    justifyContent: 'center',
  },
  statMain: { fontSize: 14, fontWeight: FontWeight.medium, color: Colors.textPrimary, textAlign: 'center' },
  statTrend: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  statLabel: { fontSize: 10, color: Colors.textLabel, marginTop: 2, textAlign: 'center' },

  divider: { height: 0.5, backgroundColor: Colors.borderLight },

  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 0 },
  sectionLabel: {
    fontSize: 11, fontWeight: FontWeight.medium, color: Colors.textLabel,
    letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 14,
  },

  // Children horizontal scroll
  childScroll: {
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
    paddingTop: 2, gap: 10,
  },
  childCard: {
    width: 130, borderRadius: Radius.lg, padding: 14,
    borderWidth: 0.5, borderColor: Colors.border,
    backgroundColor: Colors.surface, alignItems: 'center', gap: 6,
  },
  childCardTop: { position: 'relative', marginBottom: 2 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: FontWeight.medium },
  statusDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 13, height: 13, borderRadius: 7,
    borderWidth: 2, borderColor: Colors.background,
  },
  childCardName: {
    fontSize: 13, fontWeight: FontWeight.medium,
    color: Colors.textPrimary, textAlign: 'center',
  },
  childBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: Radius.full, borderWidth: 0.5,
  },
  childBadgeText: { fontSize: 10, fontWeight: FontWeight.medium },
  childCardTime: {
    fontSize: 15, fontWeight: FontWeight.medium,
    color: Colors.textPrimary, marginTop: 2,
  },
  childCardSub: { fontSize: 11, fontWeight: FontWeight.medium, textAlign: 'center' },

  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 2,
  },
  contactBtnText: { fontSize: 10, color: '#fff', fontWeight: FontWeight.medium },

  // Gradient section
  gradientBar: { height: 8, borderRadius: 100, marginBottom: 8 },
  gradientLabels: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14,
  },
  gradientLabel: { fontSize: 9 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.lg },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.full,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, color: Colors.textSecondary },

  // Explore
  exploreCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border,
    marginBottom: 10,
  },
  exploreIconWrap: {
    width: 42, height: 42, borderRadius: 11, marginRight: 14,
    backgroundColor: Colors.primaryPale,
    borderWidth: 0.5, borderColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  exploreTitle: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textPrimary, marginBottom: 2 },
  exploreSub: { fontSize: 11, color: Colors.textLabel },
});
