import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TouchableWithoutFeedback, Animated, TextInput, Dimensions,
  KeyboardAvoidingView, Platform, Keyboard, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { Post } from '@/types';

const { height: SH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  onEdit: (postId: string, content: string) => void;
  onDelete: (postId: string) => void;
  onArchive: (postId: string) => void;
}

type MenuView = 'actions' | 'edit' | 'confirmDelete';

export function PostActionMenu({ visible, post, onClose, onEdit, onDelete, onArchive }: Props) {
  const t = useTranslation();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [currentView, setCurrentView] = useState<MenuView>('actions');
  const [editText, setEditText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (visible) {
      setCurrentView('actions');
      setEditText(post?.content || '');
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1, tension: 65, friction: 11, useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1, duration: 200, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0, duration: 150, useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentView('edit');
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentView('confirmDelete');
  };

  const handleArchive = () => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onArchive(post.id);
    dismiss();
  };

  const confirmDelete = () => {
    if (!post) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete(post.id);
    dismiss();
  };

  const saveEdit = () => {
    if (!post || !editText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit(post.id, editText.trim());
    dismiss();
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  if (!visible && !post) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={dismiss}>
          <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }], marginBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}>
          {/* Drag handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {currentView === 'actions' && (
            <View style={styles.menuContent}>
              {/* Edit */}
              <TouchableOpacity style={styles.menuItem} onPress={handleEdit} activeOpacity={0.7}>
                <View style={[styles.menuIcon, { backgroundColor: Colors.primaryPale }]}>
                  <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.menuText}>{t.posts.editPost}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>

              {/* Archive */}
              <TouchableOpacity style={styles.menuItem} onPress={handleArchive} activeOpacity={0.7}>
                <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="archive-outline" size={18} color="#F59E0B" />
                </View>
                <Text style={styles.menuText}>{t.posts.archivePost}</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.menuDivider} />

              {/* Delete */}
              <TouchableOpacity style={styles.menuItem} onPress={handleDelete} activeOpacity={0.7}>
                <View style={[styles.menuIcon, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="trash-outline" size={18} color={Colors.wilting} />
                </View>
                <Text style={[styles.menuText, { color: Colors.wilting }]}>{t.posts.deletePost}</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentView === 'confirmDelete' && (
            <View style={styles.menuContent}>
              <View style={styles.confirmIcon}>
                <Ionicons name="warning-outline" size={32} color={Colors.wilting} />
              </View>
              <Text style={styles.confirmTitle}>{t.posts.deletePost}?</Text>
              <Text style={styles.confirmMsg}>{t.posts.deleteMsg}</Text>
              <View style={styles.confirmBtns}>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmBtnCancel]}
                  onPress={() => setCurrentView('actions')}
                >
                  <Text style={styles.confirmBtnCancelText}>{t.posts.deleteCancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmBtnDelete]}
                  onPress={confirmDelete}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.confirmBtnDeleteText}>{t.posts.deleteConfirm}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentView === 'edit' && (
            <ScrollView style={styles.editScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.menuContent}>
                <Text style={styles.editTitle}>{t.posts.editTitle}</Text>
                <View style={styles.editInputWrap}>
                  <TextInput
                    style={styles.editInput}
                    value={editText}
                    onChangeText={setEditText}
                    multiline
                    autoFocus
                    maxLength={1000}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.confirmBtns}>
                  <TouchableOpacity
                    style={[styles.confirmBtn, styles.confirmBtnCancel]}
                    onPress={() => setCurrentView('actions')}
                  >
                    <Text style={styles.confirmBtnCancelText}>{t.posts.editCancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, styles.confirmBtnSave]}
                    onPress={saveEdit}
                    disabled={!editText.trim()}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.confirmBtnDeleteText}>{t.posts.editSave}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },

  handleWrap: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderLight,
  },

  menuContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  menuDivider: {
    height: 0.5,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },

  // Confirm delete
  confirmIcon: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  confirmTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmMsg: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  confirmBtnCancel: {
    backgroundColor: Colors.surfaceSecondary,
  },
  confirmBtnDelete: {
    backgroundColor: Colors.wilting,
  },
  confirmBtnSave: {
    backgroundColor: Colors.primary,
  },
  confirmBtnCancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  confirmBtnDeleteText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },

  editScroll: {
    maxHeight: SH * 0.5,
  },

  // Edit
  editTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  editInputWrap: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    maxHeight: 180,
  },
  editInput: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
