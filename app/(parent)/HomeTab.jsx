import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";

import { Colors } from "@/constants";
import { HomeworkService }      from "@/services/api/homeworkService";
import { StudentTaskService }   from "@/services/api/studentTaskService";
import { StudentParentService } from "@/services/api/studentParentService";
import { StudentClassService }  from "@/services/api/studentClassService";
import { StudentService }       from "@/services/api/studentService";
import { HomeworkChart } from "./homework/HomeworkChart";

// ─────────────────────────────
//  Helpers
// ─────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning 👋";
  if (h < 17) return "Good afternoon 👋";
  return "Good evening 👋";
}

function formatDue(d) {
  if (!d) return "—";
  const dt   = new Date(d);
  const now  = new Date();
  now.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  const diff = Math.round((dt - now) / (1000 * 60 * 60 * 24));
  if (diff < 0)   return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function deriveStatus(hw, taskByHomeworkId) {
  const task    = taskByHomeworkId[String(hw.id)];
  const endDate = hw.endDate ? new Date(hw.endDate) : null;
  const today   = new Date();
  today.setHours(0, 0, 0, 0);

  if (task) {
    // Task was submitted — check if on time or late
    const submitDate = task.submitDate ? new Date(task.submitDate) : null;
    if (endDate && submitDate && submitDate > endDate) return "overdue"; // submitted after deadline
    return "submitted";
  }
  // No task submitted yet
  if (endDate && endDate < today) return "overdue"; // deadline passed, nothing submitted
  return "pending";
}

// ─────────────────────────────
//  AnimatedNumber
// ─────────────────────────────
function AnimatedNumber({ value }) {
  const animated = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animated.setValue(0);
    const listener = animated.addListener(({ value: v }) => setDisplayValue(Math.floor(v)));
    Animated.timing(animated, { toValue: value, duration: 800, useNativeDriver: false }).start();
    return () => animated.removeListener(listener);
  }, [value]);

  return <Text style={styles.countText}>{displayValue}</Text>;
}

// ─────────────────────────────
//  QuickBtn
// ─────────────────────────────
function QuickBtn({ icon, label, count, color, accentColor, iconBg }) {
  return (
    <TouchableOpacity style={styles.quickCard} activeOpacity={0.85}>
      <View style={[styles.quickAccent, { backgroundColor: accentColor }]} />
      <View style={styles.quickContent}>
        <View style={[styles.quickIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.quickLabel, { color }]} numberOfLines={1}>{label}</Text>
          <Text style={styles.quickSub}>Homework status</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: color }]}>
          <AnimatedNumber value={count} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────
//  HomeworkRow
// ─────────────────────────────
function HomeworkRow({ hw }) {
  const isPending = hw.status === "pending";
  return (
    <View style={styles.hwRow}>
      <View style={[styles.hwDot, { backgroundColor: hw.color + "20" }]}>
        <Ionicons name={hw.icon} size={18} color={hw.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.hwTitle}>{hw.title}</Text>
        <Text style={styles.hwMeta}>
          {hw.subject}{hw.child ? ` · ${hw.child}` : ""}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: isPending ? Colors.orangeSoft : Colors.greenSoft }]}>
        <Text style={[styles.statusText, { color: isPending ? Colors.orange : Colors.green }]}>
          {isPending ? `Due ${hw.due}` : hw.status === "overdue" ? "Overdue" : "Done"}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────
export function HomeTab() {
  const [user, setUser]         = useState(null);
  const [stats, setStats]       = useState(null);
  const [recentHw, setRecentHw] = useState([]);
  const [loading, setLoading]   = useState(true);

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  async function loadData() {
    setLoading(true);
    try {
      // ── 1. User ──────────────────────────────────────────────
      const raw = await AsyncStorage.getItem("user");
      if (!raw) return;
      const userData = JSON.parse(raw);
      setUser(userData);
      const parentId = userData.id;

      // ── 2. Parent's children ─────────────────────────────────
      const linkRes = await StudentParentService.getByParent(parentId);
      const links   = linkRes.data?.data ?? linkRes.data ?? [];

      if (links.length === 0) {
        setStats({ pending: 0, submitted: 0, overdue: 0, total: 0 });
        setRecentHw([]);
        return;
      }

      // ── 3. For each child fetch name + enrolled classes ──────
      const childData = await Promise.all(
        links.map(async (link) => {
          const studentId = link.stuentId ?? link.studentId;
          try {
            const [stuRes, clsRes] = await Promise.all([
              StudentService.getOne(Number(studentId)),
              StudentClassService.getByStudent(studentId),
            ]);
            const stu         = stuRes.data?.data ?? stuRes.data;
            const studentName = stu?.name ?? "Student";
            const classes     = clsRes.data?.data ?? clsRes.data ?? [];
            const classIds    = classes.map((c) => String(c.classId));
            return { studentName, classIds };
          } catch {
            return { studentName: "Student", classIds: [] };
          }
        })
      );

      // ── 4. Map classId → student names (for display) ─────────
      const classToStudents = {}; // { classId: [name, ...] }
      childData.forEach(({ studentName, classIds }) => {
        classIds.forEach((cid) => {
          if (!classToStudents[cid]) classToStudents[cid] = [];
          classToStudents[cid].push(studentName);
        });
      });

      const uniqueClassIds = Object.keys(classToStudents);
      if (uniqueClassIds.length === 0) {
        setStats({ pending: 0, submitted: 0, overdue: 0, total: 0 });
        setRecentHw([]);
        return;
      }

      // ── 5. Fetch homework per class + all tasks in parallel ───
      const [homeworkResults, taskRes] = await Promise.all([
        Promise.all(uniqueClassIds.map((cid) => HomeworkService.getByClass(Number(cid)))),
        StudentTaskService.getAll(),
      ]);

      // ── 6. Deduplicate homework by id; tag with classId ───────
      const hwMap = {}; // homeworkId → hw object
      homeworkResults.forEach((res, idx) => {
        const classId = uniqueClassIds[idx];
        const items   = res.data?.data ?? res.data ?? [];
        items.forEach((hw) => {
          if (!hwMap[String(hw.id)]) {
            hwMap[String(hw.id)] = { ...hw, _classId: classId };
          }
        });
      });

      // ── 7. Task lookup by homeworkId ──────────────────────────
      const allTasks = taskRes.data?.data ?? taskRes.data ?? [];
      const taskByHomeworkId = {};
      allTasks.forEach((t) => {
        taskByHomeworkId[String(t.homeworkId)] = t;
      });

      // ── 8. Build rows ─────────────────────────────────────────
      const rows = Object.values(hwMap).map((hw) => {
        const studentNames = classToStudents[String(hw._classId)] ?? [];
        const status       = deriveStatus(hw, taskByHomeworkId);
        return {
          id:      String(hw.id),
          title:   hw.title || hw.homework || "Untitled",
          subject: hw.subjectName || hw.subject || "Homework",
          child:   studentNames.join(", "),
          due:     formatDue(hw.endDate),
          status,
          color:   status === "submitted" ? Colors.green
                 : status === "overdue"   ? Colors.error
                 :                          Colors.orange,
          icon:    status === "submitted" ? "checkmark-circle-outline"
                 : status === "overdue"   ? "warning-outline"
                 :                          "book-outline",
        };
      });

      const pending   = rows.filter((h) => h.status === "pending").length;
      const submitted = rows.filter((h) => h.status === "submitted").length;
      const overdue   = rows.filter((h) => h.status === "overdue").length;

      setStats({ pending, submitted, overdue, total: rows.length });
      setRecentHw([...rows].reverse().slice(0, 3));

    } catch {
      // keep previous state on error
    } finally {
      setLoading(false);
    }
  }

  const displayName = user?.name
    ?? [user?.firstName, user?.lastName].filter(Boolean).join(" ")
    ?? user?.fullName
    ?? "Parent";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.parentName}>{displayName}</Text>
          <Text style={styles.bannerSub}>Here's today's overview</Text>
        </View>
        <TouchableOpacity style={styles.bannerIcon}>
          <Ionicons name="notifications-outline" size={22} color={Colors.white} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* Chart */}
      <Text style={styles.sectionLabel}>Homework overview</Text>
      <HomeworkChart stats={stats ?? undefined} />

      {/* Quick Actions */}
      <Text style={styles.sectionLabel}>Homework status</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.quickColumn}>
          <QuickBtn
            icon="sparkles-outline"
            label="New homework"
            count={stats?.pending ?? 0}
            color={Colors.blue}
            accentColor={Colors.blueSoft}
            iconBg={Colors.blueSoft}
          />
          <QuickBtn
            icon="checkmark-done-outline"
            label="Finished homework"
            count={stats?.submitted ?? 0}
            color={Colors.green}
            accentColor={Colors.greenSoft}
            iconBg={Colors.greenSoft}
          />
          <QuickBtn
            icon="alert-circle-outline"
            label="Overdue homework"
            count={stats?.overdue ?? 0}
            color={Colors.error}
            accentColor={Colors.errorLight}
            iconBg={Colors.errorLight}
          />
        </View>
      )}

      {/* Recent Homework */}
      <Text style={styles.sectionLabel}>Recent homework</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 10 }} />
      ) : recentHw.length === 0 ? (
        <Text style={styles.emptyText}>No homework found for your children</Text>
      ) : (
        recentHw.map((hw) => <HomeworkRow key={hw.id} hw={hw} />)
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ─────────────────────────────
//  STYLES
// ─────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  /* Banner */
  banner: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 34,
    marginBottom: 24,
    elevation: 6,
  },
  bannerLeft: { flex: 1 },
  greeting:   { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  parentName: { fontSize: 22, fontWeight: "800", color: Colors.white },
  bannerSub:  { fontSize: 12, color: "rgba(255,255,255,0.65)" },

  bannerIcon: { position: "relative", padding: 4 },
  notifDot: {
    position: "absolute", top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.orange,
  },

  /* Section */
  sectionLabel: {
    fontSize: 16, fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 12, marginTop: 10,
  },

  /* Quick Column */
  quickColumn: { gap: 12, marginBottom: 24 },

  quickCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
  },
  quickAccent:  { height: 3, width: "100%" },
  quickContent: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  quickIcon: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  quickLabel: { fontSize: 14, fontWeight: "800" },
  quickSub:   { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  countBadge: {
    minWidth: 36, height: 30, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
  },
  countText: { fontSize: 13, fontWeight: "900", color: Colors.white },

  /* Homework rows */
  hwRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  hwDot: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  hwTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  hwMeta:  { fontSize: 11, color: Colors.textSecondary },

  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontWeight: "700" },

  emptyText: {
    fontSize: 13, color: Colors.textSecondary,
    textAlign: "center", paddingVertical: 16,
  },
});
