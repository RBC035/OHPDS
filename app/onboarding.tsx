import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

/* ─── Design tokens ─── */
const C = {
  blue:    '#2563EB',
  blueSoft:'#EFF6FF',
  blueMid: '#DBEAFE',
  orange:  '#F97316',
  orangeSoft: '#FFF7ED',
  teal:    '#0D9488',
  tealSoft:'#F0FDFA',
  ink:     '#0F172A',
  slate:   '#64748B',
  muted:   '#94A3B8',
  border:  '#E2E8F0',
  white:   '#FFFFFF',
  bg:      '#F8FAFF',
};

/* ─── Illustration ─── */
function Illustration() {
  return (
    <View style={ill.wrap}>
      {/* Big soft circle backdrop */}
      <View style={ill.circle} />

      {/* Floating homework card */}
      <View style={[ill.card, ill.cardLeft]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <View style={[ill.dot, { backgroundColor: C.blue }]} />
          <Text style={ill.cardTitle}>Math Homework</Text>
        </View>
        <View style={ill.bar} />
        <View style={[ill.bar, { width: '60%', marginTop: 4 }]} />
        <View style={[ill.badge2, { marginTop: 8 }]}>
          <Ionicons name="checkmark-circle" size={11} color={C.teal} />
          <Text style={ill.badge2Text}>Submitted</Text>
        </View>
      </View>

      {/* Upload badge */}
      <View style={[ill.card, ill.cardRight]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={[ill.iconBox, { backgroundColor: C.orangeSoft }]}>
            <Ionicons name="cloud-upload-outline" size={14} color={C.orange} />
          </View>
          <View>
            <Text style={ill.cardTitle}>Upload Work</Text>
            <Text style={ill.cardSub}>Photo → Teacher</Text>
          </View>
        </View>
      </View>

      {/* Central device */}
      <View style={ill.device}>
        <View style={ill.deviceTop}>
          <View style={ill.notch} />
        </View>
        <View style={ill.deviceScreen}>
          {/* Mini app UI inside phone */}
          <View style={ill.miniHeader}>
            <View style={[ill.miniDot, { backgroundColor: C.blue }]} />
            <View style={ill.miniLine} />
          </View>
          <View style={ill.miniCard}>
            <View style={[ill.miniDot, { backgroundColor: C.orange }]} />
            <View style={{ flex: 1 }}>
              <View style={[ill.miniLine, { width: '80%' }]} />
              <View style={[ill.miniLine, { width: '55%', marginTop: 3 }]} />
            </View>
          </View>
          <View style={ill.miniCard}>
            <View style={[ill.miniDot, { backgroundColor: C.teal }]} />
            <View style={{ flex: 1 }}>
              <View style={[ill.miniLine, { width: '70%' }]} />
              <View style={[ill.miniLine, { width: '40%', marginTop: 3 }]} />
            </View>
          </View>
          <View style={ill.miniBtn} />
        </View>
        <View style={ill.deviceBottom}>
          <View style={ill.homeBar} />
        </View>
      </View>

      {/* SMS notification badge */}
      <View style={ill.smsBadge}>
        <Ionicons name="notifications" size={13} color={C.blue} />
        <Text style={ill.smsText}>SMS sent to parent</Text>
      </View>

      {/* Student count */}
      <View style={ill.countBadge}>
        <Ionicons name="people" size={12} color={C.white} />
        <Text style={ill.countText}>680+ Students</Text>
      </View>
    </View>
  );
}

const ill = StyleSheet.create({
  wrap: {
    width: width - 48,
    height: 220,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  circle: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: C.blueMid,
  },

  // Floating cards
  card: {
    position: 'absolute',
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 10,
    shadowColor: C.blue,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    minWidth: 120,
  },
  cardLeft:  { top: 10, left: 0 },
  cardRight: { bottom: 18, right: 0 },

  dot:  { width: 10, height: 10, borderRadius: 5 },
  bar:  { height: 5, borderRadius: 3, backgroundColor: C.blueMid, width: '100%' },

  badge2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.tealSoft,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badge2Text: { fontSize: 10, fontWeight: '700', color: C.teal },

  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 11, fontWeight: '700', color: C.ink },
  cardSub:   { fontSize: 10, color: C.slate, marginTop: 1 },

  // Central phone
  device: {
    width: 80,
    height: 155,
    backgroundColor: C.ink,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  deviceTop: {
    height: 18,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notch: { width: 24, height: 6, borderRadius: 3, backgroundColor: '#1E293B' },
  deviceScreen: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 6,
    paddingTop: 6,
    gap: 4,
  },
  deviceBottom: {
    height: 14,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBar: { width: 22, height: 3, borderRadius: 2, backgroundColor: '#334155' },

  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  miniDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue },
  miniLine: { height: 4, borderRadius: 2, backgroundColor: C.blueMid, width: '100%', flex: 1 },

  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.white,
    borderRadius: 6,
    padding: 5,
  },

  miniBtn: {
    height: 12,
    borderRadius: 6,
    backgroundColor: C.blue,
    marginTop: 4,
  },

  // Badges
  smsBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.blueSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.blueMid,
  },
  smsText: { fontSize: 10, fontWeight: '700', color: C.blue },

  countBadge: {
    position: 'absolute',
    bottom: 4,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.blue,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countText: { fontSize: 10, fontWeight: '700', color: C.white },
});

/* ─── Feature row item ─── */
function FeatureItem({
  icon, color, bg, title, desc,
}: {
  icon: string; color: string; bg: string; title: string; desc: string;
}) {
  return (
    <View style={feat.row}>
      <View style={[feat.icon, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={feat.title}>{title}</Text>
        <Text style={feat.desc}>{desc}</Text>
      </View>
    </View>
  );
}

const feat = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  icon:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 2 },
  desc:  { fontSize: 12, color: C.slate, lineHeight: 17 },
});

/* ─── Pagination dots ─── */
function Dots() {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 16 }}>
      <View style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: C.blue }} />
      <View style={{ width: 6,  height: 6, borderRadius: 3, backgroundColor: C.blueMid }} />
      <View style={{ width: 6,  height: 6, borderRadius: 3, backgroundColor: C.blueMid }} />
    </View>
  );
}

/* ─── Main screen ─── */
export default function OnboardingScreen() {
  const fade  = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <Animated.View style={[s.topBar, { marginTop: 15, opacity: fade }]}>
          <View style={s.logoMark}>
            <Ionicons name="layers" size={17} color={C.white} />
          </View>
          <Text style={s.logoText}>OHMDS</Text>
          <View style={{ flex: 1 }} />
          <View style={s.versionBadge}>
            <Text style={s.versionText}>v1.0</Text>
          </View>
        </Animated.View>

        {/* ── Illustration ── */}
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slideY }] }}>
          <Illustration />
        </Animated.View>

        {/* ── Dots ── */}
        <Animated.View style={{ opacity: fade }}>
          <Dots />
        </Animated.View>

        {/* ── Tag + headline ── */}
        <Animated.View style={[{ opacity: fade, transform: [{ translateY: slideY }] }]}>
          <Text style={s.tag}>SMART SCHOOL PLATFORM</Text>

          <Text style={s.headline}>
            Connect, Learn &{' '}
            <Text style={s.accentBlue}>Grow </Text>
            <Text style={s.accentOrange}>Together</Text>
          </Text>

          <Text style={s.body}>
           Help student and teacher to connect and share homework, and task in one place. It is collaborative learning environment for everyone.
          </Text>
        </Animated.View>

        {/* ── CTA ── */}
        <Animated.View style={[s.cta, { opacity: fade }]}>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.88}
          >
            <Text style={s.primaryText}>Get started</Text>
            <View style={s.arrowWrap}>
              <Ionicons name="arrow-forward" size={16} color={C.white} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7}>
            <Text style={s.signIn}>
              Already have an account?{' '}
              <Text style={s.signInBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─── */
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },

  scroll: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 36,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: 1.8,
  },
  versionBadge: {
    backgroundColor: C.blueSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.blueMid,
  },
  versionText: { fontSize: 11, fontWeight: '700', color: C.blue },

  // Text
  tag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: C.blue,
    marginBottom: 10,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: C.ink,
    lineHeight: 36,
    marginBottom: 12,
  },
  accentBlue:   { color: C.blue },
  accentOrange: { color: C.orange },

  body: {
    fontSize: 14,
    color: C.slate,
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: '700',
  },

  // Feature card
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#2563EB',
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: C.border,
  },

  // CTA
  cta: { gap: 14 },

  primaryBtn: {
  height: 56,
  borderRadius: 16,
  backgroundColor: C.blue,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: C.blue,
  shadowOpacity: 0.35,
  shadowRadius: 14,
  elevation: 6,
  position: 'relative',
},
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
  },

  arrowWrap: {
  position: 'absolute',
  right: 18,
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: 'rgba(255,255,255,0.22)',
  justifyContent: 'center',
  alignItems: 'center',
},

  signIn: {
    textAlign: 'center',
    fontSize: 13,
    color: C.slate,
    fontWeight: '600',
  },
  signInBold: {
    fontWeight: '700',
    color: C.blue,
  },
});