import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Image, Alert,
  LayoutAnimation, UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { usePostsStore } from '@/store/postsStore';
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';
import { PostType } from '@/types';
import { uploadPostImage } from '@/lib/uploadImage';

const POST_TYPE_CFG: Record<PostType, { icon: string; color: string; bg: string }> = {
  progress:  { icon: 'trending-up',   color: Colors.blooming, bg: Colors.bloomingLight },
  milestone: { icon: 'star',          color: '#F59E0B',       bg: '#FFFBEB' },
  tip:       { icon: 'bulb',          color: Colors.primary,  bg: Colors.primaryPale },
  note:      { icon: 'document-text', color: Colors.textSecondary, bg: Colors.surfaceSecondary },
};

export default function CreateScreen() {
  const router = useRouter();
  const t = useTranslation();
  const parent = useAuthStore(s => s.parent);
  const children = useChildrenStore(s => s.children);
  const addPost = usePostsStore(s => s.addPost);

  const [selectedType, setSelectedType] = useState<PostType>('progress');
  const [text, setText] = useState('');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const typeLabels: Record<PostType, string> = {
    progress: t.create.typeProgress,
    milestone: t.create.typeMilestone,
    tip: t.create.typeTip,
    note: t.create.typeNote,
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);

    const child = selectedChildId ? children.find(c => c.id === selectedChildId) : undefined;

    let uploadedUrl: string | undefined;
    if (imageUri) {
      const url = await uploadPostImage(imageUri);
      if (!url) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('', t.create.errFailed);
        setPosting(false);
        return;
      }
      uploadedUrl = url;
    }

    const success = await addPost({
      type: selectedType,
      content: text.trim(),
      authorId: parent?.id || '',
      authorName: parent?.name || '',
      childId: child?.id,
      childName: child?.name,
      imageUrl: uploadedUrl,
    });

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setText('');
      setImageUri(null);
      setSelectedChildId(null);
      setSelectedType('progress');
      router.back();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('', t.create.errFailed);
    }
    setPosting(false);
  };

  const canPost = text.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>{t.create.cancel}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.create.headerTitle}</Text>
          <View style={{ flex: 1 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Post type selector */}
          <Text style={styles.sectionLabel}>{t.create.typeLabel}</Text>
          <View style={styles.typeRow}>
            {(Object.keys(POST_TYPE_CFG) as PostType[]).map(type => {
              const cfg = POST_TYPE_CFG[type];
              const active = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    { backgroundColor: active ? cfg.bg : Colors.surfaceSecondary },
                    active && { borderColor: cfg.color },
                  ]}
                  onPress={() => {
                    setSelectedType(type);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name={cfg.icon as any} size={18} color={active ? cfg.color : Colors.textMuted} />
                  <Text style={[styles.typeLabel, { color: active ? cfg.color : Colors.textMuted }]}>
                    {typeLabels[type]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Child selector */}
          {children.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t.addChild.nameLabel.split(' ')[0]}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childRow}>
                <TouchableOpacity
                  style={[styles.childChip, !selectedChildId && styles.childChipActive]}
                  onPress={() => setSelectedChildId(null)}
                >
                  <Text style={[styles.childChipText, !selectedChildId && styles.childChipTextActive]}>
                    —
                  </Text>
                </TouchableOpacity>
                {children.map(child => (
                  <TouchableOpacity
                    key={child.id}
                    style={[styles.childChip, selectedChildId === child.id && styles.childChipActive]}
                    onPress={() => setSelectedChildId(child.id)}
                  >
                    <Text style={[styles.childChipText, selectedChildId === child.id && styles.childChipTextActive]}>
                      {child.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Text input */}
          <Text style={styles.sectionLabel}>{t.create.contentLabel}</Text>
          <View style={styles.textInputWrap}>
            <TextInput
              style={styles.textInput}
              placeholder={t.create.placeholder}
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>{text.length}/500</Text>
          </View>

          {/* Photo attachment */}
          {imageUri ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.imageRemoveBtn}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setImageUri(null); }}
              >
                <Ionicons name="close-circle" size={24} color={Colors.wilting} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage} activeOpacity={0.7}>
              <Ionicons name="image-outline" size={20} color={Colors.primary} />
              <Text style={styles.addPhotoText}>{t.create.addPhoto}</Text>
            </TouchableOpacity>
          )}

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textLabel} />
            <Text style={styles.tipsText}>{t.create.tip}</Text>
          </View>
        </ScrollView>

        {/* Bottom action bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.publishBtn, !canPost && styles.publishBtnDisabled]}
            onPress={handlePost}
            disabled={!canPost || posting}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color={canPost ? '#fff' : Colors.textMuted} />
            <Text style={[styles.publishBtnText, !canPost && styles.publishBtnTextDisabled]}>
              {t.create.publish}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 6, paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.wilting,
    alignSelf: 'flex-start',
  },
  cancelText: {
    fontSize: FontSize.sm, color: Colors.wilting,
    fontWeight: FontWeight.medium, textAlign: 'center',
  },
  headerTitle: {
    flex: 2, textAlign: 'center',
    fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary,
  },

  scroll: { flex: 1, padding: Spacing.lg },

  sectionLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.medium,
    color: Colors.textLabel, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  typeLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  childRow: { marginBottom: Spacing.sm },
  childChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    marginRight: Spacing.sm, backgroundColor: Colors.surfaceSecondary,
  },
  childChipActive: { backgroundColor: Colors.primaryPale, borderColor: Colors.primary },
  childChipText: { fontSize: FontSize.sm, color: Colors.textMuted },
  childChipTextActive: { color: Colors.primary, fontWeight: FontWeight.medium },
  textInputWrap: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, minHeight: 140,
  },
  textInput: {
    fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 24, minHeight: 110,
  },
  charCount: {
    alignSelf: 'flex-end', fontSize: FontSize.xs, color: Colors.textLabel, marginTop: Spacing.xs,
  },

  // Photo
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primaryLight,
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium,
  },
  imagePreviewWrap: {
    marginTop: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%', height: 200, borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceSecondary,
  },
  imageRemoveBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#fff', borderRadius: 12,
  },

  // Tips
  tipsCard: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
    padding: Spacing.md, marginTop: Spacing.lg,
    borderWidth: 0.5, borderColor: Colors.borderLight,
  },
  tipsText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderTopWidth: 0.5, borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: 14, borderRadius: Radius.lg,
  },
  publishBtnDisabled: {
    backgroundColor: Colors.surfaceSecondary,
  },
  publishBtnText: {
    fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#fff',
  },
  publishBtnTextDisabled: {
    color: Colors.textMuted,
  },
});
