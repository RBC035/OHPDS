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
import { Colors } from "@/constants";
import { StudentSubjectService } from "@/services/api/studentSubjectService";
import { SubjectService } from "@/services/api/subjectService";

const SUBJECT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  mathematics: "calculator-outline",
  math: "calculator-outline",
  english: "book-outline",
  science: "flask-outline",
  history: "time-outline",
  geography: "globe-outline",
  kiswahili: "chatbubble-outline",
  biology: "leaf-outline",
  chemistry: "flask-outline",
  physics: "planet-outline",
  art: "color-palette-outline",
  music: "musical-notes-outline",
  pe: "football-outline",
};

const STREAM_COLORS = [
  { iconColor: "#2563EB", iconBg: "#EEF4FF", borderColor: "#BFDBFE" },
  { iconColor: "#7C3AED", iconBg: "#EDE9FE", borderColor: "#DDD6FE" },
  { iconColor: "#16A34A", iconBg: "#DCFCE7", borderColor: "#BBF7D0" },
  { iconColor: "#EA580C", iconBg: "#FFF1E6", borderColor: "#FED7AA" },
  { iconColor: "#0891B2", iconBg: "#E0F7FA", borderColor: "#B2EBF2" },
  { iconColor: "#D97706", iconBg: "#FFFBEB", borderColor: "#FDE68A" },
];

function getSubjectIcon(name: string): keyof typeof Ionicons.glyphMap {
  const key = (name ?? "").toLowerCase().split(" ")[0];
  return SUBJECT_ICONS[key] ?? "book-outline";
}

type Subject = { id: string; name: string; status?: string };

export default function ClassSubjects() {
  const { classId, studentId, className, studyYear } = useLocalSearchParams<{
    classId: string;
    studentId: string;
    className: string;
    studyYear: string;
  }>();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [studentId]),
  );

  async function loadSubjects() {
    setLoading(true);
    try {
      const [enrRes, allSubRes] = await Promise.all([
        StudentSubjectService.getByStudent(studentId),
        SubjectService.getAll(),
      ]);

      const enrollments: any[] = enrRes.data?.data ?? enrRes.data ?? [];
      const allSubjects: any[] = allSubRes.data?.data ?? allSubRes.data ?? [];

      const subjectMap = new Map<string, any>();
      allSubjects.forEach((s: any) => subjectMap.set(String(s.id), s));

      const enriched: Subject[] = enrollments.map((enr: any) => {
        const sid = String(enr.subjectId ?? "");
        const found = subjectMap.get(sid);
        return {
          id: sid,
          name: found?.name ?? `Subject #${sid}`,
          status: enr.status ?? found?.status,
        };
      });

      setSubjects(enriched);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {className ?? "Class"}
          </Text>
          {studyYear ? <Text style={styles.headerSub}>{studyYear}</Text> : null}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── STATS STRIP ── */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{loading ? "—" : subjects.length}</Text>
          <Text style={styles.statLabel}>Subjects</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>
            {loading
              ? "—"
              : subjects.filter(
                  (s) => (s.status ?? "active").toLowerCase() === "active",
                ).length || subjects.length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          color={Colors.primary}
          size="large"
          style={{ marginTop: 60 }}
        />
      ) : subjects.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={36} color={Colors.border} />
          <Text style={styles.emptyText}>No subjects found</Text>
          <Text style={styles.emptySub}>
            No subjects are assigned to this class yet
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.listLabel}>Tap a subject to view homework</Text>

          {subjects.map((sub, index) => {
            const palette = STREAM_COLORS[index % STREAM_COLORS.length];
            const icon = getSubjectIcon(sub.name);
            const isActive =
              (sub.status ?? "active").toLowerCase() === "active";

            return (
              <TouchableOpacity
                key={sub.id}
                style={styles.subjectCard}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: "/(parent)/children/SubjectHomework" as any,
                    params: {
                      subjectId: sub.id,
                      classId: String(classId),
                      studentId: String(studentId),
                      subjectName: sub.name,
                      className: className ?? "",
                      studyYear: studyYear ?? "",
                    },
                  })
                }
              >
                <View
                  style={[
                    styles.subjectIcon,
                    {
                      backgroundColor: palette.iconBg,
                      borderColor: palette.borderColor,
                    },
                  ]}
                >
                  <Ionicons name={icon} size={20} color={palette.iconColor} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{sub.name}</Text>
                  <View style={styles.subjectMetaRow}>
                    <Ionicons
                      name="clipboard-outline"
                      size={11}
                      color="#9CA3AF"
                    />
                    <Text style={styles.subjectMeta}>Tap to view homework</Text>
                  </View>
                </View>

                <View style={styles.subjectRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: isActive ? "#DCFCE7" : "#FEE2E2" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: isActive ? "#16A34A" : "#DC2626" },
                      ]}
                    >
                      {isActive ? "Active" : (sub.status ?? "—")}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color="#D1D5DB"
                    style={{ marginTop: 4 }}
                  />
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.blueSoft,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: Colors.textPrimary },
  headerSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  scroll: { paddingHorizontal: 16, paddingTop: 14 },
  listLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  subjectCard: {
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
  subjectIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  subjectName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  subjectMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  subjectMeta: { fontSize: 11, color: "#9CA3AF" },
  subjectRight: { alignItems: "flex-end" },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
