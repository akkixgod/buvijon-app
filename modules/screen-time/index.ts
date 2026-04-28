export {
  hasPermission,
  requestPermission,
  getUsageStats,
  getUsageStatsForChild,
  getTotalScreenTime,
  getInstalledApps,
  hasOverlayPermission,
  requestOverlayPermission,
  startAppBlocker,
  stopAppBlocker,
  setChildPin,
  listenPinVerified,
  unlistenPinVerified,
  getActiveChildId,
  logoutChild,
} from './src/ScreenTimeModule';

export type {
  AppUsageInfo,
  InstalledApp,
  PinVerifiedEvent,
  ActiveChildChangedEvent,
} from './src/ScreenTimeModule';
