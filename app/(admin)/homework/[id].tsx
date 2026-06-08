import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
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

type Submission = {
  id: string;
  studentName: string;
  studentId: string;
  rollNo: string;
  submittedAt: string;
  grade: string;
  note: string;
  status: "On Time" | "Late";
};

type HomeworkDetail = {
  title: string;
  subject: string;
  class: string;
  teacher: string;
  dueDate: string;
  description: string;
  status: "Pending" | "Submitted" | "Overdue";
  totalStudents: number;
  submissions: Submission[];
};

// We will fetch homework details from the API instead of using static data

const STATUS_COLORS = {
  Pending: { bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA" },
  Submitted: { bg: "#DCFCE7", color: "#16A34A", border: "#BBF7D0" },
  Overdue: { bg: "#FEE2E2", color: "#DC2626", border: "#FECACA" },
};

const SUB_STATUS_COLORS = {
  "On Time": { bg: "#DCFCE7", color: "#16A34A" },
  Late: { bg: "#FEE2E2", color: "#DC2626" },
};

const GRADE_COLORS: Record<string, { bg: string; color: string }> = {
  A: { bg: "#DCFCE7", color: "#16A34A" },
  "A-": { bg: "#DCFCE7", color: "#16A34A" },
  "B+": { bg: "#EEF4FF", color: "#2563EB" },
  B: { bg: "#EEF4FF", color: "#2563EB" },
  "C+": { bg: "#FEF3C7", color: "#D97706" },
  C: { bg: "#FEF3C7", color: "#D97706" },
  "—": { bg: "#F3F4F6", color: "#6B7280" },
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

const AVATAR_PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

type ActiveTab = "submissions" | "pending";

export default function AdminHomeworkDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hwInfo, setHwInfo] = useState<HomeworkDetail | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("submissions");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const toArr = (res: any): any[] => {
    const d = res?.data?.data ?? res?.data;
    return Array.isArray(d) ? d : [];
  };

  const mapSubmission = (s: any): Submission => ({
    id: String(s.id ?? s._id ?? s.submissionId ?? s.externalId ?? ""),
    studentName: s.student?.name ?? s.studentName ?? s.name ?? "",
    studentId: String(
      s.student?.id ?? s.studentId ?? s.student_id ?? s.student ?? "",
    ),
    rollNo: s.rollNo ?? s.roll_number ?? s.roll ?? "",
    submittedAt: s.submittedAt ?? s.createdAt ?? s.time ?? "",
    grade: s.grade ?? s.mark ?? "—",
    note: s.note ?? s.comment ?? "",
    status: (s.status ?? s.state ?? "on time").toLowerCase().includes("late")
      ? "Late"
      : "On Time",
  });

  const mapDetail = (item: any): HomeworkDetail => ({
    title: item.homework ?? item.title ?? "",
    subject: item.subject?.name ?? item.subject ?? "",
    class: item.class?.name ?? item.class ?? item.className ?? "",
    teacher: item.teacher?.name ?? item.teacher ?? "",
    dueDate: item.endDate
      ? new Date(item.endDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : (item.dueDate ?? item.due ?? ""),
    description: item.description ?? item.note ?? "",
    status: ((): HomeworkDetail["status"] => {
      const s = String(item.status ?? item.state ?? "").toLowerCase();
      if (s.includes("submi")) return "Submitted";
      if (s.includes("over")) return "Overdue";
      return "Pending";
    })(),
    totalStudents: Number(
      item.totalStudents ?? item.total_students ?? item.total ?? 0,
    ),
    submissions: (item.submissions ?? item.submitted ?? []).map(mapSubmission),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!id) {
        setHwInfo(null);
        return;
      }
      const n = Number(id as any);
      let item: any = null;
      if (!Number.isNaN(n)) {
        const res = await HomeworkService.getOne(n as any);
        item = res?.data?.data ?? res?.data ?? null;
      } else {
        // fallback: try fetching all and match by external id
        const res = await HomeworkService.getAll();
        const arr = toArr(res);
        item =
          arr.find(
            (x) =>
              String(x.id) === id ||
              String(x.externalId) === id ||
              String(x.homework) === id,
          ) ?? null;
      }
      if (!item) {
        setHwInfo(null);
      } else {
        setHwInfo(mapDetail(item));
      }
    } catch (err) {
      console.error("Failed to load homework detail", err);
      setHwInfo(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!hwInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
          <Text style={styles.errorText}>Homework not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.errorBtn}
          >
            <Text style={styles.errorBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sc = getSubjectColor(hwInfo.subject);
  const st = STATUS_COLORS[hwInfo.status];
  const submittedIds = new Set(hwInfo.submissions.map((s) => s.studentId));
  const pct =
    hwInfo.totalStudents > 0
      ? Math.round((hwInfo.submissions.length / hwInfo.totalStudents) * 100)
      : 0;
  const onTimeCount = hwInfo.submissions.filter(
    (s) => s.status === "On Time",
  ).length;
  const lateCount = hwInfo.submissions.filter(
    (s) => s.status === "Late",
  ).length;
  const pendingCount = hwInfo.totalStudents - hwInfo.submissions.length;

  const filteredSubmissions = hwInfo.submissions.filter(
    (s) =>
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo.includes(search),
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#D97706" />

      {/* ── HEADER ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: sc.color },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {hwInfo.title}
            </Text>
            <Text style={styles.headerSub}>
              {hwInfo.subject} · {hwInfo.class}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: st.bg + "33",
                borderColor: "rgba(255,255,255,0.3)",
              },
            ]}
          >
            <Text style={styles.statusBadgeText}>{hwInfo.status}</Text>
          </View>
        </View>

        {/* info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name="person-outline"
              size={13}
              color="rgba(255,255,255,0.75)"
            />
            <Text style={styles.infoText}>{hwInfo.teacher}</Text>
            <Text style={styles.infoDot}>·</Text>
            <Ionicons
              name="calendar-outline"
              size={13}
              color="rgba(255,255,255,0.75)"
            />
            <Text style={styles.infoText}>Due {hwInfo.dueDate}</Text>
          </View>
          <Text style={styles.description}>{hwInfo.description}</Text>
        </View>

        {/* stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{hwInfo.totalStudents}</Text>
            <Text style={styles.stripLabel}>Total</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{hwInfo.submissions.length}</Text>
            <Text style={styles.stripLabel}>Submitted</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{onTimeCount}</Text>
            <Text style={styles.stripLabel}>On Time</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{lateCount}</Text>
            <Text style={styles.stripLabel}>Late</Text>
          </View>
        </View>

        {/* progress bar */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{pct}% submitted</Text>
          <Text style={styles.progressLabel}>{pendingCount} pending</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>
      </View>

      {/* ── TABS ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "submissions" && styles.tabActive]}
          onPress={() => {
            setActiveTab("submissions");
            setSearch("");
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={16}
            color={activeTab === "submissions" ? sc.color : "#9CA3AF"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "submissions" && { color: sc.color },
            ]}
          >
            Submitted ({hwInfo.submissions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.tabActive]}
          onPress={() => {
            setActiveTab("pending");
            setSearch("");
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === "pending" ? "#EA580C" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "pending" && { color: "#EA580C" },
            ]}
          >
            Not submitted ({pendingCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* search */}
      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={16}
          color="#9CA3AF"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeTab === "submissions"
              ? "Search submitted students..."
              : "Search pending students..."
          }
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── LIST ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* SUBMITTED TAB */}
        {activeTab === "submissions" && (
          <>
            {filteredSubmissions.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={32}
                    color="#9CA3AF"
                  />
                </View>
                <Text style={styles.emptyTitle}>No submissions yet</Text>
                <Text style={styles.emptySub}>
                  Students have not submitted this homework
                </Text>
              </View>
            )}
            {filteredSubmissions.map((sub, index) => {
              const av = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
              const gc = GRADE_COLORS[sub.grade] ?? GRADE_COLORS["—"];
              const sc2 = SUB_STATUS_COLORS[sub.status];
              const ini = sub.studentName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <View key={sub.id} style={styles.submissionCard}>
                  {/* avatar */}
                  <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.avatarText, { color: av.color }]}>
                      {ini}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    {/* name + grade */}
                    <View style={styles.subTopRow}>
                      <Text style={styles.subName}>{sub.studentName}</Text>
                      <View
                        style={[styles.gradePill, { backgroundColor: gc.bg }]}
                      >
                        <Text style={[styles.gradeText, { color: gc.color }]}>
                          {sub.grade}
                        </Text>
                      </View>
                    </View>

                    {/* roll + time status */}
                    <View style={styles.subMetaRow}>
                      <Text style={styles.subMeta}>Roll {sub.rollNo}</Text>
                      <Text style={styles.subMetaDot}>·</Text>
                      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.subMeta}> {sub.submittedAt}</Text>
                      <Text style={styles.subMetaDot}>·</Text>
                      <View
                        style={[styles.timePill, { backgroundColor: sc2.bg }]}
                      >
                        <Text style={[styles.timeText, { color: sc2.color }]}>
                          {sub.status}
                        </Text>
                      </View>
                    </View>

                    {/* note */}
                    {sub.note ? (
                      <View style={styles.noteRow}>
                        <Ionicons
                          name="chatbubble-outline"
                          size={12}
                          color="#9CA3AF"
                        />
                        <Text style={styles.noteText}> {sub.note}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* PENDING TAB — students who have NOT submitted */}
        {activeTab === "pending" && (
          <>
            {pendingCount === 0 ? (
              <View style={styles.emptyState}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: "#DCFCE7" }]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={32}
                    color="#16A34A"
                  />
                </View>
                <Text style={styles.emptyTitle}>All submitted!</Text>
                <Text style={styles.emptySub}>
                  Every student has submitted this homework
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.pendingNotice}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color="#EA580C"
                  />
                  <Text style={styles.pendingNoticeText}>
                    {pendingCount} student
                    {pendingCount !== 1 ? "s have" : " has"} not submitted yet
                  </Text>
                </View>

                {/* We show roll numbers 1..totalStudents that are not in submissions */}
                {Array.from({ length: hwInfo.totalStudents }, (_, i) => i + 1)
                  .filter((rollNum) => {
                    const roll = String(rollNum).padStart(3, "0");
                    return !hwInfo.submissions.some((s) => s.rollNo === roll);
                  })
                  .filter((rollNum) => {
                    const roll = String(rollNum).padStart(3, "0");
                    return roll.includes(search) || search === "";
                  })
                  .map((rollNum, index) => {
                    const roll = String(rollNum).padStart(3, "0");
                    const av = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
                    return (
                      <View key={roll} style={styles.pendingCard}>
                        <View
                          style={[
                            styles.pendingAvatar,
                            { backgroundColor: av.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.pendingAvatarText,
                              { color: av.color },
                            ]}
                          >
                            {roll}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pendingName}>
                            Student Roll {roll}
                          </Text>
                          <Text style={styles.pendingClass}>
                            {hwInfo.class}
                          </Text>
                        </View>
                        <View style={styles.notSubmittedPill}>
                          <Ionicons
                            name="close-circle-outline"
                            size={14}
                            color="#DC2626"
                          />
                          <Text style={styles.notSubmittedText}>
                            Not submitted
                          </Text>
                        </View>
                      </View>
                    );
                  })}
              </>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },

  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: { fontSize: 16, fontWeight: "700", color: "#374151" },
  errorBtn: {
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorBtnText: { fontSize: 14, fontWeight: "600", color: "#D97706" },

  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },

  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  infoCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  infoText: { fontSize: 12, color: "rgba(255,255,255,0.85)" },
  infoDot: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  description: { fontSize: 13, color: "rgba(255,255,255,0.9)", lineHeight: 18 },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripNum: { fontSize: 18, fontWeight: "800", color: "#fff" },
  stripLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stripDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 4,
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  progressBg: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: 5, backgroundColor: "#fff", borderRadius: 3 },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: "#fff" },
  tabLabel: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  /* Submission card */
  submissionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: "800" },

  subTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  subName: { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 },
  gradePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  gradeText: { fontSize: 13, fontWeight: "800" },

  subMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  subMeta: { fontSize: 11, color: "#9CA3AF" },
  subMetaDot: { fontSize: 11, color: "#D1D5DB" },
  timePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  timeText: { fontSize: 10, fontWeight: "700" },

  noteRow: { flexDirection: "row", alignItems: "center" },
  noteText: { fontSize: 12, color: "#6B7280", flex: 1 },

  /* Pending card */
  pendingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  pendingNoticeText: {
    fontSize: 13,
    color: "#EA580C",
    fontWeight: "500",
    flex: 1,
  },

  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 10,
  },
  pendingAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  pendingAvatarText: { fontSize: 13, fontWeight: "800" },
  pendingName: { fontSize: 13, fontWeight: "600", color: "#374151" },
  pendingClass: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  notSubmittedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  notSubmittedText: { fontSize: 11, fontWeight: "600", color: "#DC2626" },

  /* Empty */
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
});
