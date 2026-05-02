import { Tabs } from 'expo-router';
import React, { useRef, useEffect } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useTranslation } from '@/i18n';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width: SW } = Dimensions.get('window');

// Tab configuration (excluding hidden settings)
const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index: { active: 'home', inactive: 'home-outline' },
  children: { active: 'people', inactive: 'people-outline' },
  create: { active: 'add', inactive: 'add' },
  reports: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  ai: { active: 'search', inactive: 'search-outline' },
};

function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  // Filter visible routes (exclude hidden tabs)
  const visibleRoutes = state.routes.filter(r =>
    r.name !== 'settings' && r.name !== 'create'
  );
  const tabCount = visibleRoutes.length;
  const tabW = SW / tabCount;

  // Find the visible index (map state.index to visible index)
  const activeRoute = state.routes[state.index]?.name;
  const visibleIndex = visibleRoutes.findIndex(r => r.name === activeRoute);
  const safeIndex = visibleIndex >= 0 ? visibleIndex : 0;

  // Animated blob position
  const blobX = useRef(new Animated.Value(safeIndex * tabW)).current;
  const blobScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Liquid stretch effect: scale up, move, scale down
    Animated.sequence([
      Animated.timing(blobScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(blobX, {
          toValue: safeIndex * tabW,
          tension: 68,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(blobScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();
  }, [safeIndex]);

  return (
    <View style={[styles.tabBar, { height: 60 + bottomPad, paddingBottom: bottomPad }]}>
      {/* Animated liquid blob */}
      <Animated.View
        style={[
          styles.liquidBlob,
          {
            width: tabW,
            transform: [
              { translateX: blobX },
              { scaleX: blobScale },
            ],
          },
        ]}
      >
        <View style={styles.blobPill} />
      </Animated.View>

      {/* Tab buttons */}
      {visibleRoutes.map((route, index) => {
        const isCreate = route.name === 'create';
        const isFocused = index === safeIndex;
        const iconCfg = TAB_ICONS[route.name] || TAB_ICONS.index;
        const iconName = isFocused ? iconCfg.active : iconCfg.inactive;

        // Get label from descriptor
        const realIndex = state.routes.findIndex(r => r.name === route.name);
        const descriptor = descriptors[state.routes[realIndex]?.key];
        const label = descriptor?.options?.title || route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[realIndex]?.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCreate) {
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.85}
            >
              <View style={styles.createBtn}>
                <Ionicons name="add" size={28} color="#fff" />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconName as any}
              size={22}
              color={isFocused ? Colors.primary : Colors.textMuted}
            />
            <Animated.Text
              style={[
                styles.tabLabel,
                { color: isFocused ? Colors.primary : Colors.textMuted },
              ]}
            >
              {label}
            </Animated.Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const t = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.garden }} />
      <Tabs.Screen name="children" options={{ title: t.tabs.children }} />
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ title: t.tabs.reports }} />
      <Tabs.Screen name="ai" options={{ title: t.tabs.search }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    elevation: 8,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    alignItems: 'center',
    paddingTop: 4,
  },
  liquidBlob: {
    position: 'absolute',
    top: 4,
    left: 0,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobPill: {
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryPale,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  createBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
