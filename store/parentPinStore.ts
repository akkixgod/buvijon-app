import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PARENT_PIN_KEY = 'buvijon_parent_pin';
const PARENT_BIOMETRIC_KEY = 'buvijon_parent_biometric';
const PARENT_PIN_FAILS_KEY = 'buvijon_parent_pin_fails';
const PARENT_PIN_COOLDOWN_KEY = 'buvijon_parent_pin_cooldown_until';
const PARENT_AUTOLOCK_KEY = 'buvijon_parent_autolock_ms';
const PARENT_PIN_AUDIT_KEY = 'buvijon_parent_pin_audit';

const MAX_ATTEMPTS = 5;
const BASE_COOLDOWN_MS = 30_000;
const DEFAULT_AUTOLOCK_MS = 60_000;

export interface PinAuditEvent {
  at: string;
  method: 'pin' | 'biometric';
  action: 'success' | 'failed' | 'locked_out';
}

interface ParentPinState {
  isUnlocked: boolean;
  isBiometricEnabled: boolean;
  failedAttempts: number;
  cooldownUntil: number | null;
  autoLockMs: number;
  auditLog: PinAuditEvent[];
  loadSecurityState: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => void;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  lock: () => void;
  setupPin: (pin: string) => Promise<boolean>;
  hasSetupPin: () => Promise<boolean>;
  removePin: () => Promise<void>;
  setAutoLockMs: (ms: number) => Promise<void>;
  getRemainingCooldownMs: () => number;
  clearAuditLog: () => Promise<void>;
}

export const useParentPinStore = create<ParentPinState>((set, get) => ({
  isUnlocked: false,
  isBiometricEnabled: false,
  failedAttempts: 0,
  cooldownUntil: null,
  autoLockMs: DEFAULT_AUTOLOCK_MS,
  auditLog: [],

  loadSecurityState: async () => {
    try {
      const [failsRaw, cooldownRaw, autolockRaw, auditRaw] = await Promise.all([
        SecureStore.getItemAsync(PARENT_PIN_FAILS_KEY),
        SecureStore.getItemAsync(PARENT_PIN_COOLDOWN_KEY),
        SecureStore.getItemAsync(PARENT_AUTOLOCK_KEY),
        SecureStore.getItemAsync(PARENT_PIN_AUDIT_KEY),
      ]);
      const failedAttempts = Number(failsRaw || 0);
      const cooldownUntil = cooldownRaw ? Number(cooldownRaw) : null;
      const autoLockMs = Number(autolockRaw || DEFAULT_AUTOLOCK_MS);
      const auditLog = auditRaw ? (JSON.parse(auditRaw) as PinAuditEvent[]) : [];
      set({
        failedAttempts: Number.isFinite(failedAttempts) ? failedAttempts : 0,
        cooldownUntil: cooldownUntil && Number.isFinite(cooldownUntil) ? cooldownUntil : null,
        autoLockMs: Number.isFinite(autoLockMs) ? Math.max(15_000, autoLockMs) : DEFAULT_AUTOLOCK_MS,
        auditLog: Array.isArray(auditLog) ? auditLog : [],
      });
    } catch {}
  },

  setBiometricEnabled: (enabled) => {
    set({ isBiometricEnabled: enabled });
    SecureStore.setItemAsync(PARENT_BIOMETRIC_KEY, enabled ? 'true' : 'false');
  },

  unlockWithPin: async (pin: string) => {
    const now = Date.now();
    const { cooldownUntil, failedAttempts, auditLog } = get();
    if (cooldownUntil && cooldownUntil > now) {
      const event: PinAuditEvent = { at: new Date().toISOString(), method: 'pin', action: 'locked_out' };
      const nextAudit = [event, ...auditLog].slice(0, 100);
      set({ auditLog: nextAudit });
      SecureStore.setItemAsync(PARENT_PIN_AUDIT_KEY, JSON.stringify(nextAudit));
      return false;
    }

    try {
      const savedPin = await SecureStore.getItemAsync(PARENT_PIN_KEY);
      if (savedPin === pin) {
        const event: PinAuditEvent = { at: new Date().toISOString(), method: 'pin', action: 'success' };
        const nextAudit = [event, ...auditLog].slice(0, 100);
        set({ isUnlocked: true, failedAttempts: 0, cooldownUntil: null, auditLog: nextAudit });
        await Promise.all([
          SecureStore.setItemAsync(PARENT_PIN_FAILS_KEY, '0'),
          SecureStore.deleteItemAsync(PARENT_PIN_COOLDOWN_KEY),
          SecureStore.setItemAsync(PARENT_PIN_AUDIT_KEY, JSON.stringify(nextAudit)),
        ]);
        return true;
      }
      const nextFails = failedAttempts + 1;
      const isLocked = nextFails >= MAX_ATTEMPTS;
      const lockMs = isLocked ? BASE_COOLDOWN_MS * Math.pow(2, Math.max(0, nextFails - MAX_ATTEMPTS)) : 0;
      const nextCooldownUntil = isLocked ? now + lockMs : null;
      const event: PinAuditEvent = {
        at: new Date().toISOString(),
        method: 'pin',
        action: isLocked ? 'locked_out' : 'failed',
      };
      const nextAudit = [event, ...auditLog].slice(0, 100);
      set({ failedAttempts: nextFails, cooldownUntil: nextCooldownUntil, auditLog: nextAudit });
      await Promise.all([
        SecureStore.setItemAsync(PARENT_PIN_FAILS_KEY, String(nextFails)),
        nextCooldownUntil
          ? SecureStore.setItemAsync(PARENT_PIN_COOLDOWN_KEY, String(nextCooldownUntil))
          : SecureStore.deleteItemAsync(PARENT_PIN_COOLDOWN_KEY),
        SecureStore.setItemAsync(PARENT_PIN_AUDIT_KEY, JSON.stringify(nextAudit)),
      ]);
      return false;
    } catch {
      return false;
    }
  },

  unlockWithBiometric: async () => {
    try {
      // Check if biometric is set up
      const biometricEnabled = await SecureStore.getItemAsync(PARENT_BIOMETRIC_KEY);
      if (biometricEnabled !== 'true') {
        return false;
      }

      // Check if PIN is set up
      const savedPin = await SecureStore.getItemAsync(PARENT_PIN_KEY);
      if (!savedPin) {
        return false;
      }

      // Perform biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Подтвердите, что вы родитель',
        fallbackLabel: 'Использовать PIN',
        cancelLabel: 'Отмена',
      });

      if (result.success) {
        const { auditLog } = get();
        const event: PinAuditEvent = { at: new Date().toISOString(), method: 'biometric', action: 'success' };
        const nextAudit = [event, ...auditLog].slice(0, 100);
        set({ isUnlocked: true, failedAttempts: 0, cooldownUntil: null, auditLog: nextAudit });
        await Promise.all([
          SecureStore.setItemAsync(PARENT_PIN_FAILS_KEY, '0'),
          SecureStore.deleteItemAsync(PARENT_PIN_COOLDOWN_KEY),
          SecureStore.setItemAsync(PARENT_PIN_AUDIT_KEY, JSON.stringify(nextAudit)),
        ]);
        return true;
      }
      const { auditLog } = get();
      const event: PinAuditEvent = { at: new Date().toISOString(), method: 'biometric', action: 'failed' };
      const nextAudit = [event, ...auditLog].slice(0, 100);
      set({ auditLog: nextAudit });
      await SecureStore.setItemAsync(PARENT_PIN_AUDIT_KEY, JSON.stringify(nextAudit));
      return false;
    } catch {
      return false;
    }
  },

  lock: () => {
    set({ isUnlocked: false });
  },

  setupPin: async (pin: string) => {
    try {
      await SecureStore.setItemAsync(PARENT_PIN_KEY, pin);
      return true;
    } catch {
      return false;
    }
  },

  hasSetupPin: async () => {
    try {
      const pin = await SecureStore.getItemAsync(PARENT_PIN_KEY);
      return pin !== null;
    } catch {
      return false;
    }
  },

  removePin: async () => {
    try {
      await SecureStore.deleteItemAsync(PARENT_PIN_KEY);
      await SecureStore.deleteItemAsync(PARENT_BIOMETRIC_KEY);
      await SecureStore.deleteItemAsync(PARENT_PIN_FAILS_KEY);
      await SecureStore.deleteItemAsync(PARENT_PIN_COOLDOWN_KEY);
      await SecureStore.deleteItemAsync(PARENT_PIN_AUDIT_KEY);
      set({ failedAttempts: 0, cooldownUntil: null, auditLog: [] });
    } catch {}
  },

  setAutoLockMs: async (ms: number) => {
    const next = Math.max(15_000, ms);
    set({ autoLockMs: next });
    await SecureStore.setItemAsync(PARENT_AUTOLOCK_KEY, String(next));
  },

  getRemainingCooldownMs: () => {
    const until = get().cooldownUntil;
    if (!until) return 0;
    return Math.max(0, until - Date.now());
  },

  clearAuditLog: async () => {
    set({ auditLog: [] });
    await SecureStore.deleteItemAsync(PARENT_PIN_AUDIT_KEY);
  },
}));
