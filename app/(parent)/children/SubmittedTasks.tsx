import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants";
import { StudentTaskService } from "@/services/api/studentTaskService";
import api from "@/services/api/axios";

type SubmittedTask = {
  id: number;
  homeworkId: number;
  task: string;
  submitDate: string;
};

type ImageAsset = { uri: string; name: string; type: string };

function resolveImageUrl(path?: string): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = api.defaults.baseURL ?? "";
  try {
    const origin = new URL(base).origin;
    return `${origin}/uploads/tasks/${path}`;
  } catch {
    return path;
  }
}

function formatDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export default function SubmittedTasks() {
  const { homeworkId, title } = useLocalSearchParams<{
    homeworkId: string;
    title:      string;
  }>();

  const [tasks, setTasks]           = useState<SubmittedTask[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* edit modal state */
  const [editVisible, setEditVisible]   = useState(false);
  const [editTarget, setEditTarget]     = useState<SubmittedTask | null>(null);
  const [newImage, setNewImage]         = useState<ImageAsset | null>(null);
  const [updating, setUpdating]         = useState(false);

  useFocusEffect(
    useCallback(() => { loadTasks(); }, [homeworkId])
  );

  async function loadTasks(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await StudentTaskService.getByHomework(Number(homeworkId));
      const raw: any[] = res.data?.data ?? res.data ?? [];
      const mapped: SubmittedTask[] = raw.map((t: any) => ({
        id:         Number(t.id),
        homeworkId: Number(t.homeworkId),
        task:       t.task ?? "",
        submitDate: t.submitDate ?? "",
      }));
      setTasks(mapped);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadTasks(true);
  }

  function openEdit(task: SubmittedTask) {
    setEditTarget(task);
    setNewImage(null);
    setEditVisible(true);
  }

  function confirmDelete(task: SubmittedTask) {
    Alert.alert(
      "Delete Submission",
      "Are you sure you want to delete this submitted task? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTask(task.id) },
      ]
    );
  }

  async function deleteTask(id: number) {
    try {
      await StudentTaskService.remove(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {
      Alert.alert("Error", "Failed to delete the submission.");
    }
  }

  async function pickNewImage() {
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
      setNewImage({
        uri:  asset.uri,
        name: asset.fileName ?? `task_${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      });
    }
  }

  async function handleUpdate() {
    if (!editTarget || !newImage) return;
    const today = new Date().toISOString().split("T")[0];
    const fd = new FormData();
    fd.append("homeworkId", String(editTarget.homeworkId));
    fd.append("submitDate", today);
    fd.append("task", { uri: newImage.uri, name: newImage.name, type: newImage.type } as any);
    try {
      setUpdating(true);
      await StudentTaskService.update(editTarget.id, fd);
      setEditVisible(false);
      setEditTarget(null);
      setNewImage(null);
      await loadTasks(true);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to update submission.");
    } finally {
      setUpdating(false);
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
          <Text style={styles.headerTitle}>My Submissions</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{title ?? "Homework"}</Text>
        </View>
        <View style={[styles.countBadge, { opacity: loading ? 0 : 1 }]}>
          <Text style={styles.countText}>{tasks.length}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="images-outline" size={36} color={Colors.border} />
          </View>
          <Text style={styles.emptyTitle}>No submissions yet</Text>
          <Text style={styles.emptySub}>You haven't submitted any task for this homework</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back-outline" size={15} color={Colors.primary} />
            <Text style={styles.emptyBtnText}>Back to Homework</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          <Text style={styles.listLabel}>
            {tasks.length} submission{tasks.length !== 1 ? "s" : ""} · pull to refresh
          </Text>

          {tasks.map((task, index) => {
            const imageUrl = resolveImageUrl(task.task);
            return (
              <View key={task.id} style={styles.card}>
                {/* index badge */}
                <View style={styles.cardIndexBadge}>
                  <Text style={styles.cardIndexText}>#{index + 1}</Text>
                </View>

                {/* image */}
                <View style={styles.imageWrap}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.taskImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={36} color={Colors.border} />
                      <Text style={styles.imagePlaceholderText}>Image unavailable</Text>
                    </View>
                  )}
                </View>

                {/* meta */}
                <View style={styles.cardMeta}>
                  <View style={styles.cardMetaLeft}>
                    <View style={styles.dateRow}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.dateLabel}>Submitted</Text>
                    </View>
                    <Text style={styles.dateVal}>{formatDate(task.submitDate)}</Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      activeOpacity={0.8}
                      onPress={() => openEdit(task)}
                    >
                      <Ionicons name="pencil-outline" size={14} color="#2563EB" />
                      <Text style={styles.editBtnText}>Update</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      activeOpacity={0.8}
                      onPress={() => confirmDelete(task)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* ── EDIT MODAL ── */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setEditVisible(false)} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Update Submission</Text>
                <Text style={styles.sheetSub}>Replace your submitted image</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* current image */}
            {editTarget && !newImage && (
              <View style={styles.currentWrap}>
                <Text style={styles.currentLabel}>Current submission</Text>
                {resolveImageUrl(editTarget.task) ? (
                  <Image
                    source={{ uri: resolveImageUrl(editTarget.task)! }}
                    style={styles.currentImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.currentImage, styles.imagePlaceholder]}>
                    <Ionicons name="image-outline" size={24} color={Colors.border} />
                  </View>
                )}
              </View>
            )}

            {/* new image picker / preview */}
            {newImage ? (
              <View style={styles.imagePreviewWrap}>
                <Text style={styles.currentLabel}>New image</Text>
                <Image source={{ uri: newImage.uri }} style={styles.currentImage} resizeMode="cover" />
                <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setNewImage(null)}>
                  <Ionicons name="close-circle" size={26} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePicker} onPress={pickNewImage} activeOpacity={0.8}>
                <View style={styles.imagePickerIcon}>
                  <Ionicons name="camera-outline" size={28} color="#2563EB" />
                </View>
                <Text style={styles.imagePickerTitle}>Tap to choose new photo</Text>
                <Text style={styles.imagePickerSub}>This will replace your current submission</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, (!newImage || updating) && { opacity: 0.5 }]}
              activeOpacity={0.85}
              onPress={handleUpdate}
              disabled={!newImage || updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              )}
              <Text style={styles.confirmBtnText}>{updating ? "Updating…" : "Save Update"}</Text>
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
  countBadge: {
    minWidth: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary + "18",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 8,
  },
  countText: { fontSize: 13, fontWeight: "800", color: Colors.primary },

  scroll:    { paddingHorizontal: 16, paddingTop: 16 },
  listLabel: {
    fontSize: 11, fontWeight: "700", color: Colors.textSecondary,
    marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5,
  },

  /* card */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 14, overflow: "hidden",
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  cardIndexBadge: {
    position: "absolute", top: 10, left: 10, zIndex: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  cardIndexText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  imageWrap: { width: "100%", height: 220 },
  taskImage: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F9FAFB", gap: 8,
  },
  imagePlaceholderText: { fontSize: 12, color: Colors.textSecondary },

  cardMeta: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  cardMetaLeft: { gap: 2 },
  dateRow:      { flexDirection: "row", alignItems: "center", gap: 4 },
  dateLabel:    { fontSize: 10, fontWeight: "600", color: Colors.textSecondary },
  dateVal:      { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },

  cardActions: { flexDirection: "row", gap: 8 },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  editBtnText:   { fontSize: 12, fontWeight: "700", color: "#2563EB" },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  deleteBtnText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },

  /* empty */
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.border + "33",
    justifyContent: "center", alignItems: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: Colors.textPrimary },
  emptySub:   { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 19 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "700", color: Colors.primary },

  /* modal */
  overlay:   { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 24,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center", marginTop: 12, marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sheetSub:   { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center",
  },

  currentWrap:  { marginBottom: 12 },
  currentLabel: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  currentImage: { width: "100%", height: 160, borderRadius: 12, backgroundColor: "#F3F4F6" },

  imagePreviewWrap: { position: "relative", marginBottom: 16 },
  imageRemoveBtn: { position: "absolute", top: 34, right: 6, backgroundColor: "#fff", borderRadius: 13 },

  imagePicker: {
    alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: "#BFDBFE", borderStyle: "dashed",
    borderRadius: 14, backgroundColor: "#F0F4FF",
    paddingVertical: 24, marginBottom: 20,
  },
  imagePickerIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center",
  },
  imagePickerTitle: { fontSize: 14, fontWeight: "700", color: "#1E40AF" },
  imagePickerSub:   { fontSize: 12, color: "#6B7280" },

  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12, paddingVertical: 15,
  },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
