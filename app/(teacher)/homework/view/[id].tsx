import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import api from "../../../../services/api/axios";
import { ClassService } from "../../../../services/api/classService";
import { HomeworkService } from "../../../../services/api/homeworkService";
import { StudentClassService } from "../../../../services/api/studentClassService";
import { StudentSubjectService } from "../../../../services/api/studentSubjectService";
import { StudentService } from "../../../../services/api/studentService";
import { StudentTaskService } from "../../../../services/api/studentTaskService";

type StudentTask = {
  id: number;
  homeworkId: number;
  studentId: number;
  task: string;
  submitDate: string;
};

type RosterEntry = {
  studentId: number;
  name: string;
  submitted: boolean;
  submitDate?: string;
  onTime?: boolean;
  tasks: StudentTask[];
};

type Homework = {
  id: number | string;
  subjectId: number | string;
  classId: number | string;
  title: string;
  homework: string;
  startDate: string;
  endDate: string;
  description?: string;
  status?: string;
  className?: string;
};

function fileMeta(path: string) {
  const ext = (path ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")
    return {
      icon: "document-text" as const,
      color: "#DC2626",
      bg: "#FEE2E2",
      label: "PDF Document",
    };
  if (ext === "ppt" || ext === "pptx")
    return {
      icon: "easel" as const,
      color: "#EA580C",
      bg: "#FFF1E6",
      label: "PowerPoint",
    };
  if (ext === "doc" || ext === "docx")
    return {
      icon: "document" as const,
      color: "#2563EB",
      bg: "#EEF4FF",
      label: "Word Document",
    };
  return {
    icon: "attach" as const,
    color: "#6B7280",
    bg: "#F3F4F6",
    label: "File",
  };
}

function statusStyle(status?: string) {
  const s = (status ?? "").toLowerCase();
  if (s === "active")
    return { bg: "#DCFCE7", color: "#16A34A", dot: "#16A34A" };
  if (s === "inactive")
    return { bg: "#FEF3C7", color: "#D97706", dot: "#D97706" };
  return { bg: "#F3F4F6", color: "#6B7280", dot: "#6B7280" };
}

function durationLabel(start?: string, end?: string): string {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "—";
  const days = Math.round((e.getTime() - s.getTime()) / 86_400_000);
  if (days < 0) return "—";
  if (days === 0) return "Same day";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  const rem = days % 7;
  if (rem === 0) return `${weeks} week${weeks > 1 ? "s" : ""}`;
  return `${weeks}w ${rem}d`;
}

function prettyDate(d?: string): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function remainingLabel(end?: string): {
  text: string;
  color: string;
  bg: string;
} {
  if (!end) return { text: "No end date", color: "#6B7280", bg: "#F3F4F6" };
  const e = new Date(end);
  if (isNaN(e.getTime())) return { text: "—", color: "#6B7280", bg: "#F3F4F6" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((e.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return { text: "Overdue", color: "#DC2626", bg: "#FEE2E2" };
  if (diff === 0) return { text: "Due today", color: "#EA580C", bg: "#FFF1E6" };
  if (diff === 1)
    return { text: "1 day left", color: "#EA580C", bg: "#FFF1E6" };
  return { text: `${diff} days left`, color: "#16A34A", bg: "#DCFCE7" };
}

function getInitials(name: string) {
  return (name ?? "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "#2563EB",
  "#7C3AED",
  "#16A34A",
  "#EA580C",
  "#0891B2",
  "#DB2777",
  "#D97706",
];
function avatarColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++)
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatSubmitDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TeacherHomeworkDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; subject?: string }>();
  const homeworkId = Number(params.id);
  const subjectName = params.subject
    ? decodeURIComponent(params.subject)
    : "Homework";

  const [hw, setHw] = useState<Homework | null>(null);
  const [className, setClassName] = useState<string>("");
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<
    Record<string, string> | undefined
  >(undefined);

  const [tasksVisible, setTasksVisible] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"submitted" | "pending">(
    "submitted",
  );

  const [studentDetail, setStudentDetail] = useState<RosterEntry | null>(null);

  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [imageViewerLabel, setImageViewerLabel] = useState<string>("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await HomeworkService.getOne(homeworkId);
      const data: Homework = res.data?.data ?? res.data ?? null;
      setHw(data);
      if (data?.classId != null) {
        try {
          if (data.className) setClassName(data.className);
          else {
            const clsRes = await ClassService.getAll();
            const list: any[] = clsRes.data?.data ?? clsRes.data ?? [];
            const found = list.find(
              (c) => String(c.id) === String(data.classId),
            );
            setClassName(found?.name ?? `Class #${data.classId}`);
          }
        } catch {
          setClassName(`Class #${data.classId}`);
        }
        try {
          const scRes = await StudentClassService.getByClass(data.classId);
          const arr: any[] = scRes.data?.data ?? scRes.data ?? [];
          setStudentCount(Array.isArray(arr) ? arr.length : 0);
        } catch {
          setStudentCount(null);
        }
      }
    } catch {
      setHw(null);
    } finally {
      setLoading(false);
    }
  }, [homeworkId]);

  useEffect(() => {
    load();
  }, [load]);

  function resolveFileUrl(path?: string) {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const base = (api.defaults.baseURL ?? "").replace(/\/$/, "");
    return base + "/uploads/homework/" + path;
  }
  function resolveTaskUrl(path?: string) {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const base = (api.defaults.baseURL ?? "").replace(/\/$/, "");
    return base + "/uploads/tasks/" + path;
  }

  async function openStudentTasks() {
    setTasksLoading(true);
    setActiveTab("submitted");
    setTasksVisible(true);
    try {
      if (!hw) {
        setRoster([]);
        return;
      }
      const [taskRes, classRes, subjRes, allStudentsRes] = await Promise.all([
        StudentTaskService.getByHomework(homeworkId),
        StudentClassService.getByClass(hw.classId),
        StudentSubjectService.getBySubject(hw.subjectId),
        StudentService.getAll(),
      ]);
      const taskRaw: any[] = taskRes.data?.data ?? taskRes.data ?? [];
      const tasks: StudentTask[] = taskRaw.map((t: any) => ({
        id: Number(t.id),
        homeworkId: Number(t.homeworkId),
        studentId: Number(t.studentId),
        task: t.task ?? "",
        submitDate: t.submitDate ?? "",
      }));
      const classRows: any[] = classRes.data?.data ?? classRes.data ?? [];
      const subjRows: any[] = subjRes.data?.data ?? subjRes.data ?? [];
      const allStudents: any[] =
        allStudentsRes.data?.data ?? allStudentsRes.data ?? [];
      const classIds = new Set(
        classRows.map((r) => String(r.stuentId ?? r.studentId)),
      );
      const subjIds = new Set(
        subjRows.map((r) => String(r.stuentId ?? r.studentId)),
      );
      const rosterIds = [...classIds].filter((id) => subjIds.has(id));
      const nameById = new Map<string, string>(
        allStudents.map((s: any) => [
          String(s.id),
          s.name ?? `Student #${s.id}`,
        ]),
      );
      const tasksByStudent = new Map<string, StudentTask[]>();
      tasks.forEach((t) => {
        const key = String(t.studentId);
        const arr = tasksByStudent.get(key) ?? [];
        arr.push(t);
        tasksByStudent.set(key, arr);
      });
      const endDate = hw.endDate ? new Date(hw.endDate) : null;
      const built: RosterEntry[] = rosterIds.map((id) => {
        const studentTasks = (tasksByStudent.get(id) ?? []).sort(
          (a, b) =>
            new Date(a.submitDate).getTime() - new Date(b.submitDate).getTime(),
        );
        const submitted = studentTasks.length > 0;
        let submitDate: string | undefined;
        let onTime: boolean | undefined;
        if (submitted) {
          submitDate = studentTasks[0].submitDate;
          if (endDate && submitDate)
            onTime = new Date(submitDate).getTime() <= endDate.getTime();
        }
        return {
          studentId: Number(id),
          name: nameById.get(id) ?? `Student #${id}`,
          submitted,
          submitDate,
          onTime,
          tasks: studentTasks,
        };
      });
      built.sort((a, b) => a.name.localeCompare(b.name));
      setRoster(built);
    } catch {
      setRoster([]);
    } finally {
      setTasksLoading(false);
    }
  }

  function openZoom(url: string, label: string) {
    setImageViewerUrl(url);
    setImageViewerLabel(label);
    setImageViewerVisible(true);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hw) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={40} color="#9CA3AF" />
          <Text style={styles.loadingText}>Homework not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fm = fileMeta(hw.homework);
  const ss = statusStyle(hw.status);
  const remaining = remainingLabel(hw.endDate);
  const submittedList = roster.filter((r) => r.submitted);
  const pendingList = roster.filter((r) => !r.submitted);
  const total = roster.length;
  const submittedPct =
    total === 0 ? 0 : Math.round((submittedList.length / total) * 100);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerKicker}>Homework details</Text>
            <Text style={styles.headerSubject} numberOfLines={1}>
              {subjectName}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.85}
          onPress={async () => {
            try {
              const raw = hw.homework;
              if (!raw) {
                setPreviewUrl(null);
                setPreviewVisible(true);
                return;
              }
              const resolved = resolveFileUrl(raw) || raw;
              const ext = (raw ?? "").split(".").pop()?.toLowerCase() ?? "";
              if (["pdf", "doc", "docx", "ppt", "pptx"].includes(ext)) {
                setPreviewHeaders(undefined);
                setPreviewUrl(
                  `https://docs.google.com/viewer?url=${encodeURIComponent(resolved)}&embedded=true`,
                );
              } else {
                const token = await AsyncStorage.getItem("token");
                setPreviewHeaders(
                  token ? { Authorization: `Bearer ${token}` } : undefined,
                );
                setPreviewUrl(resolved);
              }
              setPreviewVisible(true);
            } catch {
              setPreviewUrl(null);
              setPreviewVisible(true);
            }
          }}
        >
          <View style={[styles.heroIcon, { backgroundColor: fm.bg }]}>
            <Ionicons
              name={`${fm.icon}-outline` as any}
              size={34}
              color={fm.color}
            />
          </View>
          <Text style={styles.heroTitle}>{hw.title || hw.homework}</Text>
          <View style={styles.heroBadges}>
            <View style={[styles.fileTypeBadge, { backgroundColor: fm.bg }]}>
              <Ionicons
                name={`${fm.icon}-outline` as any}
                size={12}
                color={fm.color}
              />
              <Text style={[styles.fileTypeText, { color: fm.color }]}>
                {" "}
                {fm.label}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: ss.dot }]} />
              <Text style={[styles.statusBadgeText, { color: ss.color }]}>
                {hw.status ?? "Active"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.factsRow}>
          <View style={styles.factCard}>
            <Ionicons name="hourglass-outline" size={18} color="#2563EB" />
            <Text style={styles.factValue}>
              {durationLabel(hw.startDate, hw.endDate)}
            </Text>
            <Text style={styles.factLabel}>Duration</Text>
          </View>
          <View style={styles.factCard}>
            <View style={[styles.factPill, { backgroundColor: remaining.bg }]}>
              <Text style={[styles.factPillText, { color: remaining.color }]}>
                {remaining.text}
              </Text>
            </View>
            <Text style={[styles.factLabel, { marginTop: 8 }]}>Status</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Timeline</Text>
        <View style={styles.timelineCard}>
          <View
            style={[styles.timelineRow, { justifyContent: "space-between" }]}
          >
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={[styles.timelineDot, { backgroundColor: "#16A34A" }]}
              />
              <View>
                <Text style={styles.timelineLabel}>Start date</Text>
                <Text style={styles.timelineValue}>
                  {prettyDate(hw.startDate)}
                </Text>
              </View>
            </View>
            <View style={{ width: 16 }} />
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                justifyContent: "flex-end",
              }}
            >
              <View
                style={[styles.timelineDot, { backgroundColor: "#DC2626" }]}
              />
              <View>
                <Text style={styles.timelineLabel}>End date</Text>
                <Text style={styles.timelineValue}>
                  {prettyDate(hw.endDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Description</Text>
        <View style={styles.descCard}>
          {hw.description ? (
            <Text style={styles.descText}>{hw.description}</Text>
          ) : (
            <View style={styles.descEmpty}>
              <Ionicons name="document-outline" size={20} color="#D1D5DB" />
              <Text style={styles.descEmptyText}>No description provided.</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.tasksBtn}
          activeOpacity={0.85}
          onPress={openStudentTasks}
        >
          <Ionicons name="people-outline" size={18} color="#fff" />
          <Text style={styles.tasksBtnText}>View Student Tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editAction}
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.editActionText}>Back to list to edit</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* STUDENT TASKS MODAL */}
      <Modal
        visible={tasksVisible}
        animationType="slide"
        onRequestClose={() => setTasksVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4FF" }}>
          <View style={tm.header}>
            <View style={{ flex: 1 }}>
              <Text style={tm.headerTitle}>Student Tasks</Text>
              <Text style={tm.headerSub} numberOfLines={1}>
                {hw?.title ?? "Homework"}
              </Text>
            </View>
            <TouchableOpacity
              style={tm.closeBtn}
              onPress={() => setTasksVisible(false)}
            >
              <Ionicons name="close" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          {tasksLoading ? (
            <View style={tm.center}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={tm.centerText}>Loading students…</Text>
            </View>
          ) : (
            <>
              <View style={tm.progressCard}>
                <View style={tm.progressTopRow}>
                  <Text style={tm.progressTitle}>Submission progress</Text>
                  <Text style={tm.progressPct}>{submittedPct}%</Text>
                </View>
                <View style={tm.progressTrack}>
                  <View
                    style={[tm.progressFill, { width: `${submittedPct}%` }]}
                  />
                </View>
                <Text style={tm.progressMeta}>
                  {submittedList.length} of {total} students submitted
                </Text>
              </View>

              <View style={tm.tabBar}>
                <TouchableOpacity
                  style={[tm.tab, activeTab === "submitted" && tm.tabActive]}
                  onPress={() => setActiveTab("submitted")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={activeTab === "submitted" ? "#16A34A" : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      tm.tabText,
                      activeTab === "submitted" && { color: "#111827" },
                    ]}
                  >
                    Submitted
                  </Text>
                  <View
                    style={[
                      tm.tabCount,
                      activeTab === "submitted" && {
                        backgroundColor: "#DCFCE7",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        tm.tabCountText,
                        activeTab === "submitted" && { color: "#16A34A" },
                      ]}
                    >
                      {submittedList.length}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[tm.tab, activeTab === "pending" && tm.tabActive]}
                  onPress={() => setActiveTab("pending")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color={activeTab === "pending" ? "#DC2626" : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      tm.tabText,
                      activeTab === "pending" && { color: "#111827" },
                    ]}
                  >
                    Not submitted
                  </Text>
                  <View
                    style={[
                      tm.tabCount,
                      activeTab === "pending" && { backgroundColor: "#FEE2E2" },
                    ]}
                  >
                    <Text
                      style={[
                        tm.tabCountText,
                        activeTab === "pending" && { color: "#DC2626" },
                      ]}
                    >
                      {pendingList.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={tm.scroll}
                showsVerticalScrollIndicator={false}
              >
                {activeTab === "submitted" ? (
                  submittedList.length === 0 ? (
                    <View style={tm.emptyBlock}>
                      <Ionicons
                        name="documents-outline"
                        size={36}
                        color="#D1D5DB"
                      />
                      <Text style={tm.emptyText}>No submissions yet</Text>
                    </View>
                  ) : (
                    submittedList.map((entry) => (
                      <TouchableOpacity
                        key={entry.studentId}
                        style={tm.studentRow}
                        activeOpacity={0.7}
                        onPress={() => setStudentDetail(entry)}
                      >
                        <View
                          style={[
                            tm.avatar,
                            { backgroundColor: avatarColor(entry.name) },
                          ]}
                        >
                          <Text style={tm.avatarText}>
                            {getInitials(entry.name)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={tm.studentName}>{entry.name}</Text>
                          <View style={tm.rowMeta}>
                            <Ionicons
                              name="images-outline"
                              size={12}
                              color="#6B7280"
                            />
                            <Text style={tm.rowMetaText}>
                              {entry.tasks.length} photo
                              {entry.tasks.length !== 1 ? "s" : ""}
                            </Text>
                            <Text style={tm.dot}>·</Text>
                            <Text style={tm.rowMetaText}>
                              {formatSubmitDate(entry.submitDate ?? "")}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            tm.timingBadge,
                            {
                              backgroundColor: entry.onTime
                                ? "#DCFCE7"
                                : "#FEE2E2",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              tm.timingText,
                              { color: entry.onTime ? "#16A34A" : "#DC2626" },
                            ]}
                          >
                            {entry.onTime ? "On time" : "Late"}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#C7CDD6"
                        />
                      </TouchableOpacity>
                    ))
                  )
                ) : pendingList.length === 0 ? (
                  <View style={tm.emptyBlock}>
                    <Ionicons
                      name="checkmark-done-outline"
                      size={36}
                      color="#16A34A"
                    />
                    <Text style={tm.emptyText}>Everyone has submitted</Text>
                  </View>
                ) : (
                  pendingList.map((entry) => (
                    <View key={entry.studentId} style={tm.studentRow}>
                      <View style={[tm.avatar, { backgroundColor: "#E5E7EB" }]}>
                        <Text style={[tm.avatarText, { color: "#9CA3AF" }]}>
                          {getInitials(entry.name)}
                        </Text>
                      </View>
                      <Text style={[tm.studentName, { flex: 1 }]}>
                        {entry.name}
                      </Text>
                      <View style={tm.pendingBadge}>
                        <Ionicons
                          name="hourglass-outline"
                          size={12}
                          color="#D97706"
                        />
                        <Text style={tm.pendingBadgeText}>Pending</Text>
                      </View>
                    </View>
                  ))
                )}
                <View style={{ height: 30 }} />
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* PER-STUDENT GALLERY */}
      <Modal
        visible={!!studentDetail}
        animationType="slide"
        onRequestClose={() => setStudentDetail(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4FF" }}>
          <View style={tm.header}>
            <TouchableOpacity
              style={[tm.closeBtn, { marginRight: 4 }]}
              onPress={() => setStudentDetail(null)}
            >
              <Ionicons name="chevron-back" size={20} color="#374151" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={tm.headerTitle}>{studentDetail?.name}</Text>
              <Text style={tm.headerSub}>
                {studentDetail?.tasks.length} submission
                {(studentDetail?.tasks.length ?? 0) !== 1 ? "s" : ""}
                {studentDetail
                  ? `  ·  ${studentDetail.onTime ? "On time" : "Late"}`
                  : ""}
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={gallery.scroll}
            showsVerticalScrollIndicator={false}
          >
            {studentDetail?.tasks.map((t, idx) => {
              const url = resolveTaskUrl(t.task);
              const late =
                hw?.endDate && t.submitDate
                  ? new Date(t.submitDate).getTime() >
                    new Date(hw.endDate).getTime()
                  : false;
              return (
                <View key={t.id} style={gallery.card}>
                  <View style={gallery.cardHead}>
                    <View style={gallery.indexCircle}>
                      <Text style={gallery.indexText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={gallery.cardDate}>
                        {formatSubmitDate(t.submitDate)}
                      </Text>
                      <Text style={gallery.cardSub}>Submission #{idx + 1}</Text>
                    </View>
                    <View
                      style={[
                        gallery.cardBadge,
                        { backgroundColor: late ? "#FEE2E2" : "#DCFCE7" },
                      ]}
                    >
                      <Text
                        style={[
                          gallery.cardBadgeText,
                          { color: late ? "#DC2626" : "#16A34A" },
                        ]}
                      >
                        {late ? "Late" : "On time"}
                      </Text>
                    </View>
                  </View>
                  {url ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() =>
                        openZoom(url, `${studentDetail?.name} · #${idx + 1}`)
                      }
                    >
                      <Image
                        source={{ uri: url }}
                        style={gallery.image}
                        resizeMode="cover"
                      />
                      <View style={gallery.zoomHint}>
                        <Ionicons
                          name="expand-outline"
                          size={14}
                          color="#fff"
                        />
                        <Text style={gallery.zoomHintText}>Tap to zoom</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={gallery.imagePlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={32}
                        color="#D1D5DB"
                      />
                      <Text style={gallery.placeholderText}>
                        Image unavailable
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ZOOM VIEWER */}
      <Modal
        visible={imageViewerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={imageViewer.backdrop}>
          <View style={[imageViewer.topBar, { paddingTop: insets.top + 10 }]}>
            <Text style={imageViewer.label} numberOfLines={1}>
              {imageViewerLabel}
            </Text>
            <TouchableOpacity
              onPress={() => setImageViewerVisible(false)}
              style={imageViewer.closeBtn}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          {imageViewerUrl ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={imageViewer.scrollContent}
              maximumZoomScale={5}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: imageViewerUrl }}
                style={imageViewer.image}
                resizeMode="contain"
              />
            </ScrollView>
          ) : (
            <View style={imageViewer.scrollContent}>
              <Text style={{ color: "#fff" }}>No image available</Text>
            </View>
          )}
          <Text style={imageViewer.hint}>Pinch to zoom · Drag to pan</Text>
        </View>
      </Modal>

      {/* FILE PREVIEW */}
      <Modal
        visible={previewVisible}
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View
            style={{
              height: 56,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <TouchableOpacity
              onPress={() => setPreviewVisible(false)}
              style={{ padding: 8 }}
            >
              <Ionicons name="close-outline" size={24} color="#111827" />
            </TouchableOpacity>
            <Text
              style={{
                fontWeight: "700",
                marginLeft: 8,
                fontSize: 16,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {hw.title || hw.homework}
            </Text>
          </View>
          {previewUrl ? (
            <WebView
              source={
                previewHeaders
                  ? { uri: previewUrl, headers: previewHeaders }
                  : { uri: previewUrl }
              }
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => (
                <ActivityIndicator
                  style={{ flex: 1 }}
                  size="large"
                  color="#2563EB"
                />
              )}
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text>No preview available</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4FF" },
  header: {
    backgroundColor: "#1E40AF",
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerKicker: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "600",
  },
  headerSubject: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginTop: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#6B7280" },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 14,
    marginTop: -8,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 26,
  },
  heroBadges: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  fileTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fileTypeText: { fontSize: 11, fontWeight: "700" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  factsRow: { flexDirection: "row", gap: 12, marginBottom: 6 },
  factCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  factValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 6,
  },
  factLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "600",
  },
  factPill: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 2,
  },
  factPillText: { fontSize: 13, fontWeight: "800" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10,
  },
  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  timelineLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  timelineValue: { fontSize: 14, fontWeight: "700", color: "#111827" },
  descCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  descText: { fontSize: 14, color: "#374151", lineHeight: 22 },
  descEmpty: { alignItems: "center", paddingVertical: 8, gap: 6 },
  descEmptyText: { fontSize: 13, color: "#9CA3AF" },
  tasksBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 22,
  },
  tasksBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  editAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 12,
  },
  editActionText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});

const tm = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  headerSub: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  centerText: { fontSize: 14, color: "#9CA3AF" },
  progressCard: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  progressTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressTitle: { fontSize: 13, fontWeight: "700", color: "#374151" },
  progressPct: { fontSize: 18, fontWeight: "900", color: "#2563EB" },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EEF2FF",
    overflow: "hidden",
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: "#16A34A" },
  progressMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#E8EDF5",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  tabText: { fontSize: 12.5, fontWeight: "700", color: "#9CA3AF" },
  tabCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D1D9E6",
    justifyContent: "center",
    alignItems: "center",
  },
  tabCountText: { fontSize: 10, fontWeight: "800", color: "#6B7280" },
  scroll: { paddingHorizontal: 16, paddingTop: 14 },
  emptyBlock: { alignItems: "center", paddingTop: 50, gap: 10 },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontWeight: "600" },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  studentName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  rowMetaText: { fontSize: 11, color: "#6B7280" },
  dot: { fontSize: 11, color: "#D1D5DB", marginHorizontal: 1 },
  timingBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  timingText: { fontSize: 10.5, fontWeight: "800" },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: "800", color: "#D97706" },
});

const gallery = StyleSheet.create({
  scroll: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
    overflow: "hidden",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  indexCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  indexText: { fontSize: 13, fontWeight: "800", color: "#2563EB" },
  cardDate: { fontSize: 13, fontWeight: "700", color: "#111827" },
  cardSub: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  cardBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  cardBadgeText: { fontSize: 10.5, fontWeight: "800" },
  image: { width: "100%", height: 280 },
  zoomHint: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zoomHintText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  imagePlaceholder: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    gap: 8,
  },
  placeholderText: { fontSize: 12, color: "#9CA3AF" },
});

const SCREEN = Dimensions.get("window");

const imageViewer = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    zIndex: 2,
  },
  label: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "700" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: SCREEN.width, height: SCREEN.height * 0.75 },
  hint: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
});
