import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants";
import { StudentTaskService } from "@/services/api/studentTaskService";
import api from "@/services/api/axios";

const STATUS_COLOR: Record<string, string> = {
  active:    "#2563EB",
  pending:   "#EA580C",
  completed: "#16A34A",
  closed:    "#6B7280",
};

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  active:    "time-outline",
  pending:   "hourglass-outline",
  completed: "checkmark-circle-outline",
  closed:    "lock-closed-outline",
};

function formatDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateShort(d: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isDue(endDate: string) {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

function getDuration(start: string, end: string) {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

function daysFromNow(endDate: string) {
  if (!endDate) return null;
  const e = new Date(endDate);
  if (isNaN(e.getTime())) return null;
  return Math.round((e.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function resolveFileUrl(path?: string): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = api.defaults.baseURL ?? "";
  try {
    const origin = new URL(base).origin;
    return `${origin}/uploads/homework/${path}`;
  } catch {
    return path;
  }
}

function fileIcon(name: string): keyof typeof Ionicons.glyphMap {
  const ext = (name ?? "").split(".").pop()?.toLowerCase();
  if (ext === "pdf")                      return "document-text-outline";
  if (ext === "ppt" || ext === "pptx")   return "easel-outline";
  if (ext === "doc" || ext === "docx")   return "document-outline";
  return "attach-outline";
}

function fileLabel(name: string) {
  const ext = (name ?? "").split(".").pop()?.toLowerCase();
  if (ext === "pdf")                      return { label: "PDF", color: "#DC2626", bg: "#FEE2E2" };
  if (ext === "ppt" || ext === "pptx")   return { label: ext!.toUpperCase(), color: "#EA580C", bg: "#FFF1E6" };
  if (ext === "doc" || ext === "docx")   return { label: ext!.toUpperCase(), color: "#2563EB", bg: "#EEF4FF" };
  return { label: "FILE", color: "#6B7280", bg: "#F3F4F6" };
}

type ImageAsset = { uri: string; name: string; type: string };

export default function HomeworkDetail() {
  const {
    homeworkId, title, homework, startDate, endDate,
    description, status, subjectName, className, studyYear,
  } = useLocalSearchParams<{
    homeworkId:  string;
    title:       string;
    homework:    string;
    startDate:   string;
    endDate:     string;
    description: string;
    status:      string;
    subjectName: string;
    className:   string;
    studyYear:   string;
  }>();

  const [submitVisible, setSubmitVisible] = useState(false);
  const [taskImage, setTaskImage]         = useState<ImageAsset | null>(null);
  const [submitting, setSubmitting]       = useState(false);

  const overdueBool    = isDue(endDate ?? "") && status !== "completed";
  const statusKey      = overdueBool ? "pending" : (status ?? "active").toLowerCase();
  const color          = STATUS_COLOR[statusKey] ?? "#6B7280";
  const icon           = STATUS_ICON[statusKey]  ?? "document-outline";
  const duration       = getDuration(startDate ?? "", endDate ?? "");
  const remaining      = daysFromNow(endDate ?? "");
  const hasFile        = !!homework;
  const fileMeta       = hasFile ? fileLabel(homework) : null;

  const remainingLabel = (() => {
    if (status === "completed") return { text: "Completed", color: "#16A34A", bg: "#DCFCE7" };
    if (remaining === null)     return null;
    if (remaining < 0)  return { text: `${Math.abs(remaining)}d overdue`, color: "#DC2626", bg: "#FEE2E2" };
    if (remaining === 0) return { text: "Due today",  color: "#EA580C", bg: "#FFF1E6" };
    if (remaining <= 3)  return { text: `${remaining}d left`, color: "#EA580C", bg: "#FFF1E6" };
    return { text: `${remaining} days left`, color: "#2563EB", bg: "#EEF4FF" };
  })();

  async function openFile() {
    const url = resolveFileUrl(homework);
    if (!url) return;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot open", "No app found on this device to open this file type. Please install a PDF or Office viewer.");
      }
    } catch {
      Alert.alert("Error", "Failed to open the file.");
    }
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setTaskImage({
        uri:  asset.uri,
        name: asset.fileName ?? `task_${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      });
    }
  }

  async function handleSubmit() {
    if (!taskImage) return Alert.alert("Required", "Please select a photo of your completed task.");
    const today = new Date().toISOString().split("T")[0];
    const fd = new FormData();
    fd.append("homeworkId", String(homeworkId));
    fd.append("submitDate", today);
    fd.append("task", { uri: taskImage.uri, name: taskImage.name, type: taskImage.type } as any);
    try {
      setSubmitting(true);
      await StudentTaskService.create(fd);
      setSubmitVisible(false);
      setTaskImage(null);
      Alert.alert("Submitted!", "Your task has been submitted successfully.", [
        {
          text: "View My Submissions",
          onPress: () =>
            router.push({
              pathname: "/(parent)/children/SubmittedTasks" as any,
              params: { homeworkId, title },
            }),
        },
        { text: "OK", style: "cancel" },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to submit task.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>Homework Details</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {subjectName}{className ? `  ·  ${className}` : ""}{studyYear ? `  ·  ${studyYear}` : ""}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── TITLE CARD ── */}
        <View style={styles.titleCard}>
          <View style={[styles.titleAccent, { backgroundColor: color }]} />
          <View style={styles.titleBody}>
            <Text style={styles.titleText}>{title ?? "Untitled"}</Text>
            <View style={styles.titleMetaRow}>
              <View style={[styles.badge, { backgroundColor: color + "18" }]}>
                <Ionicons name={icon} size={12} color={color} />
                <Text style={[styles.badgeText, { color }]}>
                  {overdueBool ? "Overdue" : (status ?? "active").charAt(0).toUpperCase() + (status ?? "active").slice(1)}
                </Text>
              </View>
              {remainingLabel && (
                <View style={[styles.badge, { backgroundColor: remainingLabel.bg }]}>
                  <Ionicons name="alarm-outline" size={11} color={remainingLabel.color} />
                  <Text style={[styles.badgeText, { color: remainingLabel.color }]}>{remainingLabel.text}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── HOMEWORK FILE ── */}
        {hasFile && (
          <>
            <View style={styles.sectionLabel}>
              <Ionicons name="attach-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.sectionLabelText}>Homework File</Text>
            </View>
            <TouchableOpacity style={styles.fileCard} onPress={openFile} activeOpacity={0.8}>
              <View style={[styles.fileIconWrap, { backgroundColor: fileMeta!.bg }]}>
                <Ionicons name={fileIcon(homework)} size={24} color={fileMeta!.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>{homework}</Text>
                <Text style={[styles.fileType, { color: fileMeta!.color }]}>
                  {fileMeta!.label} · Tap to open with device app
                </Text>
              </View>
              <View style={[styles.openBtn, { backgroundColor: fileMeta!.bg }]}>
                <Ionicons name="open-outline" size={16} color={fileMeta!.color} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* ── SCHEDULE ── */}
        <View style={styles.sectionLabel}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.sectionLabelText}>Schedule</Text>
        </View>

        <View style={styles.dateCard}>
          {/* Start */}
          <View style={styles.dateSide}>
            <View style={[styles.dateIconWrap, { backgroundColor: "#EEF4FF" }]}>
              <Ionicons name="play-circle-outline" size={20} color="#2563EB" />
            </View>
            <Text style={[styles.dateSideLabel, { color: "#2563EB" }]}>Start Date</Text>
            <Text style={styles.dateSideVal}>{formatDateShort(startDate ?? "")}</Text>
            <Text style={styles.dateSideFull}>{formatDate(startDate ?? "")}</Text>
          </View>

          {/* Middle */}
          <View style={styles.dateMiddle}>
            <View style={styles.dateConnector} />
            <View style={[styles.durationBubble, overdueBool && { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
              <Ionicons name="time-outline" size={14} color={overdueBool ? "#DC2626" : "#6B7280"} />
              <Text style={[styles.durationBubbleTxt, overdueBool && { color: "#DC2626" }]}>
                {duration !== null ? `${Math.abs(duration)} day${Math.abs(duration) !== 1 ? "s" : ""}` : "—"}
              </Text>
            </View>
            <View style={styles.dateConnector} />
          </View>

          {/* Due */}
          <View style={[styles.dateSide, { alignItems: "flex-end" }]}>
            <View style={[styles.dateIconWrap, { backgroundColor: overdueBool ? "#FEE2E2" : "#FFF1E6" }]}>
              <Ionicons name={overdueBool ? "alert-circle-outline" : "flag-outline"} size={20}
                color={overdueBool ? "#DC2626" : "#EA580C"} />
            </View>
            <Text style={[styles.dateSideLabel, { color: overdueBool ? "#DC2626" : "#EA580C" }]}>Due Date</Text>
            <Text style={[styles.dateSideVal, overdueBool && { color: "#DC2626" }]}>
              {formatDateShort(endDate ?? "")}
            </Text>
            <Text style={[styles.dateSideFull, overdueBool && { color: "#DC2626" }]}>
              {formatDate(endDate ?? "")}
            </Text>
          </View>
        </View>

        {/* ── DESCRIPTION ── */}
        <View style={styles.sectionLabel}>
          <Ionicons name="document-text-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.sectionLabelText}>Description</Text>
        </View>
        <View style={styles.descCard}>
          {description ? (
            <Text style={styles.descText}>{description}</Text>
          ) : (
            <View style={styles.descEmpty}>
              <Ionicons name="document-outline" size={24} color={Colors.border} />
              <Text style={styles.descEmptyText}>No description provided</Text>
            </View>
          )}
        </View>

        {/* ── ACTION BUTTONS ── */}
        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.85}
          onPress={() => setSubmitVisible(true)}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.submitBtnText}>Submit Task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mySubBtn}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: "/(parent)/children/SubmittedTasks" as any,
              params: { homeworkId, title },
            })
          }
        >
          <Ionicons name="images-outline" size={18} color={Colors.primary} />
          <Text style={styles.mySubBtnText}>My Submissions</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── SUBMIT TASK MODAL ── */}
      <Modal visible={submitVisible} animationType="slide" transparent onRequestClose={() => setSubmitVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setSubmitVisible(false)} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Submit Task</Text>
                <Text style={styles.sheetSub} numberOfLines={1}>{title ?? "Homework"}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSubmitVisible(false)}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetDesc}>
              Take or upload a photo of your completed task. The image will be sent to your teacher.
            </Text>

            {/* Image preview / picker */}
            {taskImage ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: taskImage.uri }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setTaskImage(null)}>
                  <Ionicons name="close-circle" size={26} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                <View style={styles.imagePickerIcon}>
                  <Ionicons name="image-outline" size={32} color="#2563EB" />
                </View>
                <Text style={styles.imagePickerTitle}>Tap to select photo</Text>
                <Text style={styles.imagePickerSub}>Choose from your gallery</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, (!taskImage || submitting) && { opacity: 0.55 }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!taskImage || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              )}
              <Text style={styles.confirmBtnText}>{submitting ? "Submitting…" : "Submit Task"}</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.blueSoft,
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: Colors.textPrimary },
  headerSub:   { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  /* title card */
  titleCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 16, overflow: "hidden",
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  titleAccent: { width: 5 },
  titleBody:   { flex: 1, padding: 16, gap: 10 },
  titleText:   { fontSize: 18, fontWeight: "800", color: Colors.textPrimary, lineHeight: 24 },
  titleMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },

  /* section label */
  sectionLabel: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 8, paddingHorizontal: 2,
  },
  sectionLabelText: {
    fontSize: 11, fontWeight: "700", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5,
  },

  /* file card */
  fileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 16,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  fileIconWrap: { width: 48, height: 48, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  fileName:     { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  fileType:     { fontSize: 11, fontWeight: "600", marginTop: 2 },
  openBtn:      { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },

  /* date card */
  dateCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 16, gap: 8,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  dateSide:      { flex: 2, alignItems: "flex-start" },
  dateIconWrap:  { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  dateSideLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  dateSideVal:   { fontSize: 15, fontWeight: "800", color: Colors.textPrimary },
  dateSideFull:  { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  dateMiddle:    { flex: 1, alignItems: "center", gap: 6 },
  dateConnector: { flex: 1, width: 1, backgroundColor: "#E5E7EB", minHeight: 12 },
  durationBubble: {
    alignItems: "center", gap: 3,
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12,
  },
  durationBubbleTxt: { fontSize: 11, fontWeight: "800", color: "#6B7280" },

  /* description */
  descCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 20,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  descText:      { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  descEmpty:     { alignItems: "center", gap: 8, paddingVertical: 16 },
  descEmptyText: { fontSize: 13, color: Colors.textSecondary },

  /* submit button */
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 16,
    elevation: 3, shadowColor: Colors.primary, shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  submitBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },

  mySubBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 14, paddingVertical: 13, marginTop: 10,
  },
  mySubBtnText: { fontSize: 15, fontWeight: "700", color: Colors.primary },

  /* modal */
  overlay:   { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 24,
    maxHeight: "80%",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center", marginTop: 12, marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sheetSub:   { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center",
  },
  sheetDesc: { fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 20 },

  /* image picker */
  imagePicker: {
    alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#BFDBFE", borderStyle: "dashed",
    borderRadius: 14, backgroundColor: "#F0F4FF",
    paddingVertical: 32, marginBottom: 20,
  },
  imagePickerIcon: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center",
  },
  imagePickerTitle: { fontSize: 15, fontWeight: "700", color: "#1E40AF" },
  imagePickerSub:   { fontSize: 12, color: "#6B7280" },

  imagePreviewWrap: { position: "relative", marginBottom: 20, borderRadius: 14, overflow: "hidden" },
  imagePreview:     { width: "100%", height: 200 },
  imageRemoveBtn: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "#fff", borderRadius: 13,
  },

  /* confirm */
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12, paddingVertical: 15,
  },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
