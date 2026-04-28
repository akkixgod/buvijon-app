import { useState, useEffect, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
 * Hook to get screen time data from Android UsageStatsManager.
 *
 * - Without `childId`: returns device-wide usage (today, since install).
 * - With `childId`: returns time attributed to that specific child via PIN
 *   sessions in the AppBlockerService overlay. Only blocked apps contribute.
 *
 * Falls back gracefully on unsupported platforms.
 */
export function useScreenTime(childId?: string): ScreenTimeData & {
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

  // Time of first registration — used as floor for screen time queries
  const [installTime, setInstallTime] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('@buvijon_install_time').then(v => {
      if (v) setInstallTime(parseInt(v, 10));
    });
  }, []);

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

    // Count time only from when app was first installed/registered (today floor)
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const effectiveStart = installTime > midnight ? installTime : midnight;
    const endTime = now.getTime();

    const apps = childId
      ? ScreenTime.getUsageStatsForChild(childId, effectiveStart, endTime)
      : ScreenTime.getUsageStats(effectiveStart, endTime);
    // Derive total from apps array — consistent with the same time range
    const totalMinutes = apps.reduce((sum, a) => sum + a.totalMinutes, 0);

    setData({
      apps,
      totalMinutes,
      hasPermission: true,
      isSupported: true,
      loading: false,
    });
  }, [isSupported, installTime, childId]);

  // Fetch on mount + whenever childId / installTime changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch when app returns to foreground (user may have granted permission,
  // or accumulated more time in the background overlay session)
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
