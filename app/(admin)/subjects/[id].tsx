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
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { SubjectService } from "@/services/api/subjectService";

type ClassAssigned  = { id: string; name: string };
type TeacherAssigned = { id: string; name: string };

type SubjectInfo = {
  id: string;
  name: string;
  status: string;
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: "#DCFCE7", color: "#16A34A", label: "Active"   },
  inactive: { bg: "#FEE2E2", color: "#DC2626", label: "Inactive" },
};

const ITEM_PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

function extractList(res: any): any[] {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

function extractItem(res: any): any {
  const d = res?.data;
  if (d?.data && typeof d.data === "object" && !Array.isArray(d.data)) return d.data;
  return d ?? {};
}

function mapClass(item: any): ClassAssigned {
  return {
    id:   String(item.id),
    name: item.name ?? item.class_name ?? "",
  };
}

function mapTeacher(item: any): TeacherAssigned {
  return {
    id:   String(item.id),
    name: item.name ?? item.teacher_name ?? "",
  };
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getStream(name: string) {
  return name.trim().split(" ").pop()?.toUpperCase() ?? "?";
}

type ActiveTab = "classes" | "teachers";

export default function AdminSubjectDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [subjectInfo, setSubjectInfo]   = useState<SubjectInfo | null>(null);
  const [classes, setClasses]           = useState<ClassAssigned[]>([]);
  const [teachers, setTeachers]         = useState<TeacherAssigned[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState<ActiveTab>("classes");
  const [search, setSearch]             = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  // class assign form
  const [formClassId, setFormClassId]     = useState("");

  // teacher assign form
  const [formTeacherId, setFormTeacherId] = useState("");

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [subRes, classRes, teacherRes] = await Promise.all([
        SubjectService.getOne(id),
        SubjectService.getClasses(id),
        SubjectService.getTeachers(id),
      ]);

      const raw = extractItem(subRes);
      setSubjectInfo({
        id:     String(raw.id ?? id),
        name:   raw.name ?? "",
        status: raw.status ?? "active",
      });
      setClasses(extractList(classRes).map(mapClass));
      setTeachers(extractList(teacherRes).map(mapTeacher));
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to load subject details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading subject...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!subjectInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
          <Text style={styles.errorText}>Subject not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.errorBtn}>
            <Text style={styles.errorBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_STYLES[subjectInfo.status?.toLowerCase()] ?? { bg: "#F3F4F6", color: "#6B7280", label: subjectInfo.status };

  const filteredClasses  = classes.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTeachers = teachers.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  // ── Handlers ──────────────────────────────────
  function openAssignClass() {
    setFormClassId("");
    setModalVisible(true);
  }

  function openAssignTeacher() {
    setFormTeacherId("");
    setModalVisible(true);
  }

  async function saveClass() {
    if (!formClassId.trim()) { Alert.alert("Required", "Enter the class ID."); return; }
    setSaving(true);
    try {
      await SubjectService.assignClass(id, { class_id: formClassId.trim() });
      setModalVisible(false);
      const res = await SubjectService.getClasses(id);
      setClasses(extractList(res).map(mapClass));
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to assign class.");
    } finally {
      setSaving(false);
    }
  }

  function removeClass(cls: ClassAssigned) {
    Alert.alert("Remove class", `Remove "${cls.name}" from this subject?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await SubjectService.removeClass(id, cls.id);
            const res = await SubjectService.getClasses(id);
            setClasses(extractList(res).map(mapClass));
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message ?? "Failed to remove class.");
          }
        },
      },
    ]);
  }

  async function saveTeacher() {
    if (!formTeacherId.trim()) { Alert.alert("Required", "Enter the teacher ID."); return; }
    setSaving(true);
    try {
      await SubjectService.assignTeacher(id, { teacher_id: formTeacherId.trim() });
      setModalVisible(false);
      const res = await SubjectService.getTeachers(id);
      setTeachers(extractList(res).map(mapTeacher));
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to assign teacher.");
    } finally {
      setSaving(false);
    }
  }

  function removeTeacher(t: TeacherAssigned) {
    Alert.alert("Remove teacher", `Remove "${t.name}" from this subject?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await SubjectService.removeTeacher(id, t.id);
            const res = await SubjectService.getTeachers(id);
            setTeachers(extractList(res).map(mapTeacher));
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message ?? "Failed to remove teacher.");
          }
        },
      },
    ]);
  }

  const isClassTab = activeTab === "classes";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.initialBox}>
            <Text style={styles.initialText}>{subjectInfo.name.trim()[0]?.toUpperCase() ?? "S"}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headerTitle}>{subjectInfo.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg + "55" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusStyle.color }]} />
              <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={isClassTab ? openAssignClass : openAssignTeacher}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{classes.length}</Text>
            <Text style={styles.stripLabel}>Classes</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{teachers.length}</Text>
            <Text style={styles.stripLabel}>Teachers</Text>
          </View>
        </View>
      </View>

      {/* ── TABS ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "classes" && styles.tabActive]}
          onPress={() => { setActiveTab("classes"); setSearch(""); }}
          activeOpacity={0.8}
        >
          <Ionicons name="layers-outline" size={16} color={activeTab === "classes" ? "#7C3AED" : "#9CA3AF"} />
          <Text style={[styles.tabLabel, activeTab === "classes" && styles.tabLabelActive]}>
            Classes ({classes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "teachers" && styles.tabActive]}
          onPress={() => { setActiveTab("teachers"); setSearch(""); }}
          activeOpacity={0.8}
        >
          <Ionicons name="school-outline" size={16} color={activeTab === "teachers" ? "#7C3AED" : "#9CA3AF"} />
          <Text style={[styles.tabLabel, activeTab === "teachers" && styles.tabLabelActive]}>
            Teachers ({teachers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={isClassTab ? "Search classes..." : "Search teachers..."}
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

      {/* ── LIST ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} colors={["#7C3AED"]} />
        }
      >
        {/* CLASSES TAB */}
        {isClassTab && (
          <>
            {filteredClasses.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="layers-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No classes assigned</Text>
                <Text style={styles.emptySub}>Tap + to assign this subject to a class</Text>
              </View>
            )}
            {filteredClasses.map((cls, index) => {
              const av     = ITEM_PALETTE[index % ITEM_PALETTE.length];
              const stream = getStream(cls.name);
              return (
                <View key={cls.id} style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: av.bg }]}>
                    <Text style={[styles.itemStream, { color: av.color }]}>{stream}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{cls.name}</Text>
                    <Text style={styles.itemMeta}>ID: {cls.id}</Text>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeClass(cls)} activeOpacity={0.75}>
                    <Ionicons name="remove-circle-outline" size={22} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {/* TEACHERS TAB */}
        {!isClassTab && (
          <>
            {filteredTeachers.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="school-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No teachers assigned</Text>
                <Text style={styles.emptySub}>Tap + to assign a teacher to this subject</Text>
              </View>
            )}
            {filteredTeachers.map((t, index) => {
              const av = ITEM_PALETTE[index % ITEM_PALETTE.length];
              return (
                <View key={t.id} style={styles.itemRow}>
                  <View style={[styles.teacherAvatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.teacherInitials, { color: av.color }]}>{getInitials(t.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{t.name}</Text>
                    <Text style={styles.itemMeta}>ID: {t.id}</Text>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeTeacher(t)} activeOpacity={0.75}>
                    <Ionicons name="remove-circle-outline" size={22} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {isClassTab ? "Assign to class" : "Assign teacher"}
                </Text>
                <Text style={styles.sheetSub}>{subjectInfo.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {isClassTab ? (
              <>
                <Text style={styles.label}>Class ID <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter class ID (e.g. 1)"
                  placeholderTextColor="#9CA3AF"
                  value={formClassId}
                  onChangeText={setFormClassId}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={saveClass}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Assign class</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Teacher ID <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter teacher ID (e.g. 1)"
                  placeholderTextColor="#9CA3AF"
                  value={formTeacherId}
                  onChangeText={setFormTeacherId}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={saveTeacher}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="person-add-outline" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Assign teacher</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },

  loadingBox:   { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText:  { fontSize: 14, color: "#6B7280" },
  errorBox:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText:    { fontSize: 16, fontWeight: "700", color: "#374151" },
  errorBtn:     { backgroundColor: "#EDE9FE", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  errorBtnText: { fontSize: 14, fontWeight: "600", color: "#7C3AED" },

  header:    { backgroundColor: "#7C3AED", paddingHorizontal: 20, paddingBottom: 18 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 },
  backBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  initialBox:   { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  initialText:  { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerTitle:  { fontSize: 18, fontWeight: "800", color: "#fff" },
  addBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  statusBadge:  { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 3 },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  statusText:   { fontSize: 11, fontWeight: "700" },

  statsStrip:   { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingVertical: 12 },
  stripItem:    { flex: 1, alignItems: "center" },
  stripNum:     { fontSize: 18, fontWeight: "800", color: "#fff" },
  stripLabel:   { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 4 },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4,
  },
  tab:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive:      { backgroundColor: "#fff" },
  tabLabel:       { fontSize: 13, fontWeight: "600", color: "#9CA3AF" },
  tabLabelActive: { color: "#7C3AED" },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", margin: 16, marginTop: 10,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  itemRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#E5E7EB",
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 8, gap: 10,
  },
  itemIcon:    { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  itemStream:  { fontSize: 16, fontWeight: "800" },
  itemName:    { fontSize: 14, fontWeight: "700", color: "#111827" },
  itemMeta:    { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  removeBtn:   { padding: 4 },

  teacherAvatar:   { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  teacherInitials: { fontSize: 14, fontWeight: "800" },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon:  { width: 70, height: 70, borderRadius: 35, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub:   { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  overlay:    { flex: 1, justifyContent: "flex-end" },
  overlayBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:      { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 },
  sheetHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sheetSub:   { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  closeBtn:   { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },

  label:    { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  required: { color: "#DC2626" },

  input: {
    backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#111827", marginBottom: 18,
  },

  saveBtn:     { backgroundColor: "#7C3AED", borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
