import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { FlowerSVG } from '@/components/flower/FlowerSVG';
import { useChildrenStore } from '@/store/childrenStore';
import { useTranslation, formatDurationT } from '@/i18n';
import { FlowerVariant } from '@/types';

interface AddChildModalProps {
  visible: boolean;
  onClose: () => void;
}

const FLOWER_VARIANTS: FlowerVariant[] = ['rose', 'tulip', 'sunflower', 'daisy', 'lily'];
const FLOWER_COLORS = ['#E91E63', '#9C27B0', '#3F51B5', '#FF9800', '#4CAF50', '#FF5722', '#00BCD4', '#795548'];

// Common presets in minutes
const LIMIT_PRESETS = [30, 60, 90, 120, 180, 240];

// ─── LimitInput ───────────────────────────────────────────────────────────────

interface LimitInputProps {
  value: number;
  onChange: (v: number) => void;
}

function LimitInput({ value, onChange }: LimitInputProps) {
  const t = useTranslation();

  const [hStr, setHStr] = useState(() => Math.floor(value / 60).toString());
  const [mStr, setMStr] = useState(() => (value % 60).toString().padStart(2, '0'));

  // Sync with external value changes (preset taps or form reset)
  const lastValue = useRef(value);
  if (lastValue.current !== value) {
    lastValue.current = value;
    const newH = Math.floor(value / 60).toString();
    const newM = (value % 60).toString().padStart(2, '0');
    if (hStr !== newH) setHStr(newH);
    if (mStr !== newM) setMStr(newM);
  }

  const commit = (h: string, m: string) => {
    const hh = Math.min(23, Math.max(0, parseInt(h) || 0));
    const mm = Math.min(59, Math.max(0, parseInt(m) || 0));
    const total = hh * 60 + mm;
    onChange(total > 0 ? total : 1);
  };

  const selectPreset = (minutes: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(minutes);
  };

  return (
    <View style={limitStyles.container}>
      {/* Quick presets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={limitStyles.presetScroll}>
        {LIMIT_PRESETS.map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => selectPreset(p)}
            style={[limitStyles.preset, value === p && limitStyles.presetActive]}
          >
            <Text style={[limitStyles.presetText, value === p && limitStyles.presetTextActive]}>
              {formatDurationT(p, t)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Manual H : MM input */}
      <View style={limitStyles.inputRow}>
        <View style={limitStyles.field}>
          <TextInput
            style={limitStyles.timeInput}
            value={hStr}
            onChangeText={v => {
              setHStr(v);
              commit(v, mStr);
            }}
            onBlur={() => {
              const clamped = Math.min(23, Math.max(0, parseInt(hStr) || 0)).toString();
              setHStr(clamped);
            }}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            placeholderTextColor={Colors.textLabel}
          />
          <Text style={limitStyles.unit}>{t.duration.hour}</Text>
        </View>

        <Text style={limitStyles.colon}>:</Text>

        <View style={limitStyles.field}>
          <TextInput
            style={limitStyles.timeInput}
            value={mStr}
            onChangeText={v => {
              setMStr(v);
              commit(hStr, v);
            }}
            onBlur={() => {
              const clamped = Math.min(59, Math.max(0, parseInt(mStr) || 0));
              setMStr(clamped.toString().padStart(2, '0'));
            }}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            placeholderTextColor={Colors.textLabel}
          />
          <Text style={limitStyles.unit}>{t.duration.min}</Text>
        </View>
      </View>
    </View>
  );
}

const limitStyles = StyleSheet.create({
  container: { marginTop: 4 },
  presetScroll: { marginBottom: 14 },
  preset: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 0.5,
    borderColor: Colors.border, marginRight: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  presetActive: {
    backgroundColor: Colors.primaryPale,
    borderColor: Colors.primaryLight,
  },
  presetText: { fontSize: FontSize.sm, color: Colors.textMuted },
  presetTextActive: { color: Colors.primary, fontWeight: FontWeight.medium },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  field: { alignItems: 'center', gap: 4 },
  timeInput: {
    width: 80, height: 64,
    borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: Radius.md, backgroundColor: Colors.surfaceSecondary,
    fontSize: 32, fontWeight: FontWeight.medium,
    color: Colors.textPrimary, textAlign: 'center',
  },
  unit: { fontSize: 11, color: Colors.textLabel, letterSpacing: 0.5 },
  colon: {
    fontSize: 28, fontWeight: FontWeight.medium,
    color: Colors.textMuted, marginBottom: 20,
  },
});

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function AddChildModal({ visible, onClose }: AddChildModalProps) {
  const t = useTranslation();
  const addChild = useChildrenStore(s => s.addChild);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<FlowerVariant>('daisy');
  const [selectedColor, setSelectedColor] = useState(FLOWER_COLORS[0]);
  const [limitMinutes, setLimitMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) { setError(t.addChild.errName); return; }
    if (!age.trim() || isNaN(parseInt(age))) { setError(t.addChild.errAge); return; }
    setError('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    try {
      await addChild({
        name: name.trim(),
        age: parseInt(age, 10),
        flowerVariant: selectedVariant,
        flowerColor: selectedColor,
        dailyLimitMinutes: limitMinutes,
      });
      resetForm();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? t.addChild.errSave);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setAge('');
    setSelectedVariant('daisy');
    setSelectedColor(FLOWER_COLORS[0]);
    setLimitMinutes(60);
    setError('');
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={() => { resetForm(); onClose(); }}
      onSwipeComplete={() => { resetForm(); onClose(); }}
      swipeDirection="down"
      style={styles.modal}
      avoidKeyboard
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{t.addChild.title}</Text>
            <Text style={styles.subtitle}>{t.addChild.subtitle}</Text>

            <View style={styles.previewContainer}>
              <FlowerSVG variant={selectedVariant} state="blooming" color={selectedColor} size={110} />
            </View>

            <Text style={styles.label}>{t.addChild.nameLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.addChild.namePlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>{t.addChild.ageLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.addChild.agePlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={2}
            />

            <Text style={styles.label}>{t.addChild.flowerType}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
              {FLOWER_VARIANTS.map(variant => (
                <TouchableOpacity
                  key={variant}
                  onPress={() => setSelectedVariant(variant)}
                  style={[styles.flowerOption, selectedVariant === variant && styles.flowerOptionSelected]}
                >
                  <FlowerSVG variant={variant} state="blooming" color={selectedColor} size={56} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>{t.addChild.flowerColor}</Text>
            <View style={styles.colorRow}>
              {FLOWER_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                />
              ))}
            </View>

            <Text style={styles.label}>{t.addChild.limitLabel}</Text>
            <LimitInput value={limitMinutes} onChange={setLimitMinutes} />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title={t.addChild.addBtn}
              onPress={handleAdd}
              loading={loading}
              style={styles.addButton}
              size="lg"
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
    maxHeight: '94%',
  },
  handle: {
    width: 36, height: 3, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xs },
  previewContainer: { alignItems: 'center', marginVertical: Spacing.md },
  label: {
    fontSize: FontSize.xs, fontWeight: FontWeight.medium,
    color: Colors.textLabel, marginBottom: Spacing.label, marginTop: Spacing.lg,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  input: {
    borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md,
    fontSize: FontSize.md, color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
  },
  scrollRow: { marginBottom: Spacing.xs },
  flowerOption: {
    padding: Spacing.xs, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: 'transparent',
    marginRight: Spacing.xs,
  },
  flowerOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  colorDotSelected: { borderWidth: 2.5, borderColor: Colors.textPrimary },
  errorText: { color: Colors.wilting, fontSize: FontSize.sm, marginTop: Spacing.sm },
  addButton: { marginTop: Spacing.xl },
});
