import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { HomeworkService } from "../../../services/api/homeworkService";
import { StudentTaskService } from "../../../services/api/studentTaskService";
import { SubjectService } from "../../../services/api/subjectService";
import { ClassService } from "../../../services/api/classService";

type Status = "Pending" | "Submitted" | "Overdue";

type Homework = {
  id: string;
  numericId: number;
  title: string;
  fileExt: string;
  subject: string;
  class: string;
  dueDate: string;
  endDateRaw: string;
  status: Status;
  submissionCount: number;
};

const STATUS_META: Record<Status, { bg: string; color: string; border: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Pending:   { bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA", icon: "time-outline" },
  Submitted: { bg: "#DCFCE7", color: "#16A34A", border: "#BBF7D0", icon: "checkmark-circle-outline" },
  Overdue:   { bg: "#FEE2E2", color: "#DC2626", border: "#FECACA", icon: "alert-circle-outline" },
};

const SUBJECT_COLORS: Record<string, { bg: string; color: string }> = {
  Mathematics: { bg: "#EEF4FF", color: "#2563EB" },
  Physics: { bg: "#DCFCE7", color: "#16A34A" },
  Chemistry: { bg: "#EDE9FE", color: "#7C3AED" },
  Biology: { bg: "#DCFCE7", color: "#16A34A" },
  English: { bg: "#FFF7ED", color: "#EA580C" },
  Kiswahili: { bg: "#FEF3C7", color: "#D97706" },
  History: { bg: "#FEE2E2", color: "#DC2626" },
  Geography: { bg: "#EDE9FE", color: "#7C3AED" },
  "Fine Art": { bg: "#FFF1E6", color: "#EA580C" },
};

const FALLBACK_SUBJECT_PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
  { bg: "#FEF3C7", color: "#D97706" },
];

function subjectColor(subject: string) {
  if (SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_SUBJECT_PALETTE[Math.abs(hash) % FALLBACK_SUBJECT_PALETTE.length];
}

function fileMeta(path: string) {
  const ext = (path ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { icon: "document-text" as const, color: "#DC2626", bg: "#FEE2E2", label: "PDF" };
  if (ext === "ppt" || ext === "pptx") return { icon: "easel" as const, color: "#EA580C", bg: "#FFF1E6", label: ext.toUpperCase() };
  if (ext === "doc" || ext === "docx") return { icon: "document" as const, color: "#2563EB", bg: "#EEF4FF", label: ext.toUpperCase() };
  return { icon: "attach" as const, color: "#6B7280", bg: "#F3F4F6", label: "FILE" };
}

const TABS: ("All" | Status)[] = ["All", "Pending", "Submitted", "Overdue"];

export default function AdminHomeworkScreen() {
  const insets = useSafeAreaInsets();

  const [homework, setHomework] = useState<Homework[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | Status>("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const toArr = (res: any): any[] => {
    const d = res?.data?.data ?? res?.data;
    return Array.isArray(d) ? d : [];
  };

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);

      const [hwRes, taskRes, subjRes, clsRes] = await Promise.all([
        HomeworkService.getAll(),
        StudentTaskService.getAll(),
        SubjectService.getAll(),
        ClassService.getAll(),
      ]);

      const rawHw = toArr(hwRes);
      const rawTasks = toArr(taskRes);
      const subjects = toArr(subjRes);
      const classes = toArr(clsRes);

      const subjectNameById = new Map<string, string>(
        subjects.map((s: any) => [String(s.id), s.name ?? `Subject #${s.id}`]),
      );
      const classNameById = new Map<string, string>(
        classes.map((c: any) => [String(c.id), c.name ?? `Class #${c.id}`]),
      );

      // homeworkId -> submission count
      const submissionCountByHw = new Map<string, number>();
      rawTasks.forEach((t: any) => {
        const key = String(t.homeworkId);
        submissionCountByHw.set(key, (submissionCountByHw.get(key) ?? 0) + 1);
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let arr: Homework[] = rawHw.map((item: any): Homework => {
        const fileExt = item.homework ?? "";
        const subjName =
          subjectNameById.get(String(item.subjectId)) ??
          item.subject?.name ?? item.subject ?? "General";
        const clsName =
          classNameById.get(String(item.classId)) ??
          item.class?.name ?? item.className ?? "";

        const count = submissionCountByHw.get(String(item.id)) ?? 0;

        // Status: Submitted if anyone submitted; else Overdue if past end; else Pending
        let status: Status;
        if (count > 0) {
          status = "Submitted";
        } else {
          const end = item.endDate ? new Date(item.endDate) : null;
          if (end) end.setHours(0, 0, 0, 0);
          status = end && end < today ? "Overdue" : "Pending";
        }

        const title = (() => {
          const t = item.title ?? item.name ?? "";
          const ext = fileExt.split(".").pop()?.toLowerCase() ?? "";
          return t ? (ext ? `${t}.${ext}` : t) : fileExt;
        })();

        return {
          id: String(item.id ?? ""),
          numericId: Number(item.id ?? 0),
          title,
          fileExt,
          subject: subjName,
          class: clsName,
          dueDate: item.endDate
            ? new Date(item.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "",
          endDateRaw: item.endDate ?? "",
          status,
          submissionCount: count,
        };
      });

      // newest first (higher id = newer)
      arr.sort((a, b) => b.numericId - a.numericId);

      setHomework(arr);
    } catch (err) {
      console.error("Failed to load homeworks", err);
      Alert.alert("Unable to load homeworks", "Please check your connection and try again.");
      setHomework([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => { loadData(); }, [loadData]);

  function onRefresh() { setRefreshing(true); loadData(); }

  const filtered = homework.filter((h) => {
    const q = search.toLowerCase();
    const matchSearch =
      h.title.toLowerCase().includes(q) ||
      h.subject.toLowerCase().includes(q) ||
      h.class.toLowerCase().includes(q);
    const matchStatus = filterStatus === "All" || h.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalCount = homework.length;
  const pendingCount = homework.filter((h) => h.status === "Pending").length;
  const submittedCount = homework.filter((h) => h.status === "Submitted").length;
  const overdueCount = homework.filter((h) => h.status === "Overdue").length;

  const tabCount = (t: "All" | Status) =>
    t === "All" ? totalCount
      : t === "Pending" ? pendingCount
      : t === "Submitted" ? submittedCount
      : overdueCount;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#B45309" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerKicker}>Admin · School-wide</Text>
            <Text style={styles.headerTitle}>Homework</Text>
          </View>
          <View style={styles.headerIconBox}>
            <Ionicons name="clipboard-outline" size={22} color="#B45309" />
          </View>
        </View>

        {/* stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{totalCount}</Text>
            <Text style={styles.stripLabel}>Total</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripNum, { color: "#FED7AA" }]}>{pendingCount}</Text>
            <Text style={styles.stripLabel}>Pending</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripNum, { color: "#BBF7D0" }]}>{submittedCount}</Text>
            <Text style={styles.stripLabel}>Submitted</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripNum, { color: "#FECACA" }]}>{overdueCount}</Text>
            <Text style={styles.stripLabel}>Overdue</Text>
          </View>
        </View>
      </View>

      {/* SEARCH */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search title, subject or class..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={17} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {TABS.map((t) => {
          const active = filterStatus === t;
          const meta = t !== "All" ? STATUS_META[t] : null;
          const activeBg = meta?.color ?? "#B45309";
          return (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, active && { backgroundColor: activeBg, borderColor: activeBg }]}
              onPress={() => setFilterStatus(t)}
              activeOpacity={0.85}
            >
              {meta && (
                <Ionicons
                  name={meta.icon}
                  size={13}
                  color={active ? "#fff" : meta.color}
                  style={{ marginRight: 5 }}
                />
              )}
              <Text style={[styles.filterChipText, active && { color: "#fff" }]}>
                {t === "All" ? "All" : t}
              </Text>
              <View style={[styles.chipCount, active && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Text style={[styles.chipCountText, active && { color: "#fff" }]}>{tabCount(t)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B45309" />}
      >
        {loading ? (
          <View style={{ paddingTop: 50 }}>
            <ActivityIndicator size="large" color="#B45309" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="clipboard-outline" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No homework found</Text>
            <Text style={styles.emptySub}>
              {filterStatus === "All" ? "Nothing matches your search" : `No ${filterStatus.toLowerCase()} homework`}
            </Text>
          </View>
        ) : (
          filtered.map((h) => {
            const sc = subjectColor(h.subject);
            const sm = STATUS_META[h.status];
            const fm = fileMeta(h.fileExt);
            return (
              <TouchableOpacity
                key={h.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/(admin)/homework/${h.id}` as any)}
              >
                <View style={[styles.cardAccent, { backgroundColor: sc.color }]} />
                <View style={styles.cardBody}>
                  {/* top: file icon + title + status */}
                  <View style={styles.cardTopRow}>
                    <View style={[styles.fileIcon, { backgroundColor: fm.bg }]}>
                      <Ionicons name={`${fm.icon}-outline` as any} size={18} color={fm.color} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>{h.title}</Text>
                    <View style={[styles.statusPill, { backgroundColor: sm.bg, borderColor: sm.border }]}>
                      <Ionicons name={sm.icon} size={11} color={sm.color} />
                      <Text style={[styles.statusText, { color: sm.color }]}> {h.status}</Text>
                    </View>
                  </View>

                  {/* subject + class */}
                  <View style={styles.metaRow}>
                    <View style={[styles.subjectPill, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.subjectText, { color: sc.color }]}>{h.subject}</Text>
                    </View>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons name="school-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.metaText}> {h.class || "—"}</Text>
                  </View>

                  {/* due + submissions */}
                  <View style={styles.cardBottom}>
                    <View style={styles.bottomItem}>
                      <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.metaText}> Due {h.dueDate || "—"}</Text>
                    </View>
                    <View style={[styles.subCountPill, { backgroundColor: h.submissionCount > 0 ? "#DCFCE7" : "#F3F4F6" }]}>
                      <Ionicons
                        name="people-outline"
                        size={12}
                        color={h.submissionCount > 0 ? "#16A34A" : "#9CA3AF"}
                      />
                      <Text style={[styles.subCountText, { color: h.submissionCount > 0 ? "#16A34A" : "#9CA3AF" }]}>
                        {" "}{h.submissionCount} submission{h.submissionCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardChevron}>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },

  header: {
    backgroundColor: "#B45309",
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  headerKicker: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "600", marginBottom: 1 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#fff" },
  headerIconBox: {
    width: 44, height: 44, borderRadius: 13, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
  },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    paddingVertical: 14,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripNum: { fontSize: 19, fontWeight: "800", color: "#fff" },
  stripLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2, fontWeight: "600" },
  stripDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 4 },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "#E5E7EB",
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: "row" },
  filterChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 22, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff",
  },
  filterChipText: { fontSize: 12.5, fontWeight: "700", color: "#6B7280" },
  chipCount: {
    marginLeft: 6, minWidth: 20, paddingHorizontal: 5, height: 18, borderRadius: 9,
    backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center",
  },
  chipCountText: { fontSize: 10, fontWeight: "800", color: "#6B7280" },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1, borderColor: "#EEF0F4",
    marginBottom: 12, overflow: "hidden", flexDirection: "row",
    shadowColor: "#1E293B", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardChevron: { justifyContent: "center", paddingRight: 10 },

  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 },
  fileIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  cardTitle: { fontSize: 14.5, fontWeight: "800", color: "#111827", flex: 1 },

  statusPill: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0,
  },
  statusText: { fontSize: 10.5, fontWeight: "800" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12, flexWrap: "wrap" },
  subjectPill: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  subjectText: { fontSize: 11, fontWeight: "700" },
  metaDot: { fontSize: 11, color: "#D1D5DB" },
  metaText: { fontSize: 12, color: "#6B7280" },

  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bottomItem: { flexDirection: "row", alignItems: "center" },
  subCountPill: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  subCountText: { fontSize: 11, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center", marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
});