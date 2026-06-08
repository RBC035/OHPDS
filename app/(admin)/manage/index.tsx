import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ClassService } from "../../../services/api/classService";
import { HomeworkService } from "../../../services/api/homeworkService";
import { ParentService } from "../../../services/api/parentService";
import { StudentService } from "../../../services/api/studentService";
import { SubjectService } from "../../../services/api/subjectService";
import { TeacherService } from "../../../services/api/teacherService";

const MANAGE_META = [
  {
    key: "classes",
    title: "Classes",
    sub: "Add, edit, remove classes",
    icon: "layers-outline",
    bg: "#EEF4FF",
    color: "#2563EB",
    border: "#BFDBFE",
    label: "classes",
    route: "/(admin)/classes",
  },
  {
    key: "subjects",
    title: "Subjects",
    sub: "Add, edit, remove subjects",
    icon: "library-outline",
    bg: "#EDE9FE",
    color: "#7C3AED",
    border: "#DDD6FE",
    label: "subjects",
    route: "/(admin)/subjects",
  },
  {
    key: "teachers",
    title: "Teachers",
    sub: "Manage & assign to class/subject",
    icon: "school-outline",
    bg: "#DCFCE7",
    color: "#16A34A",
    border: "#BBF7D0",
    label: "teachers",
    route: "/(admin)/teachers",
  },
  {
    key: "students",
    title: "Students",
    sub: "Manage & assign to class/subject",
    icon: "people-outline",
    bg: "#FFF1E6",
    color: "#EA580C",
    border: "#FED7AA",
    label: "students",
    route: "/(admin)/students",
  },
  {
    key: "parents",
    title: "Parents",
    sub: "Manage & link to students",
    icon: "people-circle-outline",
    bg: "#EEF4FF",
    color: "#2563EB",
    border: "#BFDBFE",
    label: "parents",
    route: "/(admin)/parents",
  },
  {
    key: "homework",
    title: "Homework",
    sub: "Assign & view finished work",
    icon: "clipboard-outline",
    bg: "#FEE2E2",
    color: "#DC2626",
    border: "#FECACA",
    label: "tasks",
    route: "/(admin)/homework",
  },
] as const;

type CountKey = (typeof MANAGE_META)[number]["key"];

export default function ManageScreen() {
  const insets = useSafeAreaInsets();

  const [counts, setCounts] = useState<Record<CountKey, number | null>>({
    classes: null,
    subjects: null,
    teachers: null,
    students: null,
    parents: null,
    homework: null,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadCounts = useCallback(async () => {
    try {
      setRefreshing(true);
      const [clsRes, subRes, tchRes, stuRes, parRes, hwRes] = await Promise.all(
        [
          ClassService.getAll(),
          SubjectService.getAll(),
          TeacherService.getAll(),
          StudentService.getAll(),
          ParentService.getAll(),
          HomeworkService.getAll(),
        ],
      );
      const len = (res: any) => {
        const d = res.data?.data ?? res.data;
        return Array.isArray(d) ? d.length : 0;
      };
      setCounts({
        classes: len(clsRes),
        subjects: len(subRes),
        teachers: len(tchRes),
        students: len(stuRes),
        parents: len(parRes),
        homework: len(hwRes),
      });
    } catch {
      // keep nulls — badge shows "—"
      console.error("Manage counts load failed");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  function onRefresh() {
    setRefreshing(true);
    loadCounts();
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ── BANNER ── */}
        <View style={[styles.banner, { paddingTop: insets.top + 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Admin panel</Text>
            <Text style={styles.title}>Manage</Text>
            <Text style={styles.sub}>All school management in one place</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>AD</Text>
          </View>
        </View>

        {/* ── MANAGE ITEMS ── */}
        <Text style={styles.sectionLabel}>Select area to manage</Text>

        {MANAGE_META.map((item) => {
          const n = counts[item.key];
          const badge = n === null ? "..." : `${n} ${item.label}`;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.manageRow}
              activeOpacity={0.75}
              onPress={async () => {
                if (item.key === "homework") {
                  // fetch fresh homework list from backend before navigating
                  try {
                    setRefreshing(true);
                    await HomeworkService.getAll();
                  } catch (e: any) {
                    Alert.alert(
                      "Error",
                      e?.response?.data?.message ?? "Failed to fetch homework.",
                    );
                  } finally {
                    setRefreshing(false);
                    router.push(item.route as any);
                  }
                } else {
                  router.push(item.route as any);
                }
              }}
            >
              {/* color bar */}
              <View
                style={[styles.colorBar, { backgroundColor: item.color }]}
              />

              <View style={styles.rowInner}>
                {/* icon */}
                <View
                  style={[
                    styles.itemIcon,
                    { backgroundColor: item.bg, borderColor: item.border },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={item.color}
                  />
                </View>

                {/* text */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSub}>{item.sub}</Text>
                </View>

                {/* count badge */}
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: item.bg, borderColor: item.border },
                  ]}
                >
                  <Text style={[styles.countText, { color: item.color }]}>
                    {badge}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  scroll: { paddingBottom: 20 },

  banner: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  greeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
  },
  title: { fontSize: 24, fontWeight: "800", color: "#fff" },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },

  manageRow: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    overflow: "hidden",
  },
  colorBar: { width: 4 },
  rowInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  itemIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  itemTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  itemSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  countBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  countText: { fontSize: 11, fontWeight: "600" },
});
