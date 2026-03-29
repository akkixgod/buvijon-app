import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedFlower } from '@/components/flower/AnimatedFlower';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { useChildrenStore } from '@/store/childrenStore';
import { Colors, FlowerColors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getFlowerState, getUsagePercent, getRemainingMinutes } from '@/utils/screenTime';
import { useTranslation, formatDurationT } from '@/i18n';

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslation();
  const getChildById = useChildrenStore(s => s.getChildById);
  const removeChild = useChildrenStore(s => s.removeChild);
  const addScreenTime = useChildrenStore(s => s.addScreenTime);
  const child = getChildById(id);

  if (!child) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>{t.childDetail.notFound}</Text>
        <Button title={t.childDetail.back} onPress={() => router.back()} variant="ghost" />
      </SafeAreaView>
    );
  }

  const state = getFlowerState(child.screenTimeToday, child.dailyLimitMinutes);
  const percent = getUsagePercent(child.screenTimeToday, child.dailyLimitMinutes);
  const remaining = getRemainingMinutes(child.screenTimeToday, child.dailyLimitMinutes);
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

  const handleAddTime = async () => {
    await addScreenTime(child.id, 15);
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
            usedMinutes={child.screenTimeToday}
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
                <Text style={styles.timeValue}>{formatDurationT(child.screenTimeToday, t)}</Text>
                <Text style={styles.timeLabel}>{t.childDetail.used}</Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeStat}>
                <Text style={[styles.timeValue, { color: stateColor.primary }]}>
                  {state === 'wilting'
                    ? `+${formatDurationT(child.screenTimeToday - child.dailyLimitMinutes, t)}`
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

        {/* Действия */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.childDetail.settingsSection}</Text>
          <View style={styles.actionsCard}>
            <ActionRow icon="time-outline" label={t.childDetail.changeLimit} onPress={() => {}} />
            <ActionRow icon="ban-outline" label={t.childDetail.blockApps} onPress={() => {}} />
            <ActionRow icon="location-outline" label={t.childDetail.geolocation} onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <Button title={t.childDetail.devAddTime} onPress={handleAddTime} variant="ghost" />
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
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
  childName: { fontSize: FontSize.xxxl, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  childAge: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.sm },
  stateBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  stateBadgeText: { color: Colors.textOnDark, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textLabel,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.label,
  },
  todayCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  timeStats: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  timeStat: { flex: 1, alignItems: 'center' },
  timeValue: { fontSize: FontSize.xl, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  timeLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  timeDivider: { width: 0.5, height: 40, backgroundColor: Colors.borderLight },
  progress: {},
  percentText: { textAlign: 'right', fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
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
});
