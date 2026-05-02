import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ChatRoom, ChatMessage } from '@/interfaces/chat';
import { Colors } from '@/constants/colors';
import { useMessagesStore } from '@/store/messagesStore';

const SystemChatList = () => {
  const { parent } = useAuthStore();
  const {
    chatRooms,
    chatMessages,
    loadChatRooms,
    loadChatMessages,
    markMessageAsRead,
    isLoadingRooms,
  } = useMessagesStore();

  const [refreshing, setRefreshing] = useState(false);
  const [systemChatId, setSystemChatId] = useState<string | null>(null);
  const [activeFamilyTreeId, setActiveFamilyTreeId] = useState<string | null>(null);

  // Load chat rooms on mount
  useEffect(() => {
    if (parent?.id) {
      loadChatRooms();
    }
  }, [parent?.id, loadChatRooms]);

  // Find and set system chat ID
  useEffect(() => {
    const systemChat = chatRooms.find(cr => cr.room_type === 'system');
    if (systemChat && systemChat.id !== systemChatId) {
      setSystemChatId(systemChat.id);
      setActiveFamilyTreeId(systemChat.family_tree_id || null);
    }
  }, [chatRooms, systemChatId]);

  // Subscribe to system chat messages
  useEffect(() => {
    if (!systemChatId) return;

    const channel = supabase
      .channel(`system-chat-${systemChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_room_id=eq.${systemChatId}`,
        },
        (payload) => {
          console.log('New system chat message:', payload.new);

          // Only handle system messages from Buvijon bot
          const message = payload.new as ChatMessage;
          if (
            message.is_system_message &&
            message.sender_id === '00000000-0000-0000-0000-000000000001'
          ) {
            // Reload chat rooms to update unread count
            loadChatRooms();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [systemChatId, loadChatRooms]);

  // Sort chat rooms: system chats first, then pinned, then by last message
  const sortedChatRooms = useMemo(() => {
    return [...chatRooms].sort((a, b) => {
      // System chats first
      if (a.room_type === 'system' && b.room_type !== 'system') return -1;
      if (b.room_type === 'system' && a.room_type !== 'system') return 1;

      // Pinned chats next
      if (a.is_pinned && !b.is_pinned) return -1;
      if (b.is_pinned && !a.is_pinned) return 1;

      // Sort by last message time
      const aTime = a.last_message_at
        ? new Date(a.last_message_at).getTime()
        : 0;
      const bTime = b.last_message_at
        ? new Date(b.last_message_at).getTime()
        : 0;
      return bTime - aTime;
    });
  }, [chatRooms]);

  // Get unread count for a chat room
  const getUnreadCount = useCallback(
    (chatRoomId: string): number => {
      const roomMessages = chatMessages[chatRoomId] || [];
      return roomMessages.filter(
        (msg) =>
          !msg.is_read && msg.sender_id !== parent?.id && !msg.is_system_message
      ).length;
    },
    [chatMessages, parent?.id]
  );

  // Get last message for a chat room
  const getLastMessage = useCallback(
    (chatRoomId: string): ChatMessage | null => {
      const roomMessages = chatMessages[chatRoomId] || [];
      return roomMessages.length > 0 ? roomMessages[roomMessages.length - 1] : null;
    },
    [chatMessages]
  );

  // Handle chat room press
  const handleChatPress = useCallback(
    async (chatRoom: ChatRoom) => {
      try {
        // Load messages for this chat room
        await loadChatMessages(chatRoom.id);

        // Mark messages as read
        const roomMessages = chatMessages[chatRoom.id] || [];
        const unreadMessages = roomMessages.filter(
          (msg) => !msg.is_read && msg.sender_id !== parent?.id
        );

        for (const message of unreadMessages) {
          await markMessageAsRead(message.id);
        }

        // Navigate to chat screen (implement your navigation)
        // navigation.navigate('Chat', { chatRoomId: chatRoom.id });
        console.log('Opening chat:', chatRoom.name);
      } catch (error) {
        console.error('Error opening chat:', error);
      }
    },
    [loadChatMessages, chatMessages, parent?.id, markMessageAsRead]
  );

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  }, [loadChatRooms]);

  // Render chat room item
  const renderChatRoom = useCallback(
    ({ item }: { item: ChatRoom }) => {
      const unreadCount = getUnreadCount(item.id);
      const lastMessage = getLastMessage(item.id);
      const isSystemChat = item.room_type === 'system';

      return (
        <TouchableOpacity
          style={[styles.chatItem, isSystemChat && styles.systemChatItem]}
          onPress={() => handleChatPress(item)}
          activeOpacity={0.7}
        >
          {/* Avatar */}
          <View style={[styles.avatar, isSystemChat && styles.systemAvatar]}>
            {isSystemChat ? (
              <Ionicons name="notifications" size={24} color={Colors.primary} />
            ) : (
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Chat Info */}
          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <Text style={[styles.chatName, isSystemChat && styles.systemText]}>
                {item.name}
              </Text>

              <View style={styles.chatMeta}>
                {isSystemChat && (
                  <Ionicons name="pin" size={14} color={Colors.primary} style={styles.pinIcon} />
                )}
                {lastMessage && (
                  <Text style={styles.timestamp}>
                    {formatMessageTime(lastMessage.created_at)}
                  </Text>
                )}
              </View>
            </View>

            {/* Last Message */}
            <View style={styles.messageRow}>
              <View style={styles.messageContainer}>
                {lastMessage ? (
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {lastMessage.is_system_message ? (
                      <Text style={styles.systemMessage}>
                        {lastMessage.content}
                      </Text>
                    ) : (
                      lastMessage.content
                    )}
                  </Text>
                ) : (
                  <Text style={styles.noMessage}>No messages yet</Text>
                )}
              </View>

              {/* Unread Badge */}
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [getUnreadCount, getLastMessage, handleChatPress]
  );

  // Render system chat separator
  const renderSystemChatSeparator = useCallback(() => {
    const hasSystemChat = chatRooms.some(cr => cr.room_type === 'system');
    const hasOtherChats = chatRooms.some(cr => cr.room_type !== 'system');

    if (hasSystemChat && hasOtherChats) {
      return (
        <View style={styles.separatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>Your Chats</Text>
          <View style={styles.separatorLine} />
        </View>
      );
    }
    return null;
  }, [chatRooms]);

  if (isLoadingRooms && chatRooms.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedChatRooms}
        keyExtractor={(item) => item.id}
        renderItem={renderChatRoom}
        ItemSeparatorComponent={renderSystemChatSeparator}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {chatRooms.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.gray} />
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>
            Start a conversation to get started!
          </Text>
        </View>
      )}
    </View>
  );
};

// Helper function to format message time
const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  systemChatItem: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  systemAvatar: {
    backgroundColor: Colors.primary,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  systemText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    marginRight: 4,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageContainer: {
    flex: 1,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  systemMessage: {
    color: Colors.primary,
    fontWeight: '500',
  },
  noMessage: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  separatorText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default React.memo(SystemChatList);