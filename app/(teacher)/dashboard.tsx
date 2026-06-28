import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { HomeworkService } from "@/services/api/homeworkService";
import { StudentTaskService } from "@/services/api/studentTaskService";
import { StudentService } from "@/services/api/studentService";
import { TeacherService } from "@/services/api/teacherService";
import { TeacherSubjectService } from "@/services/api/teacherSubjectService";
import { SubjectService } from "@/services/api/subjectService";

// ─────────────────────────────
//  Types
// ─────────────────────────────
type SubmittedItem = {
  key: string;
  initials: string;
  name: string;
  meta: string;
  bg: string;
  color: string;
};

type HwItem = {
  key: string;
  fileExt: string;
  title: string;
  meta: string;
  due: string;
  dueBg: string;
  dueColor: string;
};

type ChartData = {
  label: string;
  count: number;
  percent: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// ─────────────────────────────
//  File-type config
// ─────────────────────────────
type FileStyle = {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
  badge: string;
};

function fileStyle(filename: string): FileStyle {
  const ext = (filename ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")
    return {
      icon: "document-text-outline",
      bg: "#FEE2E2",
      color: "#DC2626",
      badge: "PDF",
    };
  if (ext === "ppt" || ext === "pptx")
    return {
      icon: "easel-outline",
      bg: "#FFF1E6",
      color: "#EA580C",
      badge: ext.toUpperCase(),
    };
  if (ext === "doc" || ext === "docx")
    return {
      icon: "document-outline",
      bg: "#EEF4FF",
      color: "#2563EB",
      badge: ext.toUpperCase(),
    };
  if (ext === "xls" || ext === "xlsx")
    return {
      icon: "grid-outline",
      bg: "#DCFCE7",
      color: "#16A34A",
      badge: ext.toUpperCase(),
    };
  return {
    icon: "attach-outline",
    bg: "#F3F4F6",
    color: "#6B7280",
    badge: "FILE",
  };
}

// ─────────────────────────────
//  Helpers
// ─────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning 👋";
  if (h < 17) return "Good afternoon 👋";
  return "Good evening 👋";
}

function initials(str: string) {
  return str
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Due label for a homework row (A-level: homework has any submission or not)
function dueLabel(endDate: string, hasTask: boolean) {
  if (hasTask) return { due: "Done", dueBg: "#DCFCE7", dueColor: "#16A34A" };
  if (!endDate)
    return { due: "No date", dueBg: "#F3F4F6", dueColor: "#6B7280" };
  const dt = new Date(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const fmt = dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
  if (diff < 0)
    return { due: "Overdue", dueBg: "#FEE2E2", dueColor: "#DC2626" };
  if (diff === 0)
    return { due: "Due Today", dueBg: "#FFF1E6", dueColor: "#EA580C" };
  if (diff <= 3)
    return { due: `Due ${fmt}`, dueBg: "#FFF1E6", dueColor: "#EA580C" };
  return { due: `Due ${fmt}`, dueBg: "#F0FFF4", dueColor: "#16A34A" };
}

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

const AVATAR_PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
];

// ─────────────────────────────
//  Component
// ─────────────────────────────
export default function TeacherDashboard() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherSub, setTeacherSub] = useState("—");
  const [submitted, setSubmitted] = useState<SubmittedItem[]>([]);
  const [recentHw, setRecentHw] = useState<HwItem[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([
    {
      label: "Submitted",
      count: 0,
      percent: 0,
      color: "#16A34A",
      icon: "checkmark-circle-outline",
    },
    {
      label: "Pending",
      count: 0,
      percent: 0,
      color: "#EA580C",
      icon: "time-outline",
    },
    {
      label: "Overdue",
      count: 0,
      percent: 0,
      color: "#DC2626",
      icon: "alert-circle-outline",
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      // 1. Teacher info + resolve teacherId
      const raw = await AsyncStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      if (user) {
        setTeacherName(user.name ?? user.fullName ?? "Teacher");
        setTeacherSub(user.subject ?? user.department ?? user.email ?? "—");
      }

      let teacherId: number | string | null =
        user?.id ??
        user?.teacher_id ??
        user?.teacherId ??
        user?.user_id ??
        null;

      // Fallback: match by email/username against the teachers list
      if (!teacherId && user?.username) {
        try {
          const tRes = await TeacherService.getAll();
          const teachers: any[] = tRes.data?.data ?? tRes.data ?? [];
          const matched = teachers.find(
            (t: any) =>
              t.email?.toLowerCase() === user.username?.toLowerCase() ||
              t.name?.toLowerCase() === user.username?.toLowerCase(),
          );
          if (matched) teacherId = matched.id;
        } catch {
          /* ignore */
        }
      }

      // 2. Parallel fetch: homework, tasks, students, this teacher's subjects, subject catalogue
      const [hwRes, taskRes, studentsRes, teacherSubjRes, subjectCatRes] =
        await Promise.all([
          HomeworkService.getAll(),
          StudentTaskService.getAll(),
          StudentService.getAll(),
          teacherId
            ? TeacherSubjectService.getByTeacher(teacherId)
            : Promise.resolve({ data: { data: [] } } as any),
          SubjectService.getAll(),
        ]);

      const allHw: any[] = hwRes.data?.data ?? hwRes.data ?? [];
      const allTasks: any[] = taskRes.data?.data ?? taskRes.data ?? [];
      const allStudents: any[] =
        studentsRes.data?.data ?? studentsRes.data ?? [];
      const teacherSubjects: any[] =
        teacherSubjRes.data?.data ?? teacherSubjRes.data ?? [];
      const subjectCat: any[] =
        subjectCatRes.data?.data ?? subjectCatRes.data ?? [];

      // subjectId → subject name
      const subjectNameById: Record<string, string> = {};
      subjectCat.forEach((s: any) => {
        subjectNameById[String(s.id)] = s.name ?? `Subject #${s.id}`;
      });

      // studentId → name
      const nameByStudentId: Record<string, string> = {};
      allStudents.forEach((s: any) => {
        nameByStudentId[String(s.id)] = s.name ?? `Student #${s.id}`;
      });

      // Subjects this teacher is assigned to
      const mySubjectIds = new Set(
        teacherSubjects.map((r: any) => String(r.subjectId ?? r.id)),
      );

      // Only this teacher's homework
      const myHw = allHw.filter((hw: any) =>
        mySubjectIds.has(String(hw.subjectId)),
      );

      // Show teacher's subject names in the banner sub-line
      if (mySubjectIds.size > 0) {
        const names = [...mySubjectIds]
          .map((id) => subjectNameById[id])
          .filter(Boolean);
        if (names.length > 0) setTeacherSub(names.join(" · "));
      }

      // task lookup: homeworkId → has a submission
      const submittedHwIds = new Set(
        allTasks.map((t: any) => String(t.homeworkId)),
      );

      // 3. Chart counts (Option A — per homework)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let subCount = 0,
        pendCount = 0,
        ovdCount = 0;
      myHw.forEach((hw: any) => {
        const hasTask = submittedHwIds.has(String(hw.id));
        if (hasTask) {
          subCount++; // submitted — never overdue once submitted
        } else {
          const endDate = hw.endDate ? new Date(hw.endDate) : null;
          if (endDate) endDate.setHours(0, 0, 0, 0);
          if (endDate && endDate < today) ovdCount++;
          else pendCount++;
        }
      });
      const total = myHw.length || 1;
      setChartData([
        {
          label: "Submitted",
          count: subCount,
          percent: Math.round((subCount / total) * 100),
          color: "#16A34A",
          icon: "checkmark-circle-outline",
        },
        {
          label: "Pending",
          count: pendCount,
          percent: Math.round((pendCount / total) * 100),
          color: "#EA580C",
          icon: "time-outline",
        },
        {
          label: "Overdue",
          count: ovdCount,
          percent: Math.round((ovdCount / total) * 100),
          color: "#DC2626",
          icon: "alert-circle-outline",
        },
      ]);

      // 4. Recently added homework — last 4 of this teacher's, by id desc
      const sortedHw = [...myHw]
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, 4);
      const hwItems: HwItem[] = sortedHw.map((hw: any) => {
        const hasTask = submittedHwIds.has(String(hw.id));
        const { due, dueBg, dueColor } = dueLabel(hw.endDate, hasTask);
        const subjName =
          subjectNameById[String(hw.subjectId)] ?? hw.subjectName ?? hw.subject;
        const metaParts = [subjName, hw.className ?? hw.class].filter(Boolean);
        return {
          key: String(hw.id),
          fileExt: hw.homework ?? "",
          title: hw.title || hw.homework || "Untitled",
          meta: metaParts.join(" · ") || "—",
          due,
          dueBg,
          dueColor,
        };
      });
      setRecentHw(hwItems);

      // 5. Students who submitted — only for this teacher's homework, last 3 unique students
      const myHwIds = new Set(myHw.map((hw: any) => String(hw.id)));
      const hwById: Record<string, any> = {};
      myHw.forEach((hw: any) => {
        hwById[String(hw.id)] = hw;
      });

      const myTasks = allTasks.filter((t: any) =>
        myHwIds.has(String(t.homeworkId)),
      );
      const sortedTasks = [...myTasks].sort(
        (a, b) => Number(b.id) - Number(a.id),
      );

      const seen = new Set<string>();
      const uniqueTasks: any[] = [];
      for (const t of sortedTasks) {
        const dedupeKey = String(t.studentId);
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          uniqueTasks.push(t);
        }
        if (uniqueTasks.length >= 3) break;
      }

      const submittedItems: SubmittedItem[] = uniqueTasks.map(
        (t: any, idx: number) => {
          const hw = hwById[String(t.homeworkId)];
          const palette = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
          const studentName = nameByStudentId[String(t.studentId)] ?? "Student";
          const hwTitle =
            hw?.title ?? hw?.homework ?? `Homework #${t.homeworkId}`;
          const subjName =
            subjectNameById[String(hw?.subjectId)] ?? hw?.subjectName ?? "";
          const metaParts = [
            hwTitle,
            subjName,
            formatTimeAgo(t.submitDate),
          ].filter(Boolean);
          return {
            key: String(t.id),
            initials: initials(studentName) || `S${idx + 1}`,
            name: studentName,
            meta: metaParts.join(" · "),
            bg: palette.bg,
            color: palette.color,
          };
        },
      );
      setSubmitted(submittedItems);
    } catch {
      // keep state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData(true);
  }

  const teacherInitials = initials(teacherName) || "T";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
          />
        }
      >
        {/* BANNER */}
        <View style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.teacherName}>{teacherName}</Text>
            <Text style={styles.teacherSub} numberOfLines={1}>
              {teacherSub}
            </Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{teacherInitials}</Text>
          </View>
        </View>

        {/* MANAGE HOMEWORK */}
        <TouchableOpacity
          style={styles.homeworkCard}
          activeOpacity={0.82}
          onPress={() => router.push("/(teacher)/homework" as any)}
        >
          <View style={styles.homeworkCardLeft}>
            <View style={styles.homeworkIconBox}>
              <Ionicons name="clipboard-outline" size={24} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.homeworkCardTitle}>Manage Homework</Text>
              <Text style={styles.homeworkCardSub}>
                View subjects & assign homework
              </Text>
            </View>
          </View>
          <View style={styles.homeworkCardArrow}>
            <Ionicons name="arrow-forward" size={18} color="#2563EB" />
          </View>
        </TouchableOpacity>

        {/* SUBMISSION OVERVIEW */}
        <Text style={styles.sectionLabel}>Homework submission overview</Text>
        <View style={styles.chartCard}>
          <View style={styles.barTrack}>
            {chartData.map((d) => (
              <View
                key={d.label}
                style={[
                  styles.barSegment,
                  {
                    flex: Math.max(d.percent, d.count > 0 ? 6 : 0.0001),
                    backgroundColor: d.color,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.statRow}>
            {chartData.map((d) => (
              <View
                key={d.label}
                style={[
                  styles.statBox,
                  {
                    borderColor: d.color + "30",
                    backgroundColor: d.color + "0C",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconWrap,
                    { backgroundColor: d.color + "18" },
                  ]}
                >
                  <Ionicons name={d.icon} size={16} color={d.color} />
                </View>
                <Text style={[styles.statPercent, { color: d.color }]}>
                  {d.percent}%
                </Text>
                <Text style={styles.statCount}>
                  {d.count} task{d.count !== 1 ? "s" : ""}
                </Text>
                <Text style={styles.statLabel}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* STUDENTS WHO SUBMITTED */}
        <Text style={styles.sectionLabel}>Students who submitted</Text>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginVertical: 12 }} />
        ) : submitted.length === 0 ? (
          <View style={styles.emptyRow}>
            <Ionicons name="people-outline" size={20} color="#D1D5DB" />
            <Text style={styles.emptyText}>No submissions yet</Text>
          </View>
        ) : (
          submitted.map((s) => (
            <View key={s.key} style={styles.rowCard}>
              <View style={[styles.studentAvatar, { backgroundColor: s.bg }]}>
                <Text style={[styles.studentInitials, { color: s.color }]}>
                  {s.initials}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{s.name}</Text>
                <Text style={styles.rowMeta}>{s.meta}</Text>
              </View>
              <View style={styles.doneBadge}>
                <Ionicons name="checkmark" size={11} color="#16A34A" />
                <Text style={styles.doneText}> Done</Text>
              </View>
            </View>
          ))
        )}

        {/* RECENTLY ADDED HOMEWORK */}
        <Text style={styles.sectionLabel}>Recently added homework</Text>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginVertical: 12 }} />
        ) : recentHw.length === 0 ? (
          <View style={styles.emptyRow}>
            <Ionicons name="clipboard-outline" size={20} color="#D1D5DB" />
            <Text style={styles.emptyText}>No homework yet</Text>
          </View>
        ) : (
          recentHw.map((hw) => {
            const fs = fileStyle(hw.fileExt);
            return (
              <View key={hw.key} style={styles.rowCard}>
                <View style={[styles.fileIconWrap, { backgroundColor: fs.bg }]}>
                  <Ionicons name={fs.icon} size={22} color={fs.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.hwTitleRow}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {hw.title}
                    </Text>
                    <View
                      style={[styles.fileBadge, { backgroundColor: fs.bg }]}
                    >
                      <Text style={[styles.fileBadgeText, { color: fs.color }]}>
                        {fs.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rowMeta}>{hw.meta}</Text>
                </View>
                <View style={[styles.dueBadge, { backgroundColor: hw.dueBg }]}>
                  <Text style={[styles.dueText, { color: hw.dueColor }]}>
                    {hw.due}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────
//  Styles
// ─────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  banner: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
  },
  teacherName: { fontSize: 22, fontWeight: "800", color: "#fff" },
  teacherSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
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

  homeworkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EEF4FF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    padding: 16,
    marginBottom: 20,
  },
  homeworkCardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  homeworkIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  homeworkCardTitle: { fontSize: 15, fontWeight: "700", color: "#1E40AF" },
  homeworkCardSub: { fontSize: 11, color: "#3B82F6", marginTop: 2 },
  homeworkCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  sectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    marginTop: 10,
  },

  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 4,
  },
  barTrack: {
    flexDirection: "row",
    height: 10,
    borderRadius: 8,
    overflow: "hidden",
    gap: 2,
    marginBottom: 16,
    backgroundColor: "#F3F4F6",
  },
  barSegment: { borderRadius: 6 },

  statRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  statPercent: { fontSize: 20, fontWeight: "900" },
  statCount: { fontSize: 10, color: "#6B7280", fontWeight: "600" },
  statLabel: { fontSize: 11, color: "#374151", fontWeight: "700" },

  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
  },
  rowMeta: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  studentInitials: { fontSize: 13, fontWeight: "700" },

  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  doneText: { fontSize: 11, fontWeight: "700", color: "#16A34A" },

  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  hwTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  fileBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  fileBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  dueBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  dueText: { fontSize: 11, fontWeight: "700" },

  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  emptyText: { fontSize: 13, color: "#9CA3AF" },
});
