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

type Homework = {
  id: string;
  title: string;
  subject: string;
  class: string;
  teacher: string;
  dueDate: string;
  status: "Pending" | "Submitted" | "Overdue";
  totalStudents: number;
  submitted: number;
};

const STATUS_COLORS = {
  Pending: { bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA" },
  Submitted: { bg: "#DCFCE7", color: "#16A34A", border: "#BBF7D0" },
  Overdue: { bg: "#FEE2E2", color: "#DC2626", border: "#FECACA" },
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

function getSubjectColor(subject: string) {
  return SUBJECT_COLORS[subject] ?? { bg: "#F3F4F6", color: "#6B7280" };
}

const INITIAL_HOMEWORK: Homework[] = [
  {
    id: "HW-001",
    title: "Quadratic Equations",
    subject: "Mathematics",
    class: "Form One A",
    teacher: "Mr. Hassan",
    dueDate: "Jun 02, 2025",
    status: "Submitted",
    totalStudents: 38,
    submitted: 35,
  },
  {
    id: "HW-002",
    title: "Newton's Laws",
    subject: "Physics",
    class: "Form Two A",
    teacher: "Mr. Ali",
    dueDate: "Jun 03, 2025",
    status: "Pending",
    totalStudents: 33,
    submitted: 10,
  },
  {
    id: "HW-003",
    title: "Organic Chemistry",
    subject: "Chemistry",
    class: "Form Three A",
    teacher: "Mrs. Zainab",
    dueDate: "May 28, 2025",
    status: "Overdue",
    totalStudents: 30,
    submitted: 18,
  },
  {
    id: "HW-004",
    title: "Shakespeare Essay",
    subject: "English",
    class: "Form One B",
    teacher: "Mrs. Fatuma",
    dueDate: "Jun 05, 2025",
    status: "Pending",
    totalStudents: 35,
    submitted: 5,
  },
  {
    id: "HW-005",
    title: "Cell Biology",
    subject: "Biology",
    class: "Form Two B",
    teacher: "Mr. Omar",
    dueDate: "May 30, 2025",
    status: "Overdue",
    totalStudents: 32,
    submitted: 20,
  },
  {
    id: "HW-006",
    title: "Trigonometry Problems",
    subject: "Mathematics",
    class: "Form Two B",
    teacher: "Mr. Hassan",
    dueDate: "Jun 04, 2025",
    status: "Pending",
    totalStudents: 32,
    submitted: 0,
  },
  {
    id: "HW-007",
    title: "Kiswahili Insha",
    subject: "Kiswahili",
    class: "Form One A",
    teacher: "Mrs. Maryam",
    dueDate: "Jun 06, 2025",
    status: "Pending",
    totalStudents: 38,
    submitted: 22,
  },
  {
    id: "HW-008",
    title: "World War II Summary",
    subject: "History",
    class: "Form Three A",
    teacher: "Mr. Bakari",
    dueDate: "May 25, 2025",
    status: "Overdue",
    totalStudents: 30,
    submitted: 28,
  },
  {
    id: "HW-009",
    title: "Map Reading Exercise",
    subject: "Geography",
    class: "Form Three B",
    teacher: "Mrs. Rehema",
    dueDate: "Jun 07, 2025",
    status: "Submitted",
    totalStudents: 28,
    submitted: 28,
  },
  {
    id: "HW-010",
    title: "Still Life Drawing",
    subject: "Fine Art",
    class: "Form One B",
    teacher: "Mr. Juma",
    dueDate: "Jun 08, 2025",
    status: "Pending",
    totalStudents: 35,
    submitted: 12,
  },
];

const CLASS_LIST = [
  "Form One A",
  "Form One B",
  "Form Two A",
  "Form Two B",
  "Form Three A",
  "Form Three B",
];
const SUBJECT_LIST = Object.keys(SUBJECT_COLORS);

function generateId() {
  return "HW-" + String(Math.floor(Math.random() * 900) + 100);
}

export default function AdminHomeworkScreen() {
  const insets = useSafeAreaInsets();

  const [homework, setHomework] = useState<Homework[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // admin view-only: no local form state

  const filtered = homework.filter((h) => {
    const matchSearch =
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.subject.toLowerCase().includes(search.toLowerCase()) ||
      h.class.toLowerCase().includes(search.toLowerCase()) ||
      h.teacher.toLowerCase().includes(search.toLowerCase()) ||
      h.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || h.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = homework.filter((h) => h.status === "Pending").length;
  const submittedCount = homework.filter(
    (h) => h.status === "Submitted",
  ).length;
  const overdueCount = homework.filter((h) => h.status === "Overdue").length;

  const toArr = (res: any): any[] => {
    const d = res?.data?.data ?? res?.data;
    return Array.isArray(d) ? d : [];
  };

  const mapApiHw = (item: any): Homework => ({
    id: String(
      item.id ??
        item._id ??
        item.hwId ??
        item.homeworkId ??
        item.externalId ??
        "",
    ),
    title: item.homework ?? item.title ?? item.name ?? "",
    subject: item.subject?.name ?? item.subject ?? "General",
    class: item.class?.name ?? item.class ?? item.className ?? "",
    teacher: item.teacher?.name ?? item.teacher ?? "",
    dueDate: item.endDate
      ? new Date(item.endDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : (item.dueDate ?? item.due ?? ""),
    status: ((): Homework["status"] => {
      const s = String(item.status ?? item.state ?? "").toLowerCase();
      if (s.includes("submi")) return "Submitted";
      if (s.includes("over")) return "Overdue";
      return "Pending";
    })(),
    totalStudents: Number(item.totalStudents ?? item.total_students ?? 0),
    submitted: Number(item.submitted ?? item.submissions ?? 0),
  });

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const res = await HomeworkService.getAll();
      const raw = toArr(res);
      let arr: Homework[] = [];
      try {
        arr = raw.map(mapApiHw);
      } catch (e) {
        console.error("Mapping homework items failed", e);
        arr = [];
      }
      setHomework(arr);
    } catch (err) {
      console.error("Failed to load homeworks", err);
      Alert.alert(
        "Unable to load homeworks",
        "Please check your connection and try again.",
      );
      setHomework([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  // Admin is view-only for homework: no create/edit/delete handlers

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#D97706" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Homework</Text>
            <Text style={styles.headerSub}>Manage all school homework</Text>
          </View>
          {/* admin view-only: no add button */}
        </View>

        {/* stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{homework.length}</Text>
            <Text style={styles.stripLabel}>Total</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{pendingCount}</Text>
            <Text style={styles.stripLabel}>Pending</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{submittedCount}</Text>
            <Text style={styles.stripLabel}>Submitted</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{overdueCount}</Text>
            <Text style={styles.stripLabel}>Overdue</Text>
          </View>
        </View>
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={17}
          color="#9CA3AF"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, subject, class or teacher..."
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

      {/* ── FILTER CHIPS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {["All", "Pending", "Submitted", "Overdue"].map((st) => {
          const active = filterStatus === st;
          const sc =
            st !== "All"
              ? STATUS_COLORS[st as keyof typeof STATUS_COLORS]
              : null;
          return (
            <TouchableOpacity
              key={st}
              style={[
                styles.filterChip,
                active && {
                  backgroundColor: sc?.color ?? "#111827",
                  borderColor: sc?.color ?? "#111827",
                },
              ]}
              onPress={() => setFilterStatus(st)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.filterChipText, active && { color: "#fff" }]}
              >
                {st === "All" ? "All homework" : st}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── LIST ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={{ paddingTop: 40 }}>
            <ActivityIndicator size="large" color="#D97706" />
          </View>
        ) : (
          filtered.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="clipboard-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No homework found</Text>
              <Text style={styles.emptySub}>
                Try a different search or add new homework
              </Text>
            </View>
          )
        )}

        {!loading &&
          filtered.map((h) => {
            const sc = getSubjectColor(h.subject);
            const st = STATUS_COLORS[h.status] ?? STATUS_COLORS.Pending;
            const pct =
              h.totalStudents > 0
                ? Math.round((h.submitted / h.totalStudents) * 100)
                : 0;

            return (
              <TouchableOpacity
                key={h.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/(admin)/homework/${h.id}` as any)}
              >
                {/* top accent */}
                <View
                  style={[styles.cardAccent, { backgroundColor: sc.color }]}
                />

                <View style={styles.cardBody}>
                  {/* title + status */}
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {h.title}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: st.bg, borderColor: st.border },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: st.color }]}>
                        {h.status}
                      </Text>
                    </View>
                  </View>

                  {/* subject + class */}
                  <View style={styles.metaRow}>
                    <View
                      style={[styles.subjectPill, { backgroundColor: sc.bg }]}
                    >
                      <Text style={[styles.subjectText, { color: sc.color }]}>
                        {h.subject}
                      </Text>
                    </View>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons name="school-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.metaText}> {h.class}</Text>
                  </View>

                  {/* teacher + due */}
                  <View style={styles.metaRow}>
                    <Ionicons name="person-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.metaText}> {h.teacher}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color="#9CA3AF"
                    />
                    <Text style={styles.metaText}> {h.dueDate}</Text>
                  </View>

                  {/* submission progress */}
                  <View style={styles.progressWrap}>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${pct}%` as any,
                            backgroundColor: sc.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressLabel, { color: sc.color }]}>
                      {h.submitted}/{h.totalStudents} submitted
                    </Text>
                  </View>

                  {/* id + actions */}
                  <View style={styles.cardBottom}>
                    <Text style={styles.hwId}>{h.id}</Text>
                    <View style={styles.cardActions}>
                      {/* admin view-only: no edit/delete actions */}
                    </View>
                  </View>
                </View>

                <View style={styles.cardChevron}>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            );
          })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* admin view-only: no modal or edit UI */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },

  header: {
    backgroundColor: "#D97706",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 14,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripNum: { fontSize: 18, fontWeight: "800", color: "#fff" },
  stripLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stripDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 4,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    overflow: "hidden",
    flexDirection: "row",
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardChevron: { justifyContent: "center", paddingRight: 12 },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 },

  statusPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  subjectPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  subjectText: { fontSize: 11, fontWeight: "600" },
  metaDot: { fontSize: 11, color: "#D1D5DB" },
  metaText: { fontSize: 12, color: "#6B7280" },

  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  progressBg: {
    flex: 1,
    height: 5,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
  },
  progressFill: { height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 10, fontWeight: "600" },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hwId: { fontSize: 11, color: "#9CA3AF" },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionEditText: { fontSize: 12, fontWeight: "600", color: "#D97706" },
  actionDelete: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  overlay: { flex: 1, justifyContent: "flex-end" },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "92%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sheetSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  required: { color: "#DC2626" },
  optional: { color: "#9CA3AF", fontWeight: "400" },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    marginBottom: 18,
  },

  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  pickerChipText: { fontSize: 13, fontWeight: "600" },

  statusRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  statusOptionText: { fontSize: 13, fontWeight: "600" },

  saveBtn: {
    backgroundColor: "#D97706",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
