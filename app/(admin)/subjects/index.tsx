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
import { router } from "expo-router";

import { SubjectService } from "@/services/api/subjectService";

type Subject = {
  id: string;
  name: string;
  status: string;
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: "#DCFCE7", color: "#16A34A", label: "Active"   },
  inactive: { bg: "#FEE2E2", color: "#DC2626", label: "Inactive" },
};

const BADGE_PALETTE = [
  { bg: "#EEF4FF", border: "#BFDBFE", color: "#2563EB" },
  { bg: "#EDE9FE", border: "#DDD6FE", color: "#7C3AED" },
  { bg: "#DCFCE7", border: "#BBF7D0", color: "#16A34A" },
  { bg: "#FFF7ED", border: "#FED7AA", color: "#EA580C" },
  { bg: "#FEF3C7", border: "#FDE68A", color: "#D97706" },
];

function getStatusStyle(status: string) {
  return STATUS_STYLES[status?.toLowerCase()] ?? { bg: "#F3F4F6", color: "#6B7280", label: status || "Unknown" };
}

function getBadge(name: string, index: number) {
  return {
    ...BADGE_PALETTE[index % BADGE_PALETTE.length],
    initial: name.trim()[0]?.toUpperCase() ?? "S",
  };
}

function extractList(res: any): any[] {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

function mapSubject(item: any): Subject {
  return {
    id:     String(item.id),
    name:   item.name ?? "",
    status: item.status ?? "active",
  };
}

const STATUS_OPTIONS = ["active", "inactive"];

export default function AdminSubjectsScreen() {
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]           = useState<Subject | null>(null);
  const [formName, setFormName]         = useState("");
  const [formStatus, setFormStatus]     = useState("active");

  const fetchSubjects = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await SubjectService.getAll();
      setSubjects(extractList(res).map(mapSubject));
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to load subjects.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.status.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = subjects.filter((s) => s.status?.toLowerCase() === "active").length;
  const inactiveCount = subjects.filter((s) => s.status?.toLowerCase() === "inactive").length;

  function openAdd() {
    setEditing(null);
    setFormName("");
    setFormStatus("active");
    setModalVisible(true);
  }

  function openEdit(sub: Subject) {
    setEditing(sub);
    setFormName(sub.name);
    setFormStatus(sub.status ?? "active");
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      Alert.alert("Required", "Please enter a subject name.");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: formName.trim(), status: formStatus };
      if (editing) {
        await SubjectService.update(editing.id, payload);
      } else {
        await SubjectService.create(payload);
      }
      setModalVisible(false);
      fetchSubjects();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to save subject.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(sub: Subject) {
    Alert.alert(
      "Delete subject",
      `Remove "${sub.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await SubjectService.remove(sub.id);
              fetchSubjects();
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message ?? "Failed to delete subject.");
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Subjects</Text>
            <Text style={styles.headerSub}>Manage all school subjects</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={22} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{subjects.length}</Text>
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

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID or status..."
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
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading subjects...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchSubjects(true)} colors={["#7C3AED"]} />
          }
        >
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="library-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No subjects found</Text>
              <Text style={styles.emptySub}>Try a different search or add a new subject</Text>
            </View>
          )}

          {filtered.map((sub, index) => {
            const badge = getBadge(sub.name, index);
            const ss    = getStatusStyle(sub.status);

            return (
              <View key={sub.id} style={styles.card}>
                <View style={[styles.colorBar, { backgroundColor: badge.color }]} />

                <View style={styles.cardInner}>
                  <View style={[styles.initialBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={[styles.initialText, { color: badge.color }]}>{badge.initial}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardName}>{sub.name}</Text>
                      <View style={[styles.idPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Text style={[styles.idText, { color: badge.color }]}>#{sub.id}</Text>
                      </View>
                    </View>

                    <View style={styles.cardBottom}>
                      <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: ss.color }]} />
                        <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.actionEdit}
                          onPress={() => openEdit(sub)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="create-outline" size={15} color="#7C3AED" />
                          <Text style={styles.actionEditText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionDelete}
                          onPress={() => handleDelete(sub)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="trash-outline" size={15} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{editing ? "Edit subject" : "Add new subject"}</Text>
                <Text style={styles.sheetSub}>{editing ? `Editing #${editing.id}` : "Fill in the details below"}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Subject name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mathematics, Physics..."
              placeholderTextColor="#9CA3AF"
              value={formName}
              onChangeText={setFormName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((opt) => {
                const s      = getStatusStyle(opt);
                const active = formStatus === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.statusOption, active && { backgroundColor: s.bg, borderColor: s.color }]}
                    onPress={() => setFormStatus(opt)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.statusDot, { backgroundColor: active ? s.color : "#D1D5DB" }]} />
                    <Text style={[styles.statusOptionText, { color: active ? s.color : "#6B7280" }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={editing ? "checkmark-circle-outline" : "add-circle-outline"} size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>{editing ? "Save changes" : "Add subject"}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },

  header:    { backgroundColor: "#7C3AED", paddingHorizontal: 20, paddingBottom: 20 },
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
    backgroundColor: "#fff", margin: 16,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  loadingBox:  { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#6B7280" },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  card: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#E5E7EB",
    marginBottom: 12, flexDirection: "row", overflow: "hidden",
  },
  colorBar:  { width: 4 },
  cardInner: { flex: 1, flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },

  initialBadge: {
    width: 48, height: 48, borderRadius: 14,
    borderWidth: 2, justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  initialText: { fontSize: 20, fontWeight: "800" },

  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  cardName:   { fontSize: 14, fontWeight: "700", color: "#111827" },
  idPill:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  idText:     { fontSize: 10, fontWeight: "600" },

  cardBottom:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 11, fontWeight: "700" },

  cardActions:    { flexDirection: "row", alignItems: "center", gap: 6 },
  actionEdit: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#EDE9FE", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  actionEditText: { fontSize: 12, fontWeight: "600", color: "#7C3AED" },
  actionDelete:   { width: 30, height: 30, borderRadius: 8, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center" },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon:  { width: 70, height: 70, borderRadius: 35, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub:   { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  overlay:   { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 },
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

  statusRow:        { flexDirection: "row", gap: 10, marginBottom: 20 },
  statusOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  statusOptionText: { fontSize: 13, fontWeight: "600" },

  saveBtn:     { backgroundColor: "#7C3AED", borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
