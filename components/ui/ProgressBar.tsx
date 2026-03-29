import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { Colors, FlowerColors } from '@/constants/colors';
import { FlowerState } from '@/types';
import { Radius } from '@/constants/theme';

interface ProgressBarProps {
  progress: number;
  state: FlowerState;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export function ProgressBar({ progress, state, height = 8, style, animated = true }: ProgressBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const capped = Math.min(progress, 100);
  const color = FlowerColors[state].primary;

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: capped,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(capped);
    }
  }, [capped]);

  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height }, style]}>
      <Animated.View style={[
        styles.fill,
        { backgroundColor: color, height, borderRadius: Radius.full, width: widthInterpolated }
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 99,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {},
});
