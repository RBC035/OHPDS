import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ClassService } from "@/services/api/classService";
import { StudentService } from "@/services/api/studentService";
import { StudentClassService } from "@/services/api/studentClassService";

// ── Types ─────────────────────────────────────────────────────────────────────

type Enrollment = {
  id: number | string;
  stuentId?: number | string;
  studentId?: number | string;
  classId: number | string;
  studyYear: string;
  // API may join the student row
  student?: { id: number | string; name: string; gender: string };
  name?: string;
  gender?: string;
};

type Student = {
  id: number | string;
  name: string;
  gender: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STREAM_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  A: { bg: "#EEF4FF", border: "#BFDBFE", color: "#2563EB" },
  B: { bg: "#EDE9FE", border: "#DDD6FE", color: "#7C3AED" },
  C: { bg: "#DCFCE7", border: "#BBF7D0", color: "#16A34A" },
  D: { bg: "#FFF7ED", border: "#FED7AA", color: "#EA580C" },
};

const AVATAR_COLORS = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

function getStream(name: string) {
  const parts = name.trim().split(" ");
  return parts[parts.length - 1].toUpperCase();
}

function getStreamColor(name: string) {
  const stream = getStream(name);
  return STREAM_COLORS[stream] ?? { bg: "#F3F4F6", border: "#E5E7EB", color: "#6B7280" };
}

function getInitials(name: string | null | undefined) {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function enrollmentName(e: Enrollment) {
  return e.student?.name ?? e.name ?? `Student #${e.stuentId ?? e.studentId}`;
}

function enrollmentGender(e: Enrollment): string {
  return e.student?.gender ?? e.gender ?? "";
}

// ── Student picker dropdown ───────────────────────────────────────────────────

function StudentPicker({
  students,
  selected,
  onSelect,
  loading,
}: {
  students: Student[];
  selected: Student | null;
  onSelect: (s: Student) => void;
  loading: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const filtered = students.filter((s) =>
    (s.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Text style={styles.label}>
        Student <Text style={styles.required}>*</Text>
      </Text>
      <TouchableOpacity
        style={[
          styles.pickerField,
          open && { borderColor: "#2563EB", borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
        ]}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 8 }} />
        ) : null}
        <Text style={[styles.pickerFieldText, !selected && { color: "#9CA3AF" }]}>
          {selected ? selected.name : "Select a student..."}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#6B7280" />
      </TouchableOpacity>

      {open && (
        <View style={styles.pickerDropdown}>
          <View style={styles.pickerSearchRow}>
            <Ionicons name="search-outline" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Search student..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {filtered.length === 0 ? (
              <View style={{ padding: 16, alignItems: "center" }}>
                <Text style={{ fontSize: 13, color: "#9CA3AF" }}>No students found</Text>
              </View>
            ) : (
              filtered.map((s, i) => {
                const av      = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const active  = selected?.id === s.id;
                return (
                  <TouchableOpacity
                    key={String(s.id)}
                    style={[styles.pickerOption, active && { backgroundColor: "#EEF4FF" }]}
                    onPress={() => { onSelect(s); setOpen(false); setSearch(""); }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.pickerAvatar, { backgroundColor: av.bg }]}>
                      <Text style={[styles.pickerAvatarText, { color: av.color }]}>
                        {getInitials(s.name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerOptionName, active && { color: "#2563EB", fontWeight: "700" }]}>
                        {s.name}
                      </Text>
                      <Text style={styles.pickerOptionMeta}>
                        {s.gender === "M" ? "Male" : s.gender === "F" ? "Female" : s.gender}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={18} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ClassDetailScreen() {
  const insets     = useSafeAreaInsets();
  const { id }     = useLocalSearchParams<{ id: string }>();

  const [className, setClassName]         = useState("");
  const [enrollments, setEnrollments]     = useState<Enrollment[]>([]);
  const [allStudents, setAllStudents]     = useState<Student[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [search, setSearch]               = useState("");
  const [modalVisible, setModalVisible]   = useState(false);

  // form fields
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studyYear, setStudyYear]             = useState("");

  // ── Data loading ─────────────────────────────────────────────────────────

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [clsRes, enrRes, stuRes] = await Promise.all([
        ClassService.getOne(id),
        StudentClassService.getByClass(id),
        StudentService.getAll(),
      ]);

      const cls = clsRes.data?.data ?? clsRes.data ?? {};
      setClassName(cls.name ?? `Class #${id}`);

      const stuData: Student[] = stuRes.data?.data ?? stuRes.data ?? [];
      setAllStudents(Array.isArray(stuData) ? stuData : []);

      // Build id→student map to enrich enrollments with real name/gender
      const stuMap = new Map<string, Student>();
      stuData.forEach((s) => stuMap.set(String(s.id), s));

      const enrData: Enrollment[] = enrRes.data?.data ?? enrRes.data ?? [];
      const enriched = (Array.isArray(enrData) ? enrData : []).map((e) => {
        const sid = String(e.stuentId ?? e.studentId ?? "");
        const stu  = stuMap.get(sid);
        return stu ? { ...e, student: stu } : e;
      });
      setEnrollments(enriched);
    } catch {
      setClassName(`Class #${id}`);
      setEnrollments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadAllStudents() {
    if (allStudents.length > 0) return; // already loaded on mount
    setLoadingStudents(true);
    try {
      const res = await StudentService.getAll();
      const data: Student[] = res.data?.data ?? res.data ?? [];
      setAllStudents(Array.isArray(data) ? data : []);
    } catch {
      setAllStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  // ── Computed ──────────────────────────────────────────────────────────────

  const sc          = getStreamColor(className);
  const stream      = className ? getStream(className) : "?";
  const maleCount   = enrollments.filter((e) => enrollmentGender(e) === "M").length;
  const femaleCount = enrollments.filter((e) => enrollmentGender(e) === "F").length;

  const filtered = enrollments.filter((e) =>
    (enrollmentName(e)).toLowerCase().includes(search.toLowerCase())
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openAdd() {
    setSelectedStudent(null);
    setStudyYear("");
    loadAllStudents();
    setModalVisible(true);
  }

  async function handleAssign() {
    if (!selectedStudent) {
      Alert.alert("Required", "Please select a student.");
      return;
    }
    if (!studyYear.trim()) {
      Alert.alert("Required", "Please enter the study year (e.g. 2025/2026).");
      return;
    }
    // basic format check
    if (!/^\d{4}\/\d{4}$/.test(studyYear.trim())) {
      Alert.alert("Invalid format", "Study year must be in the format 2025/2026.");
      return;
    }
    try {
      setSaving(true);
      const res = await StudentClassService.create({
        stuentId:  Number(selectedStudent.id),   // DB column name (typo in DB)
        studentId: Number(selectedStudent.id),   // correct spelling — send both
        classId:   Number(id),
        studyYear: studyYear.trim(),
      } as any);
      const raw: Enrollment = res.data?.data ?? res.data ?? {} as Enrollment;
      const created: Enrollment = {
        ...raw,
        id:        raw.id ?? Date.now(),
        stuentId:  selectedStudent.id,
        classId:   id,
        studyYear: studyYear.trim(),
        student:   selectedStudent,   // always attach so name shows immediately
      };
      setEnrollments((prev) => [...prev, created]);
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to assign student.");
    } finally {
      setSaving(false);
    }
  }

  function handleRemove(e: Enrollment) {
    Alert.alert(
      "Remove student",
      `Remove ${enrollmentName(e)} from this class?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await StudentClassService.remove(e.id);
              setEnrollments((prev) => prev.filter((en) => en.id !== e.id));
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message ?? "Failed to remove student.");
            }
          },
        },
      ]
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={[styles.streamBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.streamBadgeText}>{stream}</Text>
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headerTitle}>{className || `Class #${id}`}</Text>
            <Text style={styles.headerSub}>{enrollments.length} enrolled students</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={19} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{enrollments.length}</Text>
            <Text style={styles.stripLabel}>Students</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{maleCount}</Text>
            <Text style={styles.stripLabel}>Male</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{femaleCount}</Text>
            <Text style={styles.stripLabel}>Female</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>#{id}</Text>
            <Text style={styles.stripLabel}>Class ID</Text>
          </View>
        </View>
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
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

      {/* ── ENROLLMENT LIST ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(true); }}
            tintColor="#2563EB"
          />
        }
      >
        {loading ? (
          <ActivityIndicator color="#2563EB" size="large" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No students enrolled</Text>
            <Text style={styles.emptySub}>
              {search ? "Try a different search" : "Tap + to assign a student to this class"}
            </Text>
          </View>
        ) : (
          filtered.map((enr, index) => {
            const name        = enrollmentName(enr);
            const gender      = enrollmentGender(enr);
            const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
            return (
              <View key={String(enr.id)} style={styles.studentCard}>
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
                  <Text style={[styles.avatarText, { color: avatarColor.color }]}>
                    {getInitials(name)}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={styles.studentTop}>
                    <Text style={styles.studentName}>{name}</Text>
                    {gender ? (
                      <View style={[
                        styles.genderPill,
                        { backgroundColor: gender === "F" ? "#FEF3F2" : "#EFF6FF" },
                      ]}>
                        <Text style={[
                          styles.genderText,
                          { color: gender === "F" ? "#E11D48" : "#2563EB" },
                        ]}>
                          {gender === "F" ? "Female" : "Male"}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.metaText}> {enr.studyYear}</Text>
                  </View>
                </View>

                {/* Remove */}
                <TouchableOpacity
                  style={styles.actionDelete}
                  onPress={() => handleRemove(enr)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── ASSIGN MODAL ── */}
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
              <View style={[styles.sheetIconBox, { backgroundColor: "#EEF4FF" }]}>
                <Ionicons name="person-add-outline" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Assign student</Text>
                <Text style={styles.sheetSub}>{className}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Student picker */}
              <StudentPicker
                students={allStudents}
                selected={selectedStudent}
                onSelect={setSelectedStudent}
                loading={loadingStudents}
              />

              <View style={{ height: 16 }} />

              {/* Study year */}
              <Text style={styles.label}>
                Study year <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2025/2026"
                placeholderTextColor="#9CA3AF"
                value={studyYear}
                onChangeText={setStudyYear}
                keyboardType="default"
              />
              <Text style={styles.hint}>Format: 2025/2026</Text>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleAssign}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                )}
                <Text style={styles.saveBtnText}>Assign to class</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },

  header: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  streamBadge: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: "center", alignItems: "center",
  },
  streamBadgeText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  headerTitle:     { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub:       { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
  },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  stripItem:    { flex: 1, alignItems: "center" },
  stripNum:     { fontSize: 18, fontWeight: "800", color: "#fff" },
  stripLabel:   { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 4 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  studentCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: "800" },

  studentTop:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  studentName: { fontSize: 13, fontWeight: "700", color: "#111827", flex: 1 },

  genderPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  genderText: { fontSize: 10, fontWeight: "600" },

  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 11, color: "#9CA3AF" },

  actionDelete: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center", alignItems: "center",
  },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center", marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub:   { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  // Modal
  overlay:   { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center", marginBottom: 20,
  },
  sheetHeader:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 },
  sheetIconBox: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  sheetSub:   { fontSize: 11, color: "#6B7280", marginTop: 2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
  },

  label:    { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 4 },
  required: { color: "#DC2626" },
  hint:     { fontSize: 11, color: "#9CA3AF", marginTop: -14, marginBottom: 16 },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#111827",
    marginBottom: 6,
  },

  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12, paddingVertical: 14,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Student picker
  pickerField: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5, borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 4,
  },
  pickerFieldText: { fontSize: 14, color: "#111827", flex: 1 },
  pickerDropdown: {
    borderWidth: 1.5, borderTopWidth: 0, borderColor: "#2563EB",
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    backgroundColor: "#fff", overflow: "hidden", marginBottom: 4,
  },
  pickerSearchRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  pickerSearchInput: { flex: 1, fontSize: 13, color: "#111827" },
  pickerOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  pickerAvatar: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  pickerAvatarText:   { fontSize: 11, fontWeight: "800" },
  pickerOptionName:   { fontSize: 14, color: "#111827", fontWeight: "500" },
  pickerOptionMeta:   { fontSize: 11, color: "#9CA3AF" },
});
