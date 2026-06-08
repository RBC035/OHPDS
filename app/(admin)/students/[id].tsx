import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ClassService } from "../../../services/api/classService";
import { StudentClassService } from "../../../services/api/studentClassService";
import {
  StudentPayload,
  StudentService,
} from "../../../services/api/studentService";
import { StudentSubjectService } from "../../../services/api/studentSubjectService";
import { SubjectService } from "../../../services/api/subjectService";

type Student = { id: number; name: string; gender: string; dob: string };

// Shape returned by GET /students/{id}/classes  (student_class row + joined class name)
type AssignedClass = {
  id: number | string; // student_class record id  → DELETE /student-classes/{id}
  classId: number | string;
  name?: string; // joined class name
  studyYear?: string;
};

// Shape returned by GET /students/{id}/subjects  (student_subject row + joined subject name)
type EnrolledSubject = {
  id: number | string; // student_subject record id  → DELETE /student-subjects/{id}
  subjectId: number | string;
  name?: string; // joined subject name
  status?: string;
};

type ClassCatalog = { id: number | string; name: string; status?: string };
type SubjectCatalog = { id: number | string; name: string; status?: string };

type ActiveTab = "profile" | "classes" | "subjects";

const PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

function getInitials(name: string) {
  return name
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
      icon: "man-outline" as const,
    };
  if (g === "female" || g === "f")
    return {
      bg: "#FDF2F8",
      border: "#FBCFE8",
      color: "#DB2777",
      label: "Female",
      icon: "woman-outline" as const,
    };
  return {
    bg: "#F3F4F6",
    border: "#E5E7EB",
    color: "#EA580C",
    label: gender,
    icon: "person-outline" as const,
  };
}

function formatDob(dob: string): string {
  if (!dob) return "—";
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return dob;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dob;
  }
}

function currentAcademicYear() {
  const y = new Date().getFullYear();
  return `${y} / ${y + 1}`;
}

function calcAge(dob: string): number | null {
  if (!dob) return null;
  try {
    const birthYear = new Date(dob).getFullYear();
    if (isNaN(birthYear)) return null;
    return new Date().getFullYear() - birthYear;
  } catch {
    return null;
  }
}

function itemInitials(name?: string) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminStudentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = parseInt(id, 10);

  const [student, setStudent] = useState<Student | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);

  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>(
    [],
  );
  const [classCatalog, setClassCatalog] = useState<ClassCatalog[]>([]);
  const [subjectCatalog, setSubjectCatalog] = useState<SubjectCatalog[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
  const [tabSearch, setTabSearch] = useState("");

  // edit profile modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formGender, setFormGender] = useState("Male");
  const [formDob, setFormDob] = useState("");

  // assign modals
  const [assignClassVisible, setAssignClassVisible] = useState(false);
  const [assignSubjectVisible, setAssignSubjectVisible] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  // class select state
  const [selectedClass, setSelectedClass] = useState<ClassCatalog | null>(null);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  // editing an existing assigned class
  const [editingAssignedClass, setEditingAssignedClass] =
    useState<AssignedClass | null>(null);

  // study year for class assignment
  const [studyYear, setStudyYear] = useState(currentAcademicYear());

  // ── Loaders ──────────────────────────────────────────────────────────────

  const loadStudent = useCallback(async () => {
    try {
      setLoadingStudent(true);
      const res = await StudentService.getOne(studentId);
      const data: Student = res.data?.data ?? res.data;
      setStudent(data);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to load student.",
      );
    } finally {
      setLoadingStudent(false);
    }
  }, [studentId]);

  const loadClassesTab = useCallback(async () => {
    try {
      setLoadingTab(true);
      const [assignedRes, allRes] = await Promise.all([
        StudentClassService.getByStudent(studentId),
        ClassService.getAll(),
      ]);
      const assigned: AssignedClass[] =
        assignedRes.data?.data ?? assignedRes.data ?? [];
      const all: ClassCatalog[] = allRes.data?.data ?? allRes.data ?? [];
      setAssignedClasses(Array.isArray(assigned) ? assigned : []);
      setClassCatalog(Array.isArray(all) ? all : []);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to load classes.",
      );
    } finally {
      setLoadingTab(false);
    }
  }, [studentId]);

  const loadSubjectsTab = useCallback(async () => {
    try {
      setLoadingTab(true);
      const [enrolledRes, allRes] = await Promise.all([
        StudentSubjectService.getByStudent(studentId),
        SubjectService.getAll(),
      ]);
      const enrolled: EnrolledSubject[] =
        enrolledRes.data?.data ?? enrolledRes.data ?? [];
      const all: SubjectCatalog[] = allRes.data?.data ?? allRes.data ?? [];
      setEnrolledSubjects(Array.isArray(enrolled) ? enrolled : []);
      setSubjectCatalog(Array.isArray(all) ? all : []);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to load subjects.",
      );
    } finally {
      setLoadingTab(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  useEffect(() => {
    if (activeTab === "classes") loadClassesTab();
    if (activeTab === "subjects") loadSubjectsTab();
  }, [activeTab]);

  // ── Edit profile ──────────────────────────────────────────────────────────

  function openEdit() {
    if (!student) return;
    setFormName(student.name);
    setFormDob(student.dob ?? "");
    const g = (student.gender ?? "").toLowerCase();
    setFormGender(g === "female" || g === "f" ? "Female" : "Male");
    setEditModalVisible(true);
  }

  function openEditAssignedClass(cls: AssignedClass) {
    const found = classCatalog.find(
      (c) => String(c.id) === String(cls.classId),
    );
    setSelectedClass(
      found ?? { id: cls.classId, name: cls.name ?? `Class #${cls.classId}` },
    );
    setStudyYear(cls.studyYear ?? currentAcademicYear());
    setEditingAssignedClass(cls);
    setAssignClassVisible(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      Alert.alert("Required", "Please enter the student name.");
      return;
    }
    if (!formDob.trim()) {
      Alert.alert("Required", "Please enter the date of birth.");
      return;
    }
    const payload: StudentPayload = {
      name: formName.trim(),
      gender: formGender,
      dob: formDob.trim(),
    };
    try {
      setSaving(true);
      await StudentService.update(studentId, payload);
      setEditModalVisible(false);
      await loadStudent();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to update student.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Delete student ────────────────────────────────────────────────────────

  function handleDelete() {
    if (!student) return;
    Alert.alert(
      "Delete student",
      `Remove "${student.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await StudentService.remove(studentId);
              router.back();
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.response?.data?.message ?? "Failed to delete student.",
              );
            }
          },
        },
      ],
    );
  }

  // ── Assign class ──────────────────────────────────────────────────────────

  async function handleAssignClass(cls?: ClassCatalog) {
    const target = cls ?? selectedClass;
    if (!target) {
      Alert.alert("Required", "Please select a class.");
      return;
    }
    try {
      setAssigning(true);
      if (editingAssignedClass) {
        // update existing assigned class record
        await StudentClassService.update(editingAssignedClass.id, {
          stuentId: studentId,
          classId: target.id,
          studyYear,
        });
      } else {
        await StudentClassService.create({
          stuentId: studentId,
          studentId: studentId,
          classId: target.id,
          studyYear,
        });
      }
      setAssignClassVisible(false);
      setSelectedClass(null);
      setClassDropdownOpen(false);
      setEditingAssignedClass(null);
      await loadClassesTab();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to assign class.",
      );
    } finally {
      setAssigning(false);
    }
  }

  function handleRemoveClass(cls: AssignedClass) {
    Alert.alert(
      "Remove class",
      `Remove "${resolvedClassName(cls)}" from ${student?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await StudentClassService.remove(cls.id);
              await loadClassesTab();
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.response?.data?.message ?? "Failed to remove class.",
              );
            }
          },
        },
      ],
    );
  }

  // ── Enroll in subject ─────────────────────────────────────────────────────

  async function handleEnrollSubject(sub: SubjectCatalog) {
    try {
      setAssigning(true);
      await StudentSubjectService.create({
        stuentId: studentId,
        studentId: studentId,
        subjectId: sub.id,
        status: "active",
      });
      setAssignSubjectVisible(false);
      setAssignSearch("");
      await loadSubjectsTab();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to enroll in subject.",
      );
    } finally {
      setAssigning(false);
    }
  }

  function handleRemoveSubject(sub: EnrolledSubject) {
    Alert.alert(
      "Remove subject",
      `Remove "${resolvedSubjectName(sub)}" from ${student?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await StudentSubjectService.remove(sub.id);
              await loadSubjectsTab();
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.response?.data?.message ?? "Failed to remove subject.",
              );
            }
          },
        },
      ],
    );
  }

  // ── Name resolvers (API join may not include name) ────────────────────────

  const classNameMap = new Map(classCatalog.map((c) => [String(c.id), c.name]));
  const subjectNameMap = new Map(
    subjectCatalog.map((s) => [String(s.id), s.name]),
  );

  function resolvedClassName(c: AssignedClass) {
    return (
      c.name || classNameMap.get(String(c.classId)) || `Class #${c.classId}`
    );
  }
  function resolvedSubjectName(s: EnrolledSubject) {
    return (
      s.name ||
      subjectNameMap.get(String(s.subjectId)) ||
      `Subject #${s.subjectId}`
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const assignedClassIds = new Set(
    assignedClasses.map((c) => String(c.classId ?? c.id)),
  );
  const enrolledSubjectIds = new Set(
    enrolledSubjects.map((s) => String(s.subjectId ?? s.id)),
  );

  const availableClasses = classCatalog.filter(
    (c) =>
      !assignedClassIds.has(String(c.id)) &&
      c.name.toLowerCase().includes(assignSearch.toLowerCase()),
  );
  const availableSubjects = subjectCatalog.filter(
    (s) =>
      !enrolledSubjectIds.has(String(s.id)) &&
      s.name.toLowerCase().includes(assignSearch.toLowerCase()),
  );

  const filteredClasses = assignedClasses.filter((c) =>
    resolvedClassName(c).toLowerCase().includes(tabSearch.toLowerCase()),
  );
  const filteredSubjects = enrolledSubjects.filter((s) =>
    resolvedSubjectName(s).toLowerCase().includes(tabSearch.toLowerCase()),
  );

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loadingStudent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.centerText}>Loading student...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
          <Text style={styles.centerText}>Student not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backFallbackBtn}
          >
            <Text style={styles.backFallbackText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const gc = genderStyle(student.gender);
  const ini = getInitials(student.name);
  const age = calcAge(student.dob);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={gc.color} />

      {/* ── HEADER ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: gc.color },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>{student.name}</Text>
            <Text style={styles.headerSub}>Student Profile</Text>
          </View>
          <View style={styles.genderBadge}>
            <Ionicons name={gc.icon} size={12} color="#fff" />
            <Text style={styles.genderBadgeText}>{gc.label}</Text>
          </View>
        </View>

        <View style={styles.profileStrip}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{ini}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.infoText}>DOB: {formatDob(student.dob)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="hourglass-outline"
                size={13}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.infoText}>
                Age: {age !== null ? `${age} years` : "—"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="finger-print-outline"
                size={13}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.infoText}>ID #{student.id}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{age !== null ? age : "—"}</Text>
            <Text style={styles.stripLabel}>Age</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{assignedClasses.length}</Text>
            <Text style={styles.stripLabel}>Classes</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripNum}>{enrolledSubjects.length}</Text>
            <Text style={styles.stripLabel}>Subjects</Text>
          </View>
        </View>
      </View>

      {/* ── TABS ── */}
      <View style={styles.tabRow}>
        {(["profile", "classes", "subjects"] as ActiveTab[]).map((tab) => {
          const icons: Record<ActiveTab, any> = {
            profile: "person-outline",
            classes: "school-outline",
            subjects: "library-outline",
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab);
                setTabSearch("");
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={icons[tab]}
                size={15}
                color={activeTab === tab ? gc.color : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab && { color: gc.color },
                ]}
              >
                {tab === "profile"
                  ? "Profile"
                  : tab === "classes"
                    ? `Classes (${assignedClasses.length})`
                    : `Subjects (${enrolledSubjects.length})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════════════════ PROFILE TAB ══════════════════ */}
      {activeTab === "profile" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: gc.color }]}
              onPress={openEdit}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editBtnText}>Edit Student</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              activeOpacity={0.85}
            >
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
                <Text style={styles.detailValue}>{student.name}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: gc.bg }]}>
                <Ionicons name="calendar-outline" size={18} color={gc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Date of Birth</Text>
                <Text style={styles.detailValue}>{formatDob(student.dob)}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: gc.bg }]}>
                <Ionicons name="hourglass-outline" size={18} color={gc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Age</Text>
                <Text style={styles.detailValue}>
                  {age !== null ? `${age} years old` : "—"}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: gc.bg }]}>
                <Ionicons
                  name="transgender-outline"
                  size={18}
                  color={gc.color}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Gender</Text>
                <View
                  style={[
                    styles.genderValuePill,
                    { backgroundColor: gc.bg, borderColor: gc.border },
                  ]}
                >
                  <Ionicons name={gc.icon} size={12} color={gc.color} />
                  <Text style={[styles.genderValueText, { color: gc.color }]}>
                    {gc.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ══════════════════ CLASSES TAB ══════════════════ */}
      {activeTab === "classes" && (
        <>
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Ionicons
                name="search-outline"
                size={16}
                color="#9CA3AF"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search assigned classes..."
                placeholderTextColor="#9CA3AF"
                value={tabSearch}
                onChangeText={setTabSearch}
              />
              {tabSearch.length > 0 && (
                <TouchableOpacity onPress={() => setTabSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.assignBtn, { backgroundColor: gc.color }]}
              onPress={() => {
                setSelectedClass(null);
                setClassDropdownOpen(false);
                setStudyYear(currentAcademicYear());
                setEditingAssignedClass(null);
                setAssignClassVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {loadingTab ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={gc.color} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              {filteredClasses.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="school-outline" size={32} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyTitle}>No classes assigned</Text>
                  <Text style={styles.emptySub}>
                    Tap + to assign a class to this student
                  </Text>
                </View>
              )}
              {filteredClasses.map((cls, index) => {
                const av = PALETTE[index % PALETTE.length];
                const name = resolvedClassName(cls);
                return (
                  <View key={String(cls.id)} style={styles.itemRow}>
                    <View style={[styles.itemIcon, { backgroundColor: av.bg }]}>
                      <Text style={[styles.itemIconText, { color: av.color }]}>
                        {itemInitials(name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{name}</Text>
                      <View style={styles.itemMeta}>
                        <Text style={styles.itemMetaText}>
                          ID #{cls.classId}
                        </Text>
                        {cls.studyYear ? (
                          <>
                            <Text style={styles.metaDot}>·</Text>
                            <Text style={styles.itemMetaText}>
                              {cls.studyYear}
                            </Text>
                          </>
                        ) : null}
                      </View>
                      <View style={{ marginTop: 8 }}>
                        <TouchableOpacity
                          style={styles.smallEditBtn}
                          onPress={() => openEditAssignedClass(cls)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="create-outline"
                            size={14}
                            color="#2563EB"
                          />
                          <Text style={styles.smallEditText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemoveClass(cls)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={22}
                        color="#DC2626"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </>
      )}

      {/* ══════════════════ SUBJECTS TAB ══════════════════ */}
      {activeTab === "subjects" && (
        <>
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Ionicons
                name="search-outline"
                size={16}
                color="#9CA3AF"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search enrolled subjects..."
                placeholderTextColor="#9CA3AF"
                value={tabSearch}
                onChangeText={setTabSearch}
              />
              {tabSearch.length > 0 && (
                <TouchableOpacity onPress={() => setTabSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.assignBtn, { backgroundColor: gc.color }]}
              onPress={() => {
                setAssignSearch("");
                setAssignSubjectVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {loadingTab ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={gc.color} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              {filteredSubjects.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="library-outline"
                      size={32}
                      color="#9CA3AF"
                    />
                  </View>
                  <Text style={styles.emptyTitle}>No subjects enrolled</Text>
                  <Text style={styles.emptySub}>
                    Tap + to enroll in a subject
                  </Text>
                </View>
              )}
              {filteredSubjects.map((sub, index) => {
                const av = PALETTE[index % PALETTE.length];
                const name = resolvedSubjectName(sub);
                return (
                  <View key={String(sub.id)} style={styles.itemRow}>
                    <View style={[styles.itemIcon, { backgroundColor: av.bg }]}>
                      <Text style={[styles.itemIconText, { color: av.color }]}>
                        {itemInitials(name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{name}</Text>
                      <View style={styles.itemMeta}>
                        <Text style={styles.itemMetaText}>
                          ID #{sub.subjectId}
                        </Text>
                        {sub.status ? (
                          <>
                            <Text style={styles.metaDot}>·</Text>
                            <View
                              style={[
                                styles.statusPill,
                                {
                                  backgroundColor:
                                    sub.status === "active"
                                      ? "#DCFCE7"
                                      : "#FEF3C7",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusText,
                                  {
                                    color:
                                      sub.status === "active"
                                        ? "#16A34A"
                                        : "#D97706",
                                  },
                                ]}
                              >
                                {sub.status}
                              </Text>
                            </View>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemoveSubject(sub)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={22}
                        color="#DC2626"
                      />
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
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.overlayBg}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Edit Student</Text>
                <Text style={styles.sheetSub}>ID #{student.id}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
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
                placeholder="e.g. Amina Farouq"
                placeholderTextColor="#9CA3AF"
                value={formName}
                onChangeText={setFormName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>
                Date of birth <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
                value={formDob}
                onChangeText={setFormDob}
                keyboardType="numbers-and-punctuation"
              />

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
                style={[
                  styles.saveBtn,
                  { backgroundColor: gc.color },
                  saving && { opacity: 0.6 },
                ]}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                )}
                <Text style={styles.saveBtnText}>Save changes</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ASSIGN CLASS MODAL ── */}
      <Modal
        visible={assignClassVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignClassVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.overlayBg}
            activeOpacity={1}
            onPress={() => {
              setAssignClassVisible(false);
              setEditingAssignedClass(null);
            }}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {editingAssignedClass ? "Edit Assignment" : "Assign Class"}
                </Text>
                <Text style={styles.sheetSub}>{student.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAssignClassVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* study year */}
            <Text style={styles.label}>
              Study year <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { marginBottom: 18 }]}
              placeholder="e.g. 2025 / 2026"
              placeholderTextColor="#9CA3AF"
              value={studyYear}
              onChangeText={setStudyYear}
            />

            {/* class select */}
            <Text style={styles.label}>
              Class name <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.selectField,
                classDropdownOpen && {
                  borderColor: gc.color,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                },
              ]}
              onPress={() => setClassDropdownOpen((v) => !v)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.selectFieldText,
                  !selectedClass && { color: "#9CA3AF" },
                ]}
              >
                {selectedClass ? selectedClass.name : "Select a class..."}
              </Text>
              <Ionicons
                name={classDropdownOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color="#6B7280"
              />
            </TouchableOpacity>

            {classDropdownOpen && (
              <View style={[styles.selectDropdown, { borderColor: gc.color }]}>
                {availableClasses.length === 0 ? (
                  <View style={styles.selectEmpty}>
                    <Text style={styles.selectEmptyText}>
                      {classCatalog.length === 0
                        ? "No classes available"
                        : "All classes already assigned"}
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 220 }}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    {availableClasses.map((cls, index) => {
                      const isSelected = selectedClass?.id === cls.id;
                      const av = PALETTE[index % PALETTE.length];
                      return (
                        <TouchableOpacity
                          key={String(cls.id)}
                          style={[
                            styles.selectOption,
                            isSelected && { backgroundColor: gc.bg },
                          ]}
                          onPress={() => {
                            setSelectedClass(cls);
                            setClassDropdownOpen(false);
                          }}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.selectOptionDot,
                              { backgroundColor: av.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.selectOptionDotText,
                                { color: av.color },
                              ]}
                            >
                              {itemInitials(cls.name)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.selectOptionText,
                                isSelected && {
                                  color: gc.color,
                                  fontWeight: "700",
                                },
                              ]}
                            >
                              {cls.name}
                            </Text>
                            <Text style={styles.itemMetaText}>
                              ID #{cls.id}
                            </Text>
                          </View>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={gc.color}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: gc.color, marginTop: 20 },
                (!selectedClass || assigning) && { opacity: 0.5 },
              ]}
              onPress={() => handleAssignClass()}
              activeOpacity={0.85}
              disabled={!selectedClass || assigning}
            >
              {assigning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={
                    editingAssignedClass
                      ? "create-outline"
                      : "add-circle-outline"
                  }
                  size={18}
                  color="#fff"
                />
              )}
              <Text style={styles.saveBtnText}>
                {editingAssignedClass ? "Update Assignment" : "Assign Class"}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ENROLL SUBJECT MODAL ── */}
      <Modal
        visible={assignSubjectVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignSubjectVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.overlayBg}
            activeOpacity={1}
            onPress={() => setAssignSubjectVisible(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Enroll in Subject</Text>
                <Text style={styles.sheetSub}>{student.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAssignSubjectVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.assignSearchWrap}>
              <Ionicons
                name="search-outline"
                size={16}
                color="#9CA3AF"
                style={{ marginRight: 8 }}
              />
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

            {availableSubjects.length === 0 ? (
              <View style={[styles.emptyState, { paddingTop: 20 }]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={36}
                  color="#9CA3AF"
                />
                <Text style={styles.emptyTitle}>
                  {subjectCatalog.length === 0
                    ? "No subjects available"
                    : "All subjects enrolled"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableSubjects}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 360 }}
                renderItem={({ item, index }) => {
                  const av = PALETTE[index % PALETTE.length];
                  return (
                    <TouchableOpacity
                      style={styles.assignRow}
                      onPress={() => handleEnrollSubject(item)}
                      activeOpacity={0.8}
                      disabled={assigning}
                    >
                      <View
                        style={[styles.itemIcon, { backgroundColor: av.bg }]}
                      >
                        <Text
                          style={[styles.itemIconText, { color: av.color }]}
                        >
                          {itemInitials(item.name)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemMetaText}>ID #{item.id}</Text>
                      </View>
                      {assigning ? (
                        <ActivityIndicator size="small" color={gc.color} />
                      ) : (
                        <View
                          style={[
                            styles.assignIconBox,
                            { backgroundColor: gc.bg },
                          ]}
                        >
                          <Ionicons name="add" size={18} color={gc.color} />
                        </View>
                      )}
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

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centerText: { fontSize: 14, color: "#6B7280" },
  backFallbackBtn: {
    backgroundColor: "#FFF1E6",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backFallbackText: { fontSize: 14, fontWeight: "600", color: "#EA580C" },

  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },

  genderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  genderBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  profileStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: { fontSize: 20, fontWeight: "800", color: "#fff" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  infoText: { fontSize: 13, color: "rgba(255,255,255,0.9)" },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripNum: { fontSize: 18, fontWeight: "800", color: "#fff" },
  stripLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stripDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 4,
  },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: "#fff" },
  tabLabel: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  actionRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  editBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "700", color: "#DC2626" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 16 },
  detailIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  detailLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
    marginBottom: 3,
  },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#111827" },

  genderValuePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  genderValueText: { fontSize: 12, fontWeight: "700" },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  assignBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 10,
  },
  itemIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  itemIconText: { fontSize: 13, fontWeight: "800" },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  itemMetaText: { fontSize: 11, color: "#9CA3AF" },
  metaDot: { fontSize: 11, color: "#D1D5DB" },
  statusPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: "700" },
  removeBtn: { padding: 4 },

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

  assignSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  assignRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  assignIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

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
    maxHeight: "92%",
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
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // select dropdown
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectFieldText: { fontSize: 14, color: "#111827", flex: 1 },
  selectDropdown: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
    marginBottom: 4,
  },
  selectOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectOptionDot: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  selectOptionDotText: { fontSize: 12, fontWeight: "800" },
  selectOptionText: { fontSize: 14, color: "#111827", fontWeight: "500" },
  selectEmpty: { paddingVertical: 20, alignItems: "center" },
  selectEmptyText: { fontSize: 13, color: "#9CA3AF" },
  smallEditBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  smallEditText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
    marginLeft: 6,
  },
});
