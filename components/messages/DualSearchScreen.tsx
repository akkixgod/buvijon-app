import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMessagesStore, SearchTab, SearchUserResult, SearchFamilyResult } from '@/store/messagesStore';
import { useAuthStore } from '@/store/authStore';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import Avatar from '@/components/Avatar';
import { Ionicons } from '@expo/vector-icons';

export default function DualSearchScreen({ onClose }: { onClose: () => void }) {
  const { parent } = useAuthStore();
  const {
    searchTab,
    searchQuery,
    searchUsers,
    searchFamilies,
    isSearching,
    searchError,
    setSearchTab,
    searchUsersByUsername,
    searchFamiliesByHandle,
    clearSearch,
    sendFamilyJoinRequest,
    createDirectChat,
    userRequestStatus
  } = useMessagesStore();

  const [localQuery, setLocalQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((query: string) => {
    setLocalQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      clearSearch();
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchTab === 'users') {
        searchUsersByUsername(query);
      } else {
        searchFamiliesByHandle(query);
      }
    }, 300); // Debounce for 300ms
  }, [searchTab, clearSearch, searchUsersByUsername, searchFamiliesByHandle]);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const handleJoinFamily = useCallback(async (family: SearchFamilyResult) => {
    try {
      const status = userRequestStatus[family.id];
      if (status === 'pending') {
        Alert.alert('Request Pending', 'You have already requested to join this family.');
        return;
      }

      await sendFamilyJoinRequest(family.id, `I would like to join your family tree.`);

      Alert.alert(
        'Request Sent',
        `Your request to join "${family.name}" has been sent. You'll be notified when it's accepted.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send join request.');
    }
  }, [sendFamilyJoinRequest, userRequestStatus]);

  const handleCreateDirectChat = useCallback(async (userId: string) => {
    try {
      const roomId = await createDirectChat(userId);
      Alert.alert(
        'Chat Created',
        'Direct chat has been created successfully.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create direct chat.');
    }
  }, [createDirectChat, onClose]);

  const renderUserItem = useCallback(({ item }: { item: SearchUserResult }) => (
    <View style={styles.userItem}>
      <TouchableOpacity
        style={styles.userItemContent}
        onPress={() => toggleUserSelection(item.id)}
      >
        <View style={styles.userInfo}>
          <Avatar uri={item.avatar} size={50} />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userUsername}>@{item.username}</Text>
          </View>
        </View>
        {item.isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={16} color={Colors.warning} />
          </View>
        )}
      </TouchableOpacity>

      {selectedUsers.has(item.id) && (
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => handleCreateDirectChat(item.id)}
        >
          <Ionicons name="chatbubble-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  ), [selectedUsers, toggleUserSelection, handleCreateDirectChat]);

  const renderFamilyItem = useCallback(({ item }: { item: SearchFamilyResult }) => {
    const status = userRequestStatus[item.id];

    return (
      <View style={styles.familyItem}>
        <View style={styles.familyItemContent}>
          <View style={styles.familyInfo}>
            <Text style={styles.familyName}>{item.name}</Text>
            <Text style={styles.familyHandle}>@{item.handle}</Text>
            <Text style={styles.familyCreator}>
              Created by {item.creatorName}
            </Text>
            <View style={styles.familyStats}>
              <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.memberCount}>{item.memberCount} members</Text>
            </View>
          </View>

          <View style={styles.joinButtonContainer}>
            {status === 'pending' ? (
              <View style={[styles.joinButton, styles.joinButtonPending]}>
                <Ionicons name="time-outline" size={16} color={Colors.white} />
                <Text style={styles.joinButtonText}>Pending</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => handleJoinFamily(item)}
                disabled={status === 'pending'}
              >
                <Ionicons name="person-add-outline" size={16} color={Colors.white} />
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }, [userRequestStatus, handleJoinFamily]);

  const ListKeyExtractor = useCallback((item: any) => item.id, []);

  const ListEmptyComponent = useCallback(() => {
    if (isSearching) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      );
    }

    if (searchError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.emptyText}>{searchError}</Text>
        </View>
      );
    }

    if (searchQuery.length < 2) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={searchTab === 'users' ? "search-outline" : "people-outline"}
            size={48}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyText}>
            {searchTab === 'users'
              ? 'Search for parents by @username'
              : 'Search for families by @family_handle'}
          </Text>
          <Text style={styles.emptySubtext}>Type at least 2 characters to search</Text>
        </View>
      );
    }

    const noResultsText = searchTab === 'users'
      ? 'No parents found'
      : 'No families found';

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.emptyText}>{noResultsText}</Text>
        <Text style={styles.emptySubtext}>Try different search terms</Text>
      </View>
    );
  }, [isSearching, searchError, searchQuery, searchTab]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dual Search</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchTab === 'users' ? 'Search by @username...' : 'Search by @family_handle...'}
            placeholderTextColor={Colors.textSecondary}
            value={localQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {localQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setLocalQuery(''); clearSearch(); }}>
              <Ionicons name="close-circle-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, searchTab === 'users' && styles.tabActive]}
            onPress={() => { setSearchTab('users'); handleSearch(localQuery); }}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={searchTab === 'users' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, searchTab === 'users' && styles.tabTextActive]}>
              Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, searchTab === 'families' && styles.tabActive]}
            onPress={() => { setSearchTab('families'); handleSearch(localQuery); }}
          >
            <Ionicons
              name="people-outline"
              size={20}
              color={searchTab === 'families' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, searchTab === 'families' && styles.tabTextActive]}>
              Families
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        <View style={styles.resultsContainer}>
          {searchTab === 'users' ? (
            <FlatList
              data={searchUsers}
              renderItem={renderUserItem}
              keyExtractor={ListKeyExtractor}
              ListEmptyComponent={ListEmptyComponent}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={searchFamilies}
              renderItem={renderFamilyItem}
              keyExtractor={ListKeyExtractor}
              ListEmptyComponent={ListEmptyComponent}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.small,
  },
  headerSpacer: {
    width: 32, // Same as closeButton
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    marginHorizontal: Spacing.medium,
    marginTop: Spacing.medium,
    backgroundColor: Colors.card,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    marginLeft: Spacing.small,
    color: Colors.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.medium,
    marginTop: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.medium,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    ...Typography.small,
    marginLeft: Spacing.xsmall,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.medium,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.small,
    marginBottom: Spacing.small,
  },
  userItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.border,
  },
  userDetails: {
    marginLeft: Spacing.medium,
  },
  userName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  userUsername: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.small,
    paddingVertical: Spacing.xsmall,
    borderRadius: Radius.small,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  familyItem: {
    marginBottom: Spacing.small,
  },
  familyItemContent: {
    backgroundColor: Colors.card,
    borderRadius: Radius.medium,
    padding: Spacing.medium,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  familyInfo: {
    flex: 1,
  },
  familyName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  familyHandle: {
    ...Typography.small,
    color: Colors.primary,
    marginTop: Spacing.xsmall,
  },
  familyCreator: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
  familyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.small,
  },
  memberCount: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginLeft: Spacing.xsmall,
  },
  joinButtonContainer: {
    alignItems: 'center',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderRadius: Radius.small,
  },
  joinButtonPending: {
    backgroundColor: Colors.textSecondary,
  },
  joinButtonText: {
    ...Typography.small,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.xsmall,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xlarge * 2,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginTop: Spacing.medium,
    textAlign: 'center',
  },
  emptySubtext: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.small,
    textAlign: 'center',
  },
});
