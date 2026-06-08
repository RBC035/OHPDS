import { Tabs } from "expo-router";

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Custom TabBar inside dashboard.tsx handles navigation —
        // suppress the Expo Router native tab bar on every screen.
        tabBarStyle: { display: "none" },
      }}
    >
      {/* ── VISIBLE ── */}
      <Tabs.Screen name="dashboard" />

      {/* ── HIDDEN — every file that must NOT appear as a tab ── */}
      <Tabs.Screen name="index"                        options={{ href: null }} />
      <Tabs.Screen name="HomeTab"                      options={{ href: null }} />
      <Tabs.Screen name="SettingsTab"                  options={{ href: null }} />
      <Tabs.Screen name="TabBar"                       options={{ href: null }} />
      <Tabs.Screen name="children/ChildrenTab"         options={{ href: null }} />
      <Tabs.Screen name="children/ChildrenDetails"     options={{ href: null }} />
      <Tabs.Screen name="children/ClassSubjects"       options={{ href: null }} />
      <Tabs.Screen name="children/SubjectHomework"     options={{ href: null }} />
      <Tabs.Screen name="children/HomeworkDetail"      options={{ href: null }} />
      <Tabs.Screen name="children/SubmittedTasks"     options={{ href: null }} />
      <Tabs.Screen name="homework/HomeworkChart"       options={{ href: null }} />
      <Tabs.Screen name="homework/HomeworkDetails"     options={{ href: null }} />
    </Tabs>
  );
}
