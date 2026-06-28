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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ParentService,
  ParentPayload,
} from "../../../services/api/parentService";

type Parent = {
  id: number;
  name: string;
  phone: string;
  email: string;
};

const AVATAR_PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

const PRIMARY = "#7C3AED";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Reduce any stored phone (255712…, 0712…, +255 712…) to its 9 national digits.
function toNationalDigits(phone: string): string {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("255")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.replace(/^0+/, "");
  return d.slice(0, 9);
}

export default function AdminParentsScreen() {
  const insets = useSafeAreaInsets();

  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState(""); // 9 national digits only
  const [formEmail, setFormEmail] = useState("");

  const loadParents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ParentService.getAll();
      const data: Parent[] = res.data?.data ?? res.data ?? [];
      setParents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to load parents.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParents();
  }, [loadParents]);

  // Phone field: digits only, block leading 0, cap at 9.
  const onChangePhone = (t: string) => {
    let d = t.replace(/\D/g, "");
    d = d.replace(/^0+/, ""); // typing 0 then 6 -> 6 becomes first digit
    if (d.length > 9) d = d.slice(0, 9);
    setFormPhone(d);
  };

  const filtered = parents.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone ?? "").includes(search),
  );

  function openAdd() {
    setEditing(null);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setModalVisible(true);
  }

  function openEdit(p: Parent) {
    setEditing(p);
    setFormName(p.name);
    setFormPhone(toNationalDigits(p.phone ?? "")); // strip country code for the field
    setFormEmail(p.email ?? "");
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      Alert.alert("Required", "Please enter the parent name.");
      return;
    }
    if (formPhone.length !== 9) {
      Alert.alert(
        "Invalid phone",
        "Enter a valid 9-digit phone number after +255.",
      );
      return;
    }
    if (!formEmail.trim()) {
      Alert.alert("Required", "Please enter the email address.");
      return;
    }
    const payload: ParentPayload = {
      name: formName.trim(),
      phone: `255${formPhone}`, // store full international form
      email: formEmail.trim(),
    };
    try {
      setSaving(true);
      if (editing) {
        await ParentService.update(editing.id, payload);
      } else {
        await ParentService.create(payload);
      }
      setModalVisible(false);
      await loadParents();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to save parent.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(p: Parent) {
    Alert.alert("Delete parent", `Remove "${p.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await ParentService.remove(p.id);
            await loadParents();
          } catch (e: any) {
            Alert.alert(
              "Error",
              e?.response?.data?.message ?? "Failed to delete parent.",
            );
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

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
            <Text style={styles.headerTitle}>Parents</Text>
            <Text style={styles.headerSub}>Manage all registered parents</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={openAdd}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{parents.length}</Text>
            <Text style={styles.stripLabel}>Total Parents</Text>
          </View>
        </View>
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={17}
          color="#9CA3AF"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email or phone..."
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
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading parents...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="people-circle-outline"
                  size={32}
                  color="#9CA3AF"
                />
              </View>
              <Text style={styles.emptyTitle}>No parents found</Text>
              <Text style={styles.emptySub}>
                Try a different search or register a new parent
              </Text>
            </View>
          )}

          {filtered.map((p, index) => {
            const av = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
            const ini = getInitials(p.name);
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/(admin)/parents/${p.id}` as any)}
              >
                <View style={[styles.colorBar, { backgroundColor: PRIMARY }]} />
                <View style={styles.cardInner}>
                  <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.avatarText, { color: av.color }]}>
                      {ini}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{p.name}</Text>

                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.infoText}> {p.email}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.infoText}> {p.phone}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="finger-print-outline"
                        size={12}
                        color="#9CA3AF"
                      />
                      <Text style={styles.infoText}> ID #{p.id}</Text>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionEdit}
                        onPress={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name="create-outline"
                          size={15}
                          color={PRIMARY}
                        />
                        <Text style={styles.actionEditText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionDelete}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(p);
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={15}
                          color="#DC2626"
                        />
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
                  {editing ? "Edit parent" : "Register new parent"}
                </Text>
                <Text style={styles.sheetSub}>
                  {editing
                    ? `Editing ID #${editing.id}`
                    : "Fill in the details below"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>
                Full name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mrs. Farouq Amani"
                placeholderTextColor="#9CA3AF"
                value={formName}
                onChangeText={setFormName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>
                Phone number <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.phoneWrap}>
                <View style={styles.prefixBox}>
                  <Ionicons
                    name="call-outline"
                    size={15}
                    color={PRIMARY}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={styles.prefixText}>+255</Text>
                </View>
                <View style={styles.prefixDivider} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="712 345 678"
                  placeholderTextColor="#9CA3AF"
                  value={formPhone}
                  onChangeText={onChangePhone}
                  keyboardType="number-pad"
                  maxLength={9}
                />
              </View>

              <Text style={styles.label}>
                Email address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. parent@mail.com"
                placeholderTextColor="#9CA3AF"
                value={formEmail}
                onChangeText={setFormEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

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
                        : "person-add-outline"
                    }
                    size={18}
                    color="#fff"
                  />
                )}
                <Text style={styles.saveBtnText}>
                  {editing ? "Save changes" : "Register parent"}
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
  container: { flex: 1, backgroundColor: "#F5F7FB" },

  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },
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
    borderRadius: 12,
    paddingVertical: 14,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripNum: { fontSize: 22, fontWeight: "800", color: "#fff" },
  stripLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#6B7280" },

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
  colorBar: { width: 4 },
  cardInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontWeight: "800" },

  cardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 5,
  },

  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  infoText: { fontSize: 12, color: "#6B7280" },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  actionEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDE9FE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionEditText: { fontSize: 12, fontWeight: "600", color: PRIMARY },
  actionDelete: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },

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
    maxHeight: "90%",
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

  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  required: { color: "#DC2626" },

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

  // Phone input with fixed +255 prefix
  phoneWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
    height: 48,
  },
  prefixBox: { flexDirection: "row", alignItems: "center" },
  prefixText: { fontSize: 14, fontWeight: "800", color: "#111827" },
  prefixDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    letterSpacing: 1,
    paddingVertical: 0,
  },

  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
