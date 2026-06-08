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

import { HomeworkService }    from "@/services/api/homeworkService";
import { StudentTaskService } from "@/services/api/studentTaskService";

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

type ChartData = { label: string; count: number; percent: number; color: string; icon: keyof typeof Ionicons.glyphMap };

// ─────────────────────────────
//  File-type config
// ─────────────────────────────
type FileStyle = { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string; badge: string };

function fileStyle(filename: string): FileStyle {
  const ext = (filename ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")                    return { icon: "document-text-outline", bg: "#FEE2E2", color: "#DC2626", badge: "PDF"  };
  if (ext === "ppt" || ext === "pptx") return { icon: "easel-outline",          bg: "#FFF1E6", color: "#EA580C", badge: ext.toUpperCase() };
  if (ext === "doc" || ext === "docx") return { icon: "document-outline",       bg: "#EEF4FF", color: "#2563EB", badge: ext.toUpperCase() };
  if (ext === "xls" || ext === "xlsx") return { icon: "grid-outline",           bg: "#DCFCE7", color: "#16A34A", badge: ext.toUpperCase() };
  return                                       { icon: "attach-outline",          bg: "#F3F4F6", color: "#6B7280", badge: "FILE" };
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
  return str.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function dueLabel(endDate: string, hasTask: boolean) {
  if (hasTask) return { due: "Done", dueBg: "#DCFCE7", dueColor: "#16A34A" };
  if (!endDate) return { due: "No date", dueBg: "#F3F4F6", dueColor: "#6B7280" };
  const dt  = new Date(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  const diff = Math.round((dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const fmt  = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  if (diff < 0)   return { due: "Overdue",    dueBg: "#FEE2E2", dueColor: "#DC2626" };
  if (diff === 0) return { due: "Due Today",  dueBg: "#FFF1E6", dueColor: "#EA580C" };
  if (diff <= 3)  return { due: `Due ${fmt}`, dueBg: "#FFF1E6", dueColor: "#EA580C" };
  return              { due: `Due ${fmt}`,    dueBg: "#F0FFF4", dueColor: "#16A34A" };
}

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
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
  const [teacherSub, setTeacherSub]   = useState("—");
  const [submitted, setSubmitted]     = useState<SubmittedItem[]>([]);
  const [recentHw, setRecentHw]       = useState<HwItem[]>([]);
  const [chartData, setChartData]     = useState<ChartData[]>([
    { label: "Submitted", count: 0, percent: 0, color: "#2563EB", icon: "checkmark-circle-outline" },
    { label: "Pending",   count: 0, percent: 0, color: "#EA580C", icon: "time-outline"             },
    { label: "Overdue",   count: 0, percent: 0, color: "#DC2626", icon: "alert-circle-outline"     },
  ]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      // 1. Teacher info
      const raw = await AsyncStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setTeacherName(u.name ?? u.fullName ?? "Teacher");
        setTeacherSub(u.subject ?? u.department ?? u.email ?? "—");
      }

      // 2. Parallel fetch
      const [hwRes, taskRes] = await Promise.all([
        HomeworkService.getAll(),
        StudentTaskService.getAll(),
      ]);

      const allHw:    any[] = hwRes.data?.data  ?? hwRes.data  ?? [];
      const allTasks: any[] = taskRes.data?.data ?? taskRes.data ?? [];

      // task lookup: homeworkId → task
      const taskByHwId: Record<string, any> = {};
      allTasks.forEach((t: any) => { taskByHwId[String(t.homeworkId)] = t; });

      // 3. Chart counts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let subCount = 0, pendCount = 0, ovdCount = 0;
      allHw.forEach((hw: any) => {
        const endDate = hw.endDate ? new Date(hw.endDate) : null;
        if (taskByHwId[String(hw.id)])           subCount++;
        else if (endDate && endDate < today)      ovdCount++;
        else                                      pendCount++;
      });
      const total = allHw.length || 1;
      setChartData([
        { label: "Submitted", count: subCount,  percent: Math.round((subCount  / total) * 100), color: "#2563EB", icon: "checkmark-circle-outline" },
        { label: "Pending",   count: pendCount, percent: Math.round((pendCount / total) * 100), color: "#EA580C", icon: "time-outline"             },
        { label: "Overdue",   count: ovdCount,  percent: Math.round((ovdCount  / total) * 100), color: "#DC2626", icon: "alert-circle-outline"     },
      ]);

      // 4. Recently added homework — last 4, sorted by id desc
      const sortedHw = [...allHw].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 4);
      const hwItems: HwItem[] = sortedHw.map((hw: any) => {
        const hasTask = !!taskByHwId[String(hw.id)];
        const { due, dueBg, dueColor } = dueLabel(hw.endDate, hasTask);
        const metaParts = [hw.subjectName ?? hw.subject, hw.className ?? hw.class].filter(Boolean);
        return {
          key:     String(hw.id),
          fileExt: hw.homework ?? "",
          title:   hw.title || hw.homework || "Untitled",
          meta:    metaParts.join(" · ") || "—",
          due, dueBg, dueColor,
        };
      });
      setRecentHw(hwItems);

      // 5. Students who submitted — last 3 UNIQUE students, by task id desc
      const hwById: Record<string, any> = {};
      allHw.forEach((hw: any) => { hwById[String(hw.id)] = hw; });

      const sortedTasks = [...allTasks].sort((a, b) => Number(b.id) - Number(a.id));

      // Deduplicate: one entry per student name
      const seen = new Set<string>();
      const uniqueTasks: any[] = [];
      for (const t of sortedTasks) {
        const name = t.studentName ?? t.student?.name ?? "";
        const dedupeKey = name || String(t.id); // if no name, each task is unique
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          uniqueTasks.push(t);
        }
        if (uniqueTasks.length >= 3) break;
      }

      const submittedItems: SubmittedItem[] = uniqueTasks.map((t: any, idx: number) => {
        const hw          = hwById[String(t.homeworkId)];
        const palette     = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
        const studentName = t.studentName ?? t.student?.name ?? "Student";
        const hwTitle     = hw?.title ?? hw?.homework ?? `Homework #${t.homeworkId}`;
        const classPart   = hw?.className ?? hw?.class ?? hw?.subjectName ?? "";
        const metaParts   = [hwTitle, classPart, formatTimeAgo(t.submitDate)].filter(Boolean);
        return {
          key:      String(t.id),
          initials: initials(studentName) || `S${idx + 1}`,
          name:     studentName,
          meta:     metaParts.join(" · "),
          bg:       palette.bg,
          color:    palette.color,
        };
      });
      setSubmitted(submittedItems);

    } catch {
      // keep state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() { setRefreshing(true); await loadData(true); }

  const teacherInitials = initials(teacherName) || "T";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
      >
        {/* ── BANNER ── */}
        <View style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.teacherName}>{teacherName}</Text>
            <Text style={styles.teacherSub}>{teacherSub}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{teacherInitials}</Text>
          </View>
        </View>

        {/* ── MANAGE HOMEWORK CARD ── */}
        <TouchableOpacity style={styles.homeworkCard} activeOpacity={0.82}
          onPress={() => router.push("/(teacher)/homework" as any)}>
          <View style={styles.homeworkCardLeft}>
            <View style={styles.homeworkIconBox}>
              <Ionicons name="clipboard-outline" size={24} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.homeworkCardTitle}>Manage Homework</Text>
              <Text style={styles.homeworkCardSub}>View subjects & assign homework</Text>
            </View>
          </View>
          <View style={styles.homeworkCardArrow}>
            <Ionicons name="arrow-forward" size={18} color="#2563EB" />
          </View>
        </TouchableOpacity>

        {/* ── SUBMISSION OVERVIEW ── */}
        <Text style={styles.sectionLabel}>Homework submission overview</Text>
        <View style={styles.chartCard}>
          {/* Segmented bar */}
          <View style={styles.barTrack}>
            {chartData.map((d) => (
              <View key={d.label}
                style={[styles.barSegment, { flex: Math.max(d.percent, 2), backgroundColor: d.color }]} />
            ))}
          </View>

          {/* Stat boxes */}
          <View style={styles.statRow}>
            {chartData.map((d) => (
              <View key={d.label} style={[styles.statBox, { borderColor: d.color + "30", backgroundColor: d.color + "0C" }]}>
                <View style={[styles.statIconWrap, { backgroundColor: d.color + "18" }]}>
                  <Ionicons name={d.icon} size={16} color={d.color} />
                </View>
                <Text style={[styles.statPercent, { color: d.color }]}>{d.percent}%</Text>
                <Text style={styles.statCount}>{d.count} tasks</Text>
                <Text style={styles.statLabel}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── STUDENTS WHO SUBMITTED ── */}
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
                <Text style={[styles.studentInitials, { color: s.color }]}>{s.initials}</Text>
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

        {/* ── RECENTLY ADDED HOMEWORK ── */}
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
                {/* File type icon */}
                <View style={[styles.fileIconWrap, { backgroundColor: fs.bg }]}>
                  <Ionicons name={fs.icon} size={22} color={fs.color} />
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                  <View style={styles.hwTitleRow}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{hw.title}</Text>
                    {/* File badge */}
                    <View style={[styles.fileBadge, { backgroundColor: fs.bg }]}>
                      <Text style={[styles.fileBadgeText, { color: fs.color }]}>{fs.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.rowMeta}>{hw.meta}</Text>
                </View>

                {/* Due badge */}
                <View style={[styles.dueBadge, { backgroundColor: hw.dueBg }]}>
                  <Text style={[styles.dueText, { color: hw.dueColor }]}>{hw.due}</Text>
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
  scroll:    { paddingHorizontal: 20, paddingTop: 20 },

  /* Banner */
  banner: {
    backgroundColor: "#2563EB", borderRadius: 16, padding: 22,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 24,
  },
  greeting:    { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  teacherName: { fontSize: 22, fontWeight: "800", color: "#fff" },
  teacherSub:  { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  /* Manage homework */
  homeworkCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#EEF4FF", borderRadius: 14,
    borderWidth: 1.5, borderColor: "#BFDBFE",
    padding: 16, marginBottom: 20,
  },
  homeworkCardLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  homeworkIconBox:   { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  homeworkCardTitle: { fontSize: 15, fontWeight: "700", color: "#1E40AF" },
  homeworkCardSub:   { fontSize: 11, color: "#3B82F6", marginTop: 2 },
  homeworkCardArrow: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },

  /* Section label */
  sectionLabel: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 12, marginTop: 10 },

  /* Chart card */
  chartCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 4,
  },
  barTrack: {
    flexDirection: "row", height: 10, borderRadius: 8,
    overflow: "hidden", gap: 2, marginBottom: 16,
  },
  barSegment: { borderRadius: 6 },

  /* Stat boxes */
  statRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    padding: 12, alignItems: "center", gap: 4,
  },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 2 },
  statPercent:  { fontSize: 20, fontWeight: "900" },
  statCount:    { fontSize: 10, color: "#6B7280", fontWeight: "600" },
  statLabel:    { fontSize: 11, color: "#374151", fontWeight: "700" },

  /* Shared row card */
  rowCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB",
  },
  rowTitle: { fontSize: 13, fontWeight: "700", color: "#111827", flexShrink: 1 },
  rowMeta:  { fontSize: 11, color: "#6B7280", marginTop: 2 },

  /* Student avatar */
  studentAvatar:   { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  studentInitials: { fontSize: 13, fontWeight: "700" },

  /* Done badge */
  doneBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#DCFCE7", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  doneText: { fontSize: 11, fontWeight: "700", color: "#16A34A" },

  /* Homework file icon */
  fileIconWrap: { width: 44, height: 44, borderRadius: 13, justifyContent: "center", alignItems: "center" },

  /* Homework title row */
  hwTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },

  /* File type badge */
  fileBadge:     { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  fileBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

  /* Due badge */
  dueBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  dueText:  { fontSize: 11, fontWeight: "700" },

  /* Empty state */
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 4 },
  emptyText: { fontSize: 13, color: "#9CA3AF" },
});
