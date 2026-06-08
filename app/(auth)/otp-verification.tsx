import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
  Radius,
  Shadows,
} from "@/constants/theme";
import { FontWeight } from "@/constants";

export default function OTPVerification() {
  const { email } = useLocalSearchParams();

  const [otp, setOtp] = useState("");
  const [focused, setFocused] = useState(false);

  const handleVerify = () => {
    router.push("/(auth)/reset-password");
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />

      {/* ───────── HEADER ───────── */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary, "#5BA4F5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={styles.iconBox}>
          <Ionicons name="shield-checkmark" size={18} color="#fff" />
        </View>

        <Text style={styles.title}>Verify OTP</Text>

        <Text style={styles.subtitle}>Sent to {email}</Text>
      </LinearGradient>

      {/* ───────── CARD ───────── */}
      <View style={styles.card}>
        <View style={styles.badge}>
          <Ionicons name="key-outline" size={14} color={Colors.primary} />
          <Text style={styles.badgeText}>OTP verification</Text>
        </View>

        <Text style={styles.label}>ENTER OTP CODE</Text>

        {/* INPUT */}
        <View style={[styles.inputWrapper, focused && styles.inputFocused]}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={focused ? Colors.primary : Colors.textMuted}
            style={{ marginRight: 10 }}
          />

          <TextInput
            placeholder="Enter OTP"
            placeholderTextColor={Colors.textMuted}
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
            style={styles.input}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>

        {/* BUTTON */}
        <TouchableOpacity style={styles.button} onPress={handleVerify}>
          <Text style={styles.buttonText}>Verify OTP</Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color="#fff"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>

        {/* BACK */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
          <Text style={styles.back}>Resend OTP</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ───────── HEADER ─────────
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 44,
    paddingBottom: 42,
    paddingHorizontal: Spacing[6],
    overflow: "hidden",
  },

  circle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  circle2: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  iconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing[5],
  },

  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize["3xl"],
    color: "#fff",
    fontWeight: "700",
  },

  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: "#fff",
    fontWeight: "600",
    marginTop: Spacing[1],
  },

  // ───────── CARD ─────────
  card: {
    flex: 1,
    marginTop: -16,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[6],
    ...Shadows.sm,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    marginBottom: Spacing[5],
  },

  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },

  label: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary,
    letterSpacing: 0.6,
    marginBottom: Spacing[2],
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    height: 52,
  },

  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },

  input: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },

  button: {
    marginTop: Spacing[5],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing[4] - 2,
    borderRadius: Radius.md,
    ...Shadows.button,
  },

  buttonText: {
    color: "#fff",
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },

  backRow: {
    marginTop: Spacing[5],
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },

  back: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
});
