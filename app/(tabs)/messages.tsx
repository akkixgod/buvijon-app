import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator,
  RefreshControl, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useMessagesStore, FamilyRanking } from '@/store/messagesStore';
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import FamilyRankingCard from '@/components/messages/FamilyRankingCard';
import ChatListItem from '@/components/messages/ChatListItem';
import RequestNotification from '@/components/messages/RequestNotification';
import CreateChatModal from '@/components/messages/CreateChatModal';

export default function MessagesScreen() {
  const t = useTranslation();
  const parent = useAuthStore(s => s.parent);
  const children = useChildrenStore(s => s.children);
  // Zustand Store

  const store = useMessagesStore();
  const {
    familyRanking,
    chatRooms,
    activeChatRoomId,
    isLoadingRanking,
    isLoadingMessages,
    rankingError,
    chatError,
    loadFamilyRanking,
    loadChatRooms,
    setActiveChatRoom,
    setPerspectiveChild,
    createDirectChat
  } = store;

  // Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [perspectiveMode, setPerspectiveMode] = useState<'all' | 'specific'>('all');
  const [selectedPerspectiveChild, setSelectedPerspectiveChild] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [familyTreeId, setFamilyTreeId] = useState<string | null>(null);

  // Refs
  const rankingListRef = useRef<FlatList>(null);

  // Constants
  const RANKING_CARD_WIDTH = 140;
  const RANKING_CARD_SPACING = 12;

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (parent?.id) {
      loadInitialData();
    }
  }, [parent?.id]);

  // Setup real-time subscriptions when familyTreeId is available
  useEffect(() => {
    if (familyTreeId) {
      // Setup subscriptions
      store.setupRankingSubscription(familyTreeId);
      store.setupChatSubscription(familyTreeId);
      store.setupRequestSubscription(familyTreeId);
    }
  }, [familyTreeId, store]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      useMessagesStore.getState().cleanup();
    };
  }, []);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadInitialData = useCallback(async () => {
    try {
      // Assuming you have a way to get the family tree ID
      // This would typically come from parent's profile or a separate store
      const treeId = await getFamilyTreeId(parent?.id || '');
      if (treeId) {
        setFamilyTreeId(treeId);
        await Promise.all([
          loadFamilyRanking(treeId, selectedPerspectiveChild || undefined),
          loadChatRooms(treeId)
        ]);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }, [parent?.id, selectedPerspectiveChild, loadFamilyRanking, loadChatRooms]);

  const getFamilyTreeId = async (parentId: string): Promise<string | null> => {
    // Implementation to get family tree ID for the current parent
    // This would typically be stored in parent profile or fetched from family_members
    try {
      const { data } = await supabase
        .from('family_members')
        .select('family_tree_id')
        .eq('parent_id', parentId)
        .limit(1)
        .single();

      return data?.family_tree_id || null;
    } catch (error) {
      console.error('Error getting family tree ID:', error);
      return null;
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadInitialData();
    setIsRefreshing(false);
  }, [loadInitialData]);

  // ============================================================================
  // PERSPECTIVE MANAGEMENT
  // ============================================================================

  const handlePerspectiveChange = useCallback((childId: string | null) => {
    setSelectedPerspectiveChild(childId);
    setPerspectiveChild(childId);
    setPerspectiveMode(childId ? 'specific' : 'all');

    // Reload ranking with new perspective
    if (parent?.id) {
      getFamilyTreeId(parent.id).then(familyTreeId => {
        if (familyTreeId) {
          loadFamilyRanking(familyTreeId, childId || undefined);
        }
      });
    }
  }, [parent?.id, setPerspectiveChild, loadFamilyRanking]);

  const getFilteredRanking = useCallback(() => {
    let ranking = familyRanking;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      ranking = ranking.filter(child =>
        child.childName.toLowerCase().includes(query)
      );
    }

    if (perspectiveMode === 'specific' && selectedPerspectiveChild) {
      // When in specific perspective, show all children but highlight the selected one
      return ranking;
    }

    return ranking;
  }, [familyRanking, searchQuery, perspectiveMode, selectedPerspectiveChild]);

  // ============================================================================
  // CHAT MANAGEMENT
  // ============================================================================

  const getFilteredChatRooms = useCallback(() => {
    let rooms = chatRooms;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      rooms = rooms.filter(room =>
        room.roomName.toLowerCase().includes(query) ||
        room.lastMessage?.content.toLowerCase().includes(query)
      );
    }

    return rooms;
  }, [chatRooms, searchQuery]);

  const handleChatRoomPress = useCallback((roomId: string) => {
    setActiveChatRoom(roomId);
    // Navigate to chat detail screen
    // router.push(`/chat/${roomId}`);
  }, [setActiveChatRoom]);

  const handleCreateDirectChat = async (otherParentId: string) => {
    try {
      const chatId = await createDirectChat(otherParentId);
      setShowCreateChat(false);
      handleChatRoomPress(chatId);
    } catch (error) {
      console.error('Error creating direct chat:', error);
      // Show error message
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderRankingCard = useCallback(({ item, index }: { item: FamilyRanking; index: number }) => (
    <FamilyRankingCard
      ranking={item}
      index={index}
      isPerspectiveChild={selectedPerspectiveChild === item.childId}
      onPress={() => handlePerspectiveChange(item.childId)}
    />
  ), [selectedPerspectiveChild, handlePerspectiveChange]);

  const renderChatRoomItem = useCallback(({ item }: { item: any }) => (
    <ChatListItem
      chatRoom={item}
      isActive={item.id === activeChatRoomId}
      onPress={() => handleChatRoomPress(item.id)}
    />
  ), [activeChatRoomId, handleChatRoomPress]);

  const renderChatSectionHeader = useCallback((title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  ), []);

  const getChatRoomSections = useCallback(() => {
    const rooms = getFilteredChatRooms();
    const systemRooms = rooms.filter(room => room.roomType === 'system' || room.roomType === 'group');
    const directRooms = rooms.filter(room => room.roomType === 'direct');

    const sections: any[] = [];

    if (systemRooms.length > 0) {
      sections.push({
        title: 'CHATS',
        data: systemRooms
      });
    }

    if (directRooms.length > 0) {
      sections.push({
        title: 'DIRECT',
        data: directRooms
      });
    }

    return sections;
  }, [getFilteredChatRooms]);

  const renderSectionHeader = useCallback(({ section: { title } }: { section: { title: string } }) => (
    renderChatSectionHeader(title)
  ), [renderChatSectionHeader]);

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryPale, Colors.background]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{t.messages.title}</Text>
            <Text style={styles.headerSubtitle}>
              {perspectiveMode === 'specific' && selectedPerspectiveChild
                ? `${t.messages.perspectiveView}: ${children.find(c => c.id === selectedPerspectiveChild)?.name || ''}`
                : t.messages.allKidsView
              }
            </Text>
          </View>

          <View style={styles.headerRight}>
            {familyTreeId && (
              <RequestNotification familyTreeId={familyTreeId} />
            )}
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Ionicons name={showSearch ? 'close' : 'search'} size={22} color={Colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowInviteModal(true)}
            >
              <Ionicons name="people" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowCreateChat(true)}
            >
              <Ionicons name="add-circle" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t.messages.searchPlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        )}
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Family Standing Section */}
        <View style={styles.familyStandingSection}>
          <View style={styles.standingHeader}>
            <Text style={styles.standingTitle}>{t.messages.familyStanding}</Text>

            {/* Perspective Toggle */}
            <View style={styles.perspectiveToggle}>
              <TouchableOpacity
                style={[
                  styles.perspectiveButton,
                  perspectiveMode === 'all' && styles.perspectiveButtonActive
                ]}
                onPress={() => handlePerspectiveChange(null)}
              >
                <Text style={[
                  styles.perspectiveButtonText,
                  perspectiveMode === 'all' && styles.perspectiveButtonTextActive
                ]}>
                  {t.messages.all}
                </Text>
              </TouchableOpacity>

              {children.length > 0 && (
                children.map(child => (
                  <TouchableOpacity
                    key={child.id}
                    style={[
                      styles.perspectiveButton,
                      perspectiveMode === 'specific' && selectedPerspectiveChild === child.id && styles.perspectiveButtonActive
                    ]}
                    onPress={() => handlePerspectiveChange(child.id)}
                  >
                    <Text style={[
                      styles.perspectiveButtonText,
                      perspectiveMode === 'specific' && selectedPerspectiveChild === child.id && styles.perspectiveButtonTextActive
                    ]}>
                      {child.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          {/* Horizontal Ranking List */}
          {isLoadingRanking ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>{t.common.loading}</Text>
            </View>
          ) : rankingError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={32} color={Colors.wilting} />
              <Text style={styles.errorText}>{rankingError}</Text>
              <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>{t.common.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : getFilteredRanking().length > 0 ? (
            <View style={styles.rankingListContainer}>
              <FlatList
                ref={rankingListRef}
                data={getFilteredRanking()}
                renderItem={renderRankingCard}
                keyExtractor={(item) => item.childId}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rankingListContent}
                snapToInterval={RANKING_CARD_WIDTH + RANKING_CARD_SPACING}
                decelerationRate="fast"
                bounces={false}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
              />
            </View>
          ) : (
            <View style={styles.emptyRankingContainer}>
              <Ionicons name="leaf" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyRankingText}>{t.messages.noRanking}</Text>
            </View>
          )}
        </View>

        {/* Chat Sections */}
        <View style={styles.chatSection}>
          {isLoadingMessages ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>{t.common.loading}</Text>
            </View>
          ) : chatError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={32} color={Colors.wilting} />
              <Text style={styles.errorText}>{chatError}</Text>
              <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>{t.common.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : getChatRoomSections().length > 0 ? (
            getChatRoomSections().map((section, sectionIndex) => (
              <View key={section.title + sectionIndex} style={styles.chatSectionBlock}>
                {renderSectionHeader({ section })}
                {section.data.map((room: any) => renderChatRoomItem({ item: room }))}
              </View>
            ))
          ) : (
            <View style={styles.emptyChatContainer}>
              <Ionicons name="chatbubbles" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyChatText}>{t.messages.noChats}</Text>
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={() => setShowCreateChat(true)}
              >
                <Ionicons name="add" size={18} color={Colors.textOnDark} />
                <Text style={styles.startChatButtonText}>{t.messages.startChat}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <CreateChatModal
        visible={showCreateChat}
        onClose={() => setShowCreateChat(false)}
        onCreateChat={handleCreateDirectChat}
        familyMembers={[]} // You'd need to implement getting family members
      />

      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.messages.joinFamily}</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>{t.messages.enterInviteCode}</Text>

              <TextInput
                style={styles.inviteInput}
                placeholder="XXXX-XXXX-XXXX"
                placeholderTextColor={Colors.textMuted}
                maxLength={12}
                autoFocus
              />

              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => {/* handle join */}}
              >
                <Text style={styles.joinButtonText}>{t.messages.join}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: 0,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.xl * 2,
  },
  familyStandingSection: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  standingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  standingTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  perspectiveToggle: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: 2,
  },
  perspectiveButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  perspectiveButtonActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  perspectiveButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textMuted,
  },
  perspectiveButtonTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  rankingListContainer: {
    height: 200, // Fixed height for horizontal list
  },
  rankingListContent: {
    paddingHorizontal: Spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.wilting,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryButton: {
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  emptyRankingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyRankingText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  chatSection: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  chatSectionBlock: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  emptyChatContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyChatText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  startChatButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textOnDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  modalBody: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  modalDescription: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  inviteInput: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    letterSpacing: 8,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textOnDark,
  },
});