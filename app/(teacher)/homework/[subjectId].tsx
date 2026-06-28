import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { ClassService } from "../../../services/api/classService";
import { HomeworkService } from "../../../services/api/homeworkService";
import { StudentClassService } from "../../../services/api/studentClassService";

type FileAsset = { uri: string; name: string; type: string };

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

type ClassItem = { id: number | string; name: string };

const ALLOWED_EXTENSIONS = ["ppt", "pptx", "pdf", "doc", "docx"];
const STATUS_OPTIONS = ["Active", "Inactive"] as const;

const PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

/* ── File type → icon + colour (PDF red · DOC blue · PPT orange) ── */
function fileMeta(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")
    return {
      icon: "document-text" as const,
      color: "#DC2626",
      bg: "#FEE2E2",
      label: "PDF",
    };
  if (ext === "ppt" || ext === "pptx")
    return {
      icon: "easel" as const,
      color: "#EA580C",
      bg: "#FFF1E6",
      label: ext.toUpperCase(),
    };
  if (ext === "doc" || ext === "docx")
    return {
      icon: "document" as const,
      color: "#2563EB",
      bg: "#EEF4FF",
      label: ext.toUpperCase(),
    };
  return {
    icon: "attach" as const,
    color: "#6B7280",
    bg: "#F3F4F6",
    label: "FILE",
  };
}

function statusStyle(status?: string) {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return { bg: "#DCFCE7", color: "#16A34A" };
  if (s === "inactive") return { bg: "#FEF3C7", color: "#D97706" };
  return { bg: "#F3F4F6", color: "#6B7280" };
}

/* ── Duration between two YYYY-MM-DD dates ── */
function durationLabel(start?: string, end?: string): string {
  if (!start || !end) return "";
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "";
  const days = Math.round((e.getTime() - s.getTime()) / 86_400_000);
  if (days < 0) return "";
  if (days === 0) return "Same day";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  const rem = days % 7;
  if (rem === 0) return `${weeks} week${weeks > 1 ? "s" : ""}`;
  return `${weeks}w ${rem}d`;
}

function validateHomeworkFile(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "File path is required.";
  const ext = trimmed.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext))
    return `Only allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
  return null;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function parseDate(s: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? new Date() : dt;
}

function formatDisplayDate(s: string): string {
  if (!s) return "";
  const dt = parseDate(s);
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TeacherHomeworkListScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ subjectId: string; name?: string }>();
  const subjectId = parseInt(params.subjectId, 10);
  const subjectName = params.name
    ? decodeURIComponent(params.name)
    : `Subject #${subjectId}`;

  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [classCatalog, setClassCatalog] = useState<ClassItem[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formHomework, setFormHomework] = useState<FileAsset | null>(null);
  const [formClassId, setFormClassId] = useState<ClassItem | null>(null);
  const [formStartDate, setFormStartDate] = useState(today());
  const [formEndDate, setFormEndDate] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  const [classDropOpen, setClassDropOpen] = useState(false);
  const [classSearch, setClassSearch] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [hwRes, clsRes] = await Promise.all([
        HomeworkService.getBySubject(subjectId),
        ClassService.getAll(),
      ]);
      const hw: Homework[] = hwRes.data?.data ?? hwRes.data ?? [];
      const cls: ClassItem[] = clsRes.data?.data ?? clsRes.data ?? [];
      const classes = Array.isArray(cls) ? cls : [];
      setHomeworkList(Array.isArray(hw) ? hw : []);
      setClassCatalog(classes);

      // student count per class
      const counts = await Promise.all(
        classes.map(async (c) => {
          try {
            const r = await StudentClassService.getByClass(c.id);
            const arr: any[] = r.data?.data ?? r.data ?? [];
            return [String(c.id), Array.isArray(arr) ? arr.length : 0] as [
              string,
              number,
            ];
          } catch {
            return [String(c.id), 0] as [string, number];
          }
        }),
      );
      setClassCounts(Object.fromEntries(counts));
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to load homework.",
      );
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const classNameMap = new Map(classCatalog.map((c) => [String(c.id), c.name]));

  function resolvedClassName(hw: Homework) {
    return (
      hw.className ||
      classNameMap.get(String(hw.classId)) ||
      `Class #${hw.classId}`
    );
  }

  function classCountLabel(id: number | string) {
    const n = classCounts[String(id)];
    if (n === undefined) return "…";
    return `${n} student${n !== 1 ? "s" : ""}`;
  }

  // ── Open modal ────────────────────────────────────────────────────────────
  function openAdd() {
    setEditing(null);
    setFormTitle("");
    setFormHomework(null);
    setFormClassId(null);
    setFormStartDate(today());
    setFormEndDate("");
    setFormDescription("");
    setFormStatus("Active");
    setClassDropOpen(false);
    setClassSearch("");
    setShowStartPicker(false);
    setShowEndPicker(false);
    setModalVisible(true);
  }

  function openEdit(hw: Homework) {
    setEditing(hw);
    setFormTitle(hw.title ?? "");
    setFormHomework(null); // can't restore uploaded file from server
    setFormClassId(
      classCatalog.find((c) => String(c.id) === String(hw.classId)) ?? null,
    );
    setFormStartDate(hw.startDate ?? today());
    setFormEndDate(hw.endDate ?? "");
    setFormDescription(hw.description ?? "");
    setFormStatus(
      (hw.status === "Inactive" ? "Inactive" : "Active") as
        | "Active"
        | "Inactive",
    );
    setClassDropOpen(false);
    setClassSearch("");
    setShowStartPicker(false);
    setShowEndPicker(false);
    setModalVisible(true);
  }

  function openDetail(hw: Homework) {
    router.push(
      `/(teacher)/homework/view/${hw.id}?subject=${encodeURIComponent(subjectName)}` as any,
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!formTitle.trim())
      return Alert.alert("Required", "Please enter a homework title.");
    if (!formClassId) return Alert.alert("Required", "Please select a class.");
    if (!formStartDate.trim())
      return Alert.alert("Required", "Please enter a start date.");
    if (!formEndDate.trim())
      return Alert.alert("Required", "Please enter an end date.");
    // File required for new homework; optional when editing (keep existing if none chosen)
    if (!editing && !formHomework)
      return Alert.alert("Required", "Please attach a homework file.");

    const fd = new FormData();
    fd.append("subjectId", String(subjectId));
    fd.append("classId", String(formClassId.id));
    fd.append("title", formTitle.trim());
    fd.append("startDate", formStartDate.trim());
    fd.append("endDate", formEndDate.trim());
    fd.append("description", formDescription.trim());
    fd.append("status", formStatus);
    if (formHomework) {
      fd.append("homework", {
        uri: formHomework.uri,
        name: formHomework.name,
        type: formHomework.type,
      } as any);
    }

    try {
      setSaving(true);
      // if (editing) await HomeworkService.update(Number(editing.id), fd);
      // else         await HomeworkService.create(fd);
      if (editing) await HomeworkService.updateRaw(Number(editing.id), fd);
      else await HomeworkService.createRaw(fd);
      setModalVisible(false);
      await loadData();
    } catch (e: any) {
      console.log("HW SAVE ERROR:", e?.response?.status, e?.response?.data);
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to save homework.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleDelete(hw: Homework) {
    Alert.alert(
      "Delete homework",
      `Remove "${hw.title || hw.homework}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await HomeworkService.remove(Number(hw.id));
              await loadData();
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.response?.data?.message ?? "Failed to delete homework.",
              );
            }
          },
        },
      ],
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredClasses = classCatalog.filter((c) =>
    c.name.toLowerCase().includes(classSearch.toLowerCase()),
  );
  const activeCount = homeworkList.filter(
    (h) => (h.status ?? "Active").toLowerCase() === "active",
  ).length;
  const inactiveCount = homeworkList.filter(
    (h) => (h.status ?? "").toLowerCase() === "inactive",
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      {/* ── HEADER ── */}
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
            <Text style={styles.headerTitle} numberOfLines={1}>
              {subjectName}
            </Text>
            <Text style={styles.headerSub}>Homework management</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={openAdd}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#1E40AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{homeworkList.length}</Text>
            <Text style={styles.stripLabel}>Total</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{activeCount}</Text>
            <Text style={styles.stripLabel}>Active</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{inactiveCount}</Text>
            <Text style={styles.stripLabel}>Inactive</Text>
          </View>
        </View>
      </View>

      {/* ── LIST ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading homework...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {homeworkList.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="clipboard-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No homework yet</Text>
              <Text style={styles.emptySub}>
                Tap + to add the first homework for this subject
              </Text>
            </View>
          )}

          {homeworkList.map((hw) => {
            const fm = fileMeta(hw.homework ?? "");
            const ss = statusStyle(hw.status);
            const dur = durationLabel(hw.startDate, hw.endDate);
            return (
              <TouchableOpacity
                key={String(hw.id)}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openDetail(hw)}
              >
                <View
                  style={[styles.colorBar, { backgroundColor: fm.color }]}
                />
                <View style={styles.cardInner}>
                  <View style={[styles.fileIcon, { backgroundColor: fm.bg }]}>
                    <Ionicons
                      name={`${fm.icon}-outline` as any}
                      size={22}
                      color={fm.color}
                    />
                    <Text style={[styles.fileBadge, { color: fm.color }]}>
                      {fm.label}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.hwTitle} numberOfLines={1}>
                      {hw.title || hw.homework}
                    </Text>

                    <View style={styles.hwMeta}>
                      <Ionicons
                        name="school-outline"
                        size={11}
                        color="#9CA3AF"
                      />
                      <Text style={styles.hwMetaText}>
                        {" "}
                        {resolvedClassName(hw)}
                      </Text>
                      <Text style={styles.metaDot}>·</Text>
                      <View
                        style={[styles.statusPill, { backgroundColor: ss.bg }]}
                      >
                        <Text style={[styles.statusText, { color: ss.color }]}>
                          {hw.status ?? "Active"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.hwDates}>
                      <Ionicons
                        name="calendar-outline"
                        size={11}
                        color="#9CA3AF"
                      />
                      <Text style={styles.hwMetaText}> {hw.startDate}</Text>
                      <Ionicons
                        name="arrow-forward-outline"
                        size={11}
                        color="#9CA3AF"
                        style={{ marginHorizontal: 2 }}
                      />
                      <Text style={styles.hwMetaText}>{hw.endDate}</Text>
                      {dur ? (
                        <View style={styles.durationPill}>
                          <Ionicons
                            name="time-outline"
                            size={10}
                            color="#2563EB"
                          />
                          <Text style={styles.durationText}> {dur}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* {hw.description ? (
                      <Text style={styles.hwDesc} numberOfLines={2}>
                        {hw.description}
                      </Text>
                    ) : null} */}

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => openEdit(hw)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name="create-outline"
                          size={14}
                          color="#2563EB"
                        />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(hw)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#DC2626"
                        />
                      </TouchableOpacity>
                      <View style={{ flex: 1 }} />
                      <View style={styles.openHint}>
                        <Text style={styles.openHintText}>Details</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={13}
                          color="#9CA3AF"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.overlayBg}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {editing ? "Edit homework" : "Add homework"}
                </Text>
                <Text style={styles.sheetSub}>{subjectName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title */}
              <Text style={styles.label}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Algebra Chapter 5 exercises"
                placeholderTextColor="#9CA3AF"
                value={formTitle}
                onChangeText={setFormTitle}
                returnKeyType="next"
              />

              {/* File picker */}
              <Text style={styles.label}>
                Homework file <Text style={styles.optional}>(optional)</Text>
              </Text>
              <Text style={styles.hint}>
                Allowed: .pdf .doc .docx .ppt .pptx
              </Text>

              {formHomework ? (
                <View
                  style={[
                    styles.filePreview,
                    { borderColor: fileMeta(formHomework.name).bg },
                  ]}
                >
                  <View
                    style={[
                      styles.filePreviewIcon,
                      { backgroundColor: fileMeta(formHomework.name).bg },
                    ]}
                  >
                    <Ionicons
                      name={
                        `${fileMeta(formHomework.name).icon}-outline` as any
                      }
                      size={22}
                      color={fileMeta(formHomework.name).color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.filePreviewName} numberOfLines={1}>
                      {formHomework.name}
                    </Text>
                    <Text
                      style={[
                        styles.filePreviewSub,
                        { color: fileMeta(formHomework.name).color },
                      ]}
                    >
                      {fileMeta(formHomework.name).label} · file selected
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setFormHomework(null)}
                    style={styles.fileClearBtn}
                  >
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.filePickerBtn}
                  activeOpacity={0.8}
                  onPress={async () => {
                    try {
                      const result = await DocumentPicker.getDocumentAsync({
                        // type: [
                        //   "application/pdf",
                        //   "application/msword",
                        //   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        //   "application/vnd.ms-powerpoint",
                        //   "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        // ],
                        type: "*/*",
                        copyToCacheDirectory: true,
                        multiple: false,
                      });
                      if (!result.canceled && result.assets?.length > 0) {
                        const asset = result.assets[0];
                        const name = asset.name ?? "";
                        const ext = name.split(".").pop()?.toLowerCase() ?? "";
                        if (!ALLOWED_EXTENSIONS.includes(ext)) {
                          Alert.alert(
                            "Invalid file",
                            `Only allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
                          );
                          return;
                        }
                        setFormHomework({
                          uri: asset.uri,
                          name: asset.name ?? "",
                          type: asset.mimeType ?? "application/octet-stream",
                        });
                      }
                    } catch {
                      Alert.alert("Error", "Could not open file picker.");
                    }
                  }}
                >
                  <View style={styles.filePickerIcon}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={24}
                      color="#2563EB"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.filePickerTitle}>
                      Tap to select file
                    </Text>
                    <Text style={styles.filePickerSub}>
                      PDF, DOC, DOCX, PPT, PPTX
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              {/* Class select */}
              <Text style={styles.label}>
                Class <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  classDropOpen && {
                    borderColor: "#2563EB",
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  },
                ]}
                onPress={() => setClassDropOpen((v) => !v)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.selectFieldText,
                    !formClassId && { color: "#9CA3AF" },
                  ]}
                >
                  {formClassId
                    ? `${formClassId.name}  ·  ${classCountLabel(formClassId.id)}`
                    : "Select a class..."}
                </Text>
                <Ionicons
                  name={classDropOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#6B7280"
                />
              </TouchableOpacity>

              {classDropOpen && (
                <View
                  style={[styles.selectDropdown, { borderColor: "#2563EB" }]}
                >
                  <View style={styles.dropSearchWrap}>
                    <Ionicons
                      name="search-outline"
                      size={14}
                      color="#9CA3AF"
                      style={{ marginRight: 6 }}
                    />
                    <TextInput
                      style={styles.dropSearchInput}
                      placeholder="Search classes..."
                      placeholderTextColor="#9CA3AF"
                      value={classSearch}
                      onChangeText={setClassSearch}
                      autoFocus
                    />
                    {classSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setClassSearch("")}>
                        <Ionicons
                          name="close-circle"
                          size={14}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView
                    style={{ maxHeight: 220 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {filteredClasses.map((cls, index) => {
                      const isSelected = formClassId?.id === cls.id;
                      const av = PALETTE[index % PALETTE.length];
                      return (
                        <TouchableOpacity
                          key={String(cls.id)}
                          style={[
                            styles.selectOption,
                            isSelected && { backgroundColor: "#EEF4FF" },
                          ]}
                          onPress={() => {
                            setFormClassId(cls);
                            setClassDropOpen(false);
                            setClassSearch("");
                          }}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.selectDot,
                              { backgroundColor: av.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.selectDotText,
                                { color: av.color },
                              ]}
                            >
                              {cls.name
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.selectOptionText,
                                isSelected && {
                                  color: "#2563EB",
                                  fontWeight: "700",
                                },
                              ]}
                            >
                              {cls.name}
                            </Text>
                            <View style={styles.selectOptionMetaRow}>
                              <Ionicons
                                name="people-outline"
                                size={11}
                                color="#9CA3AF"
                              />
                              <Text style={styles.selectOptionMeta}>
                                {" "}
                                {classCountLabel(cls.id)}
                              </Text>
                            </View>
                          </View>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color="#2563EB"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={{ height: 14 }} />

              {/* Start date */}
              <Text style={styles.label}>
                Start date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateField}
                activeOpacity={0.8}
                onPress={() => {
                  setShowEndPicker(false);
                  setShowStartPicker((v) => !v);
                }}
              >
                <Ionicons name="calendar-outline" size={16} color="#2563EB" />
                <Text style={styles.dateFieldText}>
                  {formStartDate
                    ? formatDisplayDate(formStartDate)
                    : "Select start date"}
                </Text>
                <Ionicons
                  name={showStartPicker ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#9CA3AF"
                />
              </TouchableOpacity>

              {showStartPicker && (
                <View style={styles.pickerWrap}>
                  {Platform.OS === "ios" && (
                    <TouchableOpacity
                      style={styles.pickerDoneRow}
                      onPress={() => setShowStartPicker(false)}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  )}
                  <DateTimePicker
                    value={parseDate(formStartDate)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, date) => {
                      if (Platform.OS === "android") setShowStartPicker(false);
                      if (date)
                        setFormStartDate(date.toISOString().split("T")[0]);
                    }}
                  />
                </View>
              )}

              {/* End date */}
              <Text style={styles.label}>
                End date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateField}
                activeOpacity={0.8}
                onPress={() => {
                  setShowStartPicker(false);
                  setShowEndPicker((v) => !v);
                }}
              >
                <Ionicons name="flag-outline" size={16} color="#EA580C" />
                <Text
                  style={[
                    styles.dateFieldText,
                    !formEndDate && { color: "#9CA3AF" },
                  ]}
                >
                  {formEndDate
                    ? formatDisplayDate(formEndDate)
                    : "Select end date"}
                </Text>
                <Ionicons
                  name={showEndPicker ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#9CA3AF"
                />
              </TouchableOpacity>

              {showEndPicker && (
                <View style={styles.pickerWrap}>
                  {Platform.OS === "ios" && (
                    <TouchableOpacity
                      style={styles.pickerDoneRow}
                      onPress={() => setShowEndPicker(false)}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  )}
                  <DateTimePicker
                    value={parseDate(formEndDate || today())}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={parseDate(formStartDate)}
                    onChange={(event, date) => {
                      if (Platform.OS === "android") setShowEndPicker(false);
                      if (date)
                        setFormEndDate(date.toISOString().split("T")[0]);
                    }}
                  />
                </View>
              )}

              {/* Live duration preview */}
              {durationLabel(formStartDate, formEndDate) ? (
                <View style={styles.durationPreview}>
                  <Ionicons name="time-outline" size={14} color="#2563EB" />
                  <Text style={styles.durationPreviewText}>
                    {" "}
                    Duration: {durationLabel(formStartDate, formEndDate)}
                  </Text>
                </View>
              ) : null}

              {/* Description */}
              <Text style={styles.label}>
                Description <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add instructions or notes for students..."
                placeholderTextColor="#9CA3AF"
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Status */}
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusOption,
                      formStatus === s &&
                        s === "Active" &&
                        styles.statusActiveGreen,
                      formStatus === s &&
                        s === "Inactive" &&
                        styles.statusActiveAmber,
                    ]}
                    onPress={() => setFormStatus(s)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            formStatus === s
                              ? "#fff"
                              : s === "Active"
                                ? "#16A34A"
                                : "#D97706",
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        { color: formStatus === s ? "#fff" : "#6B7280" },
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={
                      editing
                        ? "checkmark-circle-outline"
                        : "add-circle-outline"
                    }
                    size={18}
                    color="#fff"
                  />
                )}
                <Text style={styles.saveBtnText}>
                  {editing ? "Save changes" : "Add homework"}
                </Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4FF" },

  header: {
    backgroundColor: "#1E40AF",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 1 },
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
    borderRadius: 14,
    paddingVertical: 13,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripNum: { fontSize: 18, fontWeight: "800", color: "#fff" },
  stripLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stripDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 4,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#6B7280" },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  colorBar: { width: 5 },
  cardInner: { flex: 1, flexDirection: "row", padding: 14, gap: 12 },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  fileBadge: {
    fontSize: 7,
    fontWeight: "800",
    marginTop: 1,
    letterSpacing: 0.3,
  },
  hwTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  hwMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 5,
    flexWrap: "wrap",
  },
  hwDates: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  hwMetaText: { fontSize: 11, color: "#6B7280" },
  hwDesc: { fontSize: 12, color: "#6B7280", lineHeight: 17, marginBottom: 10 },
  metaDot: { fontSize: 11, color: "#D1D5DB" },
  statusPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: "700" },

  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF4FF",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  durationText: { fontSize: 10, fontWeight: "700", color: "#2563EB" },

  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF4FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  openHint: { flexDirection: "row", alignItems: "center", gap: 1 },
  openHintText: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },

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
    maxHeight: "93%",
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

  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  hint: { fontSize: 11, color: "#9CA3AF", fontWeight: "400", marginBottom: 10 },
  required: { color: "#DC2626" },
  optional: { color: "#9CA3AF", fontWeight: "400" },

  filePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0F4FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    borderStyle: "dashed",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
  },
  filePickerIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  filePickerTitle: { fontSize: 14, fontWeight: "600", color: "#1E40AF" },
  filePickerSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  filePreviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  filePreviewName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  filePreviewSub: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  fileClearBtn: { padding: 4 },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    marginBottom: 18,
  },
  textArea: { height: 90, marginBottom: 18 },

  durationPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF4FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -8,
    marginBottom: 18,
    alignSelf: "flex-start",
  },
  durationPreviewText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },

  selectField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectFieldText: { fontSize: 14, color: "#111827", flex: 1 },
  selectDropdown: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
    marginBottom: 4,
  },
  dropSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropSearchInput: { flex: 1, fontSize: 13, color: "#111827" },
  selectOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  selectDotText: { fontSize: 11, fontWeight: "800" },
  selectOptionText: { fontSize: 14, color: "#111827", fontWeight: "500" },
  selectOptionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  selectOptionMeta: { fontSize: 11, color: "#9CA3AF" },

  statusRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statusOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  statusActiveGreen: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  statusActiveAmber: { backgroundColor: "#D97706", borderColor: "#D97706" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusOptionText: { fontSize: 14, fontWeight: "600" },

  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  dateField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 6,
  },
  dateFieldText: { flex: 1, fontSize: 14, color: "#111827", fontWeight: "500" },

  pickerWrap: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    marginBottom: 18,
    overflow: "hidden",
  },
  pickerDoneRow: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  pickerDoneText: { fontSize: 15, fontWeight: "700", color: "#2563EB" },
});
