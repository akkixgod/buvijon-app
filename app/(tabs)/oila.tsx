import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AddChildModal } from '@/components/child/AddChildModal';
import ChatListItem from '@/components/messages/ChatListItem';
import RequestNotification from '@/components/messages/RequestNotification';
import { ParentPinModal } from '@/components/parent-pin/ParentPinModal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Colors, FlowerColors } from '@/constants/colors';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatDurationT, useTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';
import { useMessagesStore } from '@/store/messagesStore';
import { useParentPinStore } from '@/store/parentPinStore';
import { Child } from '@/types';
import { getMissingBlockingPermissions } from '@/utils/blockingPermissions';
import { fs, ms } from '@/utils/responsive';
import { getFlowerState, getUsagePercent } from '@/utils/screenTime';

type PinIntent = { type: 'open'; childId: string } | { type: 'add' } | null;
type FamilyTreeInfo = {
  id: string;
  name: string;
  handle: string | null;
  memberCount: number;
};
const FAMILY_TREE_CACHE_KEY_PREFIX = '@buvijon_family_tree:';

export default function OilaScreen() {
  const t = useTranslation();
  const parent = useAuthStore(s => s.parent);
  const children = useChildrenStore(s => s.children);
  const loadChildren = useChildrenStore(s => s.loadChildren);
  const { isUnlocked, lock, autoLockMs } = useParentPinStore();
  const chatRooms = useMessagesStore(s => s.chatRooms);
  const loadChatRooms = useMessagesStore(s => s.loadChatRooms);
  const hydrateChatCache = useMessagesStore(s => s.hydrateChatCache);
  const clearChatRooms = useMessagesStore(s => s.clearChatRooms);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinIntent, setPinIntent] = useState<PinIntent>(null);
  const [familyTreeId, setFamilyTreeId] = useState<string | null>(null);
  const [familyTree, setFamilyTree] = useState<FamilyTreeInfo | null>(null);
  const [isFamilyLoading, setIsFamilyLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const permissionPromptShownRef = useRef(false);
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoLock = useCallback(() => {
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    autoLockTimerRef.current = setTimeout(() => lock(), autoLockMs);
  }, [autoLockMs, lock]);

  useEffect(() => {
    if (isUnlocked && AppState.currentState === 'active') scheduleAutoLock();
    if (!isUnlocked && autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
      autoLockTimerRef.current = null;
    }
  }, [isUnlocked, scheduleAutoLock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && isUnlocked) scheduleAutoLock();
      if (state !== 'active' && autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
    });
    return () => {
      sub.remove();
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    };
  }, [isUnlocked, scheduleAutoLock]);

  const loadFamilyTree = useCallback(async () => {
    if (!parent?.id) {
      setFamilyTreeId(null);
      setFamilyTree(null);
      clearChatRooms();
      return;
    }

    setIsFamilyLoading(true);
    try {
      const cacheKey = `${FAMILY_TREE_CACHE_KEY_PREFIX}${parent.id}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as FamilyTreeInfo & { familyTreeId?: string | null };
        if (parsed) {
          setFamilyTree(parsed?.id ? parsed : null);
          setFamilyTreeId(parsed?.id ?? parsed?.familyTreeId ?? null);
        }
      }

      const { data: membership } = await supabase
        .from('family_members')
        .select('family_tree_id')
        .eq('parent_id', parent.id)
        .limit(1)
        .maybeSingle();

      const treeId = membership?.family_tree_id ?? null;
      setFamilyTreeId(treeId);

      if (!treeId) {
        setFamilyTree(null);
        clearChatRooms();
        return;
      }

      const [{ data: tree }, { count }] = await Promise.all([
        supabase
          .from('family_trees')
          .select('id, name, handle')
          .eq('id', treeId)
          .maybeSingle(),
        supabase
          .from('family_members')
          .select('id', { count: 'exact', head: true })
          .eq('family_tree_id', treeId),
      ]);

      setFamilyTree({
        id: treeId,
        name: tree?.name ?? 'Family tree',
        handle: tree?.handle ?? null,
        memberCount: count ?? 0,
      });
      AsyncStorage.setItem(cacheKey, JSON.stringify({
        id: treeId,
        name: tree?.name ?? 'Family tree',
        handle: tree?.handle ?? null,
        memberCount: count ?? 0,
      })).catch(() => {});

      await hydrateChatCache(treeId).catch(() => {});
      await loadChatRooms(treeId).catch(() => {});
    } catch {
      setFamilyTreeId(null);
      setFamilyTree(null);
      clearChatRooms();
      AsyncStorage.removeItem(`${FAMILY_TREE_CACHE_KEY_PREFIX}${parent.id}`).catch(() => {});
    } finally {
      setIsFamilyLoading(false);
    }
  }, [clearChatRooms, hydrateChatCache, loadChatRooms, parent?.id]);

  useEffect(() => {
    loadFamilyTree();
  }, [loadFamilyTree]);

  useEffect(() => {
    if (Platform.OS !== 'android' || permissionPromptShownRef.current) return;
    const hasBlockedApps = children.some(child => (child.blockedApps?.length ?? 0) > 0);
    if (!hasBlockedApps) return;

    const missing = getMissingBlockingPermissions();
    if (missing.length === 0) return;

    permissionPromptShownRef.current = true;
    Alert.alert(
      t.blockedApps.overlayTitle,
      t.blockedApps.overlayMsg,
      [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.blockedApps.overlayGrant, onPress: () => router.push('/onboarding') },
      ],
    );
  }, [children, t]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadChildren().catch(() => {}),
      loadFamilyTree().catch(() => {}),
    ]);
    setIsRefreshing(false);
  }, [loadChildren, loadFamilyTree]);

  const handleAddChild = useCallback(() => {
    if (!isUnlocked) {
      setPinIntent({ type: 'add' });
      setShowPinModal(true);
      return;
    }
    setShowAddModal(true);
  }, [isUnlocked]);

  const handleChildPress = useCallback((child: Child) => {
    if (!isUnlocked) {
      setPinIntent({ type: 'open', childId: child.id });
      setShowPinModal(true);
      return;
    }
    router.push(`/child/${child.id}` as any);
  }, [isUnlocked]);

  const handlePinSuccess = useCallback(() => {
    setShowPinModal(false);
    if (pinIntent?.type === 'open') {
      router.push(`/child/${pinIntent.childId}` as any);
    } else if (pinIntent?.type === 'add') {
      setShowAddModal(true);
    }
    setPinIntent(null);
  }, [pinIntent]);

  const bloomingCount = useMemo(
    () => children.filter(c => getFlowerState(c.screenTimeToday ?? 0, c.dailyLimitMinutes ?? 60) === 'blooming').length,
    [children],
  );

  const sortedRooms = useMemo(() => {
    return [...chatRooms].sort((a, b) => {
      if (a.roomType === 'system' && b.roomType !== 'system') return -1;
      if (b.roomType === 'system' && a.roomType !== 'system') return 1;
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [chatRooms]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[Colors.backgroundDeep, Colors.background]} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{t.tabs.children}</Text>
          <Text style={styles.subtitle}>
            {children.length} {children.length === 1 ? 'child' : 'children'} · {bloomingCount} blooming
          </Text>
        </View>

        <View style={styles.headerRight}>
          {familyTreeId ? <RequestNotification familyTreeId={familyTreeId} /> : null}
          <TouchableOpacity onPress={handleAddChild} style={styles.addButton} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color={Colors.textOnDark} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        )}
      >
        <View style={styles.section}>
          <SectionHeader title={t.children.title} icon="people-outline" />
          {children.length === 0 ? (
            <TouchableOpacity style={styles.emptyCard} onPress={handleAddChild} activeOpacity={0.85}>
              <View style={styles.emptyIcon}>
                <Ionicons name="leaf-outline" size={26} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{t.children.empty}</Text>
              <Text style={styles.emptyHint}>{t.addChild.subtitle}</Text>
            </TouchableOpacity>
          ) : (
            children.map(child => (
              <ChildCard key={child.id} child={child} t={t} onPress={() => handleChildPress(child)} />
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Family Tree" icon="git-network-outline" />

          {isFamilyLoading ? (
            <View style={styles.familyCard}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.familyMuted}>{t.common.loading}</Text>
            </View>
          ) : familyTree ? (
            <View style={styles.familyCard}>
              <View style={styles.familyIcon}>
                <Ionicons name="people" size={22} color={Colors.primary} />
              </View>
              <View style={styles.familyBody}>
                <View style={styles.familyTitleRow}>
                  <Text style={styles.familyTitle} numberOfLines={1}>{familyTree.name}</Text>
                  {familyTree.handle ? (
                    <Text style={styles.familyHandle} numberOfLines={1}>@{familyTree.handle}</Text>
                  ) : null}
                </View>
                <Text style={styles.familyMuted}>
                  {familyTree.memberCount} members · {sortedRooms.length} chats
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/messages')} style={styles.familyGoBtn} activeOpacity={0.8}>
                <Ionicons name="open-outline" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.familyCard}>
              <View style={styles.familyIconMuted}>
                <Ionicons name="people-outline" size={22} color={Colors.textMuted} />
              </View>
              <View style={styles.familyBody}>
                <Text style={styles.familyTitle}>No family yet</Text>
                <Text style={styles.familyMuted}>Add a child to start your family space.</Text>
              </View>
            </View>
          )}
        </View>

        {sortedRooms.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Chats" icon="chatbubbles-outline" />
            {sortedRooms.map(room => (
              <ChatListItem
                key={room.id}
                chatRoom={room}
                isActive={false}
                onPress={() => router.push(`/chat/${room.id}` as any)}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <AddChildModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
      <ParentPinModal
        visible={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setPinIntent(null);
        }}
        onSuccess={handlePinSuccess}
      />
    </SafeAreaView>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={Colors.textLabel} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function ChildCard({
  child,
  t,
  onPress,
}: {
  child: Child;
  t: ReturnType<typeof useTranslation>;
  onPress: () => void;
}) {
  const state = getFlowerState(child.screenTimeToday ?? 0, child.dailyLimitMinutes ?? 60);
  const percent = getUsagePercent(child.screenTimeToday ?? 0, child.dailyLimitMinutes ?? 60);
  const stateColor = FlowerColors[state] ?? FlowerColors.blooming;

  const initials = (child.name ?? '?')
    .split(' ')
    .map(chunk => chunk[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <TouchableOpacity style={styles.childCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.avatar, { backgroundColor: `${child.flowerColor}22`, borderColor: child.flowerColor }]}>
        <Text style={[styles.avatarText, { color: child.flowerColor }]}>{initials}</Text>
        <View style={[styles.stateDot, { backgroundColor: stateColor.primary }]} />
      </View>

      <View style={styles.childCardBody}>
        <View style={styles.childTitleRow}>
          <Text style={styles.childName}>{child.name}</Text>
          <View style={[styles.stateBadge, { backgroundColor: stateColor.light }]}>
            <Text style={[styles.stateBadgeText, { color: stateColor.primary }]}>{t.flowerStates[state]}</Text>
          </View>
        </View>

        <Text style={styles.childMeta}>{t.children.ageLabel(child.age)}</Text>

        <View style={styles.progressWrap}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: ms(18),
    paddingTop: ms(6),
    paddingBottom: ms(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: fs(24),
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: fs(12),
    color: Colors.textMuted,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  body: {
    flex: 1,
  },
  section: {
    paddingHorizontal: ms(16),
    paddingTop: ms(16),
    gap: ms(10),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textLabel,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: ms(28),
    paddingHorizontal: ms(20),
    borderRadius: Radius.xl,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryPale,
  },
  emptyTitle: {
    fontSize: fs(16),
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: fs(12),
    color: Colors.textMuted,
    textAlign: 'center',
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: ms(14),
    paddingVertical: ms(12),
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  avatar: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(16),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: fs(16),
    fontWeight: FontWeight.semibold,
  },
  stateDot: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  childCardBody: {
    flex: 1,
    gap: 3,
  },
  childTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  childName: {
    fontSize: fs(16),
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  stateBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stateBadgeText: {
    fontSize: fs(10),
    fontWeight: FontWeight.medium,
  },
  childMeta: {
    fontSize: fs(12),
    color: Colors.textMuted,
  },
  progressWrap: {
    marginTop: 2,
    gap: 5,
  },
  timeText: {
    fontSize: fs(11),
    color: Colors.textMuted,
  },
  timeDivider: {
    color: Colors.textLabel,
  },
  familyCard: {
    minHeight: ms(74),
    paddingHorizontal: ms(14),
    paddingVertical: ms(12),
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadow.sm,
  },
  familyIcon: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(14),
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyIconMuted: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(14),
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  familyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  familyTitle: {
    flexShrink: 1,
    fontSize: fs(16),
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  familyHandle: {
    flexShrink: 1,
    fontSize: fs(12),
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  familyMuted: {
    fontSize: fs(12),
    color: Colors.textMuted,
  },
  familyGoBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  bottomSpace: {
    height: Spacing.xl,
  },
});
