import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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

import { PasswordResetService } from "@/services/api/passwordResetService";

const OTP_LENGTH = 6;

export default function OTPVerification() {
  const params = useLocalSearchParams();
  const phone = String(params.phone ?? "");

  const [otp, setOtp] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (p: string) => {
    const digits = p.replace(/\D/g, "");
    const nat = digits.startsWith("255")
      ? digits.slice(3)
      : digits.replace(/^0/, "");
    if (nat.length === 9) {
      return `+255 ${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`;
    }
    return `+255 ${nat}`;
  };

  // ── OTP input: digits only, max 6 ──
  const onChangeOtp = (t: string) => {
    const d = t.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(d);
    setError("");
  };

  // ── Verify against the backend ──
  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code`);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await PasswordResetService.verifyOtp({ phone, otp });

      if (res.success) {
        // Pass phone + otp forward; the reset step needs both.
        router.push({
          pathname: "/(auth)/reset-password",
          params: { phone, otp },
        });
      } else {
        setError(res.message || "Invalid or expired OTP");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-verify once the 6th digit is entered ──
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !loading) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // ── Resend a fresh code ──
  const handleResend = async () => {
    if (loading) return;
    setError("");
    setOtp("");
    try {
      await PasswordResetService.requestOtp({ phone });
    } catch {
      /* generic response; nothing to surface */
    }
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

        <Text style={styles.subtitle}>Code sent to {formatPhone(phone)}</Text>
      </LinearGradient>

      {/* ───────── CARD ───────── */}
      <View style={styles.card}>
        <View style={styles.badge}>
          <Ionicons name="key-outline" size={14} color={Colors.primary} />
          <Text style={styles.badgeText}>OTP verification</Text>
        </View>

        <Text style={styles.label}>ENTER {OTP_LENGTH}-DIGIT CODE</Text>

        {/* INPUT */}
        <View
          style={[
            styles.inputWrapper,
            focused && styles.inputFocused,
            !!error && styles.inputError,
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={focused ? Colors.primary : Colors.textMuted}
            style={{ marginRight: 10 }}
          />

          <TextInput
            placeholder="••••••"
            placeholderTextColor={Colors.textMuted}
            value={otp}
            onChangeText={onChangeOtp}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            style={styles.input}
            editable={!loading}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />

          {loading && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>

        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons
              name="alert-circle-outline"
              size={14}
              color={Colors.error}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* BUTTON (kept — auto-verify doesn't replace it) */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Verify OTP</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#fff"
                style={{ marginLeft: 6 }}
              />
            </>
          )}
        </TouchableOpacity>

        {/* RESEND */}
        <TouchableOpacity
          onPress={handleResend}
          style={styles.backRow}
          disabled={loading}
        >
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

  inputError: {
    borderColor: Colors.error,
    backgroundColor: "#FFF8F8",
  },

  input: {
    flex: 1,
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    letterSpacing: 8,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing[2],
  },

  errorText: {
    color: Colors.error,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
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

  buttonDisabled: {
    opacity: 0.7,
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
