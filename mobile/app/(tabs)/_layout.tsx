import React from 'react';
import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuthStore } from '@/stores/authStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const logout = useAuthStore((state) => state.logout);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'house.fill',
                android: 'home',
                web: 'home',
              }}
              tintColor={color}
              size={28}
            />
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 12 }}>
              <Pressable onPress={logout}>
                {({ pressed }) => (
                  <Text
                    style={{
                      color: Colors[colorScheme].tint,
                      fontSize: 15,
                      fontWeight: '600',
                      opacity: pressed ? 0.5 : 1,
                    }}>
                    Log out
                  </Text>
                )}
              </Pressable>
              <Link href="/modal" asChild>
                <Pressable>
                  {({ pressed }) => (
                    <SymbolView
                      name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                      size={25}
                      tintColor={Colors[colorScheme].text}
                      style={{ opacity: pressed ? 0.5 : 1 }}
                    />
                  )}
                </Pressable>
              </Link>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Fridge',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'snowflake',
                android: 'kitchen',
                web: 'inventory_2',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
