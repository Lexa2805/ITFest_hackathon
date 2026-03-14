import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuthStore } from '@/stores/authStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  const logout = useAuthStore((state) => state.logout);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].tint,
        tabBarInactiveTintColor: Colors[theme].tabIconDefault,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 12,
          borderRadius: 18,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderColor: '#1E1E1E',
          backgroundColor: '#141414',
          shadowColor: '#000000',
          shadowOpacity: 0.28,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          elevation: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" color={color} size={24} />
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 12 }}>
              <Pressable onPress={logout}>
                {({ pressed }) => (
                  <Text
                    style={{
                      color: Colors[theme].tint,
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
                    <Ionicons
                      name="information-circle"
                      size={24}
                      color={Colors[theme].text}
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
            <Ionicons name="snow" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color }) => (
            <Ionicons name="nutrition" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="health-upload"
        options={{
          title: 'Health',
          tabBarIcon: ({ color }) => (
            <Ionicons name="pulse" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
