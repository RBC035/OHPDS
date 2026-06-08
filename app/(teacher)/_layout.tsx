import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TeacherLayout() {
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
        name="students/index"
        options={{
          title: "Students",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
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

      {/* ── HIDDEN — every file/folder that must NOT appear as a tab ── */}
      <Tabs.Screen name="index"          options={{ href: null }} />
      <Tabs.Screen name="students"       options={{ href: null }} />
      <Tabs.Screen name="assignment"     options={{ href: null }} />
      <Tabs.Screen name="classes"        options={{ href: null }} />
      <Tabs.Screen name="classes/index"  options={{ href: null }} />
      <Tabs.Screen name="classes/[id]"   options={{ href: null }} />
      <Tabs.Screen name="homework"              options={{ href: null }} />
      <Tabs.Screen name="homework/index"        options={{ href: null }} />
      <Tabs.Screen name="homework/[subjectId]"  options={{ href: null }} />
      <Tabs.Screen name="homework/view/[id]" options={{ href: null }} />
      <Tabs.Screen name="subjects"           options={{ href: null }} />
    </Tabs>
  );
}