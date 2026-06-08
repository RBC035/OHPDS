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
  FlatList,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { TeacherService, TeacherPayload } from "../../../services/api/teacherService";
import { TeacherSubjectService } from "../../../services/api/teacherSubjectService";
import { SubjectService } from "../../../services/api/subjectService";

type Teacher = {
  id: number;
  name: string;
  phone: string;
  gender: string;
  email: string;
};

// Shape returned by GET /teachers/{id}/subjects  (teacher_subject row + joined subject name)
type AssignedSubject = {
  id: number | string;          // teacher_subject record id  → used for DELETE /teacher-subjects/{id}
  subjectId: number | string;   // the subject's own id
  name?: string;                // joined subject name
  status?: string;              // assignment status
  addedDate?: string;
};

// Shape returned by GET /subjects  (subject catalogue)
type SubjectCatalog = {
  id: number | string;
  name: string;
  status?: string;
};

type ActiveTab = "profile" | "subjects";

const PALETTE = [
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
  if (g === "male"   || g === "m") return { bg: "#EFF6FF", border: "#BFDBFE", color: "#2563EB", label: "Male" };
  if (g === "female" || g === "f") return { bg: "#FDF2F8", border: "#FBCFE8", color: "#DB2777", label: "Female" };
  return { bg: "#F3F4F6", border: "#E5E7EB", color: "#6B7280", label: gender };
}

function subjectInitials(name?: string) {
  if (!name) return "??";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

export default function AdminTeacherDetailScreen() {
  const insets    = useSafeAreaInsets();
  const { id }    = useLocalSearchParams<{ id: string }>();
  const teacherId = parseInt(id, 10);

  const [teacher, setTeacher]                     = useState<Teacher | null>(null);
  const [loadingTeacher, setLoadingTeacher]        = useState(true);

  const [assignedSubjects, setAssignedSubjects]    = useState<AssignedSubject[]>([]);
  const [allSubjects, setAllSubjects]              = useState<SubjectCatalog[]>([]);
  const [loadingSubjects, setLoadingSubjects]      = useState(false);

  const [activeTab, setActiveTab]                  = useState<ActiveTab>("profile");
  const [subjectSearch, setSubjectSearch]          = useState("");

  // edit profile modal
  const [editModalVisible, setEditModalVisible]    = useState(false);
  const [saving, setSaving]                        = useState(false);
  const [formName, setFormName]                    = useState("");
  const [formEmail, setFormEmail]                  = useState("");
  const [formPhone, setFormPhone]                  = useState("");
  const [formGender, setFormGender]                = useState("Male");

  // assign subject modal
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigning, setAssigning]                   = useState(false);
  const [assignSearch, setAssignSearch]             = useState("");

  // ── Loaders ──────────────────────────────────────────────────────────────

  const loadTeacher = useCallback(async () => {
    try {
      setLoadingTeacher(true);
      const res = await TeacherService.getOne(teacherId);
      const data: Teacher = res.data?.data ?? res.data;
      setTeacher(data);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load teacher.");
    } finally {
      setLoadingTeacher(false);
    }
  }, [teacherId]);

  const loadSubjects = useCallback(async () => {
    try {
      setLoadingSubjects(true);
      const [assignedRes, allRes] = await Promise.all([
        TeacherSubjectService.getByTeacher(teacherId),   // GET /teachers/{id}/subjects
        SubjectService.getAll(),                          // GET /subjects
      ]);
      const assigned: AssignedSubject[] = assignedRes.data?.data ?? assignedRes.data ?? [];
      const all: SubjectCatalog[]       = allRes.data?.data      ?? allRes.data      ?? [];
      setAssignedSubjects(Array.isArray(assigned) ? assigned : []);
      setAllSubjects(Array.isArray(all) ? all : []);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load subjects.");
    } finally {
      setLoadingSubjects(false);
    }
  }, [teacherId]);

  useEffect(() => { loadTeacher(); }, [loadTeacher]);

  useEffect(() => {
    if (activeTab === "subjects") loadSubjects();
  }, [activeTab, loadSubjects]);

  // ── Edit profile ─────────────────────────────────────────────────────────

  function openEdit() {
    if (!teacher) return;
    setFormName(teacher.name);
    setFormEmail(teacher.email);
    setFormPhone(teacher.phone ?? "");
    const g = (teacher.gender ?? "").toLowerCase();
    setFormGender((g === "female" || g === "f") ? "Female" : "Male");
    setEditModalVisible(true);
  }

  async function handleSave() {
    if (!formName.trim())  { Alert.alert("Required", "Please enter the teacher name.");         return; }
    if (!formEmail.trim()) { Alert.alert("Required", "Please enter the teacher email.");        return; }
    if (!formPhone.trim()) { Alert.alert("Required", "Please enter the teacher phone number."); return; }
    const payload: TeacherPayload = {
      name:   formName.trim(),
      email:  formEmail.trim(),
      phone:  formPhone.trim(),
      gender: formGender,
    };
    try {
      setSaving(true);
      await TeacherService.update(teacherId, payload);
      setEditModalVisible(false);
      await loadTeacher();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to update teacher.");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete teacher ────────────────────────────────────────────────────────

  function handleDelete() {
    if (!teacher) return;
    Alert.alert(
      "Delete teacher",
      `Remove "${teacher.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await TeacherService.remove(teacherId);
              router.back();
            } catch (e: any) {
              Alert.alert("Error", e?.response?.data?.message ?? "Failed to delete teacher.");
            }
          },
        },
      ]
    );
  }

  // ── Assign subject ────────────────────────────────────────────────────────
  // POST /teacher-subjects  { subjectId, teacherId, addedDate, status }

  async function handleAssignSubject(subject: SubjectCatalog) {
    try {
      setAssigning(true);
      await TeacherSubjectService.create({
        subjectId: subject.id,
        teacherId,
        addedDate: todayDate(),
        status:    "active",
      });
      setAssignModalVisible(false);
      setAssignSearch("");
      await loadSubjects();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to assign subject.");
    } finally {
      setAssigning(false);
    }
  }

  // ── Remove subject assignment ─────────────────────────────────────────────
  // DELETE /teacher-subjects/{id}  where id = teacher_subject pivot record id

  function handleRemoveSubject(sub: AssignedSubject) {
    Alert.alert(
      "Remove subject",
      `Unassign "${resolvedName(sub)}" from ${teacher?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await TeacherSubjectService.remove(sub.id);
              await loadSubjects();
            } catch (e: any) {
              Alert.alert("Error", e?.response?.data?.message ?? "Failed to remove subject.");
            }
          },
        },
      ]
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  // id → name lookup built from the full subject catalogue
  const subjectNameMap = new Map<string, string>(
    allSubjects.map((s) => [String(s.id), s.name])
  );

  // resolve a display name: prefer API-joined name, fall back to catalogue lookup
  function resolvedName(sub: AssignedSubject): string {
    return sub.name || subjectNameMap.get(String(sub.subjectId)) || `Subject #${sub.subjectId}`;
  }

  // subject ids already assigned — used to filter the catalogue in the assign modal
  const assignedSubjectIds = new Set(
    assignedSubjects.map((s) => String(s.subjectId ?? s.id))
  );

  const availableToAssign = allSubjects.filter(
    (s) =>
      !assignedSubjectIds.has(String(s.id)) &&
      s.name.toLowerCase().includes(assignSearch.toLowerCase())
  );

  const filteredAssigned = assignedSubjects.filter((s) =>
    resolvedName(s).toLowerCase().includes(subjectSearch.toLowerCase())
  );

  // ── Loading / not-found screens ────────────────────────────────────────────

  if (loadingTeacher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.centerText}>Loading teacher...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!teacher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
          <Text style={styles.centerText}>Teacher not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backFallbackBtn}>
            <Text style={styles.backFallbackText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const gc  = genderStyle(teacher.gender);
  const ini = getInitials(teacher.name);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={gc.color} />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: gc.color }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>{teacher.name}</Text>
            <Text style={styles.headerSub}>Teacher Profile</Text>
          </View>
          <View style={styles.genderBadge}>
            <Text style={styles.genderBadgeText}>{gc.label}</Text>
          </View>
        </View>

        <View style={styles.profileStrip}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{ini}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoText}>{teacher.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoText}>{teacher.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="finger-print-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoText}>ID #{teacher.id}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{assignedSubjects.length}</Text>
            <Text style={styles.stripLabel}>Subjects</Text>
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
          <Ionicons name="person-outline" size={16} color={activeTab === "profile" ? gc.color : "#9CA3AF"} />
          <Text style={[styles.tabLabel, activeTab === "profile" && { color: gc.color }]}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "subjects" && styles.tabActive]}
          onPress={() => setActiveTab("subjects")}
          activeOpacity={0.8}
        >
          <Ionicons name="library-outline" size={16} color={activeTab === "subjects" ? gc.color : "#9CA3AF"} />
          <Text style={[styles.tabLabel, activeTab === "subjects" && { color: gc.color }]}>
            Subjects ({assignedSubjects.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════ PROFILE TAB ══════════════════ */}
      {activeTab === "profile" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.editBtn, { backgroundColor: gc.color }]} onPress={openEdit} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editBtnText}>Edit Teacher</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Profile Information</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: gc.bg }]}>
                <Ionicons name="person-outline" size={18} color={gc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailValue}>{teacher.name}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: gc.bg }]}>
                <Ionicons name="mail-outline" size={18} color={gc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{teacher.email}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: gc.bg }]}>
                <Ionicons name="call-outline" size={18} color={gc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>{teacher.phone}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: gc.bg }]}>
                <Ionicons name="transgender-outline" size={18} color={gc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Gender</Text>
                <View style={[styles.genderValuePill, { backgroundColor: gc.bg, borderColor: gc.border }]}>
                  <Text style={[styles.genderValueText, { color: gc.color }]}>{gc.label}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ══════════════════ SUBJECTS TAB ══════════════════ */}
      {activeTab === "subjects" && (
        <>
          {/* search + assign button */}
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search assigned subjects..."
                placeholderTextColor="#9CA3AF"
                value={subjectSearch}
                onChangeText={setSubjectSearch}
              />
              {subjectSearch.length > 0 && (
                <TouchableOpacity onPress={() => setSubjectSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.assignBtn, { backgroundColor: gc.color }]}
              onPress={() => { setAssignSearch(""); setAssignModalVisible(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {loadingSubjects ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={gc.color} />
              <Text style={styles.centerText}>Loading subjects...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              {filteredAssigned.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="library-outline" size={32} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyTitle}>No subjects assigned</Text>
                  <Text style={styles.emptySub}>Tap + to assign a subject to this teacher</Text>
                </View>
              )}

              {filteredAssigned.map((sub, index) => {
                const av      = PALETTE[index % PALETTE.length];
                const display = resolvedName(sub);
                const code    = subjectInitials(display);
                return (
                  <View key={String(sub.id)} style={styles.subjectRow}>
                    <View style={[styles.subjectCodeBox, { backgroundColor: av.bg }]}>
                      <Text style={[styles.subjectCode, { color: av.color }]}>{code}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectName}>{display}</Text>
                      <View style={styles.subjectMeta}>
                        <Text style={styles.subjectMetaText}>ID #{sub.subjectId}</Text>
                        {sub.status ? (
                          <>
                            <Text style={styles.metaDot}>·</Text>
                            <View style={[
                              styles.statusPill,
                              { backgroundColor: sub.status === "active" ? "#DCFCE7" : "#FEF3C7" },
                            ]}>
                              <Text style={[
                                styles.statusText,
                                { color: sub.status === "active" ? "#16A34A" : "#D97706" },
                              ]}>{sub.status}</Text>
                            </View>
                          </>
                        ) : null}
                        {sub.addedDate ? (
                          <>
                            <Text style={styles.metaDot}>·</Text>
                            <Text style={styles.subjectMetaText}>{sub.addedDate}</Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemoveSubject(sub)}
                      activeOpacity={0.75}
                    >
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
                <Text style={styles.sheetTitle}>Edit Teacher</Text>
                <Text style={styles.sheetSub}>ID #{teacher.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Full name <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. Mr. Hassan Abdalla" placeholderTextColor="#9CA3AF" value={formName} onChangeText={setFormName} autoCapitalize="words" />

              <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. hassan@school.edu" placeholderTextColor="#9CA3AF" value={formEmail} onChangeText={setFormEmail} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Phone <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. +255 712 000 001" placeholderTextColor="#9CA3AF" value={formPhone} onChangeText={setFormPhone} keyboardType="phone-pad" />

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
                style={[styles.saveBtn, { backgroundColor: gc.color }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                }
                <Text style={styles.saveBtnText}>Save changes</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ASSIGN SUBJECT MODAL ── */}
      <Modal visible={assignModalVisible} animationType="slide" transparent onRequestClose={() => setAssignModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setAssignModalVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Assign Subject</Text>
                <Text style={styles.sheetSub}>{teacher.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.assignSearchWrap}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search subjects..."
                placeholderTextColor="#9CA3AF"
                value={assignSearch}
                onChangeText={setAssignSearch}
                autoFocus
              />
              {assignSearch.length > 0 && (
                <TouchableOpacity onPress={() => setAssignSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {availableToAssign.length === 0 ? (
              <View style={[styles.emptyState, { paddingTop: 30 }]}>
                <Ionicons name="checkmark-circle-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>
                  {allSubjects.length === 0 ? "No subjects in catalogue" : "All subjects already assigned"}
                </Text>
                <Text style={styles.emptySub}>
                  {allSubjects.length === 0
                    ? "Add subjects first via the Subjects section"
                    : "This teacher is assigned to all available subjects"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableToAssign}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 380 }}
                renderItem={({ item, index }) => {
                  const av   = PALETTE[index % PALETTE.length];
                  const code = subjectInitials(item.name);
                  return (
                    <TouchableOpacity
                      style={styles.assignRow}
                      onPress={() => handleAssignSubject(item)}
                      activeOpacity={0.8}
                      disabled={assigning}
                    >
                      <View style={[styles.subjectCodeBox, { backgroundColor: av.bg }]}>
                        <Text style={[styles.subjectCode, { color: av.color }]}>{code}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectName}>{item.name}</Text>
                        <Text style={styles.subjectMetaText}>ID #{item.id}</Text>
                      </View>
                      {assigning
                        ? <ActivityIndicator size="small" color={gc.color} />
                        : (
                          <View style={[styles.assignIconBox, { backgroundColor: gc.bg }]}>
                            <Ionicons name="add" size={18} color={gc.color} />
                          </View>
                        )
                      }
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <View style={{ height: 8 }} />
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
  backFallbackBtn:  { backgroundColor: "#DCFCE7", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backFallbackText: { fontSize: 14, fontWeight: "600", color: "#16A34A" },

  header:      { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop:   { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },

  genderBadge:     { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.25)" },
  genderBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  profileStrip:   { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  avatarCircle:   { width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  avatarInitials: { fontSize: 20, fontWeight: "800", color: "#fff" },
  infoRow:        { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  infoText:       { fontSize: 13, color: "rgba(255,255,255,0.9)" },

  statsStrip:   { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingVertical: 12 },
  stripItem:    { flex: 1, alignItems: "center" },
  stripNum:     { fontSize: 18, fontWeight: "800", color: "#fff" },
  stripLabel:   { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  tabRow:    { flexDirection: "row", marginHorizontal: 16, marginTop: 14, marginBottom: 4, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4 },
  tab:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: "#fff" },
  tabLabel:  { fontSize: 13, fontWeight: "600", color: "#9CA3AF" },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  actionRow:     { flexDirection: "row", gap: 12, marginBottom: 16 },
  editBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 13 },
  editBtnText:   { fontSize: 14, fontWeight: "700", color: "#fff" },
  deleteBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEE2E2", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13 },
  deleteBtnText: { fontSize: 14, fontWeight: "700", color: "#DC2626" },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 },

  detailCard:    { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  detailRow:     { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  divider:       { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 16 },
  detailIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  detailLabel:   { fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginBottom: 3 },
  detailValue:   { fontSize: 14, fontWeight: "600", color: "#111827" },

  genderValuePill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginTop: 4 },
  genderValueText: { fontSize: 12, fontWeight: "700" },

  searchRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 10, marginBottom: 4 },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: "#E5E7EB" },
  searchInput:{ flex: 1, fontSize: 14, color: "#111827" },
  assignBtn:  { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },

  subjectRow:    { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8, gap: 10 },
  subjectCodeBox:{ width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  subjectCode:   { fontSize: 12, fontWeight: "800" },
  subjectName:   { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subjectMeta:   { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  subjectMetaText: { fontSize: 11, color: "#9CA3AF" },
  metaDot:       { fontSize: 11, color: "#D1D5DB" },
  statusPill:    { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText:    { fontSize: 10, fontWeight: "700" },
  removeBtn:     { padding: 4 },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon:  { width: 70, height: 70, borderRadius: 35, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub:   { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  assignSearchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 14 },
  assignRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  assignIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },

  overlay:    { flex: 1, justifyContent: "flex-end" },
  overlayBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:      { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
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

  genderRow:          { flexDirection: "row", gap: 10, marginBottom: 20 },
  genderOption:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: "#E5E7EB" },
  genderActiveMale:   { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  genderActiveFemale: { backgroundColor: "#DB2777", borderColor: "#DB2777" },
  genderOptionText:   { fontSize: 14, fontWeight: "600" },

  saveBtn:     { borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
