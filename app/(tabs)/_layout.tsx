import { Tabs } from 'expo-router';
import { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { FlowerSVG } from '@/components/flower/FlowerSVG';
import { useTranslation } from '@/i18n';

interface TabIconProps {
  name: any;
  focused: boolean;
  isGarden?: boolean;
}

function TabIcon({ name, focused, isGarden }: TabIconProps) {
  const flowerAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(flowerAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 7,
    }).start();
  }, [focused]);

  if (isGarden) {
    return (
      <View style={styles.gardenWrap}>
        <Animated.View
          style={[
            styles.flowerDecor,
            { opacity: flowerAnim, transform: [{ scale: flowerAnim }] },
          ]}
          pointerEvents="none"
        >
          <FlowerSVG variant="daisy" state="blooming" color={Colors.primaryLight} size={48} />
        </Animated.View>
        <Ionicons
          name={focused ? 'leaf' : 'leaf-outline'}
          size={22}
          color={focused ? Colors.primary : Colors.textMuted}
          style={styles.gardenIcon}
        />
      </View>
    );
  }

  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

function CreateTabButton({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.createBtnWrap} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.createBtn}>
        <Ionicons name="add" size={28} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const t = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.garden,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="leaf-outline" focused={focused} isGarden />
          ),
        }}
      />
      <Tabs.Screen
        name="children"
        options={{
          title: t.tabs.children,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <CreateTabButton onPress={props.onPress as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t.tabs.reports,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: t.tabs.ai,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'sparkles' : 'sparkles-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    elevation: 8,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '400',
  },
  iconWrap: {
    width: 40, height: 28,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: Colors.primaryPale,
  },
  gardenWrap: {
    width: 48, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  flowerDecor: {
    position: 'absolute',
    top: -4, left: 0,
  },
  gardenIcon: {
    zIndex: 1,
  },
  createBtnWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  createBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
