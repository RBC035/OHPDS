import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { Colors, FontWeight } from "@/constants";
import { HOMEWORK } from "@/data";

// ─── constants ───────────────────────────────────────────────
const R = 60;
const STR = 14;
const C = 2 * Math.PI * R;
const SZ = (R + STR) * 2 + 4;

const MINI_R = 22;
const MINI_STR = 5;
const MINI_C = 2 * Math.PI * MINI_R;
const MINI_SZ = (MINI_R + MINI_STR) * 2 + 2;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── hook: derive counts from mock HOMEWORK data (fallback) ──
function useMockStats() {
  const pending = HOMEWORK.filter((h) => h.status === "pending").length;
  const submitted = HOMEWORK.filter((h) => h.status === "submitted").length;
  const overdue = HOMEWORK.filter((h) => h.status === "overdue").length;
  const total = pending + submitted + overdue;
  return { pending, submitted, overdue, total };
}

// ─── MiniRing ────────────────────────────────────────────────
function MiniRing({
  pct,
  color,
  delay = 0,
}: {
  pct: number;
  color: string;
  delay?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const offset = anim.interpolate({
    inputRange: [0, 100],
    outputRange: [MINI_C, MINI_C * (1 - pct / 100)],
  });

  return (
    <Svg width={MINI_SZ} height={MINI_SZ}>
      <Circle
        cx={MINI_SZ / 2}
        cy={MINI_SZ / 2}
        r={MINI_R}
        stroke={Colors.border}
        strokeWidth={MINI_STR}
        fill="none"
      />
      <G rotation="-90" origin={`${MINI_SZ / 2}, ${MINI_SZ / 2}`}>
        <AnimatedCircle
          cx={MINI_SZ / 2}
          cy={MINI_SZ / 2}
          r={MINI_R}
          stroke={color}
          strokeWidth={MINI_STR}
          fill="none"
          strokeDasharray={MINI_C}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

// ─── LegendRow ───────────────────────────────────────────────
function LegendRow({
  label,
  count,
  pct,
  color,
  bg,
  delay,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
  bg: string;
  delay: number;
}) {
  return (
    <View style={lr.row}>
      <View style={lr.ringWrap}>
        <MiniRing pct={pct} color={color} delay={delay} />
        <View style={lr.ringCenter}>
          <Text style={[lr.pct, { color }]}>{pct}%</Text>
        </View>
      </View>
      <View style={lr.textWrap}>
        <Text style={lr.label}>{label}</Text>
        <View style={[lr.badge, { backgroundColor: bg }]}>
          <Text style={[lr.badgeText, { color }]}>{count}</Text>
        </View>
      </View>
    </View>
  );
}

type ChartStats = { pending: number; submitted: number; overdue: number; total: number };

// ─── HomeworkChart ───────────────────────────────────────────
export function HomeworkChart({ stats }: { stats?: ChartStats }) {
  const mock = useMockStats();
  const { pending, submitted, overdue, total } = stats ?? mock;

  const pctPending = total > 0 ? (pending / total) * 100 : 0;
  const pctSubmitted = total > 0 ? (submitted / total) * 100 : 0;
  const pctOverdue = total > 0 ? (overdue / total) * 100 : 0;

  // Each arc starts where the previous one ends
  const rotPending = -90;
  const rotSubmitted = rotPending + (pctPending / 100) * 360;
  const rotOverdue = rotSubmitted + (pctSubmitted / 100) * 360;

  const animP = useRef(new Animated.Value(0)).current;
  const animS = useRef(new Animated.Value(0)).current;
  const animO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animP.setValue(0);
    animS.setValue(0);
    animO.setValue(0);
    Animated.stagger(120, [
      Animated.timing(animP, {
        toValue: pctPending,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animS, {
        toValue: pctSubmitted,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animO, {
        toValue: pctOverdue,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [pctPending, pctSubmitted, pctOverdue]);

  const offsetFor = (anim: Animated.Value, pct: number) =>
    anim.interpolate({
      inputRange: [0, 100],
      outputRange: [C, C * (1 - pct / 100)],
    });

  const COLORS = {
    pending: Colors.orange,
    submitted: Colors.success,
    overdue: Colors.error,
  };

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Homework overview</Text>
          <Text style={s.subtitle}>For all children</Text>
        </View>
        <View style={s.totalBadge}>
          <Text style={s.totalNum}>{total}</Text>
          <Text style={s.totalLabel}>Total</Text>
        </View>
      </View>

      {/* Donut + Legend */}
      <View style={s.body}>
        {/* Donut */}
        <View style={s.donutWrap}>
          <Svg width={SZ} height={SZ}>
            {/* Track */}
            <Circle
              cx={SZ / 2}
              cy={SZ / 2}
              r={R}
              stroke={Colors.border}
              strokeWidth={STR}
              fill="none"
            />
            {/* Pending arc */}
            <G rotation={rotPending} origin={`${SZ / 2}, ${SZ / 2}`}>
              <AnimatedCircle
                cx={SZ / 2}
                cy={SZ / 2}
                r={R}
                stroke={COLORS.pending}
                strokeWidth={STR}
                fill="none"
                strokeDasharray={C}
                strokeDashoffset={offsetFor(animP, pctPending)}
                strokeLinecap="round"
              />
            </G>
            {/* Submitted arc */}
            <G rotation={rotSubmitted} origin={`${SZ / 2}, ${SZ / 2}`}>
              <AnimatedCircle
                cx={SZ / 2}
                cy={SZ / 2}
                r={R}
                stroke={COLORS.submitted}
                strokeWidth={STR}
                fill="none"
                strokeDasharray={C}
                strokeDashoffset={offsetFor(animS, pctSubmitted)}
                strokeLinecap="round"
              />
            </G>
            {/* Overdue arc */}
            <G rotation={rotOverdue} origin={`${SZ / 2}, ${SZ / 2}`}>
              <AnimatedCircle
                cx={SZ / 2}
                cy={SZ / 2}
                r={R}
                stroke={COLORS.overdue}
                strokeWidth={STR}
                fill="none"
                strokeDasharray={C}
                strokeDashoffset={offsetFor(animO, pctOverdue)}
                strokeLinecap="round"
              />
            </G>
          </Svg>
          {/* Center label */}
          <View style={s.donutCenter}>
            <Text style={s.donutNum}>{total}</Text>
            <Text style={s.donutSub}>Tasks</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={s.legend}>
          <LegendRow
            label="Pending"
            count={pending}
            pct={Math.round(pctPending)}
            color={COLORS.pending}
            bg={Colors.orangeSoft}
            delay={0}
          />
          <LegendRow
            label="Complete"
            count={submitted}
            pct={Math.round(pctSubmitted)}
            color={COLORS.submitted}
            bg={Colors.successLight}
            delay={120}
          />
          <LegendRow
            label="Overdue"
            count={overdue}
            pct={Math.round(pctOverdue)}
            color={COLORS.overdue}
            bg={Colors.errorLight}
            delay={240}
          />
        </View>
      </View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: { fontSize: 15, fontWeight: "800", color: Colors.textPrimary },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: FontWeight.semiBold,
  },

  totalBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  totalNum: { fontSize: 20, fontWeight: "800", color: Colors.primary },
  totalLabel: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 1,
  },

  body: { flexDirection: "row", alignItems: "center", gap: 16 },

  donutWrap: { position: "relative", width: SZ, height: SZ },
  donutCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  donutNum: { fontSize: 24, fontWeight: "800", color: Colors.textPrimary },
  donutSub: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },

  legend: { flex: 1, gap: 10 },
});

const lr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  ringWrap: { position: "relative", width: MINI_SZ, height: MINI_SZ },
  ringCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  pct: { fontSize: 9, fontWeight: "800" },
  textWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" },
});

export default HomeworkChart;
