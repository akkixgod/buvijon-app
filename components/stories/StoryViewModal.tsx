import React, { useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Image, Dimensions, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Story } from '@/types';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';

interface Props {
  story: Story;
  onClose: () => void;
}

const { width: SW, height: SH } = Dimensions.get('window');

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor(diffMs / 60_000);
  if (h >= 1) return `${h}ч назад`;
  if (m >= 1) return `${m}м назад`;
  return 'только что';
}

export function StoryViewModal({ story, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const initials = story.authorName.slice(0, 2).toUpperCase();

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        <Image
          source={{ uri: story.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Gradient-like dark tint at top */}
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{story.authorName}</Text>
              <Text style={styles.timeAgo}>{timeAgo(story.createdAt)}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Progress bar (24h expiry) */}
        <View style={[styles.progressWrap, { top: insets.top + 4 }]}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${getProgress(story.createdAt, story.expiresAt)}%` }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getProgress(createdAt: string, expiresAt: string): number {
  const total = new Date(expiresAt).getTime() - new Date(createdAt).getTime();
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    position: 'absolute',
    top: 0, left: 0,
    width: SW,
    height: SH,
  },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarText: {
    color: '#fff',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  authorName: {
    color: '#fff',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.md,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.xs,
  },
  closeBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  progressWrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
});
