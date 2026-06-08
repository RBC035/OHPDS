import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { Colors, FontSize, FontWeight } from "@/constants";
import { router, useLocalSearchParams } from "expo-router";

import { HOMEWORK_DETAILS } from "@/data";

type FileType = "pdf" | "word" | "ppt" | "other";

interface HomeworkFile {
  name: string;
  type: FileType;
  size: string;
  url: string;
}

function daysRemaining(endDateStr: string): number {
  const end = new Date(endDateStr);

  const now = new Date();

  now.setHours(0, 0, 0, 0);

  end.setHours(0, 0, 0, 0);

  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const FILE_ICONS: Record<FileType, keyof typeof Ionicons.glyphMap> = {
  pdf: "document-text-outline",
  word: "document-outline",
  ppt: "easel-outline",
  other: "attach-outline",
};

const FILE_COLORS: Record<FileType, string> = {
  pdf: "#E53935",
  word: "#1565C0",
  ppt: "#E65100",
  other: "#546E7A",
};

/* ─────────────────────────────
   INFO TILE
───────────────────────────── */

function InfoTile({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoTile}>
      <View
        style={[
          styles.infoTileIcon,
          {
            backgroundColor: iconColor + "18",
          },
        ]}
      >
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>

      <Text style={styles.infoTileLabel}>{label}</Text>

      <Text style={styles.infoTileValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/* ─────────────────────────────
   FILE CARD
───────────────────────────── */

function FileCard({ file }: { file: HomeworkFile }) {
  const color = FILE_COLORS[file.type] ?? FILE_COLORS.other;

  const icon = FILE_ICONS[file.type] ?? FILE_ICONS.other;

  const open = () => {
    if (file.url) {
      Linking.openURL(file.url).catch(() => {});
    }
  };

  return (
    <TouchableOpacity
      style={styles.fileCard}
      activeOpacity={0.75}
      onPress={open}
    >
      <View
        style={[
          styles.fileIconBox,
          {
            backgroundColor: color + "18",
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={color} />

        <Text style={[styles.fileTypeLabel, { color }]}>
          {file.type.toUpperCase()}
        </Text>
      </View>

      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={2}>
          {file.name}
        </Text>

        <Text style={styles.fileSize}>{file.size}</Text>
      </View>

      <View
        style={[
          styles.fileDownloadBtn,
          {
            backgroundColor: color + "15",
          },
        ]}
      >
        <Ionicons name="cloud-download-outline" size={18} color={color} />
      </View>
    </TouchableOpacity>
  );
}

/* ─────────────────────────────
   MAIN SCREEN
───────────────────────────── */

export default function HomeworkDetails() {
  const { homeworkId } = useLocalSearchParams();

  const hw =
    HOMEWORK_DETAILS.find((item) => item.id === homeworkId) ||
    HOMEWORK_DETAILS[0];

  const days = daysRemaining(hw.endDate);

  const isLate = days < 0;

  const isToday = days === 0;

  const statusColor: Record<string, string> = {
    pending: Colors.orange,
    submitted: Colors.green,
    overdue: Colors.error,
  };

  const statusIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
    pending: "time-outline",
    submitted: "checkmark-circle-outline",
    overdue: "alert-circle-outline",
  };

  const daysColor = isLate
    ? Colors.error
    : isToday
      ? Colors.orange
      : days <= 3
        ? Colors.orange
        : Colors.green;

  const daysLabel = isLate
    ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`
    : isToday
      ? "Due today"
      : `${days} day${days !== 1 ? "s" : ""} remaining`;

  return (
    <View style={styles.rootContainer}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.75}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Homework details</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroBand} />

          <View style={styles.heroTopRow}>
            <View style={styles.subjectChip}>
              <Ionicons name="book-outline" size={12} color={Colors.blue} />

              <Text style={styles.subjectChipText}>{hw.subject}</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    (statusColor[hw.status] ?? Colors.primary) + "20",
                },
              ]}
            >
              <Ionicons
                name={statusIcon[hw.status] ?? "ellipse-outline"}
                size={12}
                color={statusColor[hw.status] ?? Colors.primary}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: statusColor[hw.status] ?? Colors.primary,
                  },
                ]}
              >
                {hw.status.charAt(0).toUpperCase() + hw.status.slice(1)}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{hw.title}</Text>

          <View
            style={[
              styles.countdownPill,
              {
                backgroundColor: daysColor + "18",
                borderColor: daysColor + "40",
              },
            ]}
          >
            <Ionicons
              name={isLate ? "alert-circle" : "timer-outline"}
              size={14}
              color={daysColor}
            />

            <Text
              style={[
                styles.countdownText,
                {
                  color: daysColor,
                },
              ]}
            >
              {daysLabel}
            </Text>
          </View>
        </View>

        {/* DATES */}
        <View style={styles.datesRow}>
          <InfoTile
            icon="calendar-outline"
            iconColor={Colors.blue}
            label="Start Date"
            value={formatDate(hw.startDate)}
          />

          <View style={styles.datesDivider} />

          <InfoTile
            icon="flag-outline"
            iconColor={Colors.error}
            label="Due Date"
            value={formatDate(hw.endDate)}
          />
        </View>

        {/* TEACHER */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subject teacher</Text>

          <View style={styles.teacherRow}>
            <View style={styles.teacherAvatar}>
              <Ionicons name="person" size={22} color={Colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.teacherName}>{hw.teacher}</Text>

              <Text style={styles.teacherSubject}>{hw.subject}</Text>
            </View>
          </View>

          <View style={styles.phoneRow}>
            <TouchableOpacity
              style={styles.callBtn}
              activeOpacity={0.8}
              onPress={() => Linking.openURL(`tel:${hw.teacherPhone}`)}
            >
              <Ionicons name="call" size={16} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.phoneText}>{hw.teacherPhone}</Text>
          </View>
        </View>

        {/* INSTRUCTIONS */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="reader-outline" size={16} color={Colors.primary} />

            <Text style={styles.cardTitle}>Instructions</Text>
          </View>

          <Text style={styles.contentText}>{hw.content}</Text>
        </View>

        {/* ATTACHMENTS */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="attach-outline" size={16} color={Colors.primary} />

            <Text style={styles.cardTitle}>Attachments</Text>

            <View style={styles.attachCount}>
              <Text style={styles.attachCountText}>{hw.files.length}</Text>
            </View>
          </View>

          <View style={styles.fileList}>
            {hw.files.map((file, i) => (
              <FileCard key={i} file={file} />
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────────
   STYLES
───────────────────────────── */

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },

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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.blueSoft,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  headerSpacer: {
    width: 36,
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },

  heroBand: {
    height: 6,
    backgroundColor: Colors.primary,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  subjectChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.blue,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    lineHeight: 28,
  },

  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  countdownText: {
    fontSize: 12,
    fontWeight: "800",
  },

  datesRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    overflow: "hidden",
  },

  infoTile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    gap: 6,
  },

  infoTileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  infoTileLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },

  infoTileValue: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },

  datesDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  attachCount: {
    backgroundColor: Colors.blueSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },

  attachCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },

  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  teacherAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.blueSoft,
    justifyContent: "center",
    alignItems: "center",
  },

  teacherName: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  teacherSubject: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.green,
    justifyContent: "center",
    alignItems: "center",
  },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  phoneText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
  },

  contentText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontWeight: FontWeight.bold,
  },

  fileList: {
    gap: 10,
  },

  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  fileIconBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },

  fileTypeLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  fileInfo: {
    flex: 1,
    gap: 3,
  },

  fileName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 18,
  },

  fileSize: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  fileDownloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
