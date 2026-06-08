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
import { router, useFocusEffect } from "expo-router";
import { ClassService } from "../../../services/api/classService";


type Class = {
  id: number | string;
  name: string;
  status?: string;
  students_count?: number;
  students?: number;
};

const STREAM_COLORS: Record<string, { bg: string; border: string; color: string; light: string }> = {
  A: { bg: "#EEF4FF", border: "#BFDBFE", color: "#2563EB", light: "#DBEAFE" },
  B: { bg: "#EDE9FE", border: "#DDD6FE", color: "#7C3AED", light: "#EDE9FE" },
  C: { bg: "#DCFCE7", border: "#BBF7D0", color: "#16A34A", light: "#DCFCE7" },
  D: { bg: "#FFF7ED", border: "#FED7AA", color: "#EA580C", light: "#FFEDD5" },
};

function getStream(name: string): string {
  const parts = name.trim().split(" ");
  return parts[parts.length - 1].toUpperCase();
}

function getStreamColor(name: string) {
  const stream = getStream(name);
  return STREAM_COLORS[stream] ?? { bg: "#F3F4F6", border: "#E5E7EB", color: "#6B7280", light: "#F9FAFB" };
}

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();

  const [classes, setClasses]           = useState<Class[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]           = useState<Class | null>(null);
  const [search, setSearch]             = useState("");
  const [formName, setFormName]         = useState("");

  async function loadClasses(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await ClassService.getAll();
      const data: Class[] = res.data?.data ?? res.data ?? [];
      setClasses(Array.isArray(data) ? data : []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [])
  );

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      String(c.id).includes(search)
  );

  function openAdd() {
    setEditing(null);
    setFormName("");
    setModalVisible(true);
  }

  function openEdit(cls: Class) {
    setEditing(cls);
    setFormName(cls.name);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      Alert.alert("Required", "Please enter a class name.");
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        await ClassService.update(editing.id, { name: formName.trim() });
        setClasses((prev) =>
          prev.map((c) => (c.id === editing.id ? { ...c, name: formName.trim() } : c))
        );
      } else {
        const res = await ClassService.create({ name: formName.trim() });
        const created: Class = res.data?.data ?? res.data ?? { id: Date.now(), name: formName.trim() };
        setClasses((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to save class.");
    } finally {
      setSaving(false);
    }
  }

  const totalStudents = classes.reduce(
    (s, c) => s + (c.students_count ?? c.students ?? 0),
    0
  );
  const totalStreams = [...new Set(classes.map((c) => getStream(c.name)))].length;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

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
            <Text style={styles.headerTitle}>Classes</Text>
            <Text style={styles.headerSub}>Manage your class groups</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{classes.length}</Text>
            <Text style={styles.stripLabel}>Classes</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{totalStudents || "—"}</Text>
            <Text style={styles.stripLabel}>Students</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{totalStreams}</Text>
            <Text style={styles.stripLabel}>Streams</Text>
          </View>
        </View>
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search classes..."
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadClasses(true); }}
            tintColor="#2563EB"
          />
        }
      >
        {loading ? (
          <ActivityIndicator color="#2563EB" size="large" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="school-outline" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No classes found</Text>
            <Text style={styles.emptySub}>
              {search ? "Try a different search" : "Tap + to add a new class"}
            </Text>
          </View>
        ) : (
          filtered.map((cls) => {
            const sc            = getStreamColor(cls.name);
            const stream        = getStream(cls.name);
            const studentCount  = cls.students_count ?? cls.students ?? 0;
            return (
              <TouchableOpacity
                key={cls.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/(teacher)/classes/${cls.id}` as any)}
              >
                {/* left color bar */}
                <View style={[styles.colorBar, { backgroundColor: sc.color }]} />

                <View style={styles.cardInner}>
                  {/* stream circle */}
                  <View style={[styles.streamCircle, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <Text style={[styles.streamLetter, { color: sc.color }]}>{stream}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardName}>{cls.name}</Text>
                      <View style={[styles.idPill, { backgroundColor: sc.light, borderColor: sc.border }]}>
                        <Text style={[styles.idText, { color: sc.color }]}>#{cls.id}</Text>
                      </View>
                    </View>

                    <View style={styles.cardBottom}>
                      <View style={styles.studentPill}>
                        <Ionicons name="people-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.studentText}> {studentCount} students</Text>
                      </View>

                      {/* Edit only — no delete for teacher */}
                      <TouchableOpacity
                        style={styles.actionEdit}
                        onPress={(e) => { e.stopPropagation(); openEdit(cls); }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="create-outline" size={15} color="#2563EB" />
                        <Text style={styles.actionEditText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── MODAL ── */}
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
                  {editing ? "Edit class" : "Add new class"}
                </Text>
                <Text style={styles.sheetSub}>
                  {editing ? `Editing #${editing.id}` : "Fill in the details below"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Class name */}
            <Text style={styles.label}>
              Class name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Form One A, Form Two C..."
              placeholderTextColor="#9CA3AF"
              value={formName}
              onChangeText={setFormName}
              autoCapitalize="words"
            />
            <Text style={styles.hint}>
              Include the stream letter at the end — e.g. "Form One A"
            </Text>

            {/* Live preview */}
            {formName.trim().length > 0 && (
              <View
                style={[
                  styles.preview,
                  {
                    borderColor:     getStreamColor(formName).border,
                    backgroundColor: getStreamColor(formName).bg,
                  },
                ]}
              >
                <Text style={[styles.previewLabel, { color: getStreamColor(formName).color }]}>
                  Preview
                </Text>
                <View style={styles.previewRow}>
                  <View
                    style={[
                      styles.previewBadge,
                      {
                        backgroundColor: getStreamColor(formName).light,
                        borderColor:     getStreamColor(formName).border,
                      },
                    ]}
                  >
                    <Text style={[styles.previewStream, { color: getStreamColor(formName).color }]}>
                      {getStream(formName)}
                    </Text>
                  </View>
                  <Text style={[styles.previewName, { color: getStreamColor(formName).color }]}>
                    {formName.trim()}
                  </Text>
                </View>
              </View>
            )}

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
                  name={editing ? "checkmark-circle-outline" : "add-circle-outline"}
                  size={18}
                  color="#fff"
                />
              )}
              <Text style={styles.saveBtnText}>
                {editing ? "Save changes" : "Add class"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

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
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
  },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 14,
  },
  stripItem:    { flex: 1, alignItems: "center" },
  stripNum:     { fontSize: 20, fontWeight: "800", color: "#fff" },
  stripLabel:   { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
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

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  colorBar:  { width: 4 },
  cardInner: {
    flex: 1, flexDirection: "row",
    alignItems: "center", padding: 14, gap: 12,
  },

  streamCircle: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2,
    justifyContent: "center", alignItems: "center",
    flexShrink: 0,
  },
  streamLetter: { fontSize: 18, fontWeight: "800" },

  cardTopRow: {
    flexDirection: "row", alignItems: "center",
    gap: 8, marginBottom: 8, flexWrap: "wrap",
  },
  cardName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  idPill: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  idText: { fontSize: 10, fontWeight: "600" },

  cardBottom:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  studentPill: { flexDirection: "row", alignItems: "center" },
  studentText: { fontSize: 12, color: "#9CA3AF" },

  actionEdit: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#EEF4FF", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  actionEditText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center", marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub:   { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  overlay:   { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center", marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 22,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sheetSub:   { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
  },

  label:    { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  required: { color: "#DC2626" },
  hint:     { fontSize: 11, color: "#9CA3AF", marginTop: -12, marginBottom: 4 },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#111827",
    marginBottom: 6,
  },

  preview: {
    borderWidth: 1, borderRadius: 12,
    padding: 14, marginBottom: 18, marginTop: 6,
  },
  previewLabel:  { fontSize: 10, fontWeight: "600", marginBottom: 8, opacity: 0.7 },
  previewRow:    { flexDirection: "row", alignItems: "center", gap: 10 },
  previewBadge: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: "center", alignItems: "center",
  },
  previewStream: { fontSize: 14, fontWeight: "800" },
  previewName:   { fontSize: 16, fontWeight: "800" },

  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12, paddingVertical: 14,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    marginTop: 4,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
