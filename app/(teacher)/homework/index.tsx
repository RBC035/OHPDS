import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TeacherSubjectService }  from "../../../services/api/teacherSubjectService";
import { TeacherService }         from "../../../services/api/teacherService";
import { SubjectService }         from "../../../services/api/subjectService";
import { StudentSubjectService }  from "../../../services/api/studentSubjectService";

type Subject = { id: number | string; name: string; status?: string };

const SUBJECT_THEMES = [
  { bg: "#1E40AF", light: "#EEF4FF", accent: "#BFDBFE", text: "#fff" },
  { bg: "#6D28D9", light: "#EDE9FE", accent: "#DDD6FE", text: "#fff" },
  { bg: "#065F46", light: "#DCFCE7", accent: "#BBF7D0", text: "#fff" },
  { bg: "#9A3412", light: "#FFF1E6", accent: "#FED7AA", text: "#fff" },
  { bg: "#991B1B", light: "#FEE2E2", accent: "#FECACA", text: "#fff" },
  { bg: "#1E3A5F", light: "#EFF6FF", accent: "#BAE6FD", text: "#fff" },
  { bg: "#4A1D96", light: "#F5F3FF", accent: "#E9D5FF", text: "#fff" },
];

function subjectInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function isActive(status?: string) {
  const s = (status ?? "").toLowerCase();
  return s === "active" || s === "";
}

export default function TeacherHomeworkSubjectsScreen() {
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects]             = useState<Subject[]>([]);
  const [studentCounts, setStudentCounts]   = useState<Record<string, number>>({});
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);

  const loadSubjects = useCallback(async () => {
    try {
      const userRaw = await AsyncStorage.getItem("user");
      const user    = userRaw ? JSON.parse(userRaw) : null;

      let teacherId: number | string | null =
        user?.id         ??
        user?.teacher_id ??
        user?.teacherId  ??
        user?.user_id    ??
        null;

      if (!teacherId && user?.username) {
        const teachersRes = await TeacherService.getAll();
        const teachers: any[] = teachersRes.data?.data ?? teachersRes.data ?? [];
        const matched = teachers.find(
          (t: any) =>
            t.email?.toLowerCase() === user.username?.toLowerCase() ||
            t.name?.toLowerCase()  === user.username?.toLowerCase()
        );
        if (matched) teacherId = matched.id;
      }

      if (!teacherId) { setSubjects([]); return; }

      const [assignedRes, catalogueRes] = await Promise.all([
        TeacherSubjectService.getByTeacher(teacherId),
        SubjectService.getAll(),
      ]);

      const raw: any[]       = assignedRes.data?.data  ?? assignedRes.data  ?? [];
      const catalogue: any[] = catalogueRes.data?.data ?? catalogueRes.data ?? [];
      const nameMap = new Map<string, string>(catalogue.map((s: any) => [String(s.id), s.name]));

      const data: Subject[] = (Array.isArray(raw) ? raw : []).map((row: any) => {
        const subjectId = row.subjectId ?? row.id;
        return {
          id:     subjectId,
          name:   row.name ?? nameMap.get(String(subjectId)) ?? `Subject #${subjectId}`,
          status: row.status,
        };
      });

      setSubjects(data);

      const countEntries = await Promise.all(
        data.map(async (sub) => {
          try {
            const res = await StudentSubjectService.getBySubject(sub.id);
            const arr: any[] = res.data?.data ?? res.data ?? [];
            return [String(sub.id), Array.isArray(arr) ? arr.length : 0] as [string, number];
          } catch { return [String(sub.id), 0] as [string, number]; }
        })
      );
      setStudentCounts(Object.fromEntries(countEntries));
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);
  function onRefresh() { setRefreshing(true); loadSubjects(); }

  const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerGreeting}>Teacher Portal</Text>
            <Text style={styles.headerTitle}>My Homework</Text>
          </View>
          <View style={styles.headerIconBox}>
            <Ionicons name="clipboard-outline" size={24} color="#2563EB" />
          </View>
        </View>

        {/* stats bar inside header */}
        <View style={styles.headerStats}>
          <View style={styles.hStat}>
            <Text style={styles.hStatNum}>{subjects.length}</Text>
            <Text style={styles.hStatLabel}>Subjects</Text>
          </View>
          <View style={styles.hStatDiv} />
          <View style={styles.hStat}>
            <Text style={styles.hStatNum}>{loading ? "—" : totalStudents}</Text>
            <Text style={styles.hStatLabel}>Students</Text>
          </View>
          <View style={styles.hStatDiv} />
          <View style={styles.hStat}>
            <Text style={styles.hStatNum}>{subjects.filter((s) => isActive(s.status)).length}</Text>
            <Text style={styles.hStatLabel}>Active</Text>
          </View>
        </View>
      </View>

      {/* ── CONTENT ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading your subjects...</Text>
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        >
          <Text style={styles.sectionLabel}>Your subjects</Text>

          {subjects.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="library-outline" size={36} color="#2563EB" />
              </View>
              <Text style={styles.emptyTitle}>No subjects assigned</Text>
              <Text style={styles.emptySub}>Contact your administrator to get subjects assigned to you</Text>
            </View>
          ) : (
            subjects.map((sub, index) => {
              const theme  = SUBJECT_THEMES[index % SUBJECT_THEMES.length];
              const ini    = subjectInitials(sub.name);
              const count  = studentCounts[String(sub.id)];
              const active = isActive(sub.status);

              return (
                <TouchableOpacity
                  key={String(sub.id)}
                  style={styles.subjectCard}
                  activeOpacity={0.82}
                  onPress={() => router.push(`/(teacher)/homework/${sub.id}?name=${encodeURIComponent(sub.name)}` as any)}
                >
                  {/* colored left section */}
                  <View style={[styles.cardLeft, { backgroundColor: theme.bg }]}>
                    <Text style={styles.cardInitials}>{ini}</Text>
                    <View style={[styles.activeDot, { backgroundColor: active ? "#4ADE80" : "#FCD34D" }]} />
                  </View>

                  {/* right content */}
                  <View style={styles.cardRight}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardName} numberOfLines={1}>{sub.name}</Text>
                      <View style={[styles.statusChip, { backgroundColor: active ? "#DCFCE7" : "#FEF3C7" }]}>
                        <Text style={[styles.statusChipText, { color: active ? "#16A34A" : "#D97706" }]}>
                          {sub.status ?? "Active"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardMeta}>
                      <View style={styles.metaChip}>
                        <Ionicons name="people-outline" size={13} color="#2563EB" />
                        <Text style={styles.metaChipText}>
                          {count !== undefined ? `${count} student${count !== 1 ? "s" : ""}` : "..."}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardCta}>Manage homework</Text>
                      <View style={[styles.cardArrow, { backgroundColor: theme.light }]}>
                        <Ionicons name="arrow-forward" size={14} color={theme.bg} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4FF" },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: "#1E40AF",
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  headerGreeting: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: "600", marginBottom: 2 },
  headerTitle:    { fontSize: 26, fontWeight: "900", color: "#fff" },
  headerIconBox:  {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
  },

  headerStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingVertical: 14,
  },
  hStat:    { flex: 1, alignItems: "center" },
  hStatNum: { fontSize: 20, fontWeight: "800", color: "#fff" },
  hStatLabel:{ fontSize: 10, color: "rgba(255,255,255,0.65)", marginTop: 2, fontWeight: "600" },
  hStatDiv: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 4 },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  loadingCard: {
    backgroundColor: "#fff", borderRadius: 20,
    padding: 32, alignItems: "center", gap: 12,
    width: "80%",
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  loadingText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },

  // ── List ─────────────────────────────────────────────────────────────────
  scroll:       { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#6B7280", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1.2 },

  // ── Subject card ─────────────────────────────────────────────────────────
  subjectCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 14,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  cardLeft: {
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    position: "relative",
  },
  cardInitials: { fontSize: 22, fontWeight: "900", color: "#fff" },
  activeDot: {
    position: "absolute", bottom: 12,
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)",
  },

  cardRight: { flex: 1, padding: 16, justifyContent: "space-between" },

  cardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  cardName:   { fontSize: 16, fontWeight: "800", color: "#111827", flex: 1 },

  statusChip:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  statusChipText:{ fontSize: 10, fontWeight: "700" },

  cardMeta:  { flexDirection: "row", gap: 8, marginBottom: 12 },
  metaChip:  { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#EEF4FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  metaChipText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },

  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardCta:    { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  cardArrow:  { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },

  // ── Empty ─────────────────────────────────────────────────────────────────
  emptyState:  { alignItems: "center", paddingTop: 60, paddingHorizontal: 20 },
  emptyIconBox:{ width: 80, height: 80, borderRadius: 24, backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle:  { fontSize: 17, fontWeight: "800", color: "#1E40AF", marginBottom: 8 },
  emptySub:    { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 20 },
});
