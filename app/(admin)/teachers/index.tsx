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
  TeacherService,
  TeacherPayload,
} from "../../../services/api/teacherService";

type Teacher = {
  id: number;
  name: string;
  phone: string;
  gender: string;
  email: string;
};

const AVATAR_PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

function getInitials(name: string) {
  return name
    .replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function genderStyle(gender: string) {
  const g = gender?.toLowerCase() ?? "";
  if (g === "male" || g === "m")
    return {
      bg: "#EFF6FF",
      border: "#BFDBFE",
      color: "#2563EB",
      label: "Male",
    };
  if (g === "female" || g === "f")
    return {
      bg: "#FDF2F8",
      border: "#FBCFE8",
      color: "#DB2777",
      label: "Female",
    };
  return { bg: "#F3F4F6", border: "#E5E7EB", color: "#6B7280", label: gender };
}

// Reduce any stored phone (255712…, 0712…, +255 712…) to its 9 national digits.
function toNationalDigits(phone: string): string {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("255")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.replace(/^0+/, "");
  return d.slice(0, 9);
}

export default function AdminTeachersScreen() {
  const insets = useSafeAreaInsets();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState(""); // 9 national digits only
  const [formGender, setFormGender] = useState("Male");

  const loadTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await TeacherService.getAll();
      const data: Teacher[] = res.data?.data ?? res.data ?? [];
      setTeachers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to load teachers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  // Phone field: digits only, block leading 0, cap at 9.
  const onChangePhone = (t: string) => {
    let d = t.replace(/\D/g, "");
    d = d.replace(/^0+/, ""); // typing 0 then 6 -> 6 becomes first digit
    if (d.length > 9) d = d.slice(0, 9);
    setFormPhone(d);
  };

  const filtered = teachers.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.phone ?? "").includes(search);
    const g = (t.gender ?? "").toLowerCase();
    const matchGender =
      filterGender === "All" ||
      (filterGender === "Male" && (g === "male" || g === "m")) ||
      (filterGender === "Female" && (g === "female" || g === "f"));
    return matchSearch && matchGender;
  });

  const maleCount = teachers.filter((t) => {
    const g = (t.gender ?? "").toLowerCase();
    return g === "male" || g === "m";
  }).length;
  const femaleCount = teachers.filter((t) => {
    const g = (t.gender ?? "").toLowerCase();
    return g === "female" || g === "f";
  }).length;

  function openAdd() {
    setEditing(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormGender("Male");
    setModalVisible(true);
  }

  function openEdit(t: Teacher) {
    setEditing(t);
    setFormName(t.name);
    setFormEmail(t.email);
    setFormPhone(toNationalDigits(t.phone ?? "")); // strip country code for the field
    const g = (t.gender ?? "").toLowerCase();
    setFormGender(g === "female" || g === "f" ? "Female" : "Male");
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      Alert.alert("Required", "Please enter the teacher name.");
      return;
    }
    if (!formEmail.trim()) {
      Alert.alert("Required", "Please enter the teacher email.");
      return;
    }
    if (formPhone.length !== 9) {
      Alert.alert(
        "Invalid phone",
        "Enter a valid 9-digit phone number after +255.",
      );
      return;
    }
    const payload: TeacherPayload = {
      name: formName.trim(),
      email: formEmail.trim(),
      phone: `255${formPhone}`, // store full international form
      gender: formGender,
    };
    try {
      setSaving(true);
      if (editing) {
        await TeacherService.update(editing.id, payload);
      } else {
        await TeacherService.create(payload);
      }
      setModalVisible(false);
      await loadTeachers();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to save teacher.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(t: Teacher) {
    Alert.alert(
      "Delete teacher",
      `Remove "${t.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await TeacherService.remove(t.id);
              await loadTeachers();
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.response?.data?.message ?? "Failed to delete teacher.",
              );
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#16A34A" />

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
            <Text style={styles.headerTitle}>Teachers</Text>
            <Text style={styles.headerSub}>Manage all school teachers</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={openAdd}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#16A34A" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{teachers.length}</Text>
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

      {/* ── GENDER FILTER ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {["All", "Male", "Female"].map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.filterChip,
              filterGender === g && styles.filterChipActive,
            ]}
            onPress={() => setFilterGender(g)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                filterGender === g && styles.filterChipTextActive,
              ]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── LIST ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Loading teachers...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="school-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No teachers found</Text>
              <Text style={styles.emptySub}>
                Try a different search or add a new teacher
              </Text>
            </View>
          )}

          {filtered.map((t, index) => {
            const gc = genderStyle(t.gender);
            const av = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
            const ini = getInitials(t.name);
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/(admin)/teachers/${t.id}` as any)}
              >
                <View
                  style={[styles.colorBar, { backgroundColor: gc.color }]}
                />
                <View style={styles.cardInner}>
                  <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.avatarText, { color: av.color }]}>
                      {ini}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardName}>{t.name}</Text>
                      <View
                        style={[
                          styles.genderPill,
                          { backgroundColor: gc.bg, borderColor: gc.border },
                        ]}
                      >
                        <Text style={[styles.genderText, { color: gc.color }]}>
                          {gc.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.emailRow}>
                      <Ionicons name="mail-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.emailText}> {t.email}</Text>
                    </View>
                    <View style={styles.phoneRow}>
                      <Ionicons name="call-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.phoneText}> {t.phone || "—"}</Text>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionEdit}
                        onPress={(e) => {
                          e.stopPropagation();
                          openEdit(t);
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name="create-outline"
                          size={15}
                          color="#16A34A"
                        />
                        <Text style={styles.actionEditText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionDelete}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(t);
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
                  {editing ? "Edit teacher" : "Add new teacher"}
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
                placeholder="e.g. Mr. Hassan Abdalla"
                placeholderTextColor="#9CA3AF"
                value={formName}
                onChangeText={setFormName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. hassan@school.edu"
                placeholderTextColor="#9CA3AF"
                value={formEmail}
                onChangeText={setFormEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>
                Phone <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.phoneWrap}>
                <View style={styles.prefixBox}>
                  <Ionicons
                    name="call-outline"
                    size={15}
                    color="#16A34A"
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
                Gender <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    formGender === "Male" && styles.genderActiveMale,
                  ]}
                  onPress={() => setFormGender("Male")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="man-outline"
                    size={18}
                    color={formGender === "Male" ? "#fff" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.genderOptionText,
                      { color: formGender === "Male" ? "#fff" : "#6B7280" },
                    ]}
                  >
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    formGender === "Female" && styles.genderActiveFemale,
                  ]}
                  onPress={() => setFormGender("Female")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="woman-outline"
                    size={18}
                    color={formGender === "Female" ? "#fff" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.genderOptionText,
                      { color: formGender === "Female" ? "#fff" : "#6B7280" },
                    ]}
                  >
                    Female
                  </Text>
                </TouchableOpacity>
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
                        : "person-add-outline"
                    }
                    size={18}
                    color="#fff"
                  />
                )}
                <Text style={styles.saveBtnText}>
                  {editing ? "Save changes" : "Add teacher"}
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
    backgroundColor: "#16A34A",
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
  stripNum: { fontSize: 18, fontWeight: "800", color: "#fff" },
  stripLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stripDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 4,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  filterChipActive: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "#fff" },

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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontWeight: "800" },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  cardName: { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 },

  genderPill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  genderText: { fontSize: 10, fontWeight: "700" },

  emailRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  emailText: { fontSize: 12, color: "#6B7280" },
  phoneRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  phoneText: { fontSize: 12, color: "#6B7280" },

  cardActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionEditText: { fontSize: 12, fontWeight: "600", color: "#16A34A" },
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
  optional: { color: "#9CA3AF", fontWeight: "400" },

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

  genderRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  genderActiveMale: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  genderActiveFemale: { backgroundColor: "#DB2777", borderColor: "#DB2777" },
  genderOptionText: { fontSize: 14, fontWeight: "600" },

  saveBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
