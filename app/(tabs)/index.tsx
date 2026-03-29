import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AnimatedFlower } from '@/components/flower/AnimatedFlower';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AddChildModal } from '@/components/child/AddChildModal';
import { OnboardingOverlay, type OnboardingStep, type Highlight } from '@/components/onboarding/OnboardingOverlay';
import { StoryViewModal } from '@/components/stories/StoryViewModal';
import { useChildrenStore } from '@/store/childrenStore';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useStoriesStore } from '@/store/storiesStore';
import { Colors, FlowerColors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getFlowerState, getUsagePercent } from '@/utils/screenTime';
import { useTranslation, formatDurationT } from '@/i18n';
import { Child, Story } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GardenScreen() {
  const router = useRouter();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const parent = useAuthStore(s => s.parent);
  const children = useChildrenStore(s => s.children);
  const loadChildren = useChildrenStore(s => s.loadChildren);
  const { hasSeenOnboarding, loaded: onboardingLoaded, complete: completeOnboarding } = useOnboardingStore();
  const { stories, isUploading, fetchStories, pickAndUpload, markViewed } = useStoriesStore();
  const [showAdd, setShowAdd] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);

  useEffect(() => { fetchStories(); }, []);

  // Group stories: own first, then others (unseen first)
  const ownStory = stories.find(s => s.isOwn) ?? null;
  const othersMap = new Map<string, Story>();
  for (const s of stories) {
    if (!s.isOwn && !othersMap.has(s.authorId)) othersMap.set(s.authorId, s);
  }
  const otherStories = [...othersMap.values()].sort((a, b) => (a.isViewed ? 1 : 0) - (b.isViewed ? 1 : 0));

  // Ref to measure the + button position
  const addBtnRef = useRef<View>(null);

  // Build onboarding steps — async because measureInWindow is async
  const buildSteps = useCallback((): Promise<OnboardingStep[]> => {
    return new Promise(resolve => {
      const { width: SW, height: SH } = Dimensions.get('window');
      const TAB_BAR_HEIGHT = 70;
      const tabBarTop = SH - insets.bottom - TAB_BAR_HEIGHT;
      const tabW = SW / 5;

      const makeSteps = (addBtnH: Highlight | null): OnboardingStep[] => [
        { title: t.onboarding.steps[0].title, body: t.onboarding.steps[0].body, highlight: null },
        { title: t.onboarding.steps[1].title, body: t.onboarding.steps[1].body, highlight: addBtnH, arrowSide: 'top' },
        { title: t.onboarding.steps[2].title, body: t.onboarding.steps[2].body, highlight: null },
        {
          title: t.onboarding.steps[3].title,
          body: t.onboarding.steps[3].body,
          highlight: { x: tabW, y: tabBarTop, w: tabW * 4, h: TAB_BAR_HEIGHT, radius: 12 },
          arrowSide: 'bottom',
        },
        { title: t.onboarding.steps[4].title, body: t.onboarding.steps[4].body, highlight: null },
      ];

      if (addBtnRef.current) {
        addBtnRef.current.measureInWindow((x, y, w, h) => {
          resolve(makeSteps({ x, y, w, h, radius: w / 2 }));
        });
      } else {
        resolve(makeSteps(null));
      }
    });
  }, [t, insets]);

  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Trigger onboarding once layout is ready
  const onHeaderLayout = useCallback(() => {
    if (onboardingLoaded && !hasSeenOnboarding && !showOnboarding) {
      setTimeout(async () => {
        const steps = await buildSteps();
        setOnboardingSteps(steps);
        setShowOnboarding(true);
      }, 400);
    }
  }, [onboardingLoaded, hasSeenOnboarding, showOnboarding, buildSteps]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChildren();
    setRefreshing(false);
  };

  const filteredChildren = children.filter(c =>
    c.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Шапка */}
        <View style={styles.header} onLayout={onHeaderLayout}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/(tabs)/settings')}>
              <Ionicons name="menu" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.titleBlock}>
              <Text style={styles.appName}>Buvijon</Text>
              <Text style={styles.subtitle}>{t.garden.subtitle}</Text>
            </View>

            <TouchableOpacity
              ref={addBtnRef}
              style={styles.addBtn}
              onPress={() => setShowAdd(true)}
            >
              <Ionicons name="add" size={22} color={Colors.textOnDark} />
            </TouchableOpacity>
          </View>

          {/* Поиск */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t.garden.searchPlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Сторис */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.storiesRow}
            contentContainerStyle={styles.storiesContent}
          >
            {/* Own story / add button */}
            <TouchableOpacity
              style={styles.storyItem}
              onPress={async () => {
                if (ownStory) {
                  setViewingStory(ownStory);
                } else {
                  const result = await pickAndUpload();
                  if (result.error === 'permission') {
                    Alert.alert('', t.stories.permissionDenied);
                  } else if (result.error) {
                    Alert.alert('', t.stories.uploadError);
                  }
                }
              }}
              disabled={isUploading}
            >
              {isUploading ? (
                <View style={[styles.storyRing, styles.storyRingOwn, { alignItems: 'center', justifyContent: 'center' }]}>
                  <ActivityIndicator color={Colors.primary} size="small" />
                </View>
              ) : (
                <View style={[styles.storyRing, ownStory ? styles.storyRingOwn : styles.storyRingAdd]}>
                  <View style={[styles.storyAvatar, !ownStory && styles.storyAvatarAdd]}>
                    {ownStory ? (
                      <Text style={styles.storyInitials}>
                        {parent?.name?.[0]?.toUpperCase() || '?'}
                      </Text>
                    ) : (
                      <Ionicons name="add" size={20} color={Colors.primary} />
                    )}
                  </View>
                </View>
              )}
              <Text style={styles.storyName}>{t.garden.you}</Text>
            </TouchableOpacity>

            {/* Other users' stories */}
            {otherStories.map(story => (
              <TouchableOpacity
                key={story.id}
                style={styles.storyItem}
                onPress={() => {
                  setViewingStory(story);
                  if (!story.isViewed) markViewed(story.id);
                }}
              >
                <View style={[styles.storyRing, story.isViewed ? styles.storyRingSeen : styles.storyRingUnseen]}>
                  <View style={styles.storyAvatar}>
                    <Text style={styles.storyInitials}>
                      {story.authorName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.storyName} numberOfLines={1}>{story.authorName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Цветки */}
        <View style={styles.gardenSection}>
          {filteredChildren.length === 0 && !searchText ? (
            <EmptyGarden onAdd={() => setShowAdd(true)} t={t} />
          ) : filteredChildren.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>{t.garden.noResults}</Text>
            </View>
          ) : (
            filteredChildren.map(child => (
              <FlowerRow key={child.id} child={child} t={t} />
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <AddChildModal visible={showAdd} onClose={() => setShowAdd(false)} />

      {viewingStory && (
        <StoryViewModal
          story={viewingStory}
          onClose={() => setViewingStory(null)}
        />
      )}

      <OnboardingOverlay
        steps={onboardingSteps}
        visible={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          completeOnboarding();
        }}
      />
    </SafeAreaView>
  );
}

function FlowerRow({ child, t }: { child: Child; t: ReturnType<typeof useTranslation> }) {
  const router = useRouter();
  const state = getFlowerState(child.screenTimeToday, child.dailyLimitMinutes);
  const percent = getUsagePercent(child.screenTimeToday, child.dailyLimitMinutes);
  const stateColor = FlowerColors[state];

  return (
    <TouchableOpacity
      style={styles.flowerRow}
      onPress={() => router.push(`/child/${child.id}`)}
      activeOpacity={0.92}
    >
      <LinearGradient
        colors={[stateColor.light, Colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.flowerRowGradient}
      >
        <View style={styles.flowerLeft}>
          <AnimatedFlower
            variant={child.flowerVariant}
            color={child.flowerColor}
            usedMinutes={child.screenTimeToday}
            limitMinutes={child.dailyLimitMinutes}
            size={90}
          />
        </View>

        <View style={styles.flowerInfo}>
          <View style={styles.flowerNameRow}>
            <Text style={styles.flowerName}>{child.name}</Text>
            <View style={[styles.stateBadge, { backgroundColor: stateColor.light }]}>
              <View style={[styles.stateDot, { backgroundColor: stateColor.primary }]} />
              <Text style={[styles.stateBadgeText, { color: stateColor.primary }]}>
                {t.flowerStates[state]}
              </Text>
            </View>
          </View>

          <Text style={styles.flowerAge}>{t.garden.ageLabel(child.age)}</Text>

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.timeText}>
              {formatDurationT(child.screenTimeToday, t)}
              <Text style={styles.timeSeparator}> / </Text>
              {formatDurationT(child.dailyLimitMinutes, t)}
            </Text>
          </View>

          <View style={styles.progressWrap}>
            <ProgressBar progress={percent} state={state} height={7} />
            <Text style={[styles.percentText, { color: stateColor.primary }]}>{percent}%</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.chevron} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

function EmptyGarden({ onAdd, t }: { onAdd: () => void; t: ReturnType<typeof useTranslation> }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🌱</Text>
      <Text style={styles.emptyTitle}>{t.garden.emptyTitle}</Text>
      <Text style={styles.emptyText}>{t.garden.emptyBody}</Text>
      <TouchableOpacity onPress={onAdd} style={styles.emptyBtn}>
        <Ionicons name="add-circle-outline" size={18} color={Colors.textOnDark} />
        <Text style={styles.emptyBtnText}>{t.garden.addBtn}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.backgroundDeep,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 0.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  appName: {
    fontSize: FontSize.xxl, fontWeight: FontWeight.medium,
    color: Colors.primary, letterSpacing: -0.3, lineHeight: 26,
  },
  subtitle: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.regular },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: Radius.full, paddingHorizontal: Spacing.md,
    height: 42, borderWidth: 0.5, borderColor: Colors.border,
    gap: Spacing.xs, marginBottom: Spacing.md,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  storiesRow: { marginLeft: Spacing.lg },
  storiesContent: { paddingRight: Spacing.lg, gap: Spacing.md },
  storyItem: { alignItems: 'center', width: 62 },
  storyRing: {
    width: 58, height: 58, borderRadius: 29,
    padding: 2.5, alignItems: 'center', justifyContent: 'center',
  },
  storyRingOwn: { borderWidth: 2, borderColor: Colors.primary },
  storyRingUnseen: { borderWidth: 2, borderColor: Colors.primary },
  storyRingSeen: { borderWidth: 1.5, borderColor: Colors.border },
  storyRingAdd: { borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  storyAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryPale, alignItems: 'center', justifyContent: 'center',
  },
  storyAvatarAdd: { backgroundColor: Colors.surfaceSecondary },
  storyInitials: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.primary },
  storyName: {
    fontSize: 10, color: Colors.textMuted,
    marginTop: 4, textAlign: 'center', width: 60,
  },
  gardenSection: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  flowerRow: {
    borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 0.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  flowerRowGradient: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingLeft: Spacing.sm, paddingRight: Spacing.md,
  },
  flowerLeft: { width: 100, alignItems: 'center' },
  flowerInfo: { flex: 1, paddingLeft: Spacing.sm, gap: 5 },
  flowerNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  flowerName: { fontSize: FontSize.lg, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  stateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2,
  },
  stateDot: { width: 5, height: 5, borderRadius: 3 },
  stateBadgeText: { fontSize: 10, fontWeight: FontWeight.medium },
  flowerAge: { fontSize: FontSize.xs, color: Colors.textMuted },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.regular },
  timeSeparator: { color: Colors.textMuted },
  progressWrap: { gap: 3 },
  percentText: { fontSize: 10, fontWeight: FontWeight.medium, textAlign: 'right' },
  chevron: { marginLeft: Spacing.xs },
  emptyContainer: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.medium, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, marginTop: Spacing.lg,
  },
  emptyBtnText: { color: Colors.textOnDark, fontWeight: FontWeight.medium, fontSize: FontSize.md },
  noResults: { alignItems: 'center', paddingVertical: Spacing.xl },
  noResultsText: { color: Colors.textMuted, fontSize: FontSize.md },
});
