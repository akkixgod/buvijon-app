import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { FlowerSVG } from './FlowerSVG';
import { FlowerVariant } from '@/types';
import { getFlowerState } from '@/utils/screenTime';

interface AnimatedFlowerProps {
  variant?: FlowerVariant;
  color: string;
  usedMinutes: number;
  limitMinutes: number;
  size?: number;
}

export function AnimatedFlower({ variant = 'daisy', color, usedMinutes, limitMinutes, size = 120 }: AnimatedFlowerProps) {
  const state = getFlowerState(usedMinutes, limitMinutes);
  const percent = (limitMinutes > 0) ? (usedMinutes / limitMinutes) * 100 : 0;
  const droopAmount = state === 'wilting' ? Math.min(1, (percent - 100) / 50) : 0;

  const swayAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    swayAnim.stopAnimation();
    pulseAnim.stopAnimation();
    swayAnim.setValue(0);
    pulseAnim.setValue(1);

    if (state === 'blooming') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(swayAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(swayAnim, { toValue: -1, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    } else if (state === 'warning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.97, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else if (state === 'wilting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(swayAnim, { toValue: 1.5, duration: 3000, useNativeDriver: true }),
          Animated.timing(swayAnim, { toValue: 0.8, duration: 3000, useNativeDriver: true }),
        ])
      ).start();
    }

    return () => {
      swayAnim.stopAnimation();
      pulseAnim.stopAnimation();
    };
  }, [state]);

  const rotate = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: state === 'wilting' ? ['0deg', '15deg'] : ['-4deg', '4deg'],
  });

  return (
    <Animated.View style={[
      styles.container,
      { width: size, height: size },
      { transform: [{ rotate }, { scale: pulseAnim }] },
    ]}>
      <FlowerSVG
        variant={variant}
        state={state}
        color={color}
        size={size}
        droopAmount={droopAmount}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
