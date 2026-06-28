import React, { useState } from "react";
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

export default function ResetPassword() {
  // Carried over from the OTP screen — both are needed by the backend.
  const params = useLocalSearchParams();
  const phone = String(params.phone ?? "");
  const otp = String(params.otp ?? "");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [focus, setFocus] = useState({ password: false, confirm: false });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    // ── Validation ──
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    // Safety: if we somehow arrived without phone/otp, send the user back.
    if (!phone || !otp) {
      setError("Your reset session expired. Please request a new code.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await PasswordResetService.resetPassword({
        phone,
        otp,
        password,
      });

      if (res.success) {
        router.replace("/(auth)/login");
      } else {
        setError(res.message || "Failed to reset password");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Failed to reset password. The code may have expired.",
      );
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

      {/* HEADER */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary, "#5BA4F5"]}
        style={styles.header}
      >
        <View style={styles.iconBox}>
          <Ionicons name="key" size={18} color="#fff" />
        </View>

        <Text style={styles.title}>Reset password</Text>

        <Text style={styles.subtitle}>Create a new secure password</Text>
      </LinearGradient>

      {/* CARD */}
      <View style={styles.card}>
        <View style={styles.badge}>
          <Ionicons
            name="lock-closed-outline"
            size={14}
            color={Colors.primary}
          />
          <Text style={styles.badgeText}>Security update</Text>
        </View>

        {/* NEW PASSWORD */}
        <Text style={styles.label}>NEW PASSWORD</Text>

        <View
          style={[
            styles.inputWrapper,
            focus.password && styles.inputFocused,
            !!error && styles.inputError,
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={focus.password ? Colors.primary : Colors.textMuted}
            style={{ marginRight: 10 }}
          />

          <TextInput
            placeholder="Enter new password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError("");
            }}
            style={styles.input}
            editable={!loading}
            onFocus={() => setFocus((p) => ({ ...p, password: true }))}
            onBlur={() => setFocus((p) => ({ ...p, password: false }))}
          />

          <TouchableOpacity
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* CONFIRM PASSWORD */}
        <Text style={[styles.label, { marginTop: Spacing[4] }]}>
          CONFIRM PASSWORD
        </Text>

        <View
          style={[
            styles.inputWrapper,
            focus.confirm && styles.inputFocused,
            !!error && styles.inputError,
          ]}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={focus.confirm ? Colors.primary : Colors.textMuted}
            style={{ marginRight: 10 }}
          />

          <TextInput
            placeholder="Confirm password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry={!showPassword}
            value={confirm}
            onChangeText={(text) => {
              setConfirm(text);
              setError("");
            }}
            style={styles.input}
            editable={!loading}
            onFocus={() => setFocus((p) => ({ ...p, confirm: true }))}
            onBlur={() => setFocus((p) => ({ ...p, confirm: false }))}
          />
        </View>

        {/* ERROR MESSAGE */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={14}
              color={Colors.error}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* BUTTON */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Reset password</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
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

  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 44,
    paddingBottom: 42,
    paddingHorizontal: Spacing[6],
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
    color: "#fff",
    fontWeight: FontWeight.semiBold,
    marginTop: Spacing[1],
  },

  card: {
    flex: 1,
    marginTop: -20,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing[6],
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
    color: Colors.primary,
    fontWeight: "800",
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
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing[3],
    gap: 4,
  },

  errorText: {
    color: Colors.error,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
  },

  button: {
    marginTop: Spacing[6],
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing[4] - 2,
    borderRadius: Radius.md,
    gap: 6,
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
});
