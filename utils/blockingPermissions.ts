import { Platform } from 'react-native';

let ScreenTime: typeof import('screen-time') | null = null;
try {
  ScreenTime = require('screen-time');
} catch {
  ScreenTime = null;
}

export function getMissingBlockingPermissions(): string[] {
  if (Platform.OS !== 'android' || !ScreenTime) return [];
  const missing: string[] = [];
  try {
    if (!ScreenTime.hasPermission()) missing.push('usage');
    if (!ScreenTime.hasOverlayPermission()) missing.push('overlay');
    if (!ScreenTime.hasAccessibilityPermission()) missing.push('accessibility');
    if (!ScreenTime.hasBatteryOptimizationBypass()) missing.push('battery');
  } catch {
    return [];
  }
  return missing;
}

export function hasRequiredBlockingPermissions(): boolean {
  const missing = getMissingBlockingPermissions();
  return missing.length === 0 || (missing.length === 1 && missing[0] === 'battery');
}
