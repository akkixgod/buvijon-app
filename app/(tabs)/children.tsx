import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Animated, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AnimatedFlower } from '@/components/flower/AnimatedFlower';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AddChildModal } from '@/components/child/AddChildModal';
import { ParentPinModal } from '@/components/parent-pin/ParentPinModal';
import { useChildrenStore } from '@/store/childrenStore';
import { useParentPinStore } from '@/store/parentPinStore';
import { Colors, FlowerColors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getFlowerState, getUsagePercent } from '@/utils/screenTime';
import { useTranslation, formatDurationT } from '@/i18n';
import { Child } from '@/types';
import { ms, fs } from '@/utils/responsive';

export default function ChildrenScreen() {
  const router = useRouter();
  const t = useTranslation();
  const children = useChildrenStore(s => s.children);
  const [showAdd, setShowAdd] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const { isUnlocked, lock } = useParentPinStore();

  useEffect(() => {
    let lockTimer: NodeJS.Timeout | null = null;
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isUnlocked) {
        if (lockTimer) clearTimeout(lockTimer);
        lockTimer = setTimeout(() => lock(), 5 * 60 * 1000);
      }
    });
    return () => {
      subscription.remove();
      if (lockTimer) clearTimeout(lockTimer);
    };
  }, [isUnlocked, lock]);

  const handleChildPress = (child: Child) => {
    if (!isUnlocked) setShowPinModal(true);
    else router.push(`/child/${child.id}`);
  };

  const handleAdd = () => {
    if (!isUnlocked) setShowPinModal(true);
    else setShowAdd(true);
  };

  const onPinSuccess = () => setShowPinModal(false);

  const bloomingCount = children.filter(c =>
    getFlowerState(c.screenTimeToday, c.dailyLimitMinutes) === 'blooming'
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#FFFFFF', '#F5F0FF']}
        style={styles.header}
      >
        <View>
          <Text style={styles.title}>{t.children.title}</Text>
          {children.length > 0 && (
            <Text style={styles.subtitle}>
              {children.length} {t.children.count ?? 'nafar'} · {bloomingCount} 🌸
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={children}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <ChildCard
            item={item}
            index={index}
            t={t}
            onPress={() => handleChildPress(item)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          children.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState t={t} onAdd={handleAdd} />}
      />

      <AddChildModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <ParentPinModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={onPinSuccess}
      />
    </SafeAreaView>
  );
}

// ─── Child Card ───────────────────────────────────────────────────────────────

function ChildCard({ item, index, t, onPress }: {
  item: Child;
  index: number;
  t: ReturnType<typeof useTranslation>;
  onPress: () => void;
}) {
  const state = getFlowerState(item.screenTimeToday, item.dailyLimitMinutes);
  const percent = getUsagePercent(item.screenTimeToday, item.dailyLimitMinutes);
  const stateColor = FlowerColors[state];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
    }}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        {/* Left accent */}
        <View style={[styles.cardAccent, { backgroundColor: stateColor.primary }]} />

        {/* Flower */}
        <AnimatedFlower
          variant={item.flowerVariant}
          color={item.flowerColor}
          usedMinutes={item.screenTimeToday}
          limitMinutes={item.dailyLimitMinutes}
          size={58}
        />

        {/* Info */}
        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={styles.childName}>{item.name}</Text>
            <View style={[styles.badge, { backgroundColor: stateColor.light }]}>
              <Text style={[styles.badgeText, { color: stateColor.primary }]}>
                {t.flowerStates[state]}
              </Text>
            </View>
          </View>

          <Text style={styles.ageText}>{t.children.ageLabel(item.age)}</Text>

          <View style={styles.progressSection}>
            <ProgressBar progress={percent} state={state} height={4} />
            <Text style={styles.timeText}>
              {formatDurationT(item.screenTimeToday, t)}
              <Text style={styles.timeDivider}> / </Text>
              {formatDurationT(item.dailyLimitMinutes, t)}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={Colors.textLabel} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ t, onAdd }: { t: ReturnType<typeof useTranslation>; onAdd: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>🌱</Text>
      </View>
      <Text style={styles.emptyTitle}>{t.children.empty}</Text>
      <Text style={styles.emptyHint}>{t.children.emptyHint ?? "Farzandingizni qo'shing va bog'ingizni o'stirishni boshlang"}</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.emptyBtnText}>{t.children.addBtn ?? "Farzand qo'shish"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: ms(20), paddingTop: ms(8), paddingBottom: ms(16),
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: fs(22), fontWeight: FontWeight.semibold, color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: fs(13), color: Colors.textMuted, marginTop: 2,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },

  list: { padding: ms(16), gap: ms(10) },
  listEmpty: { flex: 1 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardAccent: {
    width: 3, alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1, paddingVertical: ms(12), paddingRight: ms(4), paddingLeft: ms(12), gap: 3,
  },
  nameRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  childName: {
    fontSize: fs(16), fontWeight: FontWeight.semibold, color: Colors.textPrimary,
  },
  badge: {
    borderRadius: Radius.full, paddingHorizontal: ms(8), paddingVertical: 2,
  },
  badgeText: {
    fontSize: fs(11), fontWeight: FontWeight.medium,
  },
  ageText: {
    fontSize: fs(12), color: Colors.textMuted,
  },
  progressSection: { gap: 5, marginTop: 2 },
  timeText: {
    fontSize: fs(11), color: Colors.textMuted,
  },
  timeDivider: { color: Colors.textLabel },

  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: ms(40), gap: ms(12),
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: ms(4),
  },
  emptyIcon: { fontSize: 34 },
  emptyTitle: {
    fontSize: fs(17), fontWeight: FontWeight.semibold,
    color: Colors.textPrimary, textAlign: 'center',
  },
  emptyHint: {
    fontSize: fs(13), color: Colors.textMuted,
    textAlign: 'center', lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: ms(24), paddingVertical: ms(12),
    borderRadius: Radius.lg, marginTop: ms(8),
    ...Shadow.sm,
  },
  emptyBtnText: {
    fontSize: fs(15), fontWeight: FontWeight.medium, color: '#fff',
  },
});
