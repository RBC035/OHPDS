import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuthService } from "../../services/api/authService";
import api from "../../services/api/axios";
import { TeacherService } from "../../services/api/teacherService";

// ── Password field with show/hide toggle ──────────────────────────────────────

function PasswordInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      <View style={styles.passwordWrap}>
        <TextInput
          style={styles.passwordInput}
          placeholder={placeholder ?? "••••••••"}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShow((v) => !v)}
          style={styles.eyeBtn}
        >
          <Ionicons
            name={show ? "eye-off-outline" : "eye-outline"}
            size={18}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);

  // edit profile modal
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // change password modal
  const [pwdVisible, setPwdVisible] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          setUser(u);
          setEditName(u.name ?? "");
          setEditEmail(u.email ?? "");
          setEditPhone(u.phone ?? "");
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  function staffId(id?: number | string) {
    if (!id) return "OHPDS-TCH-0000";
    return `OHPDS-TCH-${String(id).padStart(4, "0")}`;
  }

  async function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await AuthService.logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  async function handleSaveProfile() {
    if (!editName.trim()) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    try {
      setSavingProfile(true);
      if (!user?.id) throw new Error("Missing user id");
      const payload = {
        name: editName,
        email: editEmail ?? "",
        phone: editPhone ?? "",
        gender: user?.gender ?? "",
      };
      await TeacherService.update(Number(user.id), payload as any);
      const updated = { ...user, ...payload };
      await AsyncStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      setEditVisible(false);
      Alert.alert("Success", "Profile updated.");
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? e?.message ?? "Failed to update profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!newPwd.trim()) {
      Alert.alert("Required", "Please enter a new password.");
      return;
    }
    if (newPwd.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    try {
      setSavingPwd(true);
      const body: any = { password: newPwd };
      if (currentPwd) body.currentPassword = currentPwd;
      await api.post("/change-password", body);
      setPwdVisible(false);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      Alert.alert("Success", "Password changed successfully.");
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to change password.",
      );
    } finally {
      setSavingPwd(false);
    }
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "TC";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── PROFILE HEADER ── */}
        <View style={[styles.profileHeader, { paddingTop: insets.top + 24 }]}>
          <View style={styles.profilePic}>
            <Text style={styles.profileInitials}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name ?? "Teacher"}</Text>
          <Text style={styles.profileRole}>
            {user?.designation ?? user?.role ?? "Teacher"}
          </Text>
          <View style={styles.profileTag}>
            <Ionicons name="school-outline" size={11} color="#fff" />
            <Text style={styles.profileTagText}> {staffId(user?.id)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* ── ACCOUNT ── */}
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={async () => {
                try {
                  const raw = await AsyncStorage.getItem("user");
                  const u = raw ? JSON.parse(raw) : null;
                  if (u) {
                    setUser(u);
                    setEditName(u.name ?? "");
                    setEditEmail(u.email ?? "");
                    setEditPhone(u.phone ?? "");
                  }
                } catch {
                  /* ignore */
                }
                setEditVisible(true);
              }}
            >
              <View style={[styles.rowIcon, { backgroundColor: "#EEF4FF" }]}>
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color="#2563EB"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Edit profile</Text>
                <Text style={styles.rowSub}>Name, email, phone</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => {
                setCurrentPwd("");
                setNewPwd("");
                setConfirmPwd("");
                setPwdVisible(true);
              }}
            >
              <View style={[styles.rowIcon, { backgroundColor: "#EDE9FE" }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#7C3AED"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Change password</Text>
                <Text style={styles.rowSub}>Update your login password</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.section}>
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: "#FFF1E6" }]}>
                  <Ionicons name="card-outline" size={18} color="#EA580C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Staff ID</Text>
                  <Text style={styles.rowSub}>{staffId(user?.id)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── ABOUT OHPDS ── */}
          <Text style={styles.sectionLabel}>About OHPDS</Text>
          <View style={styles.section}>
            <View style={styles.aboutHeader}>
              <View style={styles.appIconBox}>
                <Ionicons name="home-outline" size={26} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.appName}>OHPDS</Text>
                <Text style={styles.appFullName}>
                  Online Home Package Delivery System
                </Text>
              </View>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v 1.0</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.descBlock}>
              <Text style={styles.descText}>
                OHPDS is a mobile platform that connects teachers, students, and
                parents in one place.
              </Text>
              <Text style={[styles.descText, { marginTop: 8 }]}>
                Teachers can create and assign homework directly from the app.
                Parents receive instant notifications, review the assignments,
                and guide their children to complete the work all from their
                mobile device.
              </Text>
              <Text style={[styles.descText, { marginTop: 8 }]}>
                The admin panel manages the full school ecosystem: students,
                teachers, parents, classes, subjects, and homework with
                real-time data at every level.
              </Text>
            </View>

            <View style={styles.rowDivider} />

            {[
              {
                label: "Version",
                value: "1.0",
                icon: "code-slash-outline",
                color: "#2563EB",
                bg: "#EEF4FF",
              },
              {
                label: "Platform",
                value: "React Native (Expo)",
                icon: "phone-portrait-outline",
                color: "#16A34A",
                bg: "#DCFCE7",
              },
            ].map((d, i, arr) => (
              <View key={d.label}>
                <View style={styles.aboutDetailRow}>
                  <View style={[styles.rowIcon, { backgroundColor: d.bg }]}>
                    <Ionicons name={d.icon as any} size={15} color={d.color} />
                  </View>
                  <Text style={styles.aboutDetailLabel}>{d.label}</Text>
                  <Text style={styles.aboutDetailValue}>{d.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
          </View>

          {/* ── LOG OUT ── */}
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            OHPDS v1.0 · © 2025 Mulsol Group
          </Text>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ══════ EDIT PROFILE MODAL ══════ */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.overlayBg}
            activeOpacity={1}
            onPress={() => setEditVisible(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View
                style={[styles.sheetIconBox, { backgroundColor: "#EEF4FF" }]}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color="#2563EB"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Edit profile</Text>
                <Text style={styles.sheetSub}>
                  Update your name, email and phone
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>
                Full name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#9CA3AF"
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.label}>
                Email{" "}
                <Text
                  style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "400" }}
                >
                  (username · cannot be changed)
                </Text>
              </Text>
              <View style={[styles.input, styles.inputReadOnly]}>
                <Text style={styles.inputReadOnlyText}>{editEmail || "—"}</Text>
              </View>

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor="#9CA3AF"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.submitBtn, savingProfile && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                activeOpacity={0.85}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                )}
                <Text style={styles.submitBtnText}>Save profile</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════ CHANGE PASSWORD MODAL ══════ */}
      <Modal
        visible={pwdVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPwdVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.overlayBg}
            activeOpacity={1}
            onPress={() => setPwdVisible(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View
                style={[styles.sheetIconBox, { backgroundColor: "#EDE9FE" }]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#7C3AED"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Change password</Text>
                <Text style={styles.sheetSub}>
                  Enter and confirm your new password
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPwdVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <PasswordInput
                label="Current password (optional)"
                value={currentPwd}
                onChangeText={setCurrentPwd}
                placeholder="Current password"
              />
              <PasswordInput
                label="New password"
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="At least 6 characters"
              />
              <PasswordInput
                label="Confirm password"
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                placeholder="Re-enter new password"
              />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: "#7C3AED" },
                  savingPwd && { opacity: 0.6 },
                ]}
                onPress={handleChangePassword}
                activeOpacity={0.85}
                disabled={savingPwd}
              >
                {savingPwd ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                )}
                <Text style={styles.submitBtnText}>Change password</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  body: { paddingHorizontal: 20 },

  profileHeader: {
    backgroundColor: "#2563EB",
    paddingBottom: 32,
    alignItems: "center",
  },
  profilePic: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileInitials: { fontSize: 28, fontWeight: "800", color: "#fff" },
  profileName: { fontSize: 19, fontWeight: "800", color: "#fff" },
  profileRole: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  profileTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  profileTagText: { fontSize: 11, fontWeight: "600", color: "#fff" },

  sectionLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    marginTop: 22,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  rowDivider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 14 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rowLabel: { fontSize: 13, fontWeight: "600", color: "#111827" },
  rowSub: { fontSize: 11, color: "#6B7280", marginTop: 1 },

  aboutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  appIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  appName: { fontSize: 18, fontWeight: "800", color: "#111827" },
  appFullName: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  versionBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  versionText: { fontSize: 11, fontWeight: "700", color: "#16A34A" },
  descBlock: { padding: 16 },
  descText: { fontSize: 13, color: "#374151", lineHeight: 20 },
  aboutDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aboutDetailLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    width: 72,
  },
  aboutDetailValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
    flex: 1,
  },

  logoutBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  logoutText: { fontSize: 14, fontWeight: "700", color: "#DC2626" },
  footerText: {
    textAlign: "center",
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 16,
  },

  overlay: { flex: 1, justifyContent: "flex-end" },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  sheetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  sheetSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 4,
  },
  required: { color: "#DC2626" },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    marginBottom: 16,
  },
  inputReadOnly: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    justifyContent: "center",
  },
  inputReadOnlyText: { fontSize: 14, color: "#9CA3AF" },

  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 12 },

  submitBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
