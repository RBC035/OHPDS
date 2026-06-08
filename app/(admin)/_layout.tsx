import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      {/* LEFT */}
      <Tabs.Screen
        name="manage/index"
        options={{
          title: "Manage",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      {/* CENTER */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* RIGHT */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── HIDDEN ── */}
      <Tabs.Screen name="manage"          options={{ href: null }} />
      <Tabs.Screen name="classes"         options={{ href: null }} />
      <Tabs.Screen name="classes/index"   options={{ href: null }} />
      <Tabs.Screen name="classes/[id]"    options={{ href: null }} />
      <Tabs.Screen name="subjects"        options={{ href: null }} />
      <Tabs.Screen name="subjects/index"  options={{ href: null }} />
      <Tabs.Screen name="subjects/[id]"   options={{ href: null }} />
      <Tabs.Screen name="teachers"        options={{ href: null }} />
      <Tabs.Screen name="teachers/index"  options={{ href: null }} />
      <Tabs.Screen name="teachers/[id]"   options={{ href: null }} />
      <Tabs.Screen name="students"        options={{ href: null }} />
      <Tabs.Screen name="students/index"  options={{ href: null }} />
      <Tabs.Screen name="students/[id]"   options={{ href: null }} />
      <Tabs.Screen name="parents"         options={{ href: null }} />
      <Tabs.Screen name="parents/index"   options={{ href: null }} />
      <Tabs.Screen name="parents/[id]"    options={{ href: null }} />
      <Tabs.Screen name="homework"        options={{ href: null }} />
      <Tabs.Screen name="homework/index"  options={{ href: null }} />
      <Tabs.Screen name="homework/[id]"   options={{ href: null }} />
    </Tabs>
  );
}