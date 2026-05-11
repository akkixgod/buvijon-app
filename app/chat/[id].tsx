import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useMessagesStore, ChatMessage } from '@/store/messagesStore';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const parent = useAuthStore(s => s.parent);
  const {
    chatRooms,
    loadMessages,
    sendMessage,
    markAsRead,
    getCachedMessages,
    retryFailedMessage,
    flushOutbox,
  } = useMessagesStore();

  const room = chatRooms.find(r => r.id === roomId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!roomId) return;

    let mounted = true;

    (async () => {
      try {
        const cached = getCachedMessages(roomId);
        if (mounted && cached.length > 0) {
          setMessages(cached);
          setIsLoading(false);
        }
        const msgs = await loadMessages(roomId);
        if (mounted) setMessages(msgs);
        flushOutbox().catch(() => {});
      } catch (_) {
      } finally {
        if (mounted) setIsLoading(false);
      }
      markAsRead(roomId).catch(() => {});
    })();

    // Real-time subscription for new messages in this room
    const channel = supabase
      .channel(`chat_room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_room_id=eq.${roomId}` },
        (payload) => {
          if (!mounted) return;
          const raw = payload.new as any;
          const newMsg: ChatMessage = {
            id: raw.id,
            chatRoomId: raw.chat_room_id,
            senderId: raw.sender_id,
            senderName: raw.sender_name,
            messageType: raw.message_type,
            content: raw.content,
            imageUrl: raw.image_url,
            replyToId: raw.reply_to_id,
            createdAt: raw.created_at,
            isRead: raw.is_read,
            readBy: raw.read_by || [],
          };
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending || !roomId) return;

    setInputText('');
    setIsSending(true);
    try {
      await sendMessage(roomId, text);
      const latest = useMessagesStore.getState().getCachedMessages(roomId);
      setMessages(latest);
    } catch (_) {
      Alert.alert('Message not sent', 'Saved for retry when internet is back.');
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, roomId, sendMessage]);

  const handleRetry = useCallback(async (tempId: string) => {
    await retryFailedMessage(tempId).catch(() => {});
    if (roomId) {
      setMessages(useMessagesStore.getState().getCachedMessages(roomId));
    }
  }, [retryFailedMessage, roomId]);

  const roomTypeIcon = room?.roomType === 'system' ? 'flame'
    : room?.roomType === 'group' ? 'people'
    : 'person';

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isSystem = item.messageType === 'system' || item.messageType === 'ai_response';
    const isOwn = item.senderId === parent?.id;

    if (isSystem) {
      return (
        <View style={styles.systemMsgWrapper}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
          <Text style={styles.systemMsgTime}>{formatTime(item.createdAt)}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleRow, isOwn ? styles.ownRow : styles.otherRow]}>
        {!isOwn && item.senderName && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
          <Text style={[styles.bubbleText, isOwn ? styles.ownText : styles.otherText]}>
            {item.content}
          </Text>
          {item.localStatus === 'failed' && (
            <TouchableOpacity onPress={() => handleRetry(item.id)} style={styles.retryChip}>
              <Ionicons name="refresh" size={12} color={Colors.wilting} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
          {item.localStatus === 'pending' && (
            <Text style={styles.pendingText}>Sending...</Text>
          )}
          <Text style={[styles.timeText, isOwn ? styles.ownTime : styles.otherTime]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  }, [handleRetry, parent?.id]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.backgroundDeep, Colors.background]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {room?.roomName ?? 'Chat'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name={roomTypeIcon as any} size={22} color={Colors.primary} />
        </View>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.skeletonWrap}>
            {[0, 1, 2, 3].map((idx) => (
              <View key={idx} style={[styles.skeletonBubble, idx % 2 === 0 ? styles.skeletonLeft : styles.skeletonRight]} />
            ))}
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="chatbubbles-outline" size={56} color={Colors.textLabel} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Say hello!</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.7}
          >
            {isSending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { padding: Spacing.xs, marginRight: Spacing.xs },
  headerCenter: { flex: 1, marginHorizontal: Spacing.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  headerRight: { padding: Spacing.xs },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textMuted },

  listContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  skeletonWrap: { flex: 1, justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  skeletonBubble: {
    height: 42,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  skeletonLeft: { width: '68%', alignSelf: 'flex-start' },
  skeletonRight: { width: '54%', alignSelf: 'flex-end' },

  bubbleRow: { maxWidth: '80%' },
  ownRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  otherRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderName: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2, marginLeft: Spacing.xs },

  bubble: { borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  ownBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: Radius.sm },
  otherBubble: { backgroundColor: Colors.surfaceSecondary, borderBottomLeftRadius: Radius.sm },

  bubbleText: { fontSize: FontSize.md },
  ownText: { color: '#FFFFFF' },
  otherText: { color: Colors.textPrimary },

  timeText: { fontSize: FontSize.xs, marginTop: 2 },
  ownTime: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  otherTime: { color: Colors.textMuted },
  retryChip: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.wiltingLight,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  retryText: { color: Colors.wilting, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  pendingText: { marginTop: 3, color: Colors.textMuted, fontSize: FontSize.xs },

  systemMsgWrapper: { alignSelf: 'center', alignItems: 'center', marginVertical: Spacing.xs },
  systemMsgText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    backgroundColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  systemMsgTime: { fontSize: 10, color: Colors.textLabel, marginTop: 2 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
});
