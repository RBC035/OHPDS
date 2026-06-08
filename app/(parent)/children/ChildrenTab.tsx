import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Colors, FontWeight } from "@/constants";
import { router, useFocusEffect } from "expo-router";
import { StudentParentService } from "@/services/api/studentParentService";
import { StudentClassService } from "@/services/api/studentClassService";
import { StudentSubjectService } from "@/services/api/studentSubjectService";
import { StudentService } from "@/services/api/studentService";

type Child = {
  id: string;
  name: string;
  grade: string;
  subjects: number;
  pending: number;
  submitted: number;
};

/* ─────────────────────────────
   HELPERS
───────────────────────────── */

// initials
function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

// theme-based stable color (NO random jumps)
function getAvatarColor(key: string) {
  const palette = [
    Colors.roles.parent.primary,
    Colors.roles.teacher.primary,
    Colors.roles.admin.primary,
    Colors.blue,
    Colors.teal,
    Colors.orange,
    Colors.violet,
    Colors.green,
  ];

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
}

/* ─────────────────────────────
   CHIP
───────────────────────────── */

function Chip({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.chipWrap, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

/* ─────────────────────────────
   CHILDREN TAB
───────────────────────────── */

export function ChildrenTab() {
  const [children, setChildren]   = useState<Child[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadChildren(silent = false) {
    if (!silent) setLoading(true);
    try {
      const raw = await AsyncStorage.getItem("user");
      if (!raw) return;
      const user = JSON.parse(raw);
      const parentId = user.id;

      const linkRes = await StudentParentService.getByParent(parentId);
      const links: any[] = linkRes.data?.data ?? linkRes.data ?? [];

      const enriched = await Promise.all(
        links.map(async (link: any) => {
          const studentId = link.stuentId ?? link.studentId;
          let name = "—";
          let grade = "—";
          let subjectCount = 0;
          try {
            const [stuRes, clsRes, subRes] = await Promise.all([
              StudentService.getOne(Number(studentId)),
              StudentClassService.getByStudent(studentId),
              StudentSubjectService.getByStudent(studentId),
            ]);
            const stu = stuRes.data?.data ?? stuRes.data;
            name = stu?.name ?? "—";

            const classes: any[] = clsRes.data?.data ?? clsRes.data ?? [];
            const subs: any[]   = subRes.data?.data ?? subRes.data ?? [];
            if (classes.length > 0) {
              const latest = [...classes].sort((a, b) => Number(b.id) - Number(a.id))[0];
              grade = latest.class?.name ?? latest.className ?? latest.name ?? String(latest.classId ?? "—");
            }
            subjectCount = subs.length;
          } catch {}
          return {
            id:        String(studentId),
            name,
            grade,
            subjects:  subjectCount,
            pending:   0,
            submitted: 0,
          } as Child;
        })
      );
      setChildren(enriched);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadChildren();
    }, [])
  );

  const totalChildren = children.length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadChildren(true); }}
          tintColor={Colors.primary}
        />
      }
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Children</Text>
        <Text style={styles.headerSub}>My children</Text>
      </View>

      {/* SUMMARY */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryAccent} />

        <View style={styles.summaryIconWrap}>
          <Ionicons name="people" size={28} color={Colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>Total children</Text>
        </View>

        <View style={styles.summaryBadge}>
          <Text style={styles.summaryCount}>{totalChildren}</Text>
        </View>
      </View>

      {/* CHILD LIST */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : children.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={36} color={Colors.border} />
          <Text style={styles.emptyText}>No children linked</Text>
          <Text style={styles.emptySub}>Contact admin to link your children</Text>
        </View>
      ) : (
        children.map((child) => {
          const total   = child.submitted + child.pending;
          const percent = total === 0 ? 0 : Math.round((child.submitted / total) * 100);

          const initials = getInitials(child.name);
          const avatarBg = getAvatarColor(child.id);

          return (
            <View key={child.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardTop}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/(parent)/children/ChildrenDetails",
                    params: { studentId: child.id, studentName: child.name },
                  })
                }
              >
                {/* AVATAR (THEME-BASED) */}
                <View style={[styles.avatarBox, { backgroundColor: avatarBg }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.rowItem}>
                    <Ionicons name="person-outline" size={15} color={Colors.blue} />
                    <Text style={styles.name}>{child.name}</Text>
                  </View>

                  <View style={styles.rowBetween}>
                    <View style={styles.rowItem}>
                      <Ionicons name="school-outline" size={14} color={Colors.green} />
                      <Text style={styles.meta}>{child.grade}</Text>
                    </View>

                    <View style={styles.rowItem}>
                      <Ionicons name="book-outline" size={14} color={Colors.orange} />
                      <Text style={styles.meta}>{child.subjects} Subjects</Text>
                    </View>
                  </View>

                  <View style={styles.rowItem}>
                    <Ionicons name="time-outline" size={14} color={Colors.error} />
                    <Text style={styles.meta}>
                      {child.pending} Pending Homework
                    </Text>
                  </View>

                  <View style={styles.chipRow}>
                    <Chip
                      label={`${child.subjects} Subjects`}
                      color={Colors.white}
                      bg={Colors.blue}
                    />
                    <Chip
                      label={`${child.pending} Pending`}
                      color={Colors.white}
                      bg={Colors.orange}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {/* PROGRESS */}
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Homework completion</Text>
                <Text style={styles.progressPct}>{percent}%</Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
              </View>
            </View>
          );
        })
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

/* ─────────────────────────────
   STYLES
───────────────────────────── */

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  header: { marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: Colors.textPrimary },
  headerSub: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 3,
    fontWeight: FontWeight.bold,
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 18,
    overflow: "hidden",
  },

  summaryAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: Colors.primary,
  },

  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.blueSoft,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    marginRight: 12,
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  summaryCount: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.textPrimary,
  },

  summaryBadge: {
    backgroundColor: Colors.greenSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  /* CARD */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  cardTop: {
    flexDirection: "row",
    gap: 12,
  },

  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.white,
  },

  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },

  name: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  meta: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },

  chipWrap: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginTop: 6,
  },

  chipText: {
    fontSize: 11,
    fontWeight: "700",
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 6,
  },

  progressLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },

  progressPct: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
  },

  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.blueMid,
  },

  progressFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText:  { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  emptySub:   { fontSize: 12, color: Colors.textSecondary },
});