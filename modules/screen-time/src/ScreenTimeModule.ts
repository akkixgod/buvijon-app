import { requireNativeModule } from 'expo-modules-core';

export interface AppUsageInfo {
  packageName: string;
  appName: string;
  totalMinutes: number;
  lastUsed: number;
  launchCount: number;
}

export interface InstalledApp {
  packageName: string;
  appName: string;
}

export interface BlockerChildConfig {
  childId: string;
  childName: string;
  childPin: string;
  dailyLimitMinutes: number;
  blockedPackages: string[];
}

export interface BlockingPermissionStatus {
  usageAccess: boolean;
  overlay: boolean;
  accessibility: boolean;
  batteryOptimizationBypassed: boolean;
}

const NativeModule = requireNativeModule('ScreenTime');

/**
 * Check if the app has Usage Access permission.
 */
export function hasPermission(): boolean {
  return NativeModule.hasPermission();
}

/**
 * Open Android Settings so the user can grant Usage Access.
 */
export function requestPermission(): boolean {
  return NativeModule.requestPermission();
}

/**
 * Get per-app usage stats for a given time range.
 */
export function getUsageStats(startTime: number, endTime: number): AppUsageInfo[] {
  return NativeModule.getUsageStats(startTime, endTime);
}

/**
 * Get per-app usage stats attributed to a specific child.
 * Only counts foreground time inside *blocked* apps while this child's PIN
 * was the active session (set via the overlay).
 *
 * Returns the same AppUsageInfo shape as getUsageStats; launchCount is always 0.
 */
export function getUsageStatsForChild(
  childId: string,
  startTime: number,
  endTime: number
): AppUsageInfo[] {
  return NativeModule.getUsageStatsForChild(childId, startTime, endTime);
}

/**
 * The child whose PIN is currently the active session, or null if no session.
 * Persisted in SharedPreferences — survives app and service restarts.
 */
export function getActiveChildId(): string | null {
  const v = NativeModule.getActiveChildId();
  return v && typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * Clear the active child. Next blocked-app launch will show the PIN overlay again.
 */
export function logoutChild(): boolean {
  return NativeModule.logoutChild();
}

/**
 * Get total screen time today across all launchable apps (in minutes).
 */
export function getTotalScreenTime(): number {
  return NativeModule.getTotalScreenTime();
}

/**
 * Get all installed user-visible apps (with launcher icon).
 */
export function getInstalledApps(): InstalledApp[] {
  return NativeModule.getInstalledApps();
}

/**
 * Check if the app has overlay (draw over other apps) permission.
 */
export function hasOverlayPermission(): boolean {
  return NativeModule.hasOverlayPermission();
}

/**
 * Open settings to grant overlay permission.
 */
export function requestOverlayPermission(): boolean {
  return NativeModule.requestOverlayPermission();
}

/**
 * Check whether Buvijon's AccessibilityService is enabled.
 */
export function hasAccessibilityPermission(): boolean {
  return NativeModule.hasAccessibilityPermission();
}

/**
 * Open Android Accessibility Settings so the user can enable Buvijon.
 */
export function requestAccessibilityPermission(): boolean {
  return NativeModule.requestAccessibilityPermission();
}

/**
 * Check whether Android battery optimization is bypassed for Buvijon.
 */
export function hasBatteryOptimizationBypass(): boolean {
  return NativeModule.hasBatteryOptimizationBypass();
}

/**
 * Open Android battery optimization settings.
 */
export function requestBatteryOptimizationSettings(): boolean {
  return NativeModule.requestBatteryOptimizationSettings();
}

/**
 * Persist all child blocker configs and start/stop the native blocker service.
 */
export function syncBlockerConfigs(configs: BlockerChildConfig[]): boolean {
  return NativeModule.syncBlockerConfigs(configs);
}

export function getBlockingPermissionStatus(): BlockingPermissionStatus {
  return {
    usageAccess: hasPermission(),
    overlay: hasOverlayPermission(),
    accessibility: hasAccessibilityPermission(),
    batteryOptimizationBypassed: hasBatteryOptimizationBypass(),
  };
}

/**
 * Start the app blocker foreground service.
 * @param blockedPackages - Array of package names to block
 * @param childName - Name of the child (shown on overlay)
 * @param childId - ID of the child (for PIN verification)
 * @param childPin - 4-digit PIN code for this child
 */
export function startAppBlocker(
  blockedPackages: string[],
  childName: string,
  childId?: string,
  childPin?: string
): boolean {
  return NativeModule.startAppBlocker(blockedPackages, childName, childId, childPin);
}

/**
 * Set a child's PIN code (sends to background service).
 * @param childId - The child's ID
 * @param pin - 4-digit PIN code
 */
export function setChildPin(childId: string, pin: string): boolean {
  return NativeModule.setChildPin(childId, pin);
}

/**
 * Start listening for PIN verified events from the background service.
 * Call this in useEffect with cleanup.
 */
export function listenPinVerified(): void {
  NativeModule.listenPinVerified();
}

/**
 * Stop listening for PIN verified events.
 * Call this in useEffect cleanup.
 */
export function unlistenPinVerified(): void {
  NativeModule.unlistenPinVerified();
}

export interface PinVerifiedEvent {
  childId: string;
  childName: string;
}

export interface ActiveChildChangedEvent {
  /** Previous active child id, or empty string if none was active. */
  previousChildId: string;
  /** New active child id, or empty string on logout. */
  newChildId: string;
}

/**
 * Stop the app blocker service.
 */
export function stopAppBlocker(): boolean {
  return NativeModule.stopAppBlocker();
}
