import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AnimatedFlower } from '@/components/flower/AnimatedFlower';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AddChildModal } from '@/components/child/AddChildModal';
import { ParentPinModal } from '@/components/parent-pin/ParentPinModal';
import { useChildrenStore } from '@/store/childrenStore';
import { useParentPinStore } from '@/store/parentPinStore';
import { Colors, FlowerColors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { getFlowerState, getUsagePercent } from '@/utils/screenTime';
import { useTranslation, formatDurationT } from '@/i18n';
import { Child } from '@/types';
import { AppState } from 'react-native';

export default function ChildrenScreen() {
  const router = useRouter();
  const t = useTranslation();
  const children = useChildrenStore(s => s.children);
  const [showAdd, setShowAdd] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const { isUnlocked, lock } = useParentPinStore();

  // Auto-lock after 5 minutes of inactivity
  useEffect(() => {
    let lockTimer: NodeJS.Timeout | null = null;

    const resetTimer = () => {
      if (lockTimer) clearTimeout(lockTimer);
      lockTimer = setTimeout(() => {
        lock();
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Reset timer on user interaction
    const handleInteraction = () => {
      if (isUnlocked) {
        resetTimer();
      }
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isUnlocked) {
        resetTimer();
      }
    });

    return () => {
      subscription.remove();
      if (lockTimer) clearTimeout(lockTimer);
    };
  }, [isUnlocked, lock]);

  const handleChildPress = (child: Child) => {
    if (!isUnlocked) {
      setShowPinModal(true);
    } else {
      router.push(`/child/${child.id}`);
    }
  };

  const onPinSuccess = () => {
    setShowPinModal(false);
  };

  const renderChild = ({ item, index }: { item: Child; index: number }) => (
    <ChildRow item={item} index={index} t={t} onPress={() => handleChildPress(item)} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.children.title}</Text>
        <TouchableOpacity
          onPress={() => isUnlocked ? setShowAdd(true) : setShowPinModal(true)}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color={Colors.textOnDark} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={children}
        keyExtractor={item => item.id}
        renderItem={renderChild}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t.children.empty}</Text>
          </View>
        )}
      />

      <AddChildModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <ParentPinModal visible={showPinModal} onClose={() => setShowPinModal(false)} onSuccess={onPinSuccess} />
    </SafeAreaView>
  );
}

function ChildRow({ item, index, t, onPress }: {
  item: Child; index: number; t: ReturnType<typeof useTranslation>; onPress: () => void;
}) {
  const state = getFlowerState(item.screenTimeToday, item.dailyLimitMinutes);
  const percent = getUsagePercent(item.screenTimeToday, item.dailyLimitMinutes);
  const stateColor = FlowerColors[state];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateX: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
    }}>
      <TouchableOpacity
        style={styles.childRow}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <AnimatedFlower
          variant={item.flowerVariant}
          color={item.flowerColor}
          usedMinutes={item.screenTimeToday}
          limitMinutes={item.dailyLimitMinutes}
          size={64}
        />
        <View style={styles.childInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.childName}>{item.name}</Text>
            <View style={[styles.stateBadge, { backgroundColor: stateColor.light }]}>
              <Text style={[styles.stateBadgeText, { color: stateColor.primary }]}>
                {t.flowerStates[state]}
              </Text>
            </View>
          </View>
          <Text style={styles.childAge}>{t.children.ageLabel(item.age)}</Text>
          <View style={styles.progressRow}>
            <ProgressBar progress={percent} state={state} height={5} style={styles.progressBar} />
            <Text style={styles.progressText}>
              {formatDurationT(item.screenTimeToday, t)} / {formatDurationT(item.dailyLimitMinutes, t)}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.backgroundDeep,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: Spacing.md, gap: Spacing.sm },
  childRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 0.5, borderColor: Colors.border,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  separator: { height: 0 },
  childInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  childName: { fontSize: FontSize.lg, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  childAge: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xs },
  stateBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  stateBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  progressRow: { gap: 4 },
  progressBar: { flex: 1 },
  progressText: { fontSize: FontSize.xs, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.lg, color: Colors.textMuted },
});
