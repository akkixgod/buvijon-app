import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontWeight } from '@/constants/theme';

interface Props {
  uri?: string;
  name: string;
  size?: number;
  style?: ViewStyle;
}

export function AvatarCircle({ uri, name, size = 44, style }: Props) {
  const [imgError, setImgError] = useState(false);
  const radius = size / 2;
  const fontSize = size * 0.4;
  const initial = name?.[0]?.toUpperCase() || '?';

  if (uri && !imgError) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: radius }, style]}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
});
