import { Platform } from 'react-native';

export type SortableApp = {
  packageName: string;
  appName: string;
};

export type UsageSortMeta = {
  /** Foreground minutes today (device usage stats). */
  todayMinutes: number;
  /** Launch count today when available. */
  launchCount: number;
  /** Last used timestamp (ms). */
  lastUsed: number;
};

type ScreenTimeModule = typeof import('screen-time');

let ScreenTime: ScreenTimeModule | null = null;
try {
  if (Platform.OS === 'android') {
    ScreenTime = require('screen-time');
  }
} catch {
  ScreenTime = null;
}

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Load today's per-package usage from the native UsageStats module.
 * Returns an empty map when permission/module is unavailable.
 */
export function fetchTodayUsageByPackage(): Map<string, UsageSortMeta> {
  const map = new Map<string, UsageSortMeta>();
  if (!ScreenTime) return map;

  try {
    if (typeof ScreenTime.hasPermission === 'function' && !ScreenTime.hasPermission()) {
      return map;
    }
    const start = startOfTodayMs();
    const end = Date.now();
    const stats = ScreenTime.getUsageStats(start, end) ?? [];
    for (const row of stats) {
      const pkg = row?.packageName;
      if (!pkg) continue;
      map.set(pkg, {
        todayMinutes: Number(row.totalMinutes) || 0,
        launchCount: Number(row.launchCount) || 0,
        lastUsed: Number(row.lastUsed) || 0,
      });
    }
  } catch {
    /* permission denied / OEM quirks — fall through to empty usage */
  }
  return map;
}

/**
 * Sort apps by today's usage descending.
 * Tie-breakers: launchCount → lastUsed → packageName (stable, never alpha by appName as primary).
 */
export function sortAppsByDailyUsage<T extends SortableApp>(
  apps: T[],
  usageByPackage?: Map<string, UsageSortMeta>,
): T[] {
  const usage = usageByPackage ?? fetchTodayUsageByPackage();

  return [...apps].sort((a, b) => {
    const ua = usage.get(a.packageName);
    const ub = usage.get(b.packageName);
    const ma = ua?.todayMinutes ?? 0;
    const mb = ub?.todayMinutes ?? 0;
    if (mb !== ma) return mb - ma;

    const la = ua?.launchCount ?? 0;
    const lb = ub?.launchCount ?? 0;
    if (lb !== la) return lb - la;

    const ta = ua?.lastUsed ?? 0;
    const tb = ub?.lastUsed ?? 0;
    if (tb !== ta) return tb - ta;

    return a.packageName.localeCompare(b.packageName);
  });
}
