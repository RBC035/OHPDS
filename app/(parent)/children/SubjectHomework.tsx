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
import { HomeworkService } from "@/services/api/homeworkService";

type Homework = {
  id: string;
  title: string;
  homework: string;
  startDate: string;
  endDate: string;
  description: string;
  status: string;
};

const STATUS_COLOR: Record<string, string> = {
  active:    "#2563EB",
  pending:   "#EA580C",
  completed: "#16A34A",
  closed:    "#6B7280",
};

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  active:    "time-outline",
  pending:   "hourglass-outline",
  completed: "checkmark-circle-outline",
  closed:    "lock-closed-outline",
};

function formatDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isDue(endDate: string) {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

function getDuration(start: string, end: string) {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { label: "Due today", overdue: false };
  return { label: `${days} day${days !== 1 ? "s" : ""}`, overdue: false };
}

export default function SubjectHomework() {
  const { subjectId, classId, subjectName, className, studyYear } =
    useLocalSearchParams<{
      subjectId:   string;
      classId:     string;
      subjectName: string;
      className:   string;
      studyYear:   string;
    }>();

  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading]   = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHomework();
    }, [subjectId, classId])
  );

  async function loadHomework() {
    setLoading(true);
    try {
      const res = await HomeworkService.getByClass(Number(classId));
      const all: any[] = res.data?.data ?? res.data ?? [];

      // Filter: homework.subjectId must match this subject's id
      const filtered = all.filter(
        (hw: any) => String(hw.subjectId) === String(subjectId)
      );

      const mapped: Homework[] = filtered.map((hw: any) => ({
        id:          String(hw.id),
        title:       hw.title ?? hw.homework ?? "Untitled",
        homework:    hw.homework ?? "",
        startDate:   hw.startDate ?? "",
        endDate:     hw.endDate   ?? "",
        description: hw.description ?? "",
        status:      hw.status ?? "active",
      }));

      setHomework(mapped);
    } catch {
      setHomework([]);
    } finally {
      setLoading(false);
    }
  }

  const overdue  = homework.filter(hw => isDue(hw.endDate) && hw.status !== "completed").length;
  const active   = homework.filter(hw => !isDue(hw.endDate)).length;

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{subjectName ?? "Subject"}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {className}{studyYear ? `  ·  ${studyYear}` : ""}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── STATS STRIP ── */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{loading ? "—" : homework.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: "#2563EB" }]}>{loading ? "—" : active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: "#DC2626" }]}>{loading ? "—" : overdue}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : homework.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={36} color={Colors.border} />
          <Text style={styles.emptyText}>No homework found</Text>
          <Text style={styles.emptySub}>No homework has been assigned for this subject yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.listLabel}>Homework list · {homework.length}</Text>

          {homework.map((hw) => {
            const overdueBool = isDue(hw.endDate) && hw.status !== "completed";
            const statusKey   = overdueBool ? "pending" : (hw.status ?? "active").toLowerCase();
            const color       = STATUS_COLOR[statusKey] ?? "#6B7280";
            const icon        = STATUS_ICON[statusKey]  ?? "document-outline";
            const duration    = getDuration(hw.startDate, hw.endDate);

            return (
              <TouchableOpacity
                key={hw.id}
                style={styles.hwCard}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: "/(parent)/children/HomeworkDetail" as any,
                    params: {
                      homeworkId:  hw.id,
                      title:       hw.title,
                      homework:    hw.homework,
                      startDate:   hw.startDate,
                      endDate:     hw.endDate,
                      description: hw.description,
                      status:      hw.status,
                      subjectName: subjectName ?? "",
                      className:   className   ?? "",
                      studyYear:   studyYear   ?? "",
                    },
                  })
                }
              >
                {/* left accent bar */}
                <View style={[styles.accentBar, { backgroundColor: color }]} />

                <View style={styles.hwBody}>
                  {/* title + status badge */}
                  <View style={styles.hwTitleRow}>
                    <Text style={styles.hwTitle} numberOfLines={2}>{hw.title}</Text>
                    <View style={styles.hwRight}>
                      <View style={[styles.statusBadge, { backgroundColor: color + "18" }]}>
                        <Ionicons name={icon} size={11} color={color} />
                        <Text style={[styles.statusText, { color }]}>
                          {overdueBool ? "Overdue" : hw.status.charAt(0).toUpperCase() + hw.status.slice(1)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={13} color="#D1D5DB" style={{ marginTop: 2 }} />
                    </View>
                  </View>

                  {/* date timeline */}
                  <View style={styles.dateTimeline}>
                    {/* start */}
                    <View style={styles.dateCol}>
                      <View style={styles.dateLabelRow}>
                        <Ionicons name="play-circle-outline" size={12} color="#2563EB" />
                        <Text style={[styles.dateLabel, { color: "#2563EB" }]}>Start</Text>
                      </View>
                      <Text style={styles.dateVal}>{formatDate(hw.startDate)}</Text>
                    </View>

                    {/* duration pill */}
                    <View style={styles.durationWrap}>
                      <View style={styles.durationLine} />
                      <View style={[
                        styles.durationPill,
                        duration?.overdue && { backgroundColor: "#FEE2E2" },
                      ]}>
                        <Ionicons
                          name="time-outline"
                          size={9}
                          color={duration?.overdue ? "#DC2626" : "#6B7280"}
                        />
                        <Text style={[
                          styles.durationTxt,
                          duration?.overdue && { color: "#DC2626" },
                        ]}>
                          {duration?.label ?? "—"}
                        </Text>
                      </View>
                      <View style={styles.durationLine} />
                    </View>

                    {/* due */}
                    <View style={[styles.dateCol, { alignItems: "flex-end" }]}>
                      <View style={styles.dateLabelRow}>
                        <Ionicons
                          name={overdueBool ? "alert-circle-outline" : "flag-outline"}
                          size={12}
                          color={overdueBool ? "#DC2626" : "#EA580C"}
                        />
                        <Text style={[styles.dateLabel, { color: overdueBool ? "#DC2626" : "#EA580C" }]}>
                          Due
                        </Text>
                      </View>
                      <Text style={[styles.dateVal, overdueBool && { color: "#DC2626", fontWeight: "700" }]}>
                        {formatDate(hw.endDate)}
                      </Text>
                    </View>
                  </View>
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
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.blueSoft,
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: Colors.textPrimary },
  headerSub:   { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 14, elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
  },
  statItem:    { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  statLabel:   { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  scroll:    { paddingHorizontal: 16, paddingTop: 14 },
  listLabel: {
    fontSize: 11, fontWeight: "700", color: Colors.textSecondary,
    marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5,
  },

  hwCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 10, overflow: "hidden",
  },
  accentBar: { width: 4 },
  hwBody:    { flex: 1, padding: 14, gap: 8 },

  hwTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  hwTitle: {
    flex: 1, fontSize: 15, fontWeight: "700", color: Colors.textPrimary,
  },

  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexShrink: 0,
  },
  statusText: { fontSize: 10, fontWeight: "700" },

  hwRight: { alignItems: "flex-end", gap: 4 },

  dateTimeline: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  dateCol: { flex: 1 },
  dateLabelRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 2 },
  dateLabel:    { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  dateVal:      { fontSize: 12, fontWeight: "700", color: Colors.textPrimary },

  durationWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  durationLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  durationPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
  },
  durationTxt:  { fontSize: 9, fontWeight: "700", color: "#6B7280" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText:  { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  emptySub:   {
    fontSize: 12, color: Colors.textSecondary,
    textAlign: "center", paddingHorizontal: 40,
  },
});
