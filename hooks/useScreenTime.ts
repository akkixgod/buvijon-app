import { useState, useEffect, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import type { AppUsageInfo } from 'screen-time';

// Lazy-load native module — will be null on iOS / web / Expo Go
let ScreenTime: typeof import('screen-time') | null = null;
try {
  ScreenTime = require('screen-time');
} catch {
  ScreenTime = null;
}

export interface ScreenTimeData {
  apps: AppUsageInfo[];
  totalMinutes: number;
  hasPermission: boolean;
  isSupported: boolean;
  loading: boolean;
}

/**
 * Hook to get today's real screen time data from Android UsageStatsManager.
 * Falls back gracefully on unsupported platforms.
 */
export function useScreenTime(): ScreenTimeData & {
  refresh: () => void;
  openPermissionSettings: () => void;
} {
  const isSupported = Platform.OS === 'android' && ScreenTime !== null;

  const [data, setData] = useState<ScreenTimeData>({
    apps: [],
    totalMinutes: 0,
    hasPermission: false,
    isSupported,
    loading: true,
  });

  const fetchData = useCallback(() => {
    if (!isSupported || !ScreenTime) {
      setData(prev => ({ ...prev, loading: false, isSupported: false }));
      return;
    }

    const permitted = ScreenTime.hasPermission();
    if (!permitted) {
      setData(prev => ({
        ...prev,
        hasPermission: false,
        loading: false,
        isSupported: true,
      }));
      return;
    }

    // Get today's time range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endTime = now.getTime();

    const apps = ScreenTime.getUsageStats(startOfDay, endTime);
    const totalMinutes = ScreenTime.getTotalScreenTime();

    setData({
      apps,
      totalMinutes,
      hasPermission: true,
      isSupported: true,
      loading: false,
    });
  }, [isSupported]);

  // Fetch on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch when app returns to foreground (user may have granted permission)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchData();
      }
    });
    return () => sub.remove();
  }, [fetchData]);

  const openPermissionSettings = useCallback(() => {
    if (ScreenTime) {
      ScreenTime.requestPermission();
    }
  }, []);

  return {
    ...data,
    refresh: fetchData,
    openPermissionSettings,
  };
}
