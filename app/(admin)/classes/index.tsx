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

import { ClassService } from "@/services/api/classService";

type Class = {
  id: string;
  name: string;
  status: string;
};

const STREAM_COLORS: Record<string, { bg: string; border: string; color: string; light: string }> = {
  A: { bg: "#EEF4FF", border: "#BFDBFE", color: "#2563EB", light: "#DBEAFE" },
  B: { bg: "#EDE9FE", border: "#DDD6FE", color: "#7C3AED", light: "#EDE9FE" },
  C: { bg: "#DCFCE7", border: "#BBF7D0", color: "#16A34A", light: "#DCFCE7" },
  D: { bg: "#FFF7ED", border: "#FED7AA", color: "#EA580C", light: "#FFEDD5" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: "#DCFCE7", color: "#16A34A", label: "Active"   },
  inactive: { bg: "#FEE2E2", color: "#DC2626", label: "Inactive" },
};

function getStream(name: string) {
  return name.trim().split(" ").pop()?.toUpperCase() ?? "A";
}

function getStreamColor(name: string) {
  return STREAM_COLORS[getStream(name)] ?? { bg: "#F3F4F6", border: "#E5E7EB", color: "#6B7280", light: "#F9FAFB" };
}

function getStatusStyle(status: string) {
  return STATUS_STYLES[status?.toLowerCase()] ?? { bg: "#F3F4F6", color: "#6B7280", label: status || "Unknown" };
}

function extractList(res: any): any[] {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

function mapClass(item: any): Class {
  return {
    id:     String(item.id),
    name:   item.name ?? "",
    status: item.status ?? "active",
  };
}

const STATUS_OPTIONS = ["active", "inactive"];

export default function AdminClassesScreen() {
  const insets = useSafeAreaInsets();

  const [classes, setClasses]           = useState<Class[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]           = useState<Class | null>(null);
  const [formName, setFormName]         = useState("");
  const [formStatus, setFormStatus]     = useState("active");

  const fetchClasses = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await ClassService.getAll();
      setClasses(extractList(res).map(mapClass));
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to load classes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.status.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = classes.filter((c) => c.status?.toLowerCase() === "active").length;
  const inactiveCount = classes.filter((c) => c.status?.toLowerCase() === "inactive").length;
  const streams       = [...new Set(classes.map((c) => getStream(c.name)))].length;

  function openAdd() {
    setEditing(null);
    setFormName("");
    setFormStatus("active");
    setModalVisible(true);
  }

  function openEdit(cls: Class) {
    setEditing(cls);
    setFormName(cls.name);
    setFormStatus(cls.status ?? "active");
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      Alert.alert("Required", "Please enter a class name.");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: formName.trim(), status: formStatus };
      if (editing) {
        await ClassService.update(editing.id, payload);
      } else {
        await ClassService.create(payload);
      }
      setModalVisible(false);
      fetchClasses();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to save class.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(cls: Class) {
    Alert.alert(
      "Delete class",
      `Remove "${cls.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await ClassService.remove(cls.id);
              fetchClasses();
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message ?? "Failed to delete class.");
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Classes</Text>
            <Text style={styles.headerSub}>Manage all school classes</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{classes.length}</Text>
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
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{streams}</Text>
            <Text style={styles.stripLabel}>Streams</Text>
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
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading classes...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchClasses(true)} colors={["#2563EB"]} />
          }
        >
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="school-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No classes found</Text>
              <Text style={styles.emptySub}>Try a different search or add a new class</Text>
            </View>
          )}

          {filtered.map((cls) => {
            const sc     = getStreamColor(cls.name);
            const stream = getStream(cls.name);
            const ss     = getStatusStyle(cls.status);

            return (
              <View key={cls.id} style={styles.card}>
                <View style={[styles.colorBar, { backgroundColor: sc.color }]} />

                <View style={styles.cardInner}>
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
                      <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: ss.color }]} />
                        <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.actionEdit}
                          onPress={() => openEdit(cls)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="create-outline" size={15} color="#2563EB" />
                          <Text style={styles.actionEditText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionDelete}
                          onPress={() => handleDelete(cls)}
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
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setModalVisible(false)} />

          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{editing ? "Edit class" : "Add new class"}</Text>
                <Text style={styles.sheetSub}>{editing ? `Editing #${editing.id}` : "Fill in the details below"}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Class name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Form One A, Form Two B..."
              placeholderTextColor="#9CA3AF"
              value={formName}
              onChangeText={setFormName}
              autoCapitalize="words"
            />
            <Text style={styles.hint}>Include the stream letter at the end — e.g. "Form One A"</Text>

            <Text style={[styles.label, { marginTop: 16 }]}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((opt) => {
                const s = getStatusStyle(opt);
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

            {formName.trim().length > 0 && (
              <View style={[styles.preview, { backgroundColor: getStreamColor(formName).bg, borderColor: getStreamColor(formName).border }]}>
                <Text style={[styles.previewLabel, { color: getStreamColor(formName).color }]}>Preview</Text>
                <View style={styles.previewRow}>
                  <View style={[styles.previewBadge, { backgroundColor: getStreamColor(formName).light, borderColor: getStreamColor(formName).border }]}>
                    <Text style={[styles.previewStream, { color: getStreamColor(formName).color }]}>{getStream(formName)}</Text>
                  </View>
                  <Text style={[styles.previewName, { color: getStreamColor(formName).color }]}>{formName.trim()}</Text>
                </View>
              </View>
            )}

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
                  <Text style={styles.saveBtnText}>{editing ? "Save changes" : "Add class"}</Text>
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

  header: { backgroundColor: "#2563EB", paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
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
    borderRadius: 12, paddingVertical: 14,
  },
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

  streamCircle: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  streamLetter: { fontSize: 18, fontWeight: "800" },

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
    backgroundColor: "#EEF4FF", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  actionEditText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
  actionDelete: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center",
  },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon:  { width: 70, height: 70, borderRadius: 35, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub:   { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  overlay:   { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  sheetTitle:  { fontSize: 18, fontWeight: "800", color: "#111827" },
  sheetSub:    { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  closeBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },

  label:    { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  required: { color: "#DC2626" },
  hint:     { fontSize: 11, color: "#9CA3AF", marginTop: -12, marginBottom: 4 },

  input: {
    backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#111827", marginBottom: 6,
  },

  statusRow:        { flexDirection: "row", gap: 10, marginBottom: 16 },
  statusOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  statusOptionText: { fontSize: 13, fontWeight: "600" },

  preview: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 18, marginTop: 10 },
  previewLabel:  { fontSize: 10, fontWeight: "600", marginBottom: 8, opacity: 0.7 },
  previewRow:    { flexDirection: "row", alignItems: "center", gap: 10 },
  previewBadge:  { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  previewStream: { fontSize: 14, fontWeight: "800" },
  previewName:   { fontSize: 16, fontWeight: "800" },

  saveBtn:     { backgroundColor: "#2563EB", borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
