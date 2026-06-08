import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StudentService, StudentPayload } from "../../../services/api/studentService";

type Student = {
  id: number;
  name: string;
  gender: string;
  dob: string;
};

const AVATAR_PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function genderStyle(gender: string) {
  const g = gender?.toLowerCase() ?? "";
  if (g === "male"   || g === "m") return { bg: "#EFF6FF", border: "#BFDBFE", color: "#2563EB", label: "Male",   icon: "man-outline"   as const };
  if (g === "female" || g === "f") return { bg: "#FDF2F8", border: "#FBCFE8", color: "#DB2777", label: "Female", icon: "woman-outline" as const };
  return { bg: "#F3F4F6", border: "#E5E7EB", color: "#6B7280", label: gender, icon: "person-outline" as const };
}

function formatDob(dob: string): string {
  if (!dob) return "—";
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return dob;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return dob; }
}

function calcAge(dob: string): number | null {
  if (!dob) return null;
  try {
    const birthYear = new Date(dob).getFullYear();
    if (isNaN(birthYear)) return null;
    return new Date().getFullYear() - birthYear;
  } catch { return null; }
}

export default function AdminStudentsScreen() {
  const insets = useSafeAreaInsets();

  const [students, setStudents]         = useState<Student[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterGender, setFilterGender] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]           = useState<Student | null>(null);
  const [saving, setSaving]             = useState(false);

  const [formName, setFormName]     = useState("");
  const [formGender, setFormGender] = useState("Male");
  const [formDob, setFormDob]       = useState("");

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await StudentService.getAll();
      const data: Student[] = res.data?.data ?? res.data ?? [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const g = (s.gender ?? "").toLowerCase();
    const matchGender =
      filterGender === "All" ||
      (filterGender === "Male"   && (g === "male"   || g === "m")) ||
      (filterGender === "Female" && (g === "female" || g === "f"));
    return matchSearch && matchGender;
  });

  const maleCount   = students.filter((s) => { const g = (s.gender ?? "").toLowerCase(); return g === "male"   || g === "m"; }).length;
  const femaleCount = students.filter((s) => { const g = (s.gender ?? "").toLowerCase(); return g === "female" || g === "f"; }).length;

  function openAdd() {
    setEditing(null);
    setFormName(""); setFormGender("Male"); setFormDob("");
    setModalVisible(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setFormName(s.name);
    setFormDob(s.dob ?? "");
    const g = (s.gender ?? "").toLowerCase();
    setFormGender((g === "female" || g === "f") ? "Female" : "Male");
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formName.trim()) { Alert.alert("Required", "Please enter the student name."); return; }
    if (!formDob.trim())  { Alert.alert("Required", "Please enter the date of birth (YYYY-MM-DD)."); return; }
    const payload: StudentPayload = {
      name:   formName.trim(),
      gender: formGender,
      dob:    formDob.trim(),
    };
    try {
      setSaving(true);
      if (editing) {
        await StudentService.update(editing.id, payload);
      } else {
        await StudentService.create(payload);
      }
      setModalVisible(false);
      await loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to save student.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(s: Student) {
    Alert.alert(
      "Delete student",
      `Remove "${s.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await StudentService.remove(s.id);
              await loadStudents();
            } catch (e: any) {
              Alert.alert("Error", e?.response?.data?.message ?? "Failed to delete student.");
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#EA580C" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Students</Text>
            <Text style={styles.headerSub}>Manage all school students</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={22} color="#EA580C" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{students.length}</Text>
            <Text style={styles.stripLabel}>Total</Text>
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
        </View>
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
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

      {/* ── GENDER FILTER ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {["All", "Male", "Female"].map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.filterChip, filterGender === g && styles.filterChipActive]}
            onPress={() => setFilterGender(g)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filterGender === g && styles.filterChipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── LIST ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptySub}>Try a different search or add a new student</Text>
            </View>
          )}

          {filtered.map((s, index) => {
            const gc  = genderStyle(s.gender);
            const av  = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
            const ini = getInitials(s.name);
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/(admin)/students/${s.id}` as any)}
              >
                <View style={[styles.colorBar, { backgroundColor: gc.color }]} />
                <View style={styles.cardInner}>
                  <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.avatarText, { color: av.color }]}>{ini}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardName}>{s.name}</Text>
                      <View style={[styles.genderPill, { backgroundColor: gc.bg, borderColor: gc.border }]}>
                        <Ionicons name={gc.icon} size={10} color={gc.color} />
                        <Text style={[styles.genderText, { color: gc.color }]}>{gc.label}</Text>
                      </View>
                    </View>

                    <View style={styles.dobRow}>
                      <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.dobText}> {formatDob(s.dob)}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="hourglass-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.dobText}> {calcAge(s.dob) !== null ? `${calcAge(s.dob)} yrs` : "—"}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.idText}>ID #{s.id}</Text>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionEdit}
                        onPress={(e) => { e.stopPropagation(); openEdit(s); }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="create-outline" size={15} color="#EA580C" />
                        <Text style={styles.actionEditText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionDelete}
                        onPress={(e) => { e.stopPropagation(); handleDelete(s); }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{editing ? "Edit student" : "Add new student"}</Text>
                <Text style={styles.sheetSub}>{editing ? `Editing ID #${editing.id}` : "Fill in the details below"}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Full name <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. Amina Farouq" placeholderTextColor="#9CA3AF" value={formName} onChangeText={setFormName} autoCapitalize="words" />

              <Text style={styles.label}>Date of birth <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD  e.g. 2010-03-12" placeholderTextColor="#9CA3AF" value={formDob} onChangeText={setFormDob} keyboardType="numbers-and-punctuation" />

              <Text style={styles.label}>Gender <Text style={styles.required}>*</Text></Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderOption, formGender === "Male" && styles.genderActiveMale]}
                  onPress={() => setFormGender("Male")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="man-outline" size={18} color={formGender === "Male" ? "#fff" : "#6B7280"} />
                  <Text style={[styles.genderOptionText, { color: formGender === "Male" ? "#fff" : "#6B7280" }]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderOption, formGender === "Female" && styles.genderActiveFemale]}
                  onPress={() => setFormGender("Female")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="woman-outline" size={18} color={formGender === "Female" ? "#fff" : "#6B7280"} />
                  <Text style={[styles.genderOptionText, { color: formGender === "Female" ? "#fff" : "#6B7280" }]}>Female</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name={editing ? "checkmark-circle-outline" : "person-add-outline"} size={18} color="#fff" />
                }
                <Text style={styles.saveBtnText}>{editing ? "Save changes" : "Add student"}</Text>
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
  container: { flex: 1, backgroundColor: "#F5F7FB" },

  header:    { backgroundColor: "#EA580C", paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  addBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },

  statsStrip:   { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingVertical: 14 },
  stripItem:    { flex: 1, alignItems: "center" },
  stripNum:     { fontSize: 18, fontWeight: "800", color: "#fff" },
  stripLabel:   { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 4 },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", margin: 16, marginBottom: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  filterRow:            { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: "row" },
  filterChip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff" },
  filterChipActive:     { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  filterChipText:       { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "#fff" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#6B7280" },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  card:      { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12, flexDirection: "row", overflow: "hidden" },
  colorBar:  { width: 4 },
  cardInner: { flex: 1, flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },

  avatar:     { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: "800" },

  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  cardName:   { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 },

  genderPill: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  genderText: { fontSize: 10, fontWeight: "700" },

  dobRow:   { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  dobText:  { fontSize: 12, color: "#6B7280" },
  metaDot:  { fontSize: 12, color: "#D1D5DB", marginHorizontal: 4 },
  idText:   { fontSize: 11, color: "#9CA3AF" },

  cardActions:    { flexDirection: "row", alignItems: "center", gap: 6 },
  actionEdit:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF1E6", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionEditText: { fontSize: 12, fontWeight: "600", color: "#EA580C" },
  actionDelete:   { width: 30, height: 30, borderRadius: 8, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center" },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon:  { width: 70, height: 70, borderRadius: 35, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub:   { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  overlay:     { flex: 1, justifyContent: "flex-end" },
  overlayBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:       { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  sheetTitle:  { fontSize: 18, fontWeight: "800", color: "#111827" },
  sheetSub:    { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  closeBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },

  label:    { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  required: { color: "#DC2626" },

  input: {
    backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#111827", marginBottom: 18,
  },

  genderRow:          { flexDirection: "row", gap: 10, marginBottom: 20 },
  genderOption:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: "#E5E7EB" },
  genderActiveMale:   { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  genderActiveFemale: { backgroundColor: "#DB2777", borderColor: "#DB2777" },
  genderOptionText:   { fontSize: 14, fontWeight: "600" },

  saveBtn:     { backgroundColor: "#EA580C", borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
