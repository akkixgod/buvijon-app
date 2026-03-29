import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';

type PostType = 'progress' | 'milestone' | 'tip' | 'note';

const POST_TYPE_CFG: Record<PostType, { icon: string; color: string; bg: string }> = {
  progress:  { icon: 'trending-up',   color: Colors.blooming, bg: Colors.bloomingLight },
  milestone: { icon: 'star',          color: '#F59E0B',       bg: '#FFFBEB' },
  tip:       { icon: 'bulb',          color: Colors.primary,  bg: Colors.primaryPale },
  note:      { icon: 'document-text', color: Colors.textSecondary, bg: Colors.surfaceSecondary },
};

export default function CreateScreen() {
  const router = useRouter();
  const t = useTranslation();
  const [selectedType, setSelectedType] = useState<PostType>('progress');
  const [text, setText] = useState('');

  const typeLabels: Record<PostType, string> = {
    progress: t.create.typeProgress,
    milestone: t.create.typeMilestone,
    tip: t.create.typeTip,
    note: t.create.typeNote,
  };

  const handlePost = () => {
    if (!text.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: save post to store/backend
    router.back();
  };

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
          <TouchableOpacity
            style={[styles.postBtn, !text.trim() && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!text.trim()}
          >
            <Text style={[styles.postBtnText, !text.trim() && styles.postBtnTextDisabled]}>
              {t.create.publish}
            </Text>
          </TouchableOpacity>
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
                  <Ionicons
                    name={cfg.icon as any}
                    size={18}
                    color={active ? cfg.color : Colors.textMuted}
                  />
                  <Text style={[
                    styles.typeLabel,
                    { color: active ? cfg.color : Colors.textMuted },
                  ]}>
                    {typeLabels[type]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textLabel} />
            <Text style={styles.tipsText}>{t.create.tip}</Text>
          </View>
        </ScrollView>
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
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  cancelBtn: { flex: 1 },
  cancelText: { fontSize: FontSize.md, color: Colors.textMuted },
  headerTitle: {
    flex: 2,
    textAlign: 'center',
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  postBtn: {
    flex: 1, alignItems: 'flex-end',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  postBtnDisabled: { backgroundColor: Colors.border },
  postBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: '#fff', textAlign: 'center' },
  postBtnTextDisabled: { color: Colors.textMuted },

  scroll: { flex: 1, padding: Spacing.lg },

  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },

  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },

  textInputWrap: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 160,
  },
  textInput: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 24,
    minHeight: 130,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: FontSize.xs,
    color: Colors.textLabel,
    marginTop: Spacing.xs,
  },

  tipsCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  tipsText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
