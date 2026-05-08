import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  AppState, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useChildrenStore } from '@/store/childrenStore';
import { useParentPinStore } from '@/store/parentPinStore';
import { useAuthStore } from '@/store/authStore';
import { useMessagesStore } from '@/store/messagesStore';
import { Colors, FlowerColors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getFlowerState, getUsagePercent } from '@/utils/screenTime';
import { useTranslation, formatDurationT } from '@/i18n';
import { Child } from '@/types';
import { ms, fs } from '@/utils/responsive';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { AddChildModal } from '@/components/child/AddChildModal';
import { ParentPinModal } from '@/components/parent-pin/ParentPinModal';
import RequestNotification from '@/components/messages/RequestNotification';
import ChatListItem from '@/components/messages/ChatListItem';
import { supabase } from '@/lib/supabase';

export default function OilaScreen() {
  const t = useTranslation();
  const parent = useAuthStore(s => s.parent);
  const children = useChildrenStore(s => s.children);
  const loadChildren = useChildrenStore(s => s.loadChildren);
  const { isUnlocked, lock } = useParentPinStore();
  const { chatRooms, loadChatRooms } = useMessagesStore();

  const [showAdd, setShowAdd] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinIntent, setPinIntent] = useState<{ type: 'open'; childId: string } | { type: 'add' } | null>(null);
  const [familyTreeId, setFamilyTreeId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Lock after 60s in background
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && isUnlocked) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => lock(), 60_000);
      }
    });
    return () => { sub.remove(); if (timer) clearTimeout(timer); };
  }, [isUnlocked, lock]);

  // Load family tree and chats
  useEffect(() => {
    if (!parent?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('family_members')
          .select('family_tree_id')
          .eq('parent_id', parent.id)
          .limit(1)
          .maybeSingle();
        if (data?.family_tree_id) {
          setFamilyTreeId(data.family_tree_id);
          await loadChatRooms(data.family_tree_id).catch(() => {});
        }
      } catch {}
    })();
  }, [parent?.id]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadChildren().catch(() => {});
    if (familyTreeId) await loadChatRooms(familyTreeId).catch(() => {});
    setIsRefreshing(false);
  }, [familyTreeId, loadChildren, loadChatRooms]);

  const handleChildPress = useCallback((child: Child) => {
    if (!isUnlocked) {
      setPinIntent({ type: 'open', childId: child.id });
      setShowPin(true);
    } else {
      router.push(`/child/${child.id}` as any);
    }
  }, [isUnlocked]);

  const handleAdd = useCallback(() => {
    if (!isUnlocked) {
      setPinIntent({ type: 'add' });
      setShowPin(true);
    } else {
      setShowAdd(true);
    }
  }, [isUnlocked]);

  const handlePinSuccess = useCallback(() => {
    setShowPin(false);
    if (pinIntent?.type === 'open') {
      router.push(`/child/${pinIntent.childId}` as any);
    } else if (pinIntent?.type === 'add') {
      setShowAdd(true);
    }
    setPinIntent(null);
  }, [pinIntent]);

  const bloomingCount = children.filter(c => {
    try { return getFlowerState(c.screenTimeToday ?? 0, c.dailyLimitMinutes ?? 60) === 'blooming'; }
    catch { return false; }
  }).length;

  // Sort: system/pinned first, then direct
  const sortedRooms = [...chatRooms].sort((a, b) => {
    if (a.roomType === 'system') return -1;
    if (b.roomType === 'system') return 1;
    return 0;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[Colors.backgroundDeep, Colors.background]} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{t.children.title}</Text>
          {children.length > 0 && (
            <Text style={styles.subtitle}>{children.length} nafar · {bloomingCount} 🌸</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {familyTreeId && <RequestNotification familyTreeId={familyTreeId} />}
          <TouchableOpacity onPress={handleAdd} style={styles.addBtn} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Children section */}
        <View style={styles.section}>
          {children.length === 0 ? (
            <TouchableOpacity style={styles.emptyCard} onPress={handleAdd} activeOpacity={0.85}>
              <View style={styles.emptyIcon}>
                <Text style={{ fontSize: 28 }}>🌱</Text>
              </View>
              <Text style={styles.emptyTitle}>{t.children.empty}</Text>
              <Text style={styles.emptyHint}>{t.children.emptyHint ?? "Farzandingizni qo'shing"}</Text>
            </TouchableOpacity>
          ) : (
            children.map((child, index) => (
              <ChildCard
                key={child.id}
                child={child}
                t={t}
                index={index}
                onPress={() => handleChildPress(child)}
              />
            ))
          )}
        </View>

        {/* Chats section */}
        {sortedRooms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CHATLAR</Text>
            {sortedRooms.map(room => (
              <ChatListItem
                key={room.id}
                chatRoom={room}
                isActive={false}
                onPress={() => router.push(`/chat/${room.id}` as any)}
              />
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <AddChildModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <ParentPinModal
        visible={showPin}
        onClose={() => { setShowPin(false); setPinIntent(null); }}
        onSuccess={handlePinSuccess}
      />
    </SafeAreaView>
  );
}

// ─── Child Card ───────────────────────────────────────────────────────────────

function ChildCard({ child, t, index, onPress }: {
  child: Child;
  t: ReturnType<typeof useTranslation>;
  index: number;
  onPress: () => void;
}) {
  const state = getFlowerState(child.screenTimeToday ?? 0, child.dailyLimitMinutes ?? 60);
  const percent = getUsagePercent(child.screenTimeToday ?? 0, child.dailyLimitMinutes ?? 60);
  const stateColor = FlowerColors[state] ?? FlowerColors['normal'];

  const initials = (child.name ?? '?')
    .split(' ')
    .map((w: string) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.avatar, {
        backgroundColor: child.flowerColor + '22',
        borderColor: child.flowerColor,
      }]}>
        <Text style={[styles.avatarText, { color: child.flowerColor }]}>{initials}</Text>
        <View style={[styles.stateDot, { backgroundColor: stateColor.primary }]} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Text style={styles.childName}>{child.name}</Text>
          <View style={[styles.badge, { backgroundColor: stateColor.light }]}>
            <Text style={[styles.badgeText, { color: stateColor.primary }]}>
              {t.flowerStates[state]}
            </Text>
          </View>
        </View>
        <Text style={styles.ageText}>{t.children.ageLabel(child.age)}</Text>
        <View style={styles.progressSection}>
          <ProgressBar progress={percent} state={state} height={4} />
          <Text style={styles.timeText}>
            {formatDurationT(child.screenTimeToday, t)}
            <Text style={styles.timeDivider}> / </Text>
            {formatDurationT(child.dailyLimitMinutes, t)}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={Colors.textLabel} />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ms(20),
    paddingTop: ms(8),
    paddingBottom: ms(16),
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: fs(22), fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  subtitle: { fontSize: fs(13), color: Colors.textMuted, marginTop: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },

  section: { padding: ms(16), gap: ms(10) },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    color: Colors.textLabel,
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    padding: ms(32),
    gap: ms(10),
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: fs(16), fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: 'center' },
  emptyHint: { fontSize: fs(13), color: Colors.textMuted, textAlign: 'center' },

  // Child card
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border,
    paddingHorizontal: ms(14), paddingVertical: ms(12),
    gap: ms(14),
    ...Shadow.sm,
  },
  avatar: {
    width: ms(50), height: ms(50),
    borderRadius: ms(16), borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: fs(16), fontWeight: FontWeight.semibold },
  stateDot: {
    position: 'absolute', bottom: -3, right: -3,
    width: 13, height: 13, borderRadius: 7,
    borderWidth: 2, borderColor: Colors.surface,
  },
  cardBody: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  childName: { fontSize: fs(16), fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  badge: { borderRadius: Radius.full, paddingHorizontal: ms(8), paddingVertical: 2 },
  badgeText: { fontSize: fs(11), fontWeight: FontWeight.medium },
  ageText: { fontSize: fs(12), color: Colors.textMuted },
  progressSection: { gap: 5, marginTop: 2 },
  timeText: { fontSize: fs(11), color: Colors.textMuted },
  timeDivider: { color: Colors.textLabel },
});
