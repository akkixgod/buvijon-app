export type FlowerState = 'blooming' | 'warning' | 'wilting';

export type FlowerVariant = 'rose' | 'tulip' | 'sunflower' | 'daisy' | 'lily';

export interface Child {
  id: string;
  name: string;
  age: number;
  avatar?: string;
  flowerVariant: FlowerVariant;
  flowerColor: string;
  dailyLimitMinutes: number;
  screenTimeToday: number;       // минут сегодня
  screenTimeWeek: number[];      // минут по дням (7 дней)
  isActive: boolean;
  createdAt: string;
  lastSeen?: string;
}

export interface ScreenTimeSession {
  id: string;
  childId: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  date: string;
}

export interface AppUsage {
  appName: string;
  packageName: string;
  iconUrl?: string;
  minutesToday: number;
  minutesWeek: number;
}

export interface DailyReport {
  date: string;
  childId: string;
  totalMinutes: number;
  limitMinutes: number;
  sessions: ScreenTimeSession[];
  appUsages: AppUsage[];
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  isPremium: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  childId: string;
  type: 'limit_warning' | 'limit_exceeded' | 'session_start' | 'weekly_report';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  imageUrl: string;
  createdAt: string;
  expiresAt: string;
  isViewed: boolean;
  isOwn: boolean;
}

export interface AppSettings {
  language: 'ru' | 'uz-cyrillic' | 'uz-latin';
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  weekStartsOn: 0 | 1;
}
