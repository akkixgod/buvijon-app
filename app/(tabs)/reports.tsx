import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
  Animated, LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useChildrenStore } from '@/store/childrenStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { getFlowerState } from '@/utils/screenTime';
import { useTranslation, formatDurationT } from '@/i18n';
import { Child, FlowerState } from '@/types';
import { useScreenTime } from '@/hooks/useScreenTime';
import InsightCard from '@/components/ai/InsightCard';

type Period = 'today' | 'week';

const STATE_COLOR: Record<FlowerState, { primary: string; bg: string; text: string }> = {
  blooming: { primary: Colors.blooming, bg: Colors.bloomingLight, text: '#065F46' },
  warning:  { primary: Colors.warning,  bg: Colors.warningLight,  text: '#92400E' },
  wilting:  { primary: Colors.wilting,  bg: Colors.wiltingLight,  text: '#991B1B' },
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

// ─── Period Toggle (animated underline) ─────────────────────────────────────

function PeriodToggle({ period, onChange, t }: {
  period: Period;
  onChange: (p: Period) => void;
  t: ReturnType<typeof useTranslation>;
}) {
  const [widths, setWidths] = useState<{ today: number; week: number }>({ today: 0, week: 0 });
  const [offsets, setOffsets] = useState<{ today: number; week: number }>({ today: 0, week: 0 });
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetX = offsets[period];
    const targetW = widths[period];
    Animated.parallel([
      Animated.spring(indicatorX, { toValue: targetX, tension: 80, friction: 12, useNativeDriver: false }),
      Animated.spring(indicatorW, { toValue: targetW, tension: 80, friction: 12, useNativeDriver: false }),
    ]).start();
  }, [period, widths, offsets]);

  const handleLayout = (key: 'today' | 'week') => (e: LayoutChangeEvent) => {
    const { width, x } = e.nativeEvent.layout;
    setWidths(w => ({ ...w, [key]: width }));
    setOffsets(o => ({ ...o, [key]: x }));
  };

  return (
    <View style={styles.periodWrap}>
      <TouchableOpacity onLayout={handleLayout('today')} onPress={() => onChange('today')} style={styles.periodItem}>
        <Text style={[styles.periodText, period === 'today' && styles.periodTextActive]}>
          {t.analysis.todayBtn}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onLayout={handleLayout('week')} onPress={() => onChange('week')} style={styles.periodItem}>
        <Text style={[styles.periodText, period === 'week' && styles.periodTextActive]}>
          {t.analysis.weekBtn}
        </Text>
      </TouchableOpacity>
      <Animated.View style={[styles.periodIndicator, { left: indicatorX, width: indicatorW }]} />
    </View>
  );
}

// ─── Donut ring (single child) ───────────────────────────────────────────────

function DonutRing({ percent, color, size = 56 }: { percent: number; color: string; size?: number }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.min(Math.max(percent, 0), 100) / 100;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={Colors.borderLight}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

// ─── Animated wrapper for staggered entry ───────────────────────────────────

function FadeInUp({ delay = 0, duration = 300, children, style }: {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  style?: any;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration, delay, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[
      style,
      {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      },
    ]}>
      {children}
    </Animated.View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const t = useTranslation();
  const children = useChildrenStore(s => s.children);
  const [period, setPeriod] = useState<Period>('today');
  const screenTime = useScreenTime();
  const realMinutes = screenTime.hasPermission ? screenTime.totalMinutes : 0;

  const now = new Date();
  const dateStr = `${t.analysis.fullDayNames[now.getDay()]} · ${now.getDate()} ${t.analysis.monthNames[now.getMonth()]}`;

  const getTime = (c: Child) =>
    period === 'today'
      ? realMinutes
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

  const trendText = familyDiff === 0
    ? '—'
    : familyDiff > 0
      ? `+${familyDiff}${t.duration.min}`
      : `${familyDiff}${t.duration.min}`;
  const trendColor = familyDiff > 0 ? Colors.wilting : familyDiff < 0 ? Colors.blooming : Colors.textMuted;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateSubtitle}>{dateStr}</Text>
          <Text style={styles.title}>{t.analysis.title}</Text>
        </View>
        <PeriodToggle period={period} onChange={setPeriod} t={t} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero — Family today */}
        <FadeInUp duration={350} style={styles.hero}>
          <Text style={styles.heroLabel}>{t.analysis.familyAvg}</Text>
          <Text style={styles.heroNumber}>{formatDurationT(familyAvg, t)}</Text>
          <View style={styles.trendRow}>
            <Ionicons
              name={familyDiff > 0 ? 'trending-up' : familyDiff < 0 ? 'trending-down' : 'remove'}
              size={14}
              color={trendColor}
            />
            <Text style={[styles.trendText, { color: trendColor }]}>{trendText}</Text>
            <Text style={styles.trendHint}>{period === 'today' ? 'vs yesterday' : 'vs last week'}</Text>
          </View>
        </FadeInUp>

        {/* Inline secondary stats */}
        <FadeInUp delay={120} duration={300} style={styles.inlineStats}>
          <View style={styles.inlineRow}>
            <Text style={styles.inlineLabel}>{t.analysis.topApp}</Text>
            <Text style={styles.inlineValue}>YouTube · Entertainment</Text>
          </View>
          <View style={styles.inlineRow}>
            <Text style={styles.inlineLabel}>{t.analysis.mostImproved}</Text>
            <Text style={styles.inlineValue}>
              {mostImprovedChild ? `${mostImprovedChild.name}  −${mostImprovedDiff}${t.duration.min}` : '—'}
            </Text>
          </View>
        </FadeInUp>

        {/* Children list — vertical rows with rings */}
        {children.length > 0 && (
          <View style={styles.section}>
            <FadeInUp delay={180} duration={250}>
              <Text style={styles.sectionLabel}>{t.analysis.childrenLabel}</Text>
            </FadeInUp>

            {children.map((child, i) => {
              const state = getFlowerState(realMinutes, child.dailyLimitMinutes);
              const cfg = STATE_COLOR[state];
              const overDays = state === 'wilting' ? consecutiveOverDays(child) : 0;
              const isDoctorMode = overDays >= 3;
              const initials = getInitials(child.name);
              const childPercent = Math.min(100, Math.round((getTime(child) / Math.max(child.dailyLimitMinutes, 1)) * 100));
              const trend = getTime(child) - (child.screenTimeWeek[5] ?? 0);

              const stateLabel =
                state === 'blooming' ? t.analysis.stateSafe
                : state === 'warning' ? t.analysis.stateModerate
                : isDoctorMode ? t.analysis.stateDoctorMode
                : t.analysis.stateOverLimit;

              return (
                <FadeInUp key={child.id} delay={220 + i * 60} duration={300}>
                  <View style={styles.childRow}>
                    <View style={styles.ringWrap}>
                      <DonutRing percent={childPercent} color={cfg.primary} size={48} />
                      <View style={[styles.ringInitials, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.ringInitialsText, { color: cfg.text }]}>{initials}</Text>
                      </View>
                    </View>

                    <View style={styles.childInfo}>
                      <View style={styles.childTopRow}>
                        <Text style={styles.childName} numberOfLines={1}>{child.name}</Text>
                        <View style={[styles.statePill, { backgroundColor: cfg.bg }]}>
                          <Text style={[styles.statePillText, { color: cfg.text }]}>{stateLabel}</Text>
                        </View>
                      </View>
                      <View style={styles.childBottomRow}>
                        <Text style={styles.childTime}>{formatDurationT(getTime(child), t)}</Text>
                        <Text style={styles.childLimit}>/ {formatDurationT(child.dailyLimitMinutes, t)}</Text>
                        {trend !== 0 && (
                          <View style={styles.trendBadge}>
                            <Ionicons
                              name={trend > 0 ? 'arrow-up' : 'arrow-down'}
                              size={10}
                              color={trend > 0 ? Colors.wilting : Colors.blooming}
                            />
                            <Text style={[styles.trendBadgeText, { color: trend > 0 ? Colors.wilting : Colors.blooming }]}>
                              {Math.abs(trend)}{t.duration.min}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {isDoctorMode && (
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => Linking.openURL('tel:112')}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="call" size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </FadeInUp>
              );
            })}
          </View>
        )}

        {/* Weekly AI insights — per child */}
        {children.length > 0 && (
          <View style={styles.section}>
            <FadeInUp delay={350} duration={300}>
              <Text style={styles.sectionLabel}>{t.analysis.weeklyInsight}</Text>
            </FadeInUp>
            {children.map((child, i) => (
              <FadeInUp key={child.id} delay={400 + i * 60} duration={300}>
                <InsightCard childId={child.id} childName={child.name} />
              </FadeInUp>
            ))}
          </View>
        )}

        {/* Explore — flat cards */}
        <View style={styles.section}>
          <FadeInUp delay={400} duration={300}>
            <Text style={styles.sectionLabel}>{t.analysis.explore}</Text>
          </FadeInUp>

          <FadeInUp delay={450} duration={300}>
            <ExploreRow
              icon="trending-up-outline"
              title={t.analysis.improvement}
              subtitle={t.analysis.improvementSub}
            />
          </FadeInUp>
          <FadeInUp delay={500} duration={300}>
            <ExploreRow
              icon="heart-outline"
              title={t.analysis.mentalCase}
              subtitle={t.analysis.mentalCaseSub}
            />
          </FadeInUp>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Explore Row ────────────────────────────────────────────────────────────

function ExploreRow({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <TouchableOpacity style={styles.exploreRow} activeOpacity={0.7}>
      <View style={styles.exploreIcon}>
        <Ionicons name={icon as any} size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.exploreTitle}>{title}</Text>
        <Text style={styles.exploreSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textLabel} />
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  dateSubtitle: {
    fontSize: 11,
    color: Colors.textLabel,
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },

  // Period toggle (underline style)
  periodWrap: {
    flexDirection: 'row',
    position: 'relative',
    paddingBottom: 6,
  },
  periodItem: {
    paddingHorizontal: 4,
    paddingBottom: 6,
    marginLeft: 12,
  },
  periodText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  periodTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  periodIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },

  scroll: { paddingBottom: Spacing.xl },

  // Hero
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    color: Colors.textLabel,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroNumber: {
    fontSize: 44,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: -1.2,
    lineHeight: 50,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  trendText: {
    fontSize: 13,
    fontWeight: FontWeight.semibold,
  },
  trendHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },

  // Inline stats (no boxes)
  inlineStats: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  inlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  inlineLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  inlineValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },

  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    color: Colors.textLabel,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Child row
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  ringWrap: {
    width: 48, height: 48,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  ringInitials: {
    position: 'absolute',
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  ringInitialsText: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
  },
  childInfo: {
    flex: 1,
    gap: 4,
  },
  childTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  childName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
  },
  statePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statePillText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  childBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  childTime: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  childLimit: {
    fontSize: 12,
    color: Colors.textLabel,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  callBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  // Explore
  exploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  exploreIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
  },
  exploreTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  exploreSub: {
    fontSize: 11,
    color: Colors.textLabel,
  },
});
