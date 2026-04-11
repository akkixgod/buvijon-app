import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useParentPinStore } from '@/store/parentPinStore';

interface ParentPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ParentPinModal({ visible, onClose, onSuccess }: ParentPinModalProps) {
  const t = useTranslation();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  const {
    isUnlocked,
    isBiometricEnabled,
    unlockWithPin,
    unlockWithBiometric,
    setupPin,
    hasSetupPin,
    setBiometricEnabled,
  } = useParentPinStore();

  // Check if PIN is already set up
  useEffect(() => {
    async function check() {
      const hasPin = await hasSetupPin();
      setShowSetup(!hasPin);
    }
    check();
  }, [visible]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setPin('');
      setError('');
      setLoading(false);
    }
  }, [visible]);

  const handleBiometric = async () => {
    setError('');
    setLoading(true);
    try {
      const success = await unlockWithBiometric();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      } else {
        setError(t.parentPin.wrongPin);
      }
    } catch {
      setError(t.parentPin.wrongPin);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      setError(t.parentPin.errPinLength);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const success = await unlockWithPin(pin);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      } else {
        setError(t.parentPin.wrongPin);
        setPin('');
      }
    } catch {
      setError(t.parentPin.wrongPin);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    if (pin.length !== 4) {
      setError(t.parentPin.errPinLength);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const success = await setupPin(pin);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      } else {
        setError(t.parentPin.errPinLength);
      }
    } catch {
      setError(t.parentPin.errPinLength);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricToggle = async () => {
    const newState = !isBiometricEnabled;
    setBiometricEnabled(newState);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleBack}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <TouchableOpacity style={styles.overlay} onPress={handleBack}>
          <View style={styles.container}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleBack}
            >
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>

            <Text style={styles.title}>
              {showSetup ? t.parentPin.setupTitle : t.parentPin.title}
            </Text>
            <Text style={styles.subtitle}>
              {showSetup ? t.parentPin.setupSubtitle : t.parentPin.subtitle}
            </Text>

            <View style={styles.pinSection}>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={24} color={Colors.primary} />
                <TextInput
                  style={styles.pinInput}
                  placeholder={showSetup ? t.parentPin.setupPinPlaceholder : t.parentPin.pinPlaceholder}
                  placeholderTextColor={Colors.textMuted}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  autoFocus
                  textAlign="center"
                  selectionColor={Colors.primary}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.buttonsRow}>
                {showSetup ? (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={handleBack}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryBtnText}>{t.parentPin.cancelBtn}</Text>
                  </TouchableOpacity>
                ) : isBiometricEnabled && (
                  <TouchableOpacity
                    style={styles.biometricBtn}
                    onPress={handleBiometric}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="finger-print" size={20} color={Colors.primary} />
                    <Text style={styles.biometricBtnText}>{t.parentPin.biometricLabel}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                  onPress={showSetup ? handleSetup : handlePinSubmit}
                  disabled={loading || pin.length !== 4}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {showSetup ? t.parentPin.setupBtn : t.parentPin.unlockBtn}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {!showSetup && (
              <TouchableOpacity
                style={styles.biometricToggle}
                onPress={handleBiometricToggle}
              >
                <View style={styles.biometricToggleTrack}>
                  <View style={[styles.biometricToggleKnob, isBiometricEnabled && styles.biometricToggleKnobOn]} />
                </View>
                <Text style={styles.biometricToggleText}>{t.parentPin.biometricToggle}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '88%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  pinSection: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  pinInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    letterSpacing: 12,
  },
  errorText: {
    color: Colors.wilting,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    width: '100%',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.primaryLight,
  },
  primaryBtnText: {
    color: Colors.textOnDark,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  secondaryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  biometricBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  biometricToggleTrack: {
    width: 44,
    height: 24,
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
  },
  biometricToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  biometricToggleKnobOn: {
    backgroundColor: Colors.primary,
  },
  biometricToggleText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
