import { Dimensions, PixelRatio } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

export const SCREEN_WIDTH  = W;
export const SCREEN_HEIGHT = H;

// Базовый дизайн: 375×812 (iPhone 14)
const BASE_W = 375;
const BASE_H = 812;

/** Горизонтальный масштаб */
export const sw = (px: number) => (W / BASE_W) * px;

/** Вертикальный масштаб */
export const sh = (px: number) => (H / BASE_H) * px;

/**
 * Умеренный масштаб — основной для большинства размеров.
 * factor 0 = без масштабирования, 1 = полное масштабирование.
 */
export const ms = (px: number, factor = 0.5) =>
  Math.round(px + (sw(px) - px) * factor);

/** Масштаб шрифтов (мягкий) */
export const fs = (px: number) => ms(px, 0.3);

/** Является ли экран маленьким (< 360px) */
export const isSmallScreen = W < 360;

/** Является ли экран большим (> 414px) */
export const isLargeScreen = W > 414;

/** Ширина контента с отступами */
export const contentWidth = (horizontalPadding = 32) => W - horizontalPadding * 2;
