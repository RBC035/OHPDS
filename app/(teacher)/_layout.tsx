import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#2563EB";
const PRIMARY_DARK = "#1E40AF";
const INACTIVE = "#9CA3AF";
const BLUE_SOFT = "#EFF6FF";
const BAR_HEIGHT = 64;
const HOME_BTN = 56;

function SideIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <View
      style={{
        width: 40,
        height: 32,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: focused ? BLUE_SOFT : "transparent",
      }}
    >
      <Ionicons name={name} size={20} color={focused ? PRIMARY : INACTIVE} />
    </View>
  );
}

function HomeIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: HOME_BTN,
        height: HOME_BTN,
        borderRadius: HOME_BTN / 2,
        marginTop: -(HOME_BTN / 2 + 4),
        backgroundColor: focused ? PRIMARY : PRIMARY_DARK,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "#fff",
        shadowColor: PRIMARY,
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      <Ionicons name="home" size={24} color="#fff" />
    </View>
  );
}

export default function TeacherLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          height: BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 14,
          elevation: 16,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      {/* LEFT */}
      <Tabs.Screen
        name="students/index"
        options={{
          title: "Students",
          tabBarIcon: ({ focused }) => <SideIcon name="people-outline" focused={focused} />,
        }}
      />

      {/* CENTER */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
        }}
      />

      {/* RIGHT */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <SideIcon name="settings-outline" focused={focused} />,
        }}
      />

      {/* ── HIDDEN — every file/folder that must NOT appear as a tab ── */}
      <Tabs.Screen name="index"                    options={{ href: null }} />
      <Tabs.Screen name="classes/index"            options={{ href: null }} />
      <Tabs.Screen name="classes/[id]"             options={{ href: null }} />
      <Tabs.Screen name="homework/index"           options={{ href: null }} />
      <Tabs.Screen name="homework/[subjectId]"     options={{ href: null }} />
      <Tabs.Screen name="homework/view/[id]"       options={{ href: null }} />
    </Tabs>
  );
}
