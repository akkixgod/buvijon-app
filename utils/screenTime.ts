import { FlowerState } from '@/types';

/**
 * Вычисляет состояние цветка на основе экранного времени
 * blooming  — ≤ 75% лимита
 * warning   — 76–100% лимита
 * wilting   — > 100% лимита
 */
export function getFlowerState(usedMinutes: number, limitMinutes: number): FlowerState {
  if (limitMinutes === 0) return 'blooming';
  const ratio = usedMinutes / limitMinutes;
  if (ratio > 1) return 'wilting';
  if (ratio > 0.75) return 'warning';
  return 'blooming';
}

/** Процент использованного лимита (0–100+) */
export function getUsagePercent(usedMinutes: number, limitMinutes: number): number {
  if (limitMinutes === 0) return 0;
  return Math.round((usedMinutes / limitMinutes) * 100);
}

/** Форматирует минуты → "2 ч 30 мин" */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return '0 мин';
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

/** Форматирует минуты → "2:30" */
export function formatDurationShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** Оставшееся время до лимита */
export function getRemainingMinutes(usedMinutes: number, limitMinutes: number): number {
  return Math.max(0, limitMinutes - usedMinutes);
}

/** Сегодняшняя дата в формате YYYY-MM-DD */
export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/** Последние N дней в формате YYYY-MM-DD */
export function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

/** Названия дней недели (короткие, на узбекском) */
export const DAY_NAMES_UZ = ['Якш', 'Душ', 'Сеш', 'Чор', 'Пай', 'Жум', 'Шан'];
export const DAY_NAMES_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function getDayName(dateStr: string, lang: 'uz' | 'ru' = 'ru'): string {
  const day = new Date(dateStr).getDay();
  return lang === 'uz' ? DAY_NAMES_UZ[day] : DAY_NAMES_RU[day];
}
