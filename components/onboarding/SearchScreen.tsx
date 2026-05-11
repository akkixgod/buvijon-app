// @ts-nocheck
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessagesStore, SearchTab, SearchUserResult, SearchFamilyResult } from '@/store/messagesStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { SearchService } from '@/services/searchService';
import { createSearchDebouncer } from '@/services/searchService';

const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const { parent } = useAuthStore();
  const {
    searchTab,
    setSearchTab,
    searchUsersByUsername,
    searchFamiliesByHandle,
    searchUsers,
    searchFamilies,
    isSearching,
    searchError,
    sendFamilyJoinRequest,
    userRequestStatus,
    createDirectChat,
    clearSearch,
  } = useMessagesStore();

  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUserResult | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<SearchFamilyResult | null>(null);

  // Create debounced search
  const debouncedSearch = useMemo(
    () =>
      createSearchDebouncer((searchQuery: string) => {
        if (searchQuery.length >= 2) {
          if (searchTab === 'users') {
            searchUsersByUsername(searchQuery);
          } else {
            searchFamiliesByHandle(searchQuery);
          }
        }
      }, 300),
    [searchTab, searchUsersByUsername, searchFamiliesByHandle]
  );

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: SearchTab) => {
      setSearchTab(tab);
      setQuery('');
      clearSearch();
      setSelectedUser(null);
      setSelectedFamily(null);
    },
    [setSearchTab, clearSearch]
  );

  // Handle search input
  const handleSearchChange = useCallback(
    (text: string) => {
      setQuery(text);
      debouncedSearch(text);

      // Add to search history if not empty
      if (text.trim().length >= 2 && !searchHistory.includes(text)) {
        setSearchHistory(prev => [text, ...prev.slice(0, 9)]);
      }
    },
    [debouncedSearch, searchHistory]
  );

  // Clear search
  const handleClearSearch = useCallback(() => {
    setQuery('');
    clearSearch();
    setSelectedUser(null);
    setSelectedFamily(null);
  }, [clearSearch]);

  // Handle user selection - create direct chat
  const handleUserSelect = useCallback(
    async (user: SearchUserResult) => {
      try {
        setSelectedUser(user);
        const chatRoomId = await createDirectChat(user.id);

        Alert.alert(
          'Chat Created',
          `Direct chat with ${user.name} created successfully!`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Chat',
              onPress: () => {
                navigation.navigate('Chat', { chatRoomId });
                navigation.goBack();
              },
            },
          ]
        );
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to create direct chat');
      } finally {
        setSelectedUser(null);
      }
    },
    [createDirectChat, navigation]
  );

  // Handle family join request
  const handleFamilyJoinRequest = useCallback(
    async (family: SearchFamilyResult) => {
      try {
        setSelectedFamily(family);

        Alert.alert(
          'Join Request',
          `Send a request to join ${family.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send Request',
              onPress: async () => {
                try {
                  await sendFamilyJoinRequest(
                    family.id,
                    `Hi! I would like to join your family tree.`
                  );

                  Alert.alert(
                    'Success',
                    'Your join request has been sent! You will be notified when it\'s accepted.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                  );
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to send join request');
                }
              },
            },
          ]
        );
      } finally {
        setSelectedFamily(null);
      }
    },
    [sendFamilyJoinRequest, navigation]
  );

  // Render user result item
  const renderUserItem = useCallback(
    ({ item }: { item: SearchUserResult }) => (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleUserSelect(item)}
        activeOpacity={0.8}
      >
        <View style={styles.resultItemContent}>
          {/* User Avatar */}
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color={Colors.textTertiary} />
            </View>
          )}

          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.userInfoRow}>
              <Text style={styles.userName}>{item.name}</Text>
              {item.isPremium && (
                <Ionicons name="star" size={16} color={Colors.accent} />
              )}
            </View>

            {item.username && (
              <Text style={styles.userHandle}>@{item.username}</Text>
            )}

            {/* Mutual Families */}
            {item.mutualFamilies && item.mutualFamilies.length > 0 && (
              <View style={styles.mutualFamilies}>
                <Ionicons name="people" size={12} color={Colors.primary} />
                <Text style={styles.mutualFamiliesText}>
                  {item.mutualFamilies.length} mutual family
                  {item.mutualFamilies.length === 1 ? '' : 'ies'}
                </Text>
              </View>
            )}
          </View>

          {/* Action Button */}
          <View style={styles.actionButton}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => handleUserSelect(item)}
            >
              <Ionicons name="chatbubbles" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleUserSelect]
  );

  // Render family result item
  const renderFamilyItem = useCallback(
    ({ item }: { item: SearchFamilyResult }) => {
      const isMember = userRequestStatus[item.id] === 'accepted';
      const isPending = userRequestStatus[item.id] === 'pending' || item.hasPendingRequest;

      return (
        <TouchableOpacity
          style={[
            styles.resultItem,
            styles.familyItem,
            isMember && styles.memberFamilyItem
          ]}
          onPress={() => !isMember && !isPending && handleFamilyJoinRequest(item)}
          activeOpacity={isMember || isPending ? 0.5 : 0.8}
          disabled={isMember || isPending}
        >
          <View style={styles.resultItemContent}>
            {/* Family Icon */}
            <View style={styles.familyIcon}>
              <Ionicons name="people" size={32} color={Colors.primary} />
            </View>

            {/* Family Info */}
            <View style={styles.familyInfo}>
              <View style={styles.familyNameRow}>
                <Text style={styles.familyName}>{item.name}</Text>
                {item.handle && (
                  <Text style={styles.familyHandle}>@{item.handle}</Text>
                )}
              </View>

              <View style={styles.familyDetails}>
                <View style={styles.familyDetailItem}>
                  <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.familyDetailText}>
                    {item.memberCount} member{item.memberCount === 1 ? '' : 's'}
                  </Text>
                </View>

                <View style={styles.familyDetailItem}>
                  <Ionicons name="person-circle-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.familyDetailText}>
                    Created by {item.creatorName}
                  </Text>
                </View>
              </View>
            </View>

            {/* Status Badge */}
            {isMember && (
              <View style={[styles.statusBadge, styles.memberBadge]}>
                <Text style={styles.memberBadgeText}>Member</Text>
              </View>
            )}

            {isPending && (
              <View style={[styles.statusBadge, styles.pendingBadge]}>
                <Ionicons name="time" size={14} color={Colors.white} />
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>
            )}

            {/* Join Button */}
            {!isMember && !isPending && (
              <View style={styles.actionButton}>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleFamilyJoinRequest(item)}
                >
                  <Ionicons name="add" size={20} color={Colors.white} />
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
      </TouchableOpacity>
    );
    },
    [handleFamilyJoinRequest, userRequestStatus]
  );

  // Render empty state
  const renderEmptyState = useCallback(() => {
    if (isSearching) return null;

    return (
      <View style={styles.emptyState}>
        <Ionicons
          name={searchTab === 'users' ? 'person' : 'people'}
          size={64}
          color={Colors.textTertiary}
        />
        <Text style={styles.emptyStateTitle}>No results found</Text>
        <Text style={styles.emptyStateText}>
          {searchTab === 'users'
            ? 'Try searching for a different username'
            : 'Try searching for a different family handle'}
        </Text>
      </View>
    );
  }, [isSearching, searchTab]);

  // Render search history item
  const renderHistoryItem = useCallback(
    (item: string) => (
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => {
          setQuery(item);
          debouncedSearch(item);
        }}
      >
        <Ionicons name="time" size={16} color={Colors.textTertiary} />
        <Text style={styles.historyText}>{item}</Text>
        <Ionicons name="close" size={16} color={Colors.textTertiary} />
      </TouchableOpacity>
    ),
    [debouncedSearch]
  );

  // Get current search results based on tab
  const currentResults = searchTab === 'users' ? searchUsers : searchFamilies;
  const resultsKeyExtractor = (item: SearchUserResult | SearchFamilyResult) => item.id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Search Input */}
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={Colors.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={
              searchTab === 'users'
                ? 'Search parents by @username...'
                : 'Search families by @family_handle...'
            }
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={handleClearSearch}
            >
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search History */}
        {query.length === 0 && searchHistory.length > 0 && (
          <View style={styles.searchHistory}>
            <Text style={styles.historyTitle}>Recent Searches</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {searchHistory.map(renderHistoryItem)}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, searchTab === 'users' && styles.activeTab]}
          onPress={() => handleTabChange('users')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person"
            size={20}
            color={searchTab === 'users' ? Colors.white : Colors.textTertiary}
          />
          <Text
            style={[
              styles.tabText,
              searchTab === 'users' && styles.activeTabText
            ]}
          >
            Find Parents
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, searchTab === 'families' && styles.activeTab]}
          onPress={() => handleTabChange('families')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people"
            size={20}
            color={searchTab === 'families' ? Colors.white : Colors.textTertiary}
          />
          <Text
            style={[
              styles.tabText,
              searchTab === 'families' && styles.activeTabText
            ]}
          >
            Find Families
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : searchError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{searchError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleSearchChange(query)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : currentResults.length > 0 ? (
        <FlatList
          data={currentResults}
          keyExtractor={resultsKeyExtractor}
          renderItem={
            searchTab === 'users' ? renderUserItem : renderFamilyItem
          }
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}

      {/* User Selection Modal */}
      <Modal
        visible={selectedUser !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedUser && (
              <>
                <View style={styles.modalAvatar}>
                  {selectedUser.avatar ? (
                    <Image source={{ uri: selectedUser.avatar }} style={styles.modalAvatarImage} />
                  ) : (
                    <View style={[styles.modalAvatar, styles.modalAvatarPlaceholder]}>
                      <Ionicons name="person" size={40} color={Colors.textTertiary} />
                    </View>
                  )}
                </View>

                <Text style={styles.modalName}>{selectedUser.name}</Text>
                <Text style={styles.modalHandle}>@{selectedUser.username}</Text>

                {selectedUser.mutualFamilies && selectedUser.mutualFamilies.length > 0 && (
                  <Text style={styles.modalMutualFamilies}>
                    {selectedUser.mutualFamilies.length} mutual family
                    {selectedUser.mutualFamilies.length === 1 ? '' : 'ies'}
                  </Text>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => setSelectedUser(null)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalConfirmButton]}
                    onPress={() => handleUserSelect(selectedUser)}
                  >
                    <Text style={styles.modalConfirmText}>Start Chat</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    padding: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
  },
  searchHistory: {
    marginTop: 12,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.white,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  familyItem: {
    borderWidth: 2,
  },
  memberFamilyItem: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  resultItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  userHandle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  mutualFamilies: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  mutualFamiliesText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
  },
  actionButton: {
    marginLeft: 12,
  },
  chatButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  familyIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  familyInfo: {
    flex: 1,
  },
  familyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  familyName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  familyHandle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  familyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  familyDetailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberBadge: {
    backgroundColor: Colors.success,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  pendingBadge: {
    backgroundColor: Colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 4,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  modalAvatarPlaceholder: {
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalHandle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalMutualFamilies: {
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  modalConfirmButton: {
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default SearchScreen;
