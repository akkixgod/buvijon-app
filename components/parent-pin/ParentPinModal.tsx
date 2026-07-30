import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useParentPinStore } from '@/store/parentPinStore';

const NUMPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['biometric', '0', 'backspace'],
] as const;

type NumpadKey = (typeof NUMPAD_KEYS)[number][number];

interface ParentPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ParentPinModal({ visible, onClose, onSuccess }: ParentPinModalProps) {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const keySize = Math.min(76, Math.floor((width - Spacing.lg * 2 - 24) / 3));

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  const {
    isBiometricEnabled,
    unlockWithPin,
    unlockWithBiometric,
    setupPin,
    hasSetupPin,
    setBiometricEnabled,
  } = useParentPinStore();

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const hasPin = await hasSetupPin();
      if (!cancelled) setShowSetup(!hasPin);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, hasSetupPin]);

  useEffect(() => {
    if (!visible) return;
    setPin('');
    setError('');
    setLoading(false);
    setBioBusy(false);
  }, [visible]);

  // Auto-trigger biometric when the lock screen mounts / opens
  useEffect(() => {
    if (!visible || showSetup || !isBiometricEnabled) return;
    const timer = setTimeout(() => {
      void tryBiometric(true);
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, showSetup, isBiometricEnabled]);

  const tryBiometric = async (silent = false) => {
    if (!isBiometricEnabled || showSetup || bioBusy || loading) return;
    setBioBusy(true);
    if (!silent) setError('');
    try {
      const success = await unlockWithBiometric();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      } else if (!silent) {
        setError(t.parentPin.wrongPin);
      }
    } catch {
      if (!silent) setError(t.parentPin.wrongPin);
    } finally {
      setBioBusy(false);
    }
  };

  const submitPin = async (value: string) => {
    if (value.length !== 4 || loading) return;
    setLoading(true);
    setError('');
    try {
      if (showSetup) {
        const ok = await setupPin(value);
        if (ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess();
          return;
        }
        setError(t.parentPin.errPinLength);
        setPin('');
        return;
      }

      const ok = await unlockWithPin(value);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
        return;
      }
      setError(t.parentPin.wrongPin);
      setPin('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      setError(showSetup ? t.parentPin.errPinLength : t.parentPin.wrongPin);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const appendDigit = (digit: string) => {
    if (loading || pin.length >= 4) return;
    Haptics.selectionAsync().catch(() => {});
    const next = `${pin}${digit}`.slice(0, 4);
    setPin(next);
    setError('');
    if (next.length === 4) void submitPin(next);
  };

  const backspace = () => {
    if (loading || !pin.length) return;
    Haptics.selectionAsync().catch(() => {});
    setPin(prev => prev.slice(0, -1));
  };

  const handleBiometricToggle = () => {
    setBiometricEnabled(!isBiometricEnabled);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderKey = (key: NumpadKey) => {
    if (key === 'biometric') {
      if (showSetup || !isBiometricEnabled) {
        return <View key={key} style={[styles.key, { width: keySize, height: keySize }]} />;
      }
      return (
        <TouchableOpacity
          key={key}
          style={[styles.key, { width: keySize, height: keySize }]}
          onPress={() => void tryBiometric(false)}
          disabled={bioBusy || loading}
          activeOpacity={0.7}
          accessibilityLabel={t.parentPin.biometricLabel}
        >
          {bioBusy ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Ionicons name="finger-print" size={28} color={Colors.primary} />
          )}
        </TouchableOpacity>
      );
    }

    if (key === 'backspace') {
      return (
        <TouchableOpacity
          key={key}
          style={[styles.key, { width: keySize, height: keySize }]}
          onPress={backspace}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="backspace-outline" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={key}
        style={[styles.key, { width: keySize, height: keySize }]}
        onPress={() => appendDigit(key)}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Text style={styles.keyDigit}>{key}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, Spacing.lg),
            paddingBottom: Math.max(insets.bottom, Spacing.md),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.brand}>Buvijon</Text>
          <Text style={styles.title}>
            {showSetup ? t.parentPin.setupTitle : t.parentPin.lockTitle}
          </Text>
          <Text style={styles.subtitle}>
            {showSetup ? t.parentPin.setupSubtitle : t.parentPin.lockSubtitle}
          </Text>

          <View style={styles.dotsRow} accessibilityLabel={`PIN ${pin.length} of 4`}>
            {Array.from({ length: 4 }, (_, i) => {
              const on = i < pin.length;
              return <View key={i} style={[styles.dot, on && styles.dotFilled]} />;
            })}
          </View>

          <View style={styles.errorSlot}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <ActivityIndicator color={Colors.primary} /> : null}
          </View>
        </View>

        <View style={styles.spacer} />

        <View style={styles.numpad} pointerEvents={loading ? 'none' : 'auto'}>
          {NUMPAD_KEYS.map((row, ri) => (
            <View key={`r-${ri}`} style={styles.numpadRow}>
              {row.map(key => renderKey(key))}
            </View>
          ))}
        </View>

        <Text style={styles.hint}>
          {showSetup ? t.parentPin.setupSubtitle : t.parentPin.lockHint}
        </Text>

        {!showSetup ? (
          <TouchableOpacity style={styles.bioToggle} onPress={handleBiometricToggle}>
            <View style={styles.bioTrack}>
              <View style={[styles.bioKnob, isBiometricEnabled && styles.bioKnobOn]} />
            </View>
            <Text style={styles.bioToggleText}>{t.parentPin.biometricToggle}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{t.parentPin.cancelBtn}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  brand: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontSize: FontSize.md,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    minHeight: 44,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    height: 18,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  errorSlot: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: Colors.wilting,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  spacer: { flex: 1, minHeight: Spacing.md },
  numpad: {
    paddingBottom: Spacing.sm,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  key: {
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDigit: {
    fontSize: 26,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  hint: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
    minHeight: 40,
  },
  bioToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  bioTrack: {
    width: 44,
    height: 24,
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  bioKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  bioKnobOn: {
    backgroundColor: Colors.primary,
    marginLeft: 20,
  },
  bioToggleText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  cancelBtn: {
    alignSelf: 'center',
    padding: Spacing.sm,
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
});
