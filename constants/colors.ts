// ─── Buvijon Design System ───────────────────────────────────────────────────
// "White is the canvas. Color is used only to carry meaning — never for decoration."

export const Colors = {
  // Фоны
  background: '#FFFFFF',
  backgroundDeep: '#FFF0F7',   // лёгкий розовый тинт для хедеров
  surface: '#FFFFFF',
  surfaceSecondary: '#F8F8F8', // subtle surface

  // Основной акцент — Blossom Pink
  primary: '#E91E8C',
  primaryMid: '#E91E8C',
  primaryLight: '#F48DBD',
  primaryPale: '#FFF0F7',

  // Состояния цветка
  blooming: '#1D9E75',
  bloomingLight: '#E6F5F0',
  warning: '#BA7517',
  warningLight: '#FDF3E3',
  wilting: '#A32D2D',
  wiltingLight: '#FAE8E8',

  // Текст
  textPrimary: '#111111',
  textSecondary: '#333333',
  textMuted: '#888888',
  textLabel: '#AAAAAA',
  textOnDark: '#FFFFFF',

  // UI
  border: '#EEEEEE',
  borderLight: '#F0F0F0',
  shadow: 'rgba(0,0,0,0.06)',

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
