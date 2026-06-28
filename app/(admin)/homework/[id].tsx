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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import api from "../../../services/api/axios";
import { ClassService } from "../../../services/api/classService";
import { HomeworkService } from "../../../services/api/homeworkService";
import { StudentClassService } from "../../../services/api/studentClassService";
import { StudentSubjectService } from "../../../services/api/studentSubjectService";
import { StudentService } from "../../../services/api/studentService";
import { StudentTaskService } from "../../../services/api/studentTaskService";
import { SubjectService } from "../../../services/api/subjectService";

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

type HomeworkDetail = {
  id: number | string;
  title: string;
  homework: string;
  subjectId: number | string;
  classId: number | string;
  subject: string;
  class: string;
  dueDate: string;
  endDateRaw: string;
  description: string;
  status: "Pending" | "Submitted" | "Overdue";
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

const STATUS_COLORS = {
  Pending: { bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA" },
  Submitted: { bg: "#DCFCE7", color: "#16A34A", border: "#BBF7D0" },
  Overdue: { bg: "#FEE2E2", color: "#DC2626", border: "#FECACA" },
};

const AVATAR_PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

function getInitials(name: string) {
  return (name ?? "").trim().split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
}

function formatSubmitDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type ActiveTab = "submissions" | "pending";

export default function AdminHomeworkDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [hwInfo, setHwInfo] = useState<HomeworkDetail | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("submissions");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // homework file preview
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<Record<string, string> | undefined>(undefined);

  // per-student image gallery
  const [studentDetail, setStudentDetail] = useState<RosterEntry | null>(null);

  // zoom viewer
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [imageViewerLabel, setImageViewerLabel] = useState("");

  function resolveFileUrl(path?: string): string | null {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const base = (api.defaults.baseURL ?? "").replace(/\/$/, "");
    return `${base}/uploads/homework/${path}`;
  }
  function resolveTaskUrl(path?: string): string | null {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const base = (api.defaults.baseURL ?? "").replace(/\/$/, "");
    return `${base}/uploads/tasks/${path}`;
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!id) { setHwInfo(null); return; }
      const n = Number(id);
      const res = await HomeworkService.getOne(n as any);
      const item: any = res?.data?.data ?? res?.data ?? null;
      if (!item) { setHwInfo(null); return; }

      // Resolve subject + class names, build roster, fetch tasks — all in parallel
      const [subjectCatRes, classCatRes, taskRes, classRes, subjRes, studentsRes] =
        await Promise.all([
          SubjectService.getAll(),
          ClassService.getAll(),
          StudentTaskService.getByHomework(n),
          StudentClassService.getByClass(item.classId),
          StudentSubjectService.getBySubject(item.subjectId),
          StudentService.getAll(),
        ]);

      const subjectCat: any[] = subjectCatRes.data?.data ?? subjectCatRes.data ?? [];
      const classCat: any[] = classCatRes.data?.data ?? classCatRes.data ?? [];
      const subjName =
        subjectCat.find((s) => String(s.id) === String(item.subjectId))?.name ??
        item.subject?.name ?? item.subject ?? "General";
      const clsName =
        classCat.find((c) => String(c.id) === String(item.classId))?.name ??
        item.class?.name ?? item.className ?? `Class #${item.classId}`;

      const title = (() => {
        const t = item.title ?? "";
        const hw = item.homework ?? "";
        const ext = hw.split(".").pop()?.toLowerCase() ?? "";
        return t ? (ext ? `${t}.${ext}` : t) : hw;
      })();

      const status: HomeworkDetail["status"] = (() => {
        const endDate = item.endDate ? new Date(item.endDate) : null;
        if (endDate && !isNaN(endDate.getTime()) && endDate < new Date())
          return "Overdue";
        return "Pending";
      })();

      const detail: HomeworkDetail = {
        id: item.id,
        title,
        homework: item.homework ?? "",
        subjectId: item.subjectId,
        classId: item.classId,
        subject: subjName,
        class: clsName,
        dueDate: item.endDate
          ? new Date(item.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "",
        endDateRaw: item.endDate ?? "",
        description: item.description ?? "",
        status,
      };
      setHwInfo(detail);

      // ── Build roster: (class ∩ subject) ──
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
      const allStudents: any[] = studentsRes.data?.data ?? studentsRes.data ?? [];

      const classIds = new Set(classRows.map((r) => String(r.stuentId ?? r.studentId)));
      const subjIds = new Set(subjRows.map((r) => String(r.stuentId ?? r.studentId)));
      const rosterIds = [...classIds].filter((sid) => subjIds.has(sid));

      const nameById = new Map<string, string>(
        allStudents.map((s: any) => [String(s.id), s.name ?? `Student #${s.id}`]),
      );

      const tasksByStudent = new Map<string, StudentTask[]>();
      tasks.forEach((t) => {
        const key = String(t.studentId);
        const arr = tasksByStudent.get(key) ?? [];
        arr.push(t);
        tasksByStudent.set(key, arr);
      });

      const endDate = item.endDate ? new Date(item.endDate) : null;
      const built: RosterEntry[] = rosterIds.map((sid) => {
        const studentTasks = (tasksByStudent.get(sid) ?? []).sort(
          (a, b) => new Date(a.submitDate).getTime() - new Date(b.submitDate).getTime(),
        );
        const submitted = studentTasks.length > 0;
        let submitDate: string | undefined;
        let onTime: boolean | undefined;
        if (submitted) {
          submitDate = studentTasks[0].submitDate;
          if (endDate && submitDate) onTime = new Date(submitDate).getTime() <= endDate.getTime();
        }
        return { studentId: Number(sid), name: nameById.get(sid) ?? `Student #${sid}`, submitted, submitDate, onTime, tasks: studentTasks };
      });
      built.sort((a, b) => a.name.localeCompare(b.name));
      setRoster(built);
    } catch (err) {
      console.error("Failed to load homework detail", err);
      setHwInfo(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function openHomeworkPreview() {
    if (!hwInfo?.homework) { setPreviewUrl(null); setPreviewVisible(true); return; }
    try {
      const url = resolveFileUrl(hwInfo.homework)!;
      const ext = hwInfo.homework.split(".").pop()?.toLowerCase() ?? "";
      if (["pdf", "doc", "docx", "ppt", "pptx"].includes(ext)) {
        setPreviewHeaders(undefined);
        setPreviewUrl(`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`);
      } else {
        const token = await AsyncStorage.getItem("token");
        setPreviewHeaders(token ? { Authorization: `Bearer ${token}` } : undefined);
        setPreviewUrl(url);
      }
      setPreviewVisible(true);
    } catch {
      setPreviewUrl(null);
      setPreviewVisible(true);
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
        <StatusBar barStyle="light-content" backgroundColor="#D97706" />
        <View style={styles.errorBox}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={[styles.errorText, { color: "#9CA3AF", fontWeight: "500" }]}>Loading homework…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hwInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
          <Text style={styles.errorText}>Homework not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.errorBtn}>
            <Text style={styles.errorBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sc = getSubjectColor(hwInfo.subject);
  const submittedList = roster.filter((r) => r.submitted);
  const pendingList = roster.filter((r) => !r.submitted);
  const total = roster.length;
  const onTimeCount = submittedList.filter((s) => s.onTime).length;
  const lateCount = submittedList.filter((s) => !s.onTime).length;
  const pct = total > 0 ? Math.round((submittedList.length / total) * 100) : 0;

  const filteredSubmitted = submittedList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredPending = pendingList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#D97706" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: sc.color }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{hwInfo.title}</Text>
            <Text style={styles.headerSub}>{hwInfo.subject} · {hwInfo.class}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: "rgba(255,255,255,0.3)" }]}>
            <Text style={styles.statusBadgeText}>{hwInfo.status}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={styles.infoText}>Due {hwInfo.dueDate}</Text>
          </View>
          {hwInfo.description ? <Text style={styles.description}>{hwInfo.description}</Text> : null}
          {hwInfo.homework ? (
            <TouchableOpacity style={styles.previewBtn} onPress={openHomeworkPreview} activeOpacity={0.8}>
              <Ionicons name="eye-outline" size={14} color="#fff" />
              <Text style={styles.previewBtnText}>Preview Homework File</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{total}</Text>
            <Text style={styles.stripLabel}>Total</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{submittedList.length}</Text>
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

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{pct}% submitted</Text>
          <Text style={styles.progressLabel}>{pendingList.length} pending</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "submissions" && styles.tabActive]}
          onPress={() => { setActiveTab("submissions"); setSearch(""); }}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color={activeTab === "submissions" ? sc.color : "#9CA3AF"} />
          <Text style={[styles.tabLabel, activeTab === "submissions" && { color: sc.color }]}>
            Submitted ({submittedList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.tabActive]}
          onPress={() => { setActiveTab("pending"); setSearch(""); }}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={16} color={activeTab === "pending" ? "#EA580C" : "#9CA3AF"} />
          <Text style={[styles.tabLabel, activeTab === "pending" && { color: "#EA580C" }]}>
            Not submitted ({pendingList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === "submissions" ? "Search submitted students..." : "Search pending students..."}
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

      {/* LIST */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* SUBMITTED */}
        {activeTab === "submissions" && (
          <>
            {filteredSubmitted.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="checkmark-circle-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No submissions yet</Text>
                <Text style={styles.emptySub}>Students have not submitted this homework</Text>
              </View>
            )}
            {filteredSubmitted.map((entry, index) => {
              const av = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
              const timing = entry.onTime
                ? { bg: "#DCFCE7", color: "#16A34A", label: "On Time" }
                : { bg: "#FEE2E2", color: "#DC2626", label: "Late" };
              return (
                <TouchableOpacity
                  key={entry.studentId}
                  style={styles.submissionCard}
                  activeOpacity={0.8}
                  onPress={() => setStudentDetail(entry)}
                >
                  <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.avatarText, { color: av.color }]}>{getInitials(entry.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.subTopRow}>
                      <Text style={styles.subName}>{entry.name}</Text>
                      <View style={[styles.timePill, { backgroundColor: timing.bg }]}>
                        <Text style={[styles.timeText, { color: timing.color }]}>{timing.label}</Text>
                      </View>
                    </View>
                    <View style={styles.subMetaRow}>
                      <Ionicons name="images-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.subMeta}> {entry.tasks.length} photo{entry.tasks.length !== 1 ? "s" : ""}</Text>
                      <Text style={styles.subMetaDot}>·</Text>
                      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.subMeta}> {formatSubmitDate(entry.submitDate ?? "")}</Text>
                    </View>
                    <View style={styles.viewRow}>
                      <Ionicons name="eye-outline" size={13} color={sc.color} />
                      <Text style={[styles.viewText, { color: sc.color }]}>Tap to view & preview images</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* NOT SUBMITTED */}
        {activeTab === "pending" && (
          <>
            {pendingList.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="checkmark-circle-outline" size={32} color="#16A34A" />
                </View>
                <Text style={styles.emptyTitle}>All submitted!</Text>
                <Text style={styles.emptySub}>Every student has submitted this homework</Text>
              </View>
            ) : (
              <>
                <View style={styles.pendingNotice}>
                  <Ionicons name="alert-circle-outline" size={16} color="#EA580C" />
                  <Text style={styles.pendingNoticeText}>
                    {pendingList.length} student{pendingList.length !== 1 ? "s have" : " has"} not submitted yet
                  </Text>
                </View>
                {filteredPending.map((entry, index) => {
                  const av = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
                  return (
                    <View key={entry.studentId} style={styles.pendingCard}>
                      <View style={[styles.pendingAvatar, { backgroundColor: av.bg }]}>
                        <Text style={[styles.pendingAvatarText, { color: av.color }]}>{getInitials(entry.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendingName}>{entry.name}</Text>
                        <Text style={styles.pendingClass}>{hwInfo.class}</Text>
                      </View>
                      <View style={styles.notSubmittedPill}>
                        <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
                        <Text style={styles.notSubmittedText}>Not submitted</Text>
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

      {/* PER-STUDENT IMAGE GALLERY */}
      <Modal visible={!!studentDetail} animationType="slide" onRequestClose={() => setStudentDetail(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FB" }}>
          <View style={[gallery.header, { backgroundColor: sc.color, paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={gallery.backBtn} onPress={() => setStudentDetail(null)}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={gallery.headerTitle}>{studentDetail?.name}</Text>
              <Text style={gallery.headerSub}>
                {studentDetail?.tasks.length} submission{(studentDetail?.tasks.length ?? 0) !== 1 ? "s" : ""}
                {studentDetail ? `  ·  ${studentDetail.onTime ? "On time" : "Late"}` : ""}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={gallery.scroll} showsVerticalScrollIndicator={false}>
            {studentDetail?.tasks.map((t, idx) => {
              const url = resolveTaskUrl(t.task);
              const late = hwInfo.endDateRaw && t.submitDate
                ? new Date(t.submitDate).getTime() > new Date(hwInfo.endDateRaw).getTime()
                : false;
              return (
                <View key={t.id} style={gallery.card}>
                  <View style={gallery.cardHead}>
                    <View style={[gallery.indexCircle, { backgroundColor: sc.bg }]}>
                      <Text style={[gallery.indexText, { color: sc.color }]}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={gallery.cardDate}>{formatSubmitDate(t.submitDate)}</Text>
                      <Text style={gallery.cardSub}>Submission #{idx + 1}</Text>
                    </View>
                    <View style={[gallery.cardBadge, { backgroundColor: late ? "#FEE2E2" : "#DCFCE7" }]}>
                      <Text style={[gallery.cardBadgeText, { color: late ? "#DC2626" : "#16A34A" }]}>
                        {late ? "Late" : "On time"}
                      </Text>
                    </View>
                  </View>
                  {url ? (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => openZoom(url, `${studentDetail?.name} · #${idx + 1}`)}>
                      <Image source={{ uri: url }} style={gallery.image} resizeMode="cover" />
                      <View style={gallery.zoomHint}>
                        <Ionicons name="expand-outline" size={14} color="#fff" />
                        <Text style={gallery.zoomHintText}>Tap to zoom</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={gallery.imagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#D1D5DB" />
                      <Text style={gallery.placeholderText}>Image unavailable</Text>
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
      <Modal visible={imageViewerVisible} animationType="fade" transparent onRequestClose={() => setImageViewerVisible(false)}>
        <View style={imageViewer.backdrop}>
          <View style={[imageViewer.topBar, { paddingTop: insets.top + 10 }]}>
            <Text style={imageViewer.label} numberOfLines={1}>{imageViewerLabel}</Text>
            <TouchableOpacity onPress={() => setImageViewerVisible(false)} style={imageViewer.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          {imageViewerUrl ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={imageViewer.scrollContent} maximumZoomScale={5} minimumZoomScale={1} centerContent showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
              <Image source={{ uri: imageViewerUrl }} style={imageViewer.image} resizeMode="contain" />
            </ScrollView>
          ) : (
            <View style={imageViewer.scrollContent}><Text style={{ color: "#fff" }}>No image available</Text></View>
          )}
          <Text style={imageViewer.hint}>Pinch to zoom · Drag to pan</Text>
        </View>
      </Modal>

      {/* HOMEWORK FILE PREVIEW */}
      <Modal visible={previewVisible} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.previewBar}>
            <TouchableOpacity onPress={() => setPreviewVisible(false)} style={{ padding: 8 }}>
              <Ionicons name="close-outline" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.previewBarTitle} numberOfLines={1}>{hwInfo.title}</Text>
          </View>
          {previewUrl ? (
            <WebView
              source={previewHeaders ? { uri: previewUrl, headers: previewHeaders } : { uri: previewUrl }}
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => (<ActivityIndicator style={{ flex: 1 }} size="large" color="#D97706" />)}
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="document-outline" size={40} color="#D1D5DB" />
              <Text style={{ color: "#9CA3AF", marginTop: 10 }}>No preview available</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  errorBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontWeight: "700", color: "#374151" },
  errorBtn: { backgroundColor: "#FEF3C7", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  errorBtnText: { fontSize: 14, fontWeight: "600", color: "#D97706" },

  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 10 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  statusBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  infoCard: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12, marginBottom: 14, gap: 8 },
  previewBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignSelf: "flex-start", marginTop: 4 },
  previewBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  previewBar: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  previewBarTitle: { fontWeight: "700", marginLeft: 8, fontSize: 16, flex: 1, color: "#111827" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  infoText: { fontSize: 12, color: "rgba(255,255,255,0.85)" },
  description: { fontSize: 13, color: "rgba(255,255,255,0.9)", lineHeight: 18 },

  statsStrip: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingVertical: 12, marginBottom: 12 },
  stripItem: { flex: 1, alignItems: "center" },
  stripNum: { fontSize: 18, fontWeight: "800", color: "#fff" },
  stripLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 4 },

  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  progressBg: { height: 5, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 5, backgroundColor: "#fff", borderRadius: 3 },

  tabRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 14, marginBottom: 4, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: "#fff" },
  tabLabel: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginTop: 10, marginBottom: 4, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: "#E5E7EB" },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  submissionCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", padding: 14, marginBottom: 10, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarText: { fontSize: 14, fontWeight: "800" },
  subTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  subName: { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 },
  subMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4, flexWrap: "wrap" },
  subMeta: { fontSize: 11, color: "#9CA3AF" },
  subMetaDot: { fontSize: 11, color: "#D1D5DB" },
  timePill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  timeText: { fontSize: 10, fontWeight: "700" },
  viewRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  viewText: { fontSize: 11, fontWeight: "600" },

  pendingNotice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF7ED", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#FED7AA" },
  pendingNoticeText: { fontSize: 13, color: "#EA580C", fontWeight: "500", flex: 1 },
  pendingCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8, gap: 10 },
  pendingAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  pendingAvatarText: { fontSize: 13, fontWeight: "800" },
  pendingName: { fontSize: 13, fontWeight: "600", color: "#374151" },
  pendingClass: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  notSubmittedPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEE2E2", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  notSubmittedText: { fontSize: 11, fontWeight: "600", color: "#DC2626" },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
});

const gallery = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  scroll: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 14, overflow: "hidden" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  indexCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  indexText: { fontSize: 13, fontWeight: "800" },
  cardDate: { fontSize: 13, fontWeight: "700", color: "#111827" },
  cardSub: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  cardBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  cardBadgeText: { fontSize: 10.5, fontWeight: "800" },
  image: { width: "100%", height: 280 },
  zoomHint: { position: "absolute", bottom: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  zoomHintText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  imagePlaceholder: { height: 180, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB", gap: 8 },
  placeholderText: { fontSize: 12, color: "#9CA3AF" },
});

const SCREEN = Dimensions.get("window");
const imageViewer = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 12, zIndex: 2 },
  label: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "700" },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  scrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  image: { width: SCREEN.width, height: SCREEN.height * 0.75 },
  hint: { position: "absolute", bottom: 24, alignSelf: "center", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
});