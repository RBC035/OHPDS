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

import { ClassService } from "@/services/api/classService";
import { StudentService } from "@/services/api/studentService";

type Student = { id: string; name: string; rollNo: string; gender: "M" | "F" };
type Subject = { id: string; name: string; teacher: string };

type ClassInfo = {
  id: string;
  className: string;
  status: string;
};

const STREAM_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  A: { bg: "#EEF4FF", border: "#BFDBFE", color: "#2563EB" },
  B: { bg: "#EDE9FE", border: "#DDD6FE", color: "#7C3AED" },
  C: { bg: "#DCFCE7", border: "#BBF7D0", color: "#16A34A" },
  D: { bg: "#FFF7ED", border: "#FED7AA", color: "#EA580C" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: "#DCFCE7", color: "#16A34A", label: "Active"   },
  inactive: { bg: "#FEE2E2", color: "#DC2626", label: "Inactive" },
};

const STATUS_KEYS = ["active", "inactive"];

function getStream(name: string) {
  return name.trim().split(" ").pop()?.toUpperCase() ?? "A";
}

function getStreamColor(name: string) {
  return STREAM_COLORS[getStream(name)] ?? { bg: "#F3F4F6", border: "#E5E7EB", color: "#6B7280" };
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_PALETTE = [
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

// `GET /classes/{id}/students` only returns student_class link rows
// (id, stuentId, classId, studyYear) — no name/gender. Those live on the
// student table, so each link has to be joined with StudentService.getOne.
async function joinStudents(rawLinks: any[]): Promise<Student[]> {
  const links = rawLinks.map((item) => ({
    linkId:    String(item.id),
    studentId: item.stuentId ?? item.studentId ?? item.student_id ?? null,
    rollNo:    item.roll_no ?? item.rollNo ?? item.roll_number ?? "",
  }));

  const details = await Promise.allSettled(
    links.map((l) =>
      l.studentId != null
        ? StudentService.getOne(Number(l.studentId))
        : Promise.reject(new Error("missing studentId"))
    )
  );

  return links.map((l, idx) => {
    const d = details[idx];
    const raw = d.status === "fulfilled" ? extractItem(d.value) : {};
    return {
      id:     l.linkId,
      name:   raw.name ?? "",
      rollNo: l.rollNo,
      gender: raw.gender === "F" || raw.gender === "female" ? "F" : "M",
    };
  });
}

function mapSubject(item: any): Subject {
  return {
    id:      String(item.id),
    name:    item.name ?? item.subject_name ?? "",
    teacher: item.teacher_name ?? item.teacher ?? "",
  };
}

type ActiveTab = "students" | "subjects";

export default function AdminClassDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [classInfo, setClassInfo]       = useState<ClassInfo | null>(null);
  const [students, setStudents]         = useState<Student[]>([]);
  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState<ActiveTab>("students");
  const [search, setSearch]             = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  // class details / edit
  const [classModalVisible, setClassModalVisible] = useState(false);
  const [classDetailsVisible, setClassDetailsVisible] = useState(false);
  const [savingClass, setSavingClass]   = useState(false);
  const [classFormName, setClassFormName]     = useState("");
  const [classFormStatus, setClassFormStatus] = useState("active");

  // student form
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formName, setFormName]             = useState("");
  const [formRoll, setFormRoll]             = useState("");
  const [formGender, setFormGender]         = useState<"M" | "F">("M");

  // subject form
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formSubName, setFormSubName]       = useState("");
  const [formSubTeacher, setFormSubTeacher] = useState("");

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // Use allSettled so one broken endpoint (e.g. subjects-by-class,
      // which this backend doesn't expose) can't wipe out the whole screen.
      const [classRes, studentsRes, subjectsRes] = await Promise.allSettled([
        ClassService.getOne(id),
        ClassService.getStudents(id),
        ClassService.getSubjects(id),
      ]);

      if (classRes.status === "fulfilled") {
        const raw = extractItem(classRes.value);
        setClassInfo({
          id:        String(raw.id ?? id),
          className: raw.class_name ?? raw.name ?? "",
          status:    raw.status ?? "active",
        });
      } else {
        setClassInfo(null);
      }

      setStudents(studentsRes.status === "fulfilled" ? await joinStudents(extractList(studentsRes.value)) : []);
      setSubjects(subjectsRes.status === "fulfilled" ? extractList(subjectsRes.value).map(mapSubject) : []);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to load class details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Class details / edit handlers ──────────────────
  function openClassDetails() {
    setClassDetailsVisible(true);
  }

  function openEditClass() {
    if (!classInfo) return;
    setClassFormName(classInfo.className);
    setClassFormStatus(classInfo.status ?? "active");
    setClassDetailsVisible(false);
    setClassModalVisible(true);
  }

  async function saveClass() {
    if (!classFormName.trim()) { Alert.alert("Required", "Enter class name."); return; }
    setSavingClass(true);
    try {
      await ClassService.update(id, { name: classFormName.trim(), status: classFormStatus });
      setClassModalVisible(false);
      await fetchAll();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to update class.");
    } finally {
      setSavingClass(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading class...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!classInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
          <Text style={styles.errorText}>Class not found</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity onPress={() => fetchAll()} style={styles.errorBtn}>
              <Text style={styles.errorBtnText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={styles.errorBtn}>
              <Text style={styles.errorBtnText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const sc          = getStreamColor(classInfo.className);
  const stream      = getStream(classInfo.className);
  const maleCount   = students.filter((s) => s.gender === "M").length;
  const femaleCount = students.filter((s) => s.gender === "F").length;
  const statusStyle = STATUS_STYLES[classInfo.status?.toLowerCase()] ?? { bg: "#F3F4F6", color: "#6B7280", label: classInfo.status };

  const filteredStudents = students.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.includes(search)
  );
  const filteredSubjects = subjects.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.teacher.toLowerCase().includes(search.toLowerCase())
  );

  // ── Student handlers ──────────────────────────────
  function openAddStudent() {
    setEditingStudent(null);
    setFormName("");
    setFormRoll(String(students.length + 1).padStart(3, "0"));
    setFormGender("M");
    setModalVisible(true);
  }

  function openEditStudent(st: Student) {
    setEditingStudent(st);
    setFormName(st.name);
    setFormRoll(st.rollNo);
    setFormGender(st.gender);
    setModalVisible(true);
  }

  async function saveStudent() {
    if (!formName.trim()) { Alert.alert("Required", "Enter student name."); return; }
    setSaving(true);
    try {
      const payload = { name: formName.trim(), roll_no: formRoll.trim(), gender: formGender };
      if (editingStudent) {
        await ClassService.updateStudent(id, editingStudent.id, payload);
      } else {
        await ClassService.addStudent(id, payload);
      }
      setModalVisible(false);
      const res = await ClassService.getStudents(id);
      setStudents(await joinStudents(extractList(res)));
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to save student.");
    } finally {
      setSaving(false);
    }
  }

  function deleteStudent(st: Student) {
    Alert.alert("Remove student", `Remove ${st.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await ClassService.removeStudent(id, st.id);
            const res = await ClassService.getStudents(id);
            setStudents(await joinStudents(extractList(res)));
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message ?? "Failed to remove student.");
          }
        },
      },
    ]);
  }

  // ── Subject handlers ──────────────────────────────
  function openAddSubject() {
    setEditingSubject(null);
    setFormSubName("");
    setFormSubTeacher("");
    setModalVisible(true);
  }

  function openEditSubject(sub: Subject) {
    setEditingSubject(sub);
    setFormSubName(sub.name);
    setFormSubTeacher(sub.teacher);
    setModalVisible(true);
  }

  async function saveSubject() {
    if (!formSubName.trim()) { Alert.alert("Required", "Enter subject name."); return; }
    setSaving(true);
    try {
      const payload = { name: formSubName.trim(), teacher: formSubTeacher.trim() };
      if (editingSubject) {
        await ClassService.updateSubject(id, editingSubject.id, payload);
      } else {
        await ClassService.addSubject(id, payload);
      }
      setModalVisible(false);
      const res = await ClassService.getSubjects(id);
      setSubjects(extractList(res).map(mapSubject));
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to save subject.");
    } finally {
      setSaving(false);
    }
  }

  function deleteSubject(sub: Subject) {
    Alert.alert("Remove subject", `Remove ${sub.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await ClassService.removeSubject(id, sub.id);
            const res = await ClassService.getSubjects(id);
            setSubjects(extractList(res).map(mapSubject));
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message ?? "Failed to remove subject.");
          }
        },
      },
    ]);
  }

  const isStudentTab = activeTab === "students";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={[styles.streamBadge, { backgroundColor: sc.color + "33" }]}>
            <Text style={styles.streamBadgeText}>{stream}</Text>
          </View>
          <TouchableOpacity
            style={{ flex: 1, marginLeft: 10 }}
            onPress={openClassDetails}
            activeOpacity={0.8}
          >
            <Text style={styles.headerTitle}>{classInfo.className}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg + "55" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusStyle.color }]} />
              <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={openClassDetails}
            activeOpacity={0.8}
          >
            <Ionicons name="information-circle-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={isStudentTab ? openAddStudent : openAddSubject}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{students.length}</Text>
            <Text style={styles.stripLabel}>Students</Text>
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
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{subjects.length}</Text>
            <Text style={styles.stripLabel}>Subjects</Text>
          </View>
        </View>

      </View>

      {/* ── TABS ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "students" && styles.tabActive]}
          onPress={() => { setActiveTab("students"); setSearch(""); }}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={16} color={activeTab === "students" ? "#2563EB" : "#9CA3AF"} />
          <Text style={[styles.tabLabel, activeTab === "students" && styles.tabLabelActive]}>
            Students ({students.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "subjects" && styles.tabActive]}
          onPress={() => { setActiveTab("subjects"); setSearch(""); }}
          activeOpacity={0.8}
        >
          <Ionicons name="library-outline" size={16} color={activeTab === "subjects" ? "#2563EB" : "#9CA3AF"} />
          <Text style={[styles.tabLabel, activeTab === "subjects" && styles.tabLabelActive]}>
            Subjects ({subjects.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={isStudentTab ? "Search students..." : "Search subjects..."}
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
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} colors={["#2563EB"]} />
        }
      >
        {/* STUDENTS */}
        {isStudentTab && (
          <>
            {filteredStudents.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No students found</Text>
                <Text style={styles.emptySub}>Add a student using the + button</Text>
              </View>
            )}
            {filteredStudents.map((st, index) => {
              const av = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
              return (
                <View key={st.id} style={styles.studentRow}>
                  <Text style={styles.rollNum}>{st.rollNo}</Text>
                  <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.avatarText, { color: av.color }]}>{getInitials(st.name)}</Text>
                  </View>
                  <Text style={styles.studentName}>{st.name}</Text>
                  <View style={[styles.genderPill, { backgroundColor: st.gender === "F" ? "#FEF3F2" : "#EFF6FF" }]}>
                    <Text style={[styles.genderText, { color: st.gender === "F" ? "#E11D48" : "#2563EB" }]}>
                      {st.gender}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.actionEdit} onPress={() => openEditStudent(st)} activeOpacity={0.75}>
                    <Ionicons name="create-outline" size={15} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionDelete} onPress={() => deleteStudent(st)} activeOpacity={0.75}>
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {/* SUBJECTS */}
        {!isStudentTab && (
          <>
            {filteredSubjects.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="library-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No subjects found</Text>
                <Text style={styles.emptySub}>Add a subject using the + button</Text>
              </View>
            )}
            {filteredSubjects.map((sub, index) => {
              const av = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
              return (
                <View key={sub.id} style={styles.subjectRow}>
                  <View style={[styles.subjectIcon, { backgroundColor: av.bg }]}>
                    <Ionicons name="library-outline" size={18} color={av.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{sub.name}</Text>
                    <View style={styles.subjectTeacherRow}>
                      <Ionicons name="person-outline" size={11} color="#9CA3AF" />
                      <Text style={styles.subjectTeacher}> {sub.teacher || "No teacher assigned"}</Text>
                    </View>
                  </View>
                  <View style={[styles.idPill, { backgroundColor: av.bg }]}>
                    <Text style={[styles.idText, { color: av.color }]}>{sub.id}</Text>
                  </View>
                  <TouchableOpacity style={styles.actionEdit} onPress={() => openEditSubject(sub)} activeOpacity={0.75}>
                    <Ionicons name="create-outline" size={15} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionDelete} onPress={() => deleteSubject(sub)} activeOpacity={0.75}>
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
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
                  {isStudentTab
                    ? (editingStudent ? "Edit student" : "Add student")
                    : (editingSubject ? "Edit subject" : "Add subject")}
                </Text>
                <Text style={styles.sheetSub}>{classInfo.className}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* STUDENT FORM */}
            {isStudentTab && (
              <>
                <Text style={styles.label}>Full name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Amina Farouq"
                  placeholderTextColor="#9CA3AF"
                  value={formName}
                  onChangeText={setFormName}
                  autoCapitalize="words"
                />

                <Text style={styles.label}>Roll number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 001"
                  placeholderTextColor="#9CA3AF"
                  value={formRoll}
                  onChangeText={setFormRoll}
                  keyboardType="number-pad"
                />

                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[styles.genderOption, formGender === "M" && styles.genderActiveMale]}
                    onPress={() => setFormGender("M")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="man-outline" size={18} color={formGender === "M" ? "#fff" : "#6B7280"} />
                    <Text style={[styles.genderOptionText, { color: formGender === "M" ? "#fff" : "#6B7280" }]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderOption, formGender === "F" && styles.genderActiveFemale]}
                    onPress={() => setFormGender("F")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="woman-outline" size={18} color={formGender === "F" ? "#fff" : "#6B7280"} />
                    <Text style={[styles.genderOptionText, { color: formGender === "F" ? "#fff" : "#6B7280" }]}>Female</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={saveStudent}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name={editingStudent ? "checkmark-circle-outline" : "person-add-outline"} size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>{editingStudent ? "Save changes" : "Add student"}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* SUBJECT FORM */}
            {!isStudentTab && (
              <>
                <Text style={styles.label}>Subject name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Algebra, Physics..."
                  placeholderTextColor="#9CA3AF"
                  value={formSubName}
                  onChangeText={setFormSubName}
                  autoCapitalize="words"
                />

                <Text style={styles.label}>Teacher <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mr. Hassan"
                  placeholderTextColor="#9CA3AF"
                  value={formSubTeacher}
                  onChangeText={setFormSubTeacher}
                  autoCapitalize="words"
                />

                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={saveSubject}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name={editingSubject ? "checkmark-circle-outline" : "add-circle-outline"} size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>{editingSubject ? "Save changes" : "Add subject"}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CLASS DETAILS MODAL ── */}
      <Modal
        visible={classDetailsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setClassDetailsVisible(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setClassDetailsVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Class details</Text>
                <Text style={styles.sheetSub}>#{classInfo.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setClassDetailsVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: sc.bg }]}>
                <Ionicons name="school-outline" size={18} color={sc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Class name</Text>
                <Text style={styles.detailValue}>{classInfo.className}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: statusStyle.bg }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={statusStyle.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, { color: statusStyle.color }]}>{statusStyle.label}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: "#EEF4FF" }]}>
                <Ionicons name="people-outline" size={18} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Students</Text>
                <Text style={styles.detailValue}>{students.length} ({maleCount} male · {femaleCount} female)</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: "#EDE9FE" }]}>
                <Ionicons name="library-outline" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Subjects</Text>
                <Text style={styles.detailValue}>{subjects.length}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={openEditClass} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Edit class</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── EDIT CLASS MODAL ── */}
      <Modal
        visible={classModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setClassModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setClassModalVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Edit class</Text>
                <Text style={styles.sheetSub}>#{classInfo.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setClassModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Class name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Form One A, Form Two B..."
              placeholderTextColor="#9CA3AF"
              value={classFormName}
              onChangeText={setClassFormName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Status</Text>
            <View style={styles.genderRow}>
              {STATUS_KEYS.map((opt) => {
                const s = STATUS_STYLES[opt];
                const active = classFormStatus === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.statusOption, active && { backgroundColor: s.bg, borderColor: s.color }]}
                    onPress={() => setClassFormStatus(opt)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.statusDot, { backgroundColor: active ? s.color : "#D1D5DB" }]} />
                    <Text style={[styles.statusOptionText, { color: active ? s.color : "#6B7280" }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, savingClass && { opacity: 0.7 }]}
              onPress={saveClass}
              disabled={savingClass}
              activeOpacity={0.85}
            >
              {savingClass ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Save changes</Text>
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

  loadingBox:   { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText:  { fontSize: 14, color: "#6B7280" },
  errorBox:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText:    { fontSize: 16, fontWeight: "700", color: "#374151" },
  errorBtn:     { backgroundColor: "#EEF4FF", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  errorBtnText: { fontSize: 14, fontWeight: "600", color: "#2563EB" },

  header:    { backgroundColor: "#2563EB", paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 10 },
  backBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  streamBadge:     { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  streamBadgeText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  headerTitle:  { fontSize: 18, fontWeight: "800", color: "#fff" },
  addBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  infoBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center", marginRight: 8 },
  statusBadge:  { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 3 },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  statusText:   { fontSize: 11, fontWeight: "700" },

  statsStrip:   { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingVertical: 12, marginBottom: 14 },
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
  tabLabelActive: { color: "#2563EB" },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", margin: 16, marginTop: 10,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  studentRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#E5E7EB",
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8, gap: 10,
  },
  rollNum:     { fontSize: 12, fontWeight: "700", color: "#D1D5DB", width: 26, textAlign: "center" },
  avatar:      { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarText:  { fontSize: 13, fontWeight: "800" },
  studentName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#111827" },
  genderPill:  { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  genderText:  { fontSize: 11, fontWeight: "700" },

  subjectRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#E5E7EB",
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 8, gap: 10,
  },
  subjectIcon:       { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  subjectName:       { fontSize: 14, fontWeight: "700", color: "#111827" },
  subjectTeacherRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  subjectTeacher:    { fontSize: 12, color: "#9CA3AF" },
  idPill:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderColor: "#E5E7EB" },
  idText:  { fontSize: 10, fontWeight: "600" },

  actionEdit:   { width: 30, height: 30, borderRadius: 8, backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center" },
  actionDelete: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center" },

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
  optional: { color: "#9CA3AF", fontWeight: "400" },

  input: {
    backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#111827", marginBottom: 18,
  },

  detailRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  detailIcon:  { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  detailLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginBottom: 2 },
  detailValue: { fontSize: 14, color: "#111827", fontWeight: "700" },

  statusOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  statusOptionText: { fontSize: 13, fontWeight: "600" },

  genderRow:          { flexDirection: "row", gap: 10, marginBottom: 20 },
  genderOption:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: "#E5E7EB" },
  genderActiveMale:   { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  genderActiveFemale: { backgroundColor: "#E11D48", borderColor: "#E11D48" },
  genderOptionText:   { fontSize: 14, fontWeight: "600" },

  saveBtn:     { backgroundColor: "#2563EB", borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
