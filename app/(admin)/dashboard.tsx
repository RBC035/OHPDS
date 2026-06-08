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
import { StudentService }  from "../../services/api/studentService";
import { TeacherService }  from "../../services/api/teacherService";
import { ClassService }    from "../../services/api/classService";
import { ParentService }   from "../../services/api/parentService";
import { SubjectService }  from "../../services/api/subjectService";
import { HomeworkService } from "../../services/api/homeworkService";

type Counts = {
  students: number;
  teachers: number;
  classes:  number;
  parents:  number;
  subjects: number;
  homework: number;
};

type RecentStudent = { id: number | string; name: string; gender?: string; dob?: string };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function genderColor(gender?: string) {
  const g = (gender ?? "").toLowerCase();
  if (g === "male"   || g === "m") return { bg: "#EFF6FF", color: "#2563EB", label: "Male",   icon: "man-outline"   as const };
  if (g === "female" || g === "f") return { bg: "#FDF2F8", color: "#DB2777", label: "Female", icon: "woman-outline" as const };
  return { bg: "#F3F4F6", color: "#6B7280", label: "", icon: "person-outline" as const };
}

function formatDob(dob?: string) {
  if (!dob) return null;
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const age = new Date().getFullYear() - d.getFullYear();
    return `${age} yrs · ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
  } catch { return null; }
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const STAT_META = [
  { key: "students", label: "Students", icon: "people-outline",        bg: "#EEF4FF", color: "#2563EB", route: "/(admin)/students" },
  { key: "teachers", label: "Teachers", icon: "school-outline",         bg: "#EDE9FE", color: "#7C3AED", route: "/(admin)/teachers" },
  { key: "classes",  label: "Classes",  icon: "layers-outline",         bg: "#DCFCE7", color: "#16A34A", route: "/(admin)/classes"  },
  { key: "parents",  label: "Parents",  icon: "people-circle-outline",  bg: "#FFF1E6", color: "#EA580C", route: "/(admin)/parents"  },
  { key: "subjects", label: "Subjects", icon: "library-outline",        bg: "#EDE9FE", color: "#7C3AED", route: "/(admin)/subjects" },
  { key: "homework", label: "Homework", icon: "clipboard-outline",      bg: "#FFF1E6", color: "#EA580C", route: "/(admin)/homework" },
] as const;

const AVATAR_PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();

  const [counts, setCounts]               = useState<Counts | null>(null);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [stuRes, tchRes, clsRes, parRes, subRes, hwRes] = await Promise.all([
        StudentService.getAll(),
        TeacherService.getAll(),
        ClassService.getAll(),
        ParentService.getAll(),
        SubjectService.getAll(),
        HomeworkService.getAll(),
      ]);

      const toArr = (res: any): any[] => {
        const d = res.data?.data ?? res.data;
        return Array.isArray(d) ? d : [];
      };

      const students = toArr(stuRes);
      setCounts({
        students: students.length,
        teachers: toArr(tchRes).length,
        classes:  toArr(clsRes).length,
        parents:  toArr(parRes).length,
        subjects: toArr(subRes).length,
        homework: toArr(hwRes).length,
      });

      // show 5 most-recent students (last in list = highest id = most recent)
      setRecentStudents([...students].reverse().slice(0, 5));
    } catch {
      // silently fail — counts show "—" if network unavailable
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function onRefresh() { setRefreshing(true); loadData(); }

  const countOf = (key: keyof Counts) =>
    loading ? "..." : counts ? String(counts[key]) : "—";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {/* ── BANNER ── */}
        <View style={[styles.banner, { paddingTop: insets.top + 20 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.adminName}>Admin</Text>
            <Text style={styles.adminSub}>OHPDS School Management</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>AD</Text>
          </View>
        </View>

        {/* ── OVERVIEW STRIP (totals) ── */}
        <View style={styles.overviewStrip}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewNum}>{countOf("students")}</Text>
            <Text style={styles.overviewLabel}>Students</Text>
          </View>
          <View style={styles.overviewDiv} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewNum}>{countOf("teachers")}</Text>
            <Text style={styles.overviewLabel}>Teachers</Text>
          </View>
          <View style={styles.overviewDiv} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewNum}>{countOf("parents")}</Text>
            <Text style={styles.overviewLabel}>Parents</Text>
          </View>
          <View style={styles.overviewDiv} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewNum}>{countOf("classes")}</Text>
            <Text style={styles.overviewLabel}>Classes</Text>
          </View>
        </View>

        {/* ── STAT CARDS GRID ── */}
        <Text style={styles.sectionLabel}>Overview</Text>

        <View style={styles.statsGrid}>
          {STAT_META.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={styles.statCard}
              activeOpacity={0.78}
              onPress={() => router.push(s.route as any)}
            >
              <Ionicons name="chevron-forward" size={14} color="#D1D5DB" style={styles.statArrow} />

              <View style={styles.statTop}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={22} color={s.color} />
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color={s.color} />
                ) : (
                  <Text style={[styles.statNum, { color: s.color }]}>
                    {counts ? counts[s.key] : "—"}
                  </Text>
                )}
              </View>

              <Text style={styles.statLabel}>{s.label}</Text>

              <View style={[styles.statBar, { backgroundColor: s.bg }]}>
                <View style={[styles.statBarFill, { backgroundColor: s.color, width: "100%" }]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── QUICK ACTIONS ── */}
        <Text style={styles.sectionLabel}>Quick actions</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {[
            { label: "Add Student",  icon: "person-add-outline",   color: "#2563EB", bg: "#EEF4FF", route: "/(admin)/students" },
            { label: "Add Teacher",  icon: "school-outline",        color: "#7C3AED", bg: "#EDE9FE", route: "/(admin)/teachers" },
            { label: "Add Parent",   icon: "people-circle-outline", color: "#EA580C", bg: "#FFF1E6", route: "/(admin)/parents"  },
            { label: "Add Subject",  icon: "library-outline",       color: "#16A34A", bg: "#DCFCE7", route: "/(admin)/subjects" },
          ].map((q) => (
            <TouchableOpacity
              key={q.label}
              style={styles.quickCard}
              onPress={() => router.push(q.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: q.bg }]}>
                <Ionicons name={q.icon as any} size={20} color={q.color} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── RECENT STUDENTS ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel2}>Recent students</Text>
          <TouchableOpacity onPress={() => router.push("/(admin)/students" as any)}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentCard}>
          {loading ? (
            <View style={styles.recentLoading}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.recentLoadingText}>Loading students...</Text>
            </View>
          ) : recentStudents.length === 0 ? (
            <View style={styles.recentLoading}>
              <Ionicons name="people-outline" size={28} color="#9CA3AF" />
              <Text style={styles.recentLoadingText}>No students yet</Text>
            </View>
          ) : (
            recentStudents.map((s, i) => {
              const av  = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
              const gc  = genderColor(s.gender);
              const ini = getInitials(s.name);
              const dob = formatDob(s.dob);
              return (
                <TouchableOpacity
                  key={String(s.id)}
                  style={[styles.recentRow, i < recentStudents.length - 1 && styles.recentBorder]}
                  onPress={() => router.push(`/(admin)/students/${s.id}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.recentAvatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.recentAvatarText, { color: av.color }]}>{ini}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentName}>{s.name}</Text>
                    <View style={styles.recentMeta}>
                      <Text style={styles.recentMetaText}>ID #{s.id}</Text>
                      {dob ? <><Text style={styles.metaDot}>·</Text><Text style={styles.recentMetaText}>{dob}</Text></> : null}
                      {s.gender ? (
                        <>
                          <Text style={styles.metaDot}>·</Text>
                          <View style={[styles.genderPill, { backgroundColor: gc.bg }]}>
                            <Ionicons name={gc.icon} size={9} color={gc.color} />
                            <Text style={[styles.genderText, { color: gc.color }]}>{gc.label}</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  scroll:    { paddingBottom: 20 },

  // banner
  banner: {
    backgroundColor: "#1E40AF",
    paddingHorizontal: 20,
    paddingBottom: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greeting:  { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  adminName: { fontSize: 28, fontWeight: "900", color: "#fff", marginTop: 2 },
  adminSub:  { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 3 },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center" },
  avatarText:   { color: "#fff", fontWeight: "800", fontSize: 16 },

  // overview strip (floats over banner)
  overviewStrip: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  overviewItem:  { flex: 1, alignItems: "center" },
  overviewNum:   { fontSize: 20, fontWeight: "800", color: "#111827" },
  overviewLabel: { fontSize: 10, color: "#6B7280", marginTop: 2, fontWeight: "600" },
  overviewDiv:   { width: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },

  // section labels
  sectionLabel: { fontSize: 16, fontWeight: "800", color: "#111827", paddingHorizontal: 16, marginTop: 24, marginBottom: 10 },
  sectionRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 24, marginBottom: 10 },
  sectionLabel2:{ fontSize: 16, fontWeight: "800", color: "#111827" },
  seeAll:       { fontSize: 13, fontWeight: "600", color: "#2563EB" },

  // stat cards grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, gap: 12 },
  statCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  statIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  statNum:   { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 10 },
  statArrow: { position: "absolute", top: 12, right: 12 },
  statBar:   { height: 4, borderRadius: 2, overflow: "hidden" },
  statBarFill:{ height: 4, borderRadius: 2 },

  // quick actions
  quickRow: { paddingHorizontal: 16, gap: 10 },
  quickCard: { alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", minWidth: 90, gap: 8 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  quickLabel:{ fontSize: 11, fontWeight: "700", color: "#374151", textAlign: "center" },

  // recent students
  recentCard: { backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  recentLoading:    { flexDirection: "row", alignItems: "center", gap: 10, padding: 20, justifyContent: "center" },
  recentLoadingText:{ fontSize: 13, color: "#6B7280" },
  recentRow:   { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  recentBorder:{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  recentAvatar:    { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  recentAvatarText:{ fontSize: 13, fontWeight: "800" },
  recentName:  { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 3 },
  recentMeta:  { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  recentMetaText: { fontSize: 11, color: "#9CA3AF" },
  metaDot:     { fontSize: 11, color: "#D1D5DB" },
  genderPill:  { flexDirection: "row", alignItems: "center", gap: 2, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  genderText:  { fontSize: 10, fontWeight: "700" },
});
