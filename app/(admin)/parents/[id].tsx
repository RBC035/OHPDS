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
import { router, useLocalSearchParams } from "expo-router";
import { ParentService, ParentPayload } from "../../../services/api/parentService";
import { StudentParentService } from "../../../services/api/studentParentService";
import { StudentService } from "../../../services/api/studentService";

type Parent = { id: number; name: string; phone: string; email: string };

// Shape from GET /parents/{id}/students  (student_parent pivot + joined student data)
type LinkedStudent = {
  id: number | string;          // student_parent pivot id → DELETE /student-parents/{id}
  stuentId: number | string;    // student's own id
  name?: string;                // joined student name
  gender?: string;
  status?: string;
};

type StudentCatalog = { id: number | string; name: string; gender?: string; dob?: string };

type ActiveTab = "profile" | "children";

const PRIMARY  = "#7C3AED";
const PALETTE  = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function genderIcon(gender?: string) {
  const g = (gender ?? "").toLowerCase();
  if (g === "male"   || g === "m") return { icon: "man-outline"   as const, color: "#2563EB", bg: "#EFF6FF", label: "Male" };
  if (g === "female" || g === "f") return { icon: "woman-outline" as const, color: "#DB2777", bg: "#FDF2F8", label: "Female" };
  return { icon: "person-outline" as const, color: "#6B7280", bg: "#F3F4F6", label: gender ?? "" };
}

export default function AdminParentDetailScreen() {
  const insets   = useSafeAreaInsets();
  const { id }   = useLocalSearchParams<{ id: string }>();
  const parentId = parseInt(id, 10);

  const [parent, setParent]                     = useState<Parent | null>(null);
  const [loadingParent, setLoadingParent]        = useState(true);

  const [linkedStudents, setLinkedStudents]      = useState<LinkedStudent[]>([]);
  const [studentCatalog, setStudentCatalog]      = useState<StudentCatalog[]>([]);
  const [loadingChildren, setLoadingChildren]    = useState(false);

  const [activeTab, setActiveTab]                = useState<ActiveTab>("profile");
  const [childSearch, setChildSearch]            = useState("");

  // edit profile modal
  const [editModalVisible, setEditModalVisible]  = useState(false);
  const [saving, setSaving]                      = useState(false);
  const [formName, setFormName]                  = useState("");
  const [formPhone, setFormPhone]                = useState("");
  const [formEmail, setFormEmail]                = useState("");

  // link child modal
  const [linkModalVisible, setLinkModalVisible]  = useState(false);
  const [linking, setLinking]                    = useState(false);
  const [selectedStudent, setSelectedStudent]    = useState<StudentCatalog | null>(null);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch]      = useState("");

  // ── Loaders ──────────────────────────────────────────────────────────────

  const loadParent = useCallback(async () => {
    try {
      setLoadingParent(true);
      const res = await ParentService.getOne(parentId);
      const data: Parent = res.data?.data ?? res.data;
      setParent(data);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load parent.");
    } finally {
      setLoadingParent(false);
    }
  }, [parentId]);

  const loadChildren = useCallback(async () => {
    try {
      setLoadingChildren(true);
      const [linkedRes, allRes] = await Promise.all([
        StudentParentService.getByParent(parentId),
        StudentService.getAll(),
      ]);
      const linked: LinkedStudent[]     = linkedRes.data?.data ?? linkedRes.data ?? [];
      const all:    StudentCatalog[]    = allRes.data?.data    ?? allRes.data    ?? [];
      setLinkedStudents(Array.isArray(linked) ? linked : []);
      setStudentCatalog(Array.isArray(all)    ? all    : []);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load children.");
    } finally {
      setLoadingChildren(false);
    }
  }, [parentId]);

  useEffect(() => { loadParent(); }, [loadParent]);
  useEffect(() => {
    if (activeTab === "children") loadChildren();
  }, [activeTab]);

  // ── Edit profile ──────────────────────────────────────────────────────────

  function openEdit() {
    if (!parent) return;
    setFormName(parent.name); setFormPhone(parent.phone ?? ""); setFormEmail(parent.email ?? "");
    setEditModalVisible(true);
  }

  async function handleSave() {
    if (!formName.trim())  { Alert.alert("Required", "Please enter the parent name.");  return; }
    if (!formPhone.trim()) { Alert.alert("Required", "Please enter the phone number."); return; }
    if (!formEmail.trim()) { Alert.alert("Required", "Please enter the email address."); return; }
    const payload: ParentPayload = { name: formName.trim(), phone: formPhone.trim(), email: formEmail.trim() };
    try {
      setSaving(true);
      await ParentService.update(parentId, payload);
      setEditModalVisible(false);
      await loadParent();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to update parent.");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete parent ─────────────────────────────────────────────────────────

  function handleDelete() {
    if (!parent) return;
    Alert.alert("Delete parent", `Remove "${parent.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await ParentService.remove(parentId);
            router.back();
          } catch (e: any) {
            Alert.alert("Error", e?.response?.data?.message ?? "Failed to delete parent.");
          }
        },
      },
    ]);
  }

  // ── Link student to parent ────────────────────────────────────────────────
  // POST /student-parents  { stuentId, parentId, status }

  async function handleLinkStudent() {
    if (!selectedStudent) { Alert.alert("Required", "Please select a student."); return; }
    try {
      setLinking(true);
      await StudentParentService.create({
        stuentId: selectedStudent.id,
        parentId,
        status:   "active",
      });
      setLinkModalVisible(false);
      setSelectedStudent(null);
      setStudentDropdownOpen(false);
      await loadChildren();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to link student.");
    } finally {
      setLinking(false);
    }
  }

  // ── Unlink student ────────────────────────────────────────────────────────
  // DELETE /student-parents/{id}  (pivot record id)

  function handleUnlink(child: LinkedStudent) {
    Alert.alert(
      "Remove child",
      `Unlink "${resolvedStudentName(child)}" from ${parent?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove", style: "destructive",
          onPress: async () => {
            try {
              await StudentParentService.remove(child.id);
              await loadChildren();
            } catch (e: any) {
              Alert.alert("Error", e?.response?.data?.message ?? "Failed to unlink student.");
            }
          },
        },
      ]
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const studentNameMap = new Map(studentCatalog.map((s) => [String(s.id), s.name]));

  function resolvedStudentName(child: LinkedStudent) {
    return child.name || studentNameMap.get(String(child.stuentId)) || `Student #${child.stuentId}`;
  }

  const linkedIds = new Set(linkedStudents.map((c) => String(c.stuentId ?? c.id)));

  const availableStudents = studentCatalog.filter(
    (s) =>
      !linkedIds.has(String(s.id)) &&
      s.name.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  const filteredLinked = linkedStudents.filter((c) =>
    resolvedStudentName(c).toLowerCase().includes(childSearch.toLowerCase())
  );

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loadingParent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.centerText}>Loading parent...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!parent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
          <Text style={styles.centerText}>Parent not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backFallbackBtn}>
            <Text style={styles.backFallbackText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ini = getInitials(parent.name);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>{parent.name}</Text>
            <Text style={styles.headerSub}>Parent Profile</Text>
          </View>
          <View style={styles.idBadge}>
            <Text style={styles.idBadgeText}>ID #{parent.id}</Text>
          </View>
        </View>

        <View style={styles.profileStrip}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{ini}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoText}>{parent.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoText}>{parent.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{linkedStudents.length}</Text>
            <Text style={styles.stripLabel}>Children</Text>
          </View>
        </View>
      </View>

      {/* ── TABS ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "profile" && styles.tabActive]}
          onPress={() => setActiveTab("profile")}
          activeOpacity={0.8}
        >
          <Ionicons name="person-outline" size={16} color={activeTab === "profile" ? PRIMARY : "#9CA3AF"} />
          <Text style={[styles.tabLabel, activeTab === "profile" && { color: PRIMARY }]}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "children" && styles.tabActive]}
          onPress={() => setActiveTab("children")}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={16} color={activeTab === "children" ? PRIMARY : "#9CA3AF"} />
          <Text style={[styles.tabLabel, activeTab === "children" && { color: PRIMARY }]}>
            Children ({linkedStudents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════ PROFILE TAB ══════════════════ */}
      {activeTab === "profile" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={openEdit} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editBtnText}>Edit Parent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Profile Information</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Ionicons name="person-outline" size={18} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailValue}>{parent.name}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Ionicons name="call-outline" size={18} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>{parent.phone}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Ionicons name="mail-outline" size={18} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{parent.email}</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ══════════════════ CHILDREN TAB ══════════════════ */}
      {activeTab === "children" && (
        <>
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search linked students..."
                placeholderTextColor="#9CA3AF"
                value={childSearch}
                onChangeText={setChildSearch}
              />
              {childSearch.length > 0 && (
                <TouchableOpacity onPress={() => setChildSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => { setSelectedStudent(null); setStudentDropdownOpen(false); setDropdownSearch(""); setLinkModalVisible(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {loadingChildren ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              {filteredLinked.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyTitle}>No children linked</Text>
                  <Text style={styles.emptySub}>Tap + to assign a student to this parent</Text>
                </View>
              )}

              {filteredLinked.map((child, index) => {
                const av   = PALETTE[index % PALETTE.length];
                const name = resolvedStudentName(child);
                const gc   = genderIcon(child.gender);
                const ini2 = getInitials(name);
                return (
                  <View key={String(child.id)} style={styles.childRow}>
                    <View style={[styles.childAvatar, { backgroundColor: av.bg }]}>
                      <Text style={[styles.childAvatarText, { color: av.color }]}>{ini2}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.childName}>{name}</Text>
                      <View style={styles.childMeta}>
                        <Text style={styles.childMetaText}>ID #{child.stuentId}</Text>
                        {child.gender ? (
                          <>
                            <Text style={styles.metaDot}>·</Text>
                            <View style={[styles.genderPill, { backgroundColor: gc.bg }]}>
                              <Ionicons name={gc.icon} size={10} color={gc.color} />
                              <Text style={[styles.genderPillText, { color: gc.color }]}>{gc.label}</Text>
                            </View>
                          </>
                        ) : null}
                        {child.status ? (
                          <>
                            <Text style={styles.metaDot}>·</Text>
                            <View style={[styles.statusPill, { backgroundColor: child.status === "active" ? "#DCFCE7" : "#FEF3C7" }]}>
                              <Text style={[styles.statusText, { color: child.status === "active" ? "#16A34A" : "#D97706" }]}>
                                {child.status}
                              </Text>
                            </View>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleUnlink(child)} activeOpacity={0.75}>
                      <Ionicons name="remove-circle-outline" size={22} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                );
              })}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </>
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setEditModalVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Edit Parent</Text>
                <Text style={styles.sheetSub}>ID #{parent.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Full name <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. Mrs. Farouq Amani" placeholderTextColor="#9CA3AF" value={formName} onChangeText={setFormName} autoCapitalize="words" />

              <Text style={styles.label}>Phone number <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. +255 712 111 001" placeholderTextColor="#9CA3AF" value={formPhone} onChangeText={setFormPhone} keyboardType="phone-pad" />

              <Text style={styles.label}>Email address <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. parent@mail.com" placeholderTextColor="#9CA3AF" value={formEmail} onChangeText={setFormEmail} keyboardType="email-address" autoCapitalize="none" />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
                <Text style={styles.saveBtnText}>Save changes</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── LINK STUDENT MODAL ── */}
      <Modal visible={linkModalVisible} animationType="slide" transparent onRequestClose={() => setLinkModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setLinkModalVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Add Child</Text>
                <Text style={styles.sheetSub}>{parent.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setLinkModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* student select */}
              <Text style={styles.label}>Select student <Text style={styles.required}>*</Text></Text>

              <TouchableOpacity
                style={[styles.selectField, studentDropdownOpen && { borderColor: PRIMARY, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
                onPress={() => setStudentDropdownOpen((v) => !v)}
                activeOpacity={0.8}
              >
                <Text style={[styles.selectFieldText, !selectedStudent && { color: "#9CA3AF" }]}>
                  {selectedStudent ? selectedStudent.name : "Select a student..."}
                </Text>
                <Ionicons name={studentDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#6B7280" />
              </TouchableOpacity>

              {studentDropdownOpen && (
                <View style={[styles.selectDropdown, { borderColor: PRIMARY }]}>
                  {/* search inside dropdown */}
                  <View style={styles.dropdownSearchWrap}>
                    <Ionicons name="search-outline" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.dropdownSearchInput}
                      placeholder="Search students..."
                      placeholderTextColor="#9CA3AF"
                      value={dropdownSearch}
                      onChangeText={setDropdownSearch}
                      autoFocus
                    />
                    {dropdownSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setDropdownSearch("")}>
                        <Ionicons name="close-circle" size={14} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {availableStudents.length === 0 ? (
                    <View style={styles.selectEmpty}>
                      <Text style={styles.selectEmptyText}>
                        {studentCatalog.length === 0 ? "No students available" : "All students already linked"}
                      </Text>
                    </View>
                  ) : (
                    <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                      {availableStudents.map((s, index) => {
                        const isSelected = selectedStudent?.id === s.id;
                        const av = PALETTE[index % PALETTE.length];
                        const gc = genderIcon(s.gender);
                        return (
                          <TouchableOpacity
                            key={String(s.id)}
                            style={[styles.selectOption, isSelected && { backgroundColor: "#F5F3FF" }]}
                            onPress={() => { setSelectedStudent(s); setStudentDropdownOpen(false); setDropdownSearch(""); }}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.selectOptionDot, { backgroundColor: av.bg }]}>
                              <Text style={[styles.selectOptionDotText, { color: av.color }]}>{getInitials(s.name)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.selectOptionText, isSelected && { color: PRIMARY, fontWeight: "700" }]}>{s.name}</Text>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                                <Text style={styles.selectOptionMeta}>ID #{s.id}</Text>
                                {s.gender ? (
                                  <View style={[styles.genderPill, { backgroundColor: gc.bg }]}>
                                    <Ionicons name={gc.icon} size={9} color={gc.color} />
                                    <Text style={[styles.genderPillText, { color: gc.color }]}>{gc.label}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { marginTop: 20 }, (!selectedStudent || linking) && { opacity: 0.5 }]}
                onPress={handleLinkStudent}
                activeOpacity={0.85}
                disabled={!selectedStudent || linking}
              >
                {linking ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="link-outline" size={18} color="#fff" />}
                <Text style={styles.saveBtnText}>Assign Child</Text>
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

  centerBox:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  centerText:       { fontSize: 14, color: "#6B7280" },
  backFallbackBtn:  { backgroundColor: "#EDE9FE", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backFallbackText: { fontSize: 14, fontWeight: "600", color: PRIMARY },

  header:      { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingBottom: 16 },
  headerTop:   { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },

  idBadge:     { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.25)" },
  idBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  profileStrip:   { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  avatarCircle:   { width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  avatarInitials: { fontSize: 20, fontWeight: "800", color: "#fff" },
  infoRow:        { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  infoText:       { fontSize: 13, color: "rgba(255,255,255,0.9)" },

  statsStrip:  { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingVertical: 12 },
  stripItem:   { flex: 1, alignItems: "center" },
  stripNum:    { fontSize: 22, fontWeight: "800", color: "#fff" },
  stripLabel:  { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  tabRow:    { flexDirection: "row", marginHorizontal: 16, marginTop: 14, marginBottom: 4, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4 },
  tab:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: "#fff" },
  tabLabel:  { fontSize: 13, fontWeight: "600", color: "#9CA3AF" },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  actionRow:     { flexDirection: "row", gap: 12, marginBottom: 16 },
  editBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 13 },
  editBtnText:   { fontSize: 14, fontWeight: "700", color: "#fff" },
  deleteBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEE2E2", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13 },
  deleteBtnText: { fontSize: 14, fontWeight: "700", color: "#DC2626" },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 },

  detailCard:    { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  detailRow:     { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  divider:       { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 16 },
  detailIconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#EDE9FE", justifyContent: "center", alignItems: "center", flexShrink: 0 },
  detailLabel:   { fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginBottom: 3 },
  detailValue:   { fontSize: 14, fontWeight: "600", color: "#111827" },

  searchRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 10, marginBottom: 4 },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: "#E5E7EB" },
  searchInput:{ flex: 1, fontSize: 14, color: "#111827" },
  linkBtn:    { width: 44, height: 44, borderRadius: 12, backgroundColor: PRIMARY, justifyContent: "center", alignItems: "center" },

  childRow:      { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8, gap: 10 },
  childAvatar:   { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  childAvatarText:{ fontSize: 14, fontWeight: "800" },
  childName:     { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  childMeta:     { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  childMetaText: { fontSize: 11, color: "#9CA3AF" },
  metaDot:       { fontSize: 11, color: "#D1D5DB" },
  genderPill:    { flexDirection: "row", alignItems: "center", gap: 2, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  genderPillText:{ fontSize: 10, fontWeight: "700" },
  statusPill:    { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText:    { fontSize: 10, fontWeight: "700" },
  removeBtn:     { padding: 4 },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon:  { width: 70, height: 70, borderRadius: 35, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub:   { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  overlay:    { flex: 1, justifyContent: "flex-end" },
  overlayBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:      { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "92%" },
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

  selectField:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F9FAFB", borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  selectFieldText:    { fontSize: 14, color: "#111827", flex: 1 },
  selectDropdown:     { borderWidth: 1.5, borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: "#fff", overflow: "hidden", marginBottom: 4 },
  dropdownSearchWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownSearchInput:{ flex: 1, fontSize: 13, color: "#111827" },
  selectOption:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  selectOptionDot:    { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  selectOptionDotText:{ fontSize: 12, fontWeight: "800" },
  selectOptionText:   { fontSize: 14, color: "#111827", fontWeight: "500" },
  selectOptionMeta:   { fontSize: 11, color: "#9CA3AF" },
  selectEmpty:        { paddingVertical: 20, alignItems: "center" },
  selectEmptyText:    { fontSize: 13, color: "#9CA3AF" },

  saveBtn:     { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
