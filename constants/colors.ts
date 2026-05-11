// ─── Buvijon Design System ───────────────────────────────────────────────────
// "White is the canvas. Color is used only to carry meaning — never for decoration."

export const Colors = {
  // Фоны
  background: '#FFFFFF',
  backgroundDeep: '#F5F0FF',   // лёгкий фиолетовый тинт для хедеров
  surface: '#FFFFFF',
  surfaceSecondary: '#F8F6FF', // subtle purple surface

  // Основной акцент — Light Purple
  primary: '#7C3AED',
  primaryMid: '#8B5CF6',
  primaryLight: '#C4B5FD',
  primaryPale: '#F5F0FF',

  // Акцент для CTA (кнопка "+", важные действия)
  accent: '#7C3AED',
  accentLight: '#A78BFA',
  accentPale: '#EDE9FE',

  // Состояния цветка
  blooming: '#10B981',
  bloomingLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  wilting: '#EF4444',
  wiltingLight: '#FEF2F2',

  // Текст
  textPrimary: '#111111',
  textSecondary: '#333333',
  textTertiary: '#6B7280',
  textMuted: '#888888',
  textLabel: '#AAAAAA',
  textOnDark: '#FFFFFF',
  white: '#FFFFFF',

  // UI
  border: '#EEEEEE',
  borderLight: '#F0F0F0',
  shadow: 'rgba(0,0,0,0.06)',
  card: '#FFFFFF',
  error: '#EF4444',
  disabled: '#D1D5DB',
  gray: '#9CA3AF',
  success: '#10B981',

  // Цветочные горшки (для SVG)
  soil: '#6B4226',
  soilLight: '#A0674A',
  pot: '#8B5E3C',
};

import { FlowerState } from '@/types';
export type { FlowerState };

export const FlowerColors: Record<FlowerState, { primary: string; light: string }> = {
  blooming: { primary: Colors.blooming, light: Colors.bloomingLight },
  warning:  { primary: Colors.warning,  light: Colors.warningLight  },
  wilting:  { primary: Colors.wilting,  light: Colors.wiltingLight  },
};
