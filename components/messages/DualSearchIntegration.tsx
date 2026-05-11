// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import RequestNotification from './RequestNotification';
import DualSearchScreen from './DualSearchScreen';
import { useMessagesStore } from '@/store/messagesStore';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/theme';

interface DualSearchIntegrationProps {
  familyTreeId: string;
}

export default function DualSearchIntegration({ familyTreeId }: DualSearchIntegrationProps) {
  const { parent } = useAuthStore();
  const { chatRooms, activeChatRoomId, setActiveChatRoom } = useMessagesStore();
  const [showSearch, setShowSearch] = useState(false);

  // Find the Buvijon AI system chat
  const buvijonChat = chatRooms.find(
    room => room.roomType === 'system' && room.metadata?.system_type === 'ai_assistant'
  );

  // Find user's own children (this would come from childrenStore)
  const myChildrenCount = 0; // TODO: Get from childrenStore

  const handleRequestCountChange = (count: number) => {
    console.log('Unread requests count:', count);
    // Could update tab bar badge or show other notifications
  };

  if (showSearch) {
    return <DualSearchScreen onClose={() => setShowSearch(false)} />;
  }

  return (
    <View style={styles.container}>
      {/* Family Tree Header with Request Notification */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.buvijonChatIndicator}>
            <Ionicons name="heart" size={20} color={Colors.primary} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Family Tree</Text>
            <Text style={styles.headerSubtitle}>
              {myChildrenCount} children • {chatRooms.length} chats
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Request Notification Icon */}
          <RequestNotification
            familyTreeId={familyTreeId}
            onRequestCountChange={handleRequestCountChange}
          />

          {/* Dual Search Button */}
          <View style={styles.iconContainer}>
            <Ionicons name="search-outline" size={24} color={Colors.textPrimary} />
          </View>

          {/* Settings Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="settings-outline" size={24} color={Colors.textPrimary} />
          </View>
        </View>
      </View>

      {/* Buvijon AI Chat Preview */}
      {buvijonChat && (
        <View style={styles.buvijonPreview}>
          <View style={styles.buvijonHeader}>
            <Ionicons name="heart" size={20} color={Colors.primary} />
            <Text style={styles.buvijonTitle}>Buvijon AI</Text>
            <View style={styles.spacer} />
            {buvijonChat.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{buvijonChat.unreadCount}</Text>
              </View>
            )}
          </View>

          {buvijonChat.lastMessage && (
            <View style={styles.buvijonMessage}>
              <Text style={styles.messagePreview} numberOfLines={1}>
                {buvijonChat.lastMessage.content}
              </Text>
              <Text style={styles.messageTime}>
                {new Date(buvijonChat.lastMessage.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Dual Search Trigger Button (Alternative to header icon) */}
      <View style={styles.searchTriggerContainer}>
        <View style={styles.searchTrigger}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <Text style={styles.searchTriggerText}>Search for parents & families...</Text>
        </View>
        <View style={styles.iconTriggerContainer}>
          <View style={styles.iconTrigger}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.iconTrigger}>
            <Ionicons name="people-outline" size={20} color={Colors.primary} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.large,
    paddingVertical: Spacing.medium,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buvijonChatIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: Spacing.medium,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.small,
  },
  iconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buvijonPreview: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.large,
    marginTop: Spacing.medium,
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  buvijonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  buvijonTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: Spacing.small,
  },
  spacer: {
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xsmall,
  },
  unreadBadgeText: {
    ...Typography.small,
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  buvijonMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
  },
  messagePreview: {
    flex: 1,
    ...Typography.small,
    color: Colors.textSecondary,
    marginRight: Spacing.medium,
  },
  messageTime: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  searchTriggerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.large,
    paddingVertical: Spacing.medium,
  },
  searchTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
  },
  searchTriggerText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.small,
  },
  iconTriggerContainer: {
    flexDirection: 'row',
    gap: Spacing.small,
    marginLeft: Spacing.medium,
  },
  iconTrigger: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
});
