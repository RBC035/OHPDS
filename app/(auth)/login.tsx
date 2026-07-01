import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
  Radius,
  Shadows,
} from "@/constants/theme";
import { AuthService } from "@/services/api/authService";

// ── Route map — driven entirely by server-returned role ───────
const ROLE_ROUTES: Record<string, string> = {
  admin:   "/(admin)/dashboard",
  teacher: "/(teacher)/dashboard",
  parent:  "/(parent)/dashboard",
};

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────
export default function LoginScreen() {
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passError, setPassError]     = useState("");

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Helpers ───────────────────────────────
  const validate = (): boolean => {
    let valid = true;
    if (!username.trim()) {
      setUsernameError("Username is required");
      valid = false;
    } else {
      setUsernameError("");
    }
    if (!password) {
      setPassError("Password is required");
      valid = false;
    } else if (password.length < 6) {
      setPassError("Password must be at least 6 characters");
      valid = false;
    } else {
      setPassError("");
    }
    return valid;
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!validate()) { triggerShake(); return; }
    setIsLoading(true);
    try {
      const data = await AuthService.login({ username: username.trim(), password });
      const role: string = data?.role ?? data?.user?.role ?? "";
      const route = ROLE_ROUTES[role];
      if (!route) {
        setPassError("Account role not recognised. Please contact support.");
        triggerShake();
        return;
      }
      router.replace(route as any);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Invalid username or password";
      setPassError(msg);
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Blue gradient header ── */}
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

          {/* Logo row */}
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Ionicons name="school" size={18} color="#fff" />
            </View>
            <Text style={styles.logoText}>OHMDS</Text>
          </View>

          {/* Welcome text */}
          <Text style={styles.welcomeTitle}>Welcome to OHMDS</Text>
          <Text style={styles.welcomeSub}>Sign in to your account</Text>
        </LinearGradient>

        {/* ── Form card ── */}
        <Animated.View
          style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}
        >
          {/* Username */}
          <InputField
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={(t) => { setUsername(t); setUsernameError(""); }}
            autoCapitalize="none"
            leftIcon="person-outline"
            error={usernameError}
          />

          {/* Password */}
          <InputField
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(t) => { setPassword(t); setPassError(""); }}
            secureTextEntry={!showPassword}
            leftIcon="lock-closed-outline"
            error={passError}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            }
          />

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign in button */}
          <TouchableOpacity
            style={[styles.signInBtn, isLoading && styles.signInBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.signInText}>Sign in</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
//  InputField
// ─────────────────────────────────────────────
interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  leftIcon: keyof typeof Ionicons.glyphMap;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  rightElement?: React.ReactNode;
}

function InputField({
  label, placeholder, value, onChangeText,
  leftIcon, error, secureTextEntry, keyboardType, autoCapitalize, rightElement,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={inputStyles.wrapper}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={[
        inputStyles.row,
        focused && inputStyles.rowFocused,
        !!error && inputStyles.rowError,
      ]}>
        <Ionicons
          name={leftIcon}
          size={18}
          color={focused ? Colors.primary : Colors.textMuted}
          style={{ marginRight: Spacing[2] }}
        />
        <TextInput
          style={inputStyles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={autoCapitalize ?? "sentences"}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightElement}
      </View>
      {!!error && (
        <View style={inputStyles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={Colors.error} />
          <Text style={inputStyles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },

  // ── Header ──
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 44,
    paddingBottom: 40,
    paddingHorizontal: Spacing[6],
    overflow: "hidden",
  },
  circle1: {
    position: "absolute", top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  circle2: {
    position: "absolute", bottom: -30, left: -30,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  circle3: {
    position: "absolute", top: 60, right: 60,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  logoRow: {
    flexDirection: "row", alignItems: "center",
    gap: 8, marginBottom: Spacing[5],
  },
  logoBox: {
    width: 34, height: 34, borderRadius: Radius.sm,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  logoText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: "#fff", letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize["3xl"],
    color: "#fff", fontWeight: "700",
    marginBottom: Spacing[1],
  },
  welcomeSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md, fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
  },

  // ── Form card ──
  formCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    marginTop: -16,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[8],
    ...Shadows.sm,
  },

  // ── Forgot ──
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -Spacing[2],
    marginBottom: Spacing[5],
  },
  forgotText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm, fontWeight: "600",
    color: Colors.primary,
  },

  // ── Sign in button ──
  signInBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing[4] - 2,
    marginBottom: Spacing[5],
    ...Shadows.button,
  },
  signInBtnDisabled: { opacity: 0.7 },
  signInText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg, fontWeight: "800",
    color: "#fff",
  },
});

const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: Spacing[4] },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs, color: Colors.primary,
    textTransform: "uppercase", letterSpacing: 0.6,
    marginBottom: Spacing[2],
  },
  row: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3], height: 50,
  },
  rowFocused: { borderColor: Colors.primary, backgroundColor: Colors.surface },
  rowError:   { borderColor: Colors.error,   backgroundColor: "#FFF8F8" },
  input: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: Spacing[1] },
  errorText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs, color: Colors.error,
  },
});
