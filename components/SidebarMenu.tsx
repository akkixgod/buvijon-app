import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, TouchableWithoutFeedback, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { BuvijonLogo } from '@/components/ui/BuvijonLogo';
import { useTranslation } from '@/i18n';

const { width: SW } = Dimensions.get('window');
const SIDEBAR_W = SW * 0.75;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SidebarMenu({ visible, onClose }: Props) {
  const t = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const parent = useAuthStore(s => s.parent);
  const logout = useAuthStore(s => s.logout);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -SIDEBAR_W, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const navigate = (path: string) => {
    onClose();
    setTimeout(() => router.push(path as any), 200);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    onClose();
    setTimeout(() => {
      router.replace('/(auth)/login');
      setTimeout(() => logout(), 500);
    }, 250);
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }], paddingTop: insets.top + 16 }]}>
        {/* Profile */}
        <View style={styles.profileSection}>
          <View style={styles.logoRow}>
            <BuvijonLogo size={40} />
            <Text style={styles.logoText}>Buvijon</Text>
          </View>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{parent?.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{parent?.name || ''}</Text>
              <Text style={styles.profileEmail}>{parent?.email || ''}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Nav items */}
        <View style={styles.navSection}>
          <NavItem icon="home-outline" label={t.tabs.garden} onPress={() => navigate('/(tabs)')} />
          <NavItem icon="people-outline" label={t.tabs.children} onPress={() => navigate('/(tabs)/children')} />
          <NavItem icon="bar-chart-outline" label={t.tabs.reports} onPress={() => navigate('/(tabs)/reports')} />
          <NavItem icon="sparkles-outline" label={t.tabs.ai} onPress={() => navigate('/(tabs)/ai')} />
        </View>

        <View style={styles.divider} />

        {/* Settings & Logout */}
        <View style={styles.navSection}>
          <NavItem icon="settings-outline" label={t.settings.title} onPress={() => navigate('/(tabs)/settings')} />
          <NavItem icon="log-out-outline" label={t.settings.logout} onPress={handleLogout} color={Colors.wilting} />
        </View>

        {/* Version */}
        <Text style={styles.version}>{t.settings.version}</Text>
      </Animated.View>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={28} color={Colors.wilting} />
            </View>
            <Text style={styles.modalTitle}>{t.settings.logoutAlertTitle}</Text>
            <Text style={styles.modalMessage}>{t.settings.logoutAlertMsg}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>{t.settings.logoutCancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={confirmLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnConfirmText}>{t.settings.logoutConfirm}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NavItem({ icon, label, onPress, color }: {
  icon: any; label: string; onPress: () => void; color?: string;
}) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={color || Colors.textSecondary} />
      <Text style={[styles.navLabel, color ? { color } : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_W,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  profileSection: { marginBottom: Spacing.md },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  logoText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  navSection: { gap: 2 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  navLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  version: {
    fontSize: FontSize.xs,
    color: Colors.textLabel,
    textAlign: 'center',
    marginTop: 'auto',
    paddingBottom: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.wiltingLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  modalMessage: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  modalBtnCancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.wilting,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: '#FFFFFF',
  },
});
