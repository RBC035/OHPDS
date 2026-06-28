import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";

import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
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

export default function ForgotPassword() {
  // Only the 9 national digits live in state; "+255" is a fixed prefix.
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ─────────────────────────────
  // Shake animation
  // ─────────────────────────────
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onChangePhone = (t: string) => {
    let d = t.replace(/\D/g, ""); // keep digits only
    d = d.replace(/^0+/, ""); // block leading zero(s) entirely
    if (d.length > 9) d = d.slice(0, 9);
    setPhone(d);
    setError("");
  };

  // ─────────────────────────────
  // Send OTP
  // ─────────────────────────────
  const handleSend = async () => {
    if (phone.length !== 9) {
      setError("Enter a valid 9-digit phone number");
      triggerShake();
      return;
    }

    // Full E.164-style national number for the backend (it normalises anyway).
    const fullPhone = `255${phone}`;

    setLoading(true);
    try {
      await PasswordResetService.requestOtp({ phone: fullPhone });

      // The backend always responds generically (it never reveals whether the
      // number exists), so we always move forward to the OTP screen.
      router.push({
        pathname: "/(auth)/otp-verification",
        params: { phone: fullPhone },
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Could not send the code. Please try again.";
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />

      {/* ───────────────── HEADER ───────────────── */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary, "#5BA4F5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Ionicons name="lock-closed" size={18} color="#fff" />
          </View>

          <Text style={styles.logoText}>OHPDS</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Forgot password</Text>

        <Text style={styles.subtitle}>
          Enter your phone number and we will send an OTP verification code by
          SMS.
        </Text>
      </LinearGradient>

      {/* ───────────────── FORM ───────────────── */}
      <Animated.View
        style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}
      >
        {/* Badge */}
        <View style={styles.badge}>
          <Ionicons name="call-outline" size={14} color={Colors.primary} />
          <Text style={styles.badgeText}>Password recovery</Text>
        </View>

        {/* Phone Input */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>PHONE NUMBER</Text>

          <View
            style={[
              styles.inputRow,
              focused && styles.inputFocused,
              !!error && styles.inputError,
            ]}
          >
            {/* Fixed, non-editable +255 prefix */}
            <View style={styles.prefixBox}>
              <Ionicons
                name="call-outline"
                size={16}
                color={Colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.prefixText}>+255</Text>
            </View>

            <View style={styles.prefixDivider} />

            <TextInput
              placeholder="712 345 678"
              placeholderTextColor={Colors.textMuted}
              value={phone}
              onChangeText={onChangePhone}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={9}
              autoCorrect={false}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
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
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Send OTP</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#fff"
                style={{ marginLeft: 6 }}
              />
            </>
          )}
        </TouchableOpacity>

        {/* Back */}
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back-outline"
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.backText}>Back to login</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ───────────────── HEADER ─────────────────
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

  circle3: {
    position: "absolute",
    top: 60,
    right: 60,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing[5],
  },

  logoBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  logoText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: "#fff",
    letterSpacing: 0.5,
  },

  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize["3xl"],
    color: "#fff",
    fontWeight: "700",
    marginBottom: Spacing[1],
  },

  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: "#fff",
    lineHeight: 22,
    fontWeight: "600",
  },

  // ───────────────── FORM ─────────────────
  formCard: {
    flex: 1,
    marginTop: -16,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[8],
    ...Shadows.sm,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    marginBottom: Spacing[5],
  },

  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },

  // ───────────────── INPUT ─────────────────
  inputWrapper: {
    marginBottom: Spacing[5],
  },

  label: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 0.6,
    marginBottom: Spacing[2],
  },

  inputRow: {
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

  // Fixed +255 prefix
  prefixBox: {
    flexDirection: "row",
    alignItems: "center",
  },

  prefixText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  prefixDivider: {
    width: 1,
    height: 22,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing[3],
  },

  input: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    letterSpacing: 1,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing[1],
  },

  errorText: {
    color: Colors.error,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
  },

  // ───────────────── BUTTON ─────────────────
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing[4] - 2,
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

  // ───────────────── BACK ─────────────────
  backRow: {
    marginTop: Spacing[5],
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },

  backText: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
});
