import React, { memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatRoom } from '@/store/messagesStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

interface ChatListItemProps {
  chatRoom: ChatRoom;
  isActive: boolean;
  onPress: () => void;
}

// Helper function to format time
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  const day = date.getDate();
  const month = date.toLocaleDateString('en', { month: 'short' }).replace('.', '');
  return `${day} ${month}`;
};

// Helper function to get chat room styling
const getChatRoomStyle = (roomType: string, isActive: boolean) => {
  switch (roomType) {
    case 'system':
      return {
        avatarColor: Colors.primary,
        icon: 'flame',
        bgColor: isActive ? Colors.primaryPale : Colors.surface,
        borderColor: isActive ? Colors.primary : Colors.border,
      };
    case 'group':
      return {
        avatarColor: Colors.blooming,
        icon: 'people',
        bgColor: isActive ? Colors.bloomingLight : Colors.surface,
        borderColor: isActive ? Colors.blooming : Colors.border,
      };
    case 'direct':
      return {
        avatarColor: Colors.accent,
        icon: 'person',
        bgColor: isActive ? Colors.surfaceSecondary : Colors.surface,
        borderColor: isActive ? Colors.accent : Colors.border,
      };
    default:
      return {
        avatarColor: Colors.textMuted,
        icon: 'chatbubbles',
        bgColor: Colors.surface,
        borderColor: Colors.border,
      };
  }
};

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: ChatListItemProps, nextProps: ChatListItemProps) => {
  const prevRoom = prevProps.chatRoom;
  const nextRoom = nextProps.chatRoom;

  return (
    prevRoom.id === nextRoom.id &&
    prevRoom.unreadCount === nextRoom.unreadCount &&
    prevRoom.lastMessage?.id === nextRoom.lastMessage?.id &&
    prevRoom.lastMessage?.content === nextRoom.lastMessage?.content &&
    prevRoom.lastMessage?.createdAt === nextRoom.lastMessage?.createdAt &&
    prevProps.isActive === nextProps.isActive
  );
};

const ChatListItem: React.FC<ChatListItemProps> = memo(({
  chatRoom,
  isActive,
  onPress
}) => {
  const roomStyle = getChatRoomStyle(chatRoom.roomType, isActive);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: roomStyle.bgColor, borderColor: roomStyle.borderColor }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatarContainer]}>
        <View style={[styles.avatar, { backgroundColor: roomStyle.avatarColor }]}>
          <Ionicons name={roomStyle.icon as any} size={22} color="#fff" />

          {/* Online indicator for direct chats */}
          {chatRoom.roomType === 'direct' && chatRoom.isActive && (
            <View style={styles.onlineIndicator} />
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[styles.roomName, isActive && styles.activeRoomName]}>
              {chatRoom.roomName}
            </Text>

            {/* Room type badge */}
            {chatRoom.roomType === 'system' && (
              <View style={styles.typeBadge}>
                <Ionicons name="star" size={8} color={Colors.primary} />
              </View>
            )}
          </View>

          {/* Timestamp */}
          {chatRoom.lastMessage && (
            <Text style={styles.timestamp}>
              {formatTime(chatRoom.lastMessage.createdAt)}
            </Text>
          )}
        </View>

        {/* Last message */}
        {chatRoom.lastMessage ? (
          <View style={styles.messageRow}>
            <Text
              style={[
                styles.lastMessage,
                chatRoom.unreadCount > 0 && styles.unreadMessage
              ]}
              numberOfLines={1}
            >
              {chatRoom.lastMessage.content}
            </Text>

            {/* Unread count */}
            {chatRoom.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {chatRoom.unreadCount > 99 ? '99+' : chatRoom.unreadCount}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noMessage}>No messages yet</Text>
        )}
      </View>

      {/* Chevron */}
      <View style={styles.chevronContainer}>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={Colors.textMuted}
        />
      </View>
    </TouchableOpacity>
  );
}, arePropsEqual);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 0.5,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.blooming,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  activeRoomName: {
    color: Colors.primary,
  },
  typeBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timestamp: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  unreadMessage: {
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  noMessage: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  chevronContainer: {
    marginLeft: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
});

export default ChatListItem;