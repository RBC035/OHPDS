import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Colors, FontWeight } from "@/constants";
import { StudentService } from "@/services/api/studentService";
import { StudentClassService } from "@/services/api/studentClassService";
import { ClassService } from "@/services/api/classService";

const GENDER_PALETTE: Record<string, string> = {
  male:   "#2563EB",
  female: "#DB2777",
  m:      "#2563EB",
  f:      "#DB2777",
};

function getAvatarColor(key: string) {
  const palette = ["#2563EB", "#7C3AED", "#16A34A", "#EA580C", "#0891B2", "#D97706"];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function getInitials(name: string) {
  return (name ?? "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

function formatDob(dob: string) {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return dob;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function calcAge(dob: string) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const STREAM_COLORS = [
  { iconColor: "#2563EB", iconBg: "#EEF4FF", borderColor: "#BFDBFE" },
  { iconColor: "#7C3AED", iconBg: "#EDE9FE", borderColor: "#DDD6FE" },
  { iconColor: "#16A34A", iconBg: "#DCFCE7", borderColor: "#BBF7D0" },
  { iconColor: "#EA580C", iconBg: "#FFF1E6", borderColor: "#FED7AA" },
];

type ClassEnrollment = {
  enrollmentId: string;
  classId: string;
  className: string;
  studyYear: string;
};

export default function ChildrenDetails() {
  const { studentId, studentName } = useLocalSearchParams<{
    studentId: string;
    studentName?: string;
  }>();

  const [student, setStudent]     = useState<any>(null);
  const [classes, setClasses]     = useState<ClassEnrollment[]>([]);
  const [loading, setLoading]     = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [studentId])
  );

  async function loadData() {
    setLoading(true);
    try {
      const [stuRes, enrRes] = await Promise.all([
        StudentService.getOne(Number(studentId)),
        StudentClassService.getByStudent(studentId),
      ]);

      const stu = stuRes.data?.data ?? stuRes.data;
      setStudent(stu);

      const enrollments: any[] = enrRes.data?.data ?? enrRes.data ?? [];
      const sorted = [...enrollments].sort((a, b) => Number(b.id) - Number(a.id));

      const enriched = await Promise.all(
        sorted.map(async (enr: any) => {
          let className = String(enr.classId ?? "—");
          try {
            const clsRes = await ClassService.getOne(enr.classId);
            const cls = clsRes.data?.data ?? clsRes.data;
            className = cls?.name ?? className;
          } catch {}
          return {
            enrollmentId: String(enr.id),
            classId:      String(enr.classId),
            className,
            studyYear:    enr.studyYear ?? "—",
          } as ClassEnrollment;
        })
      );
      setClasses(enriched);
    } catch {
      setStudent(null);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }

  const displayName = student?.name ?? studentName ?? "—";
  const avatarBg    = getAvatarColor(String(studentId));
  const initials    = getInitials(displayName);
  const genderKey   = (student?.gender ?? "").toLowerCase();
  const genderColor = GENDER_PALETTE[genderKey] ?? Colors.textSecondary;

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student details</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── PROFILE CARD ── */}
          <View style={styles.profileCard}>
            <View style={styles.profileBand} />

            <View style={[styles.avatarRing, { borderColor: avatarBg }]}>
              <View style={[styles.avatarInner, { backgroundColor: avatarBg }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>

            <Text style={styles.profileName}>{displayName}</Text>

            {student?.gender ? (
              <View style={[styles.genderBadge, { backgroundColor: genderColor + "18" }]}>
                <Ionicons
                  name={genderKey === "female" || genderKey === "f" ? "female-outline" : "male-outline"}
                  size={13}
                  color={genderColor}
                />
                <Text style={[styles.genderText, { color: genderColor }]}>
                  {student.gender.charAt(0).toUpperCase() + student.gender.slice(1)}
                </Text>
              </View>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: "#EEF4FF" }]}>
                  <Ionicons name="calendar-outline" size={17} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Date of birth</Text>
                  <Text style={styles.infoValue}>
                    {formatDob(student?.dob)}{calcAge(student?.dob) ? `  ·  Age ${calcAge(student?.dob)}` : ""}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="school-outline" size={17} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Classes enrolled</Text>
                  <Text style={styles.infoValue}>{classes.length} class{classes.length !== 1 ? "es" : ""}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── CLASS LIST ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Classes</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{classes.length}</Text>
            </View>
          </View>

          {classes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={32} color={Colors.border} />
              <Text style={styles.emptyText}>No classes enrolled</Text>
            </View>
          ) : (
            classes.map((cls, index) => {
              const palette = STREAM_COLORS[index % STREAM_COLORS.length];
              return (
                <TouchableOpacity
                  key={cls.enrollmentId}
                  style={styles.classCard}
                  activeOpacity={0.75}
                  onPress={() =>
                    router.push({
                      pathname: "/(parent)/children/ClassSubjects",
                      params: {
                        classId:    cls.classId,
                        studentId:  String(studentId),
                        className:  cls.className,
                        studyYear:  cls.studyYear,
                      },
                    })
                  }
                >
                  <View style={[styles.classIcon, { backgroundColor: palette.iconBg, borderColor: palette.borderColor }]}>
                    <Ionicons name="school-outline" size={20} color={palette.iconColor} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.className}>{cls.className}</Text>
                    <View style={styles.classMetaRow}>
                      <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.classMeta}>{cls.studyYear}</Text>
                    </View>
                  </View>

                  <View style={styles.viewSubjects}>
                    <Text style={[styles.viewSubjectsText, { color: palette.iconColor }]}>Subjects</Text>
                    <Ionicons name="chevron-forward" size={14} color={palette.iconColor} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.blueSoft,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: Colors.textPrimary },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  profileBand: { height: 70, backgroundColor: Colors.primary, opacity: 0.12 },
  avatarRing: {
    alignSelf: "center",
    marginTop: -44,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.surface,
    borderWidth: 3,
    justifyContent: "center", alignItems: "center",
  },
  avatarInner: {
    width: 78, height: 78, borderRadius: 39,
    justifyContent: "center", alignItems: "center",
  },
  avatarText:   { fontSize: 30, fontWeight: "900", color: "#fff" },
  profileName:  {
    textAlign: "center", fontSize: 20, fontWeight: "800",
    color: Colors.textPrimary, marginTop: 10, paddingHorizontal: 20,
  },
  genderBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "center",
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 6,
  },
  genderText: { fontSize: 12, fontWeight: "700" },

  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16, marginVertical: 16 },

  infoGrid: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  infoRow:  { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 34, height: 34, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  infoLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: FontWeight.bold },
  infoValue: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginTop: 1 },

  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginBottom: 10, paddingHorizontal: 2,
  },
  sectionTitle:     { fontSize: 16, fontWeight: "800", color: Colors.textPrimary },
  sectionBadge:     { backgroundColor: Colors.blueSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 12, fontWeight: "700", color: Colors.primary },

  classCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  classIcon: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  className:    { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  classMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  classMeta:    { fontSize: 12, color: "#9CA3AF" },

  viewSubjects: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewSubjectsText: { fontSize: 12, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyText:  { fontSize: 14, color: Colors.textSecondary, fontWeight: "600" },
});
