import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { usePostsStore } from '@/store/postsStore';
import { useAuthStore } from '@/store/authStore';
import { Comment } from '@/types';

interface Props {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export function CommentsModal({ visible, postId, onClose }: Props) {
  const t = useTranslation();
  const parent = useAuthStore(s => s.parent);
  const comments = usePostsStore(s => s.comments[postId] || []);
  const commentsLoading = usePostsStore(s => s.commentsLoading);
  const loadComments = usePostsStore(s => s.loadComments);
  const addComment = usePostsStore(s => s.addComment);
  const deleteComment = usePostsStore(s => s.deleteComment);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && postId) {
      loadComments(postId);
    }
  }, [visible, postId]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addComment(postId, trimmed);
    setSending(false);
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleDelete = async (commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await deleteComment(commentId, postId);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t.posts.justNow;
    if (mins < 60) return `${mins} ${t.duration.min}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${t.duration.hour}`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const renderComment = ({ item }: { item: Comment }) => {
    const isOwn = item.authorId === parent?.id;

    return (
      <View style={styles.commentItem}>
        <View style={[styles.commentAvatar, isOwn && styles.commentAvatarOwn]}>
          <Text style={styles.commentAvatarText}>{getInitial(item.authorName)}</Text>
        </View>
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>
              {isOwn ? t.posts.you : item.authorName}
            </Text>
            <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.commentContent}>{item.content}</Text>
        </View>
        {isOwn && (
          <TouchableOpacity
            style={styles.commentDeleteBtn}
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t.posts.comments}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {commentsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubble-outline" size={48} color={Colors.borderLight} />
              <Text style={styles.emptyText}>{t.posts.addComment}</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={comments}
              keyExtractor={item => item.id}
              renderItem={renderComment}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: Spacing.sm }]}>
            <View style={styles.inputWrap}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder={t.posts.commentPlaceholder}
                placeholderTextColor={Colors.textMuted}
                maxLength={300}
                multiline
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary,
  },
  closeBtn: {
    position: 'absolute', right: Spacing.lg,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md, color: Colors.textMuted,
  },

  listContent: { padding: Spacing.lg, gap: Spacing.md },

  commentItem: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarOwn: {
    backgroundColor: Colors.primary,
  },
  commentAvatarText: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary,
  },
  commentBody: { flex: 1 },
  commentHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary,
  },
  commentTime: {
    fontSize: FontSize.xs, color: Colors.textMuted,
  },
  commentContent: {
    fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 20,
  },
  commentDeleteBtn: {
    padding: Spacing.xs, marginTop: 2,
  },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderTopWidth: 0.5, borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  inputWrap: {
    flex: 1, backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.xl, paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : 4,
    maxHeight: 100, borderWidth: 0.5, borderColor: Colors.border,
  },
  input: {
    fontSize: FontSize.md, color: Colors.textPrimary,
    maxHeight: 80,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
});
