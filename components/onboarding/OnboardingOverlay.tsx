import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Radius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';

const { width: SW, height: SH } = Dimensions.get('window');
const OVERLAY_COLOR = 'rgba(0,0,0,0.72)';
const SPOTLIGHT_PAD = 10; // extra space around highlighted element

export interface Highlight {
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number; // border-radius of the ring
}

export interface OnboardingStep {
  title: string;
  body: string;
  /** Element position to spotlight. null = full dark overlay, tooltip centred */
  highlight: Highlight | null;
  /** Which side of the highlight the tooltip arrow appears on */
  arrowSide?: 'top' | 'bottom';
}

interface Props {
  steps: OnboardingStep[];
  visible: boolean;
  onComplete: () => void;
}

export function OnboardingOverlay({ steps, visible, onComplete }: Props) {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const [stepIdx, setStepIdx] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStepIdx(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(cardAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const animateStepChange = (next: () => void) => {
    Animated.timing(cardAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }).start(() => {
      next();
      Animated.spring(cardAnim, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }).start();
    });
  };

  const handleNext = () => {
    animateStepChange(() => {
      if (stepIdx < steps.length - 1) {
        setStepIdx(s => s + 1);
      } else {
        handleFinish();
      }
    });
  };

  const handleFinish = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onComplete);
  };

  if (!visible || steps.length === 0) return null;

  const current = steps[Math.min(stepIdx, steps.length - 1)];
  const isLast = stepIdx === steps.length - 1;
  const hl = current?.highlight;

  // ── Spotlight geometry ──────────────────────────────────────────────────
  const sp = hl
    ? {
        x: hl.x - SPOTLIGHT_PAD,
        y: hl.y - SPOTLIGHT_PAD,
        w: hl.w + SPOTLIGHT_PAD * 2,
        h: hl.h + SPOTLIGHT_PAD * 2,
        r: (hl.radius ?? Math.min(hl.w, hl.h) / 2) + SPOTLIGHT_PAD,
      }
    : null;

  // ── Tooltip positioning ─────────────────────────────────────────────────
  const TOOLTIP_W = SW - 48;
  const ARROW_H = 12;
  const TOOLTIP_PAD = 16;

  let tooltipTop: number;
  let arrowDir: 'up' | 'down' | null = null;
  // Arrow horizontal center relative to tooltip's left edge
  let arrowCenterX = TOOLTIP_W / 2;

  // Use measured card height; fall back to 200 on first render
  const CARD_H = cardHeight > 0 ? cardHeight + ARROW_H : 200;

  if (!sp) {
    // No highlight → centre on screen
    tooltipTop = SH / 2 - CARD_H / 2;
  } else if (current.arrowSide === 'bottom' || sp.y + sp.h / 2 > SH * 0.6) {
    // Highlight in bottom half → tooltip ABOVE, arrow points DOWN
    tooltipTop = sp.y - CARD_H;
    arrowDir = 'down';
    arrowCenterX = sp.x + sp.w / 2 - 24; // 24 = tooltip left margin
  } else {
    // Highlight in top half → tooltip BELOW, arrow points UP
    tooltipTop = sp.y + sp.h + ARROW_H;
    arrowDir = 'up';
    arrowCenterX = sp.x + sp.w / 2 - 24;
  }

  // Clamp to screen
  tooltipTop = Math.max(insets.top + 12, Math.min(SH - insets.bottom - CARD_H - 12, tooltipTop));
  // Clamp arrow within tooltip width
  arrowCenterX = Math.max(20, Math.min(TOOLTIP_W - 40, arrowCenterX));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {/* swallow Android back */}}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>

        {/* ── Dark overlay (4 rects creating a spotlight hole) ── */}
        {sp ? (
          <>
            {/* Top */}
            <View style={[styles.dark, { top: 0, left: 0, right: 0, height: sp.y }]} />
            {/* Bottom */}
            <View style={[styles.dark, { top: sp.y + sp.h, left: 0, right: 0, bottom: 0 }]} />
            {/* Left */}
            <View style={[styles.dark, { top: sp.y, left: 0, width: sp.x, height: sp.h }]} />
            {/* Right */}
            <View style={[styles.dark, { top: sp.y, left: sp.x + sp.w, right: 0, height: sp.h }]} />
            {/* Spotlight ring */}
            <View
              style={[
                styles.ring,
                { left: sp.x, top: sp.y, width: sp.w, height: sp.h, borderRadius: sp.r },
              ]}
            />
          </>
        ) : (
          // Full dark overlay
          <View style={[StyleSheet.absoluteFill, styles.dark]} />
        )}

        {/* ── Tooltip card ── */}
        <Animated.View
          style={[
            styles.card,
            {
              top: tooltipTop,
              left: 24,
              width: TOOLTIP_W,
              transform: [{ scale: cardAnim }],
            },
          ]}
          onLayout={e => setCardHeight(e.nativeEvent.layout.height)}
        >
          {/* Arrow UP (tooltip is below the highlight) */}
          {arrowDir === 'up' && (
            <View style={[styles.arrowUp, { left: arrowCenterX }]} />
          )}

          {/* Step counter */}
          <View style={styles.stepRow}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === stepIdx && styles.dotActive]} />
            ))}
          </View>

          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          <View style={styles.btnRow}>
            {!isLast && (
              <TouchableOpacity onPress={handleFinish} style={styles.skipBtn} activeOpacity={0.7}>
                <Text style={styles.skipText}>{t.onboarding.skip}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleNext}
              style={[styles.nextBtn, isLast && styles.nextBtnFull]}
              activeOpacity={0.85}
            >
              <Text style={styles.nextText}>
                {isLast ? t.onboarding.done : t.onboarding.next} {isLast ? '' : '→'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Arrow DOWN (tooltip is above the highlight) */}
          {arrowDir === 'down' && (
            <View style={[styles.arrowDown, { left: arrowCenterX }]} />
          )}
        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dark: {
    position: 'absolute',
    backgroundColor: OVERLAY_COLOR,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },

  // Tooltip card
  card: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },

  // Step dots
  stepRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.borderLight,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },

  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },

  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  skipBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  nextBtnFull: {
    flex: 1,
    alignItems: 'center',
  },
  nextText: {
    color: Colors.textOnDark,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },

  // Arrows (CSS triangle trick)
  arrowUp: {
    position: 'absolute',
    top: -12,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    borderBottomWidth: 12,
    borderBottomColor: Colors.surface,
  },
  arrowDown: {
    position: 'absolute',
    bottom: -12,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    borderTopWidth: 12,
    borderTopColor: Colors.surface,
  },
});
