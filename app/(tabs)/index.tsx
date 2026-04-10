import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
  RefreshControl, Dimensions, LayoutAnimation, Platform, UIManager, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AnimatedFlower } from '@/components/flower/AnimatedFlower';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BuvijonLogo } from '@/components/ui/BuvijonLogo';
import { AddChildModal } from '@/components/child/AddChildModal';
import { SidebarMenu } from '@/components/SidebarMenu';
// import { CommentsModal } from '@/components/posts/CommentsModal';
// import { PostActionMenu } from '@/components/posts/PostActionMenu';
import { OnboardingOverlay, type OnboardingStep, type Highlight } from '@/components/onboarding/OnboardingOverlay';
import { useChildrenStore } from '@/store/childrenStore';
// import { usePostsStore } from '@/store/postsStore';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Colors, FlowerColors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { getFlowerState, getUsagePercent } from '@/utils/screenTime';
import { useTranslation, formatDurationT } from '@/i18n';
import { Child } from '@/types';
// import { Post } from '@/types';
import { useScreenTime } from '@/hooks/useScreenTime';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SW, height: SH } = Dimensions.get('window');
const CHILD_CARD_W = 130;
// const INITIAL_POSTS_COUNT = 3;

// const POST_TYPE_CFG: Record<string, { icon: string; color: string; bg: string }> = {
//   progress:  { icon: 'trending-up',   color: Colors.blooming, bg: Colors.bloomingLight },
//   milestone: { icon: 'star',          color: '#F59E0B',       bg: '#FFFBEB' },
//   tip:       { icon: 'bulb',          color: Colors.primary,  bg: Colors.primaryPale },
//   note:      { icon: 'document-text', color: Colors.textSecondary, bg: Colors.surfaceSecondary },
// };

export default function GardenScreen() {
  const router = useRouter();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const parent = useAuthStore(s => s.parent);
  const children = useChildrenStore(s => s.children);
  const loadChildren = useChildrenStore(s => s.loadChildren);
  // const posts = usePostsStore(s => s.posts);
  // const loadPosts = usePostsStore(s => s.loadPosts);
  // const toggleLike = usePostsStore(s => s.toggleLike);
  // const deletePost = usePostsStore(s => s.deletePost);
  // const editPost = usePostsStore(s => s.editPost);
  // const archivePost = usePostsStore(s => s.archivePost);
  const { hasSeenOnboarding, loaded: onboardingLoaded, complete: completeOnboarding } = useOnboardingStore();

  const screenTime = useScreenTime();
  const realMinutes = screenTime.hasPermission ? screenTime.totalMinutes : 0;

  const [showAdd, setShowAdd] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // const [showAllPosts, setShowAllPosts] = useState(false);
  // const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  // const [menuPost, setMenuPost] = useState<Post | null>(null);

  // useEffect(() => { loadPosts(); }, []);

  const smoothLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(
      400,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ));
  };


  // ─── Onboarding ─────────────────────────────────────────────────────
  const addBtnRef = useRef<View>(null);
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const buildSteps = useCallback((): Promise<OnboardingStep[]> => {
    return new Promise(resolve => {
      const bottomPad = Math.max(insets.bottom, 8);
      const TAB_BAR_HEIGHT = 60 + bottomPad;
      const tabBarTop = SH - TAB_BAR_HEIGHT;
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
          const pad = 6;
          resolve(makeSteps({ x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2, radius: (w + pad * 2) / 2 }));
        });
      } else {
        resolve(makeSteps(null));
      }
    });
  }, [t, insets]);

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
    await Promise.all([loadChildren()/* , loadPosts() */]);
    setRefreshing(false);
  };

  // ─── Format time ────────────────────────────────────────────────────
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${mins}`;

    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return time;

    const day = d.getDate();
    const month = d.toLocaleDateString('ru', { month: 'short' }).replace('.', '');
    return `${day} ${month}, ${time}`;
  };

  // const visiblePosts = showAllPosts ? posts : posts.slice(0, INITIAL_POSTS_COUNT);
  // const hasMorePosts = !showAllPosts && posts.length > INITIAL_POSTS_COUNT;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header} onLayout={onHeaderLayout}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setShowSidebar(true)}>
          <Ionicons name="menu" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <BuvijonLogo size={30} />
            <Text style={styles.appName}>Buvijon</Text>
          </View>
          <Text style={styles.subtitle}>{t.garden.subtitle}</Text>
        </View>

        <TouchableOpacity ref={addBtnRef} style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="person-add" size={18} color={Colors.textOnDark} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Kids Section */}
        <View style={styles.kidsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kidsScroll}
          >
            {children.length === 0 ? (
              <TouchableOpacity style={styles.kidCardEmpty} onPress={() => setShowAdd(true)}>
                <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
                <Text style={styles.kidCardEmptyText}>{t.garden.addBtn}</Text>
              </TouchableOpacity>
            ) : (
              children.map((child, i) => (
                <KidCard key={child.id} child={child} t={t} realMinutes={realMinutes} index={i} />
              ))
            )}
          </ScrollView>
        </View>

        {/* Posts section - temporarily hidden */}
        {/* <View style={styles.postsSection}>
          <View style={styles.postsHeader}>
            <Text style={styles.postsLabel}>{t.posts.title}</Text>
          </View>

          {posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <PulseIcon>
                <View style={styles.emptyPostsIcon}>
                  <Ionicons name="create-outline" size={32} color={Colors.primary} />
                </View>
              </PulseIcon>
              <Text style={styles.emptyPostsTitle}>{t.posts.firstPostCta}</Text>
              <Text style={styles.emptyPostsText}>{t.create.tip}</Text>
              <TouchableOpacity
                style={styles.emptyPostsBtn}
                onPress={() => router.push('/(tabs)/create')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyPostsBtnText}>{t.posts.firstPostBtn}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {visiblePosts.map((post, idx) => (
                <PostCard
                  key={post.id}
                  post={post}
                  t={t}
                  index={idx}
                  formatTime={formatTime}
                  isOwn={post.authorId === parent?.id}
                  isLast={idx === visiblePosts.length - 1}
                  onLike={() => toggleLike(post.id)}
                  onComment={() => setCommentsPostId(post.id)}
                  onMenu={() => setMenuPost(post)}
                />
              ))}
              {hasMorePosts && (
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  onPress={() => { smoothLayout(); setShowAllPosts(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showMoreText}>{t.posts.showMore}</Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View> */}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modals */}
      <AddChildModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <SidebarMenu visible={showSidebar} onClose={() => setShowSidebar(false)} />
      {/* <CommentsModal
        visible={commentsPostId !== null}
        postId={commentsPostId || ''}
        onClose={() => setCommentsPostId(null)}
      />
      <PostActionMenu
        visible={menuPost !== null}
        post={menuPost}
        onClose={() => setMenuPost(null)}
        onEdit={(id, content) => editPost(id, content)}
        onDelete={(id) => deletePost(id)}
        onArchive={(id) => archivePost(id)}
      /> */}
      <OnboardingOverlay
        steps={onboardingSteps}
        visible={showOnboarding}
        onComplete={() => { setShowOnboarding(false); completeOnboarding(); }}
      />
    </SafeAreaView>
  );
}

// ─── Kid Card ──────────────────────────────────────────────────────────────
function KidCard({ child, t, realMinutes, index }: { child: Child; t: ReturnType<typeof useTranslation>; realMinutes: number; index: number }) {
  const router = useRouter();
  const state = getFlowerState(realMinutes, child.dailyLimitMinutes);
  const percent = getUsagePercent(realMinutes, child.dailyLimitMinutes);
  const stateColor = FlowerColors[state];

  const enterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(enterAnim, {
      toValue: 1,
      delay: index * 100,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: enterAnim,
      transform: [{ scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
    }}>
      <TouchableOpacity
        style={styles.kidCard}
        onPress={() => router.push(`/child/${child.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.kidCardFlower}>
          <AnimatedFlower
            variant={child.flowerVariant}
            color={child.flowerColor}
            usedMinutes={realMinutes}
            limitMinutes={child.dailyLimitMinutes}
            size={52}
          />
        </View>
        <Text style={styles.kidCardName} numberOfLines={1}>{child.name}</Text>
        <View style={styles.kidCardProgress}>
          <ProgressBar progress={percent} state={state} height={4} />
        </View>
        <Text style={[styles.kidCardTime, { color: stateColor.primary }]}>
          {formatDurationT(realMinutes, t)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Fade-in wrapper for staggered entrance ──────────────────────────────────
function FadeSlideIn({ index, children: content }: { index: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 350,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
    }}>
      {content}
    </Animated.View>
  );
}

// // ─── Animated like button ─────────────────────────────────────────────────────
// function AnimatedLikeButton({ isLiked, count, onPress }: {
//   isLiked: boolean; count: number; onPress: () => void;
// }) {
//   const scale = useRef(new Animated.Value(1)).current;
//   const prevLiked = useRef(isLiked);

//   useEffect(() => {
//     if (isLiked !== prevLiked.current) {
//       prevLiked.current = isLiked;
//       if (isLiked) {
//         Animated.sequence([
//           Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, tension: 200, friction: 5 }),
//           Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
//         ]).start();
//       }
//     }
//   }, [isLiked]);

//   return (
//     <TouchableOpacity
//       style={styles.threadActionBtn}
//       onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
//       activeOpacity={0.6}
//     >
//       <Animated.View style={{ transform: [{ scale }] }}>
//         <Ionicons
//           name={isLiked ? 'heart' : 'heart-outline'}
//           size={18}
//           color={isLiked ? Colors.wilting : Colors.textMuted}
//         />
//       </Animated.View>
//       {count > 0 && (
//         <Text style={[styles.threadActionCount, isLiked && { color: Colors.wilting }]}>
//           {count}
//         </Text>
//       )}
//     </TouchableOpacity>
//   );
// }

// // ─── Pulse animation for empty state icon ─────────────────────────────────────
// function PulseIcon({ children: content }: { children: React.ReactNode }) {
//   const pulse = useRef(new Animated.Value(1)).current;
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
//         Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
//       ])
//     ).start();
//   }, []);
//   return <Animated.View style={{ transform: [{ scale: pulse }] }}>{content}</Animated.View>;
// }

// // ─── Post Card (Threads-style) ─────────────────────────────────────────────
// function PostCard({ post, t, index, formatTime, isOwn, isLast, onLike, onComment, onMenu }: {
//   post: Post; t: ReturnType<typeof useTranslation>;
//   index: number;
//   formatTime: (d: string) => string;
//   isOwn: boolean;
//   isLast: boolean;
//   onLike: () => void;
//   onComment: () => void;
//   onMenu: () => void;
// }) {
//   const cfg = POST_TYPE_CFG[post.type] || POST_TYPE_CFG.note;
//   const initial = (isOwn ? t.posts.you : post.authorName).charAt(0).toUpperCase();

//   return (
//     <FadeSlideIn index={index}>
//       <View style={styles.threadPost}>
//         {/* Left column: avatar + thread line */}
//         <View style={styles.threadLeft}>
//           <View style={styles.threadAvatar}>
//             <Text style={styles.threadAvatarText}>{initial}</Text>
//           </View>
//           {!isLast && <View style={styles.threadLine} />}
//         </View>

//         {/* Right column: content */}
//         <View style={styles.threadRight}>
//           {/* Header row */}
//           <View style={styles.threadHeader}>
//             <View style={styles.threadAuthorRow}>
//               <Text style={styles.threadAuthorName}>
//                 {isOwn ? t.posts.you : post.authorName}
//               </Text>
//               <View style={[styles.threadTypeBadge, { backgroundColor: cfg.bg }]}>
//                 <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
//               </View>
//             </View>
//             <View style={styles.threadHeaderRight}>
//               <Text style={styles.threadTime}>{formatTime(post.createdAt)}</Text>
//               {isOwn && (
//                 <TouchableOpacity
//                   onPress={onMenu}
//                   hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//                   style={styles.threadMenuBtn}
//                 >
//                   <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textMuted} />
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>

//           {/* Child tag */}
//           {post.childName && (
//             <View style={styles.threadChildTag}>
//               <Ionicons name="leaf-outline" size={11} color={Colors.blooming} />
//               <Text style={styles.threadChildName}>{post.childName}</Text>
//             </View>
//           )}

//           {/* Content */}
//           <Text style={styles.threadContent}>
//             {post.content}
//           </Text>

//           {/* Image */}
//           {post.imageUrl && (
//             <Image source={{ uri: post.imageUrl }} style={styles.threadImage} resizeMode="cover" />
//           )}

//           {/* Engagement */}
//           <View style={styles.threadActions}>
//             <AnimatedLikeButton isLiked={!!post.isLiked} count={post.likesCount} onPress={onLike} />

//             <TouchableOpacity style={styles.threadActionBtn} onPress={onComment} activeOpacity={0.6}>
//               <Ionicons name="chatbubble-outline" size={16} color={Colors.textMuted} />
//               {post.commentsCount > 0 && (
//                 <Text style={styles.threadActionCount}>{post.commentsCount}</Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View>
//     </FadeSlideIn>
//   );
// }

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundDeep,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 0.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  appName: {
    fontSize: FontSize.xxl, fontWeight: FontWeight.bold,
    color: Colors.primary, letterSpacing: -0.3,
  },
  subtitle: { fontSize: FontSize.xs, color: Colors.textMuted },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  // Kids section
  kidsSection: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.xl,
    borderWidth: 0.5, borderColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  kidsScroll: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 12,
  },
  kidCard: {
    width: CHILD_CARD_W,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 0.5, borderColor: Colors.border,
    gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  kidCardFlower: { marginBottom: 4 },
  kidCardName: {
    fontSize: FontSize.sm, fontWeight: FontWeight.medium,
    color: Colors.textPrimary, textAlign: 'center',
  },
  kidCardProgress: { width: '100%' },
  kidCardTime: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  kidCardEmpty: {
    width: CHILD_CARD_W, height: 130,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primaryLight, borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  kidCardEmptyText: {
    fontSize: FontSize.xs, color: Colors.primary,
    fontWeight: FontWeight.medium, textAlign: 'center',
  },

  // Posts section
  // postsSection: {
  //   marginHorizontal: Spacing.md, marginTop: Spacing.lg,
  //   backgroundColor: Colors.surface,
  //   borderRadius: Radius.xl,
  //   borderWidth: 0.5, borderColor: Colors.border,
  //   paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
  // },
  // postsHeader: {
  //   flexDirection: 'row', alignItems: 'center',
  //   justifyContent: 'space-between',
  //   paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  //   borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  //   marginBottom: Spacing.sm,
  // },
  // postsLabel: {
  //   fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary,
  // },

  // Threads-style post
  // threadPost: {
  //   flexDirection: 'row',
  //   paddingVertical: Spacing.md,
  //   borderBottomWidth: 0.5,
  //   borderBottomColor: Colors.borderLight,
  // },
  // threadLeft: {
  //   width: 40, alignItems: 'center', marginRight: Spacing.sm,
  // },
  // threadAvatar: {
  //   width: 36, height: 36, borderRadius: 18,
  //   backgroundColor: Colors.primaryPale,
  //   alignItems: 'center', justifyContent: 'center',
  // },
  // threadAvatarText: {
  //   fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary,
  // },
  // threadLine: {
  //   width: 2, flex: 1,
  //   backgroundColor: Colors.borderLight,
  //   marginTop: 6, borderRadius: 1,
  // },
  // threadRight: { flex: 1 },
  // threadHeader: {
  //   flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  // },
  // threadAuthorRow: {
  //   flexDirection: 'row', alignItems: 'center', gap: 5,
  // },
  // threadAuthorName: {
  //   fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary,
  // },
  // threadTypeBadge: {
  //   width: 18, height: 18, borderRadius: 9,
  //   alignItems: 'center', justifyContent: 'center',
  // },
  // threadHeaderRight: {
  //   flexDirection: 'row', alignItems: 'center', gap: 6,
  // },
  // threadTime: {
  //   fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium,
  // },
  // threadMenuBtn: { padding: 2 },
  // threadChildTag: {
  //   flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2,
  // },
  // threadChildName: {
  //   fontSize: FontSize.xs, color: Colors.blooming, fontWeight: FontWeight.medium,
  // },
  // threadContent: {
  //   fontSize: FontSize.md, color: Colors.textPrimary,
  //   lineHeight: 22, marginTop: 6,
  // },
  // threadImage: {
  //   width: '100%', height: 200,
  //   borderRadius: Radius.md, marginTop: Spacing.sm,
  //   backgroundColor: Colors.surfaceSecondary,
  // },
  // threadActions: {
  //   flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
  //   marginTop: Spacing.sm, paddingTop: 4,
  // },
  // threadActionBtn: {
  //   flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4,
  // },
  // threadActionCount: {
  //   fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium,
  // },

  // Show more button
  // showMoreBtn: {
  //   flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  //   gap: 4, paddingVertical: Spacing.md,
  // },
  // showMoreText: {
  //   fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium,
  // },

  // Empty posts
  // emptyPosts: {
  //   alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md,
  // },
  // emptyPostsIcon: {
  //   width: 64, height: 64, borderRadius: 32,
  //   backgroundColor: Colors.primaryPale,
  //   alignItems: 'center', justifyContent: 'center',
  //   marginBottom: Spacing.xs,
  // },
  // emptyPostsTitle: {
  //   fontSize: FontSize.lg, fontWeight: FontWeight.semibold,
  //   color: Colors.textPrimary, textAlign: 'center',
  //   paddingHorizontal: Spacing.lg,
  // },
  // emptyPostsText: {
  //   fontSize: FontSize.sm, color: Colors.textMuted,
  //   textAlign: 'center', paddingHorizontal: Spacing.xl, lineHeight: 20,
  // },
  // emptyPostsBtn: {
  //   flexDirection: 'row', alignItems: 'center', gap: 6,
  //   backgroundColor: Colors.accent,
  //   paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  //   borderRadius: Radius.lg, marginTop: Spacing.sm,
  // },
  // emptyPostsBtnText: {
  //   color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.semibold,
  // },
});
