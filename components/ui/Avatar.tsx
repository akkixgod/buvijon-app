import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle | ImageStyle;
}

const PALETTE = [
  '#7C3AED', '#8B5CF6', '#6D28D9', '#4C1D95',
  '#10B981', '#059669', '#047857',
  '#F59E0B', '#D97706', '#B45309',
  '#EF4444', '#DC2626', '#B91C1C',
  '#3B82F6', '#2563EB', '#1D4ED8',
];

function colorForName(name: string): string {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({ uri, name = '', size = 40, style }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const fontSize = Math.round(size * 0.4);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style as ImageStyle]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colorForName(name) },
        style,
      ]}
    >
      <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: undefined,
  },
});
