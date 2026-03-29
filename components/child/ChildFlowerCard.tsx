import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { AnimatedFlower } from '@/components/flower/AnimatedFlower';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Child } from '@/types';
import { Colors, FlowerColors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getFlowerState, getUsagePercent, getRemainingMinutes } from '@/utils/screenTime';
import { useTranslation, formatDurationT } from '@/i18n';

interface ChildFlowerCardProps {
  child: Child;
}

export function ChildFlowerCard({ child }: ChildFlowerCardProps) {
  const router = useRouter();
  const t = useTranslation();
  const state = getFlowerState(child.screenTimeToday, child.dailyLimitMinutes);
  const percent = getUsagePercent(child.screenTimeToday, child.dailyLimitMinutes);
  const remaining = getRemainingMinutes(child.screenTimeToday, child.dailyLimitMinutes);
  const stateColor = FlowerColors[state];

  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => router.push(`/child/${child.id}`);
  const handlePressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.inner}
      >
        <View style={[styles.badge, { backgroundColor: stateColor.light }]}>
          <View style={[styles.dot, { backgroundColor: stateColor.primary }]} />
          <Text style={[styles.badgeText, { color: stateColor.primary }]}>{t.flowerStates[state]}</Text>
        </View>

        <View style={styles.flowerContainer}>
          <AnimatedFlower
            variant={child.flowerVariant}
            color={child.flowerColor}
            usedMinutes={child.screenTimeToday}
            limitMinutes={child.dailyLimitMinutes}
            size={110}
          />
        </View>

        <Text style={styles.name}>{child.name}</Text>
        <Text style={styles.age}>{child.age} лет</Text>

        <View style={styles.progressSection}>
          <ProgressBar progress={percent} state={state} height={6} />
          <View style={styles.timeRow}>
            <Text style={styles.timeUsed}>{formatDurationT(child.screenTimeToday, t)}</Text>
            <Text style={styles.timeLimit}>/ {formatDurationT(child.dailyLimitMinutes, t)}</Text>
          </View>
        </View>

        <Text style={[styles.hint, { color: stateColor.primary }]}>
          {state === 'blooming' && `${t.childDetail.remaining} ${formatDurationT(remaining, t)}`}
          {state === 'warning' && `${t.childDetail.remaining} ${formatDurationT(remaining, t)}`}
          {state === 'wilting' && `+${formatDurationT(child.screenTimeToday - child.dailyLimitMinutes, t)}`}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    ...Shadow.md,
    minWidth: 150,
    flex: 1,
  },
  inner: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm,
    paddingVertical: 3, gap: 4, alignSelf: 'flex-end',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  flowerContainer: { marginVertical: Spacing.sm },
  name: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  age: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  progressSection: { width: '100%', gap: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  timeUsed: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  timeLimit: { fontSize: FontSize.xs, color: Colors.textMuted },
  hint: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginTop: Spacing.xs },
});
