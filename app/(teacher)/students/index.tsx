import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ClassService } from "@/services/api/classService";

const PALETTE = [
  { iconColor: "#2563EB", iconBg: "#EEF4FF", borderColor: "#BFDBFE" },
  { iconColor: "#7C3AED", iconBg: "#EDE9FE", borderColor: "#DDD6FE" },
  { iconColor: "#16A34A", iconBg: "#DCFCE7", borderColor: "#BBF7D0" },
  { iconColor: "#EA580C", iconBg: "#FFF1E6", borderColor: "#FED7AA" },
];

export default function StudentsScreen() {
  const insets = useSafeAreaInsets();
  const [classes, setClasses]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initials, setInitials]     = useState("TC");

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          if (u.name) {
            setInitials(
              u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
            );
          }
        }
      } catch {}
    })();
  }, []);

  async function loadClasses(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await ClassService.getAll();
      const data: any[] = res.data?.data ?? res.data ?? [];
      // Sort by id descending (most recent first), keep only 4
      const sorted = [...data]
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, 4);
      setClasses(sorted);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [])
  );

  const totalStudents = classes.reduce(
    (s, c) => s + (c.students_count ?? c.students ?? 0),
    0
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadClasses(true); }}
            tintColor="#2563EB"
          />
        }
      >
        {/* ── BANNER ── */}
        <View style={[styles.banner, { paddingTop: insets.top + 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Your classes</Text>
            <Text style={styles.title}>Overview</Text>
            <Text style={styles.sub}>Showing 4 most recent classes</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        {/* ── TOTALS STRIP ── */}
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalNum}>{classes.length}</Text>
            <Text style={styles.totalLabel}>Classes</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalNum}>{totalStudents || "—"}</Text>
            <Text style={styles.totalLabel}>Students</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalNum}>4</Text>
            <Text style={styles.totalLabel}>Recent</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <TouchableOpacity onPress={() => router.push("/(teacher)/homework" as any)}>
              <Text style={[styles.totalNum, { color: "#2563EB", fontSize: 13 }]}>View</Text>
              <Text style={styles.totalLabel}>Homework</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FLOW HINT ── */}
        <View style={styles.flowHint}>
          <Text style={styles.flowStep}>Class</Text>
          <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
          <Text style={styles.flowStep}>Students</Text>
          <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
          <Text style={styles.flowStep}>Subjects</Text>
          <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
          <Text style={styles.flowStep}>Homework</Text>
        </View>

        {/* ── SECTION HEADER with Manage button ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Recent classes</Text>
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => router.push("/(teacher)/classes" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={13} color="#2563EB" />
            <Text style={styles.manageBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>

        {/* ── CLASS LIST ── */}
        {loading ? (
          <ActivityIndicator color="#2563EB" size="large" style={{ marginTop: 40 }} />
        ) : classes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No classes yet</Text>
            <Text style={styles.emptySub}>Add a class from Manage</Text>
          </View>
        ) : (
          classes.map((cls, index) => {
            const palette      = PALETTE[index % PALETTE.length];
            const studentCount = cls.students_count ?? cls.students ?? 0;
            return (
              <TouchableOpacity
                key={cls.id}
                style={styles.classRow}
                activeOpacity={0.75}
                onPress={() => router.push(`/(teacher)/classes/${cls.id}` as any)}
              >
                {/* rank */}
                <Text style={styles.rankNum}>{index + 1}</Text>

                {/* icon */}
                <View style={[styles.classIcon, { backgroundColor: palette.iconBg, borderColor: palette.borderColor }]}>
                  <Ionicons name="school-outline" size={18} color={palette.iconColor} />
                </View>

                {/* name + mini stats */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.className}>{cls.name}</Text>
                  <View style={styles.miniStats}>
                    <Ionicons name="people-outline" size={11} color="#9CA3AF" />
                    <Text style={styles.miniText}>{studentCount} students</Text>
                    {cls.status ? (
                      <>
                        <Text style={styles.miniDot}>·</Text>
                        <Text style={styles.miniText}>{cls.status}</Text>
                      </>
                    ) : null}
                  </View>
                </View>

                {/* student count — right */}
                <View style={styles.countWrap}>
                  <Text style={[styles.countNum, { color: palette.iconColor }]}>{studentCount}</Text>
                  <Text style={styles.countLabel}>students</Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
            );
          })
        )}

        {/* ── QUICK ACTIONS ── */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Quick actions</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => router.push("/(teacher)/classes" as any)}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#EEF4FF" }]}>
              <Ionicons name="school-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.quickLabel}>Manage classes</Text>
            <Text style={styles.quickSub}>Add, edit or view</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => router.push("/(teacher)/homework" as any)}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#FFF1E6" }]}>
              <Ionicons name="clipboard-outline" size={20} color="#EA580C" />
            </View>
            <Text style={styles.quickLabel}>All homework</Text>
            <Text style={styles.quickSub}>View & assign</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  scroll:    { paddingBottom: 20 },

  banner: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  greeting:     { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  title:        { fontSize: 24, fontWeight: "800", color: "#fff" },
  sub:          { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  totalsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    marginBottom: 6,
  },
  totalItem:    { flex: 1, alignItems: "center" },
  totalNum:     { fontSize: 18, fontWeight: "800", color: "#111827" },
  totalLabel:   { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  totalDivider: { width: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },

  flowHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  flowStep: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },

  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  manageBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#EEF4FF", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  manageBtnText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },

  classRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rankNum: {
    fontSize: 13, fontWeight: "700",
    color: "#D1D5DB", width: 18, textAlign: "center",
  },
  classIcon: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center", alignItems: "center",
    flexShrink: 0,
  },
  className:  { fontSize: 14, fontWeight: "700", color: "#111827" },
  miniStats:  { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  miniText:   { fontSize: 11, color: "#9CA3AF" },
  miniDot:    { fontSize: 11, color: "#D1D5DB" },
  countWrap:  { alignItems: "flex-end" },
  countNum:   { fontSize: 17, fontWeight: "800" },
  countLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 1 },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText:  { fontSize: 15, fontWeight: "700", color: "#374151" },
  emptySub:   { fontSize: 12, color: "#9CA3AF" },

  quickGrid: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  quickCard: {
    flex: 1, backgroundColor: "#fff",
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  quickIcon: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  quickLabel: { fontSize: 13, fontWeight: "700", color: "#111827" },
  quickSub:   { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
});
