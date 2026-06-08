import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api/axios";
import { TeacherService } from "../../services/api/teacherService";
import { ParentService } from "../../services/api/parentService";

type TeacherItem = { id: number | string; name: string };
type ParentItem = { id: number | string; name: string };

const PALETTE = [
  { bg: "#EEF4FF", color: "#2563EB" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#DCFCE7", color: "#16A34A" },
  { bg: "#FFF1E6", color: "#EA580C" },
  { bg: "#FEE2E2", color: "#DC2626" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Reusable password field ────────────────────────────────────────────────

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

// ── Select dropdown (reusable inside modals) ───────────────────────────────

function SelectPicker<T extends { id: number | string; name: string }>({
  label,
  items,
  selected,
  onSelect,
  placeholder,
  loading,
}: {
  label: string;
  items: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  placeholder?: string;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      <TouchableOpacity
        style={[
          styles.selectField,
          open && {
            borderColor: "#2563EB",
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          },
        ]}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#2563EB"
            style={{ marginRight: 8 }}
          />
        ) : null}
        <Text
          style={[styles.selectFieldText, !selected && { color: "#9CA3AF" }]}
        >
          {selected ? selected.name : (placeholder ?? "Select...")}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#6B7280"
        />
      </TouchableOpacity>

      {open && (
        <View style={[styles.selectDropdown, { borderColor: "#2563EB" }]}>
          <View style={styles.dropSearchWrap}>
            <Ionicons
              name="search-outline"
              size={14}
              color="#9CA3AF"
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.dropSearchInput}
              placeholder="Search..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={{ maxHeight: 220 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {filtered.length === 0 ? (
              <View style={styles.selectEmpty}>
                <Text style={styles.selectEmptyText}>No results</Text>
              </View>
            ) : (
              filtered.map((item, index) => {
                const isSelected = selected?.id === item.id;
                const av = PALETTE[index % PALETTE.length];
                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[
                      styles.selectOption,
                      isSelected && { backgroundColor: "#EEF4FF" },
                    ]}
                    onPress={() => {
                      onSelect(item);
                      setOpen(false);
                      setSearch("");
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[styles.selectDot, { backgroundColor: av.bg }]}
                    >
                      <Text style={[styles.selectDotText, { color: av.color }]}>
                        {getInitials(item.name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.selectOptionText,
                          isSelected && { color: "#2563EB", fontWeight: "700" },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.selectOptionMeta}>ID #{item.id}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#2563EB"
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const insets = useSafeAreaInsets();

  // admin change password
  const [adminPwdModal, setAdminPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  // teacher reset password
  const [teacherPwdModal, setTeacherPwdModal] = useState(false);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherItem | null>(
    null,
  );
  const [teacherNewPwd, setTeacherNewPwd] = useState("");
  const [teacherConfirmPwd, setTeacherConfirmPwd] = useState("");
  const [savingTeacher, setSavingTeacher] = useState(false);

  // parent reset password
  const [parentPwdModal, setParentPwdModal] = useState(false);
  const [parents, setParents] = useState<ParentItem[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentItem | null>(null);
  const [parentNewPwd, setParentNewPwd] = useState("");
  const [parentConfirmPwd, setParentConfirmPwd] = useState("");
  const [savingParent, setSavingParent] = useState(false);

  // about section expand
  const [aboutExpanded, setAboutExpanded] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────

  async function loadTeachers() {
    try {
      setLoadingTeachers(true);
      const res = await TeacherService.getAll();
      const data: TeacherItem[] = res.data?.data ?? res.data ?? [];
      setTeachers(Array.isArray(data) ? data : []);
    } catch {
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  }

  async function loadParents() {
    try {
      setLoadingParents(true);
      const res = await ParentService.getAll();
      const data: ParentItem[] = res.data?.data ?? res.data ?? [];
      setParents(Array.isArray(data) ? data : []);
    } catch {
      setParents([]);
    } finally {
      setLoadingParents(false);
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleAdminChangePassword() {
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
      await api.post("/change-password", { password: newPwd });
      setAdminPwdModal(false);
      setNewPwd("");
      setConfirmPwd("");
      Alert.alert("Success", "Admin password changed successfully.");
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to change password.",
      );
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleTeacherResetPassword() {
    if (!selectedTeacher) {
      Alert.alert("Required", "Please select a teacher.");
      return;
    }
    if (!teacherNewPwd.trim()) {
      Alert.alert("Required", "Please enter a new password.");
      return;
    }
    if (teacherNewPwd.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }
    if (teacherNewPwd !== teacherConfirmPwd) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    try {
      setSavingTeacher(true);
      await api.put(`/teachers/${selectedTeacher.id}/password`, {
        password: teacherNewPwd,
      });
      setTeacherPwdModal(false);
      setSelectedTeacher(null);
      setTeacherNewPwd("");
      setTeacherConfirmPwd("");
      Alert.alert(
        "Success",
        `Password for ${selectedTeacher.name} has been reset.`,
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to reset teacher password.",
      );
    } finally {
      setSavingTeacher(false);
    }
  }

  async function handleParentResetPassword() {
    if (!selectedParent) {
      Alert.alert("Required", "Please select a parent.");
      return;
    }
    if (!parentNewPwd.trim()) {
      Alert.alert("Required", "Please enter a new password.");
      return;
    }
    if (parentNewPwd.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }
    if (parentNewPwd !== parentConfirmPwd) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    try {
      setSavingParent(true);
      await api.put(`/parents/${selectedParent.id}/password`, {
        password: parentNewPwd,
      });
      setParentPwdModal(false);
      setSelectedParent(null);
      setParentNewPwd("");
      setParentConfirmPwd("");
      Alert.alert(
        "Success",
        `Password for ${selectedParent.name} has been reset.`,
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to reset parent password.",
      );
    } finally {
      setSavingParent(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("token");
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── PROFILE HEADER ── */}
        <View style={[styles.profileHeader, { paddingTop: insets.top + 24 }]}>
          <View style={styles.profilePic}>
            <Text style={styles.profileInitials}>AD</Text>
          </View>
          <Text style={styles.profileName}>Administrator</Text>
          <Text style={styles.profileRole}>OHPDS School Management System</Text>
          <View style={styles.profileTag}>
            <Ionicons name="shield-checkmark-outline" size={11} color="#fff" />
            <Text style={styles.profileTagText}> Super Admin</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* ── SECURITY ── */}
          <Text style={styles.sectionLabel}>Security</Text>
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => {
                setNewPwd("");
                setConfirmPwd("");
                setAdminPwdModal(true);
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
                <Text style={styles.rowLabel}>Change admin password</Text>
                <Text style={styles.rowSub}>
                  Update your own login password
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => {
                setSelectedTeacher(null);
                setTeacherNewPwd("");
                setTeacherConfirmPwd("");
                loadTeachers();
                setTeacherPwdModal(true);
              }}
            >
              <View style={[styles.rowIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="school-outline" size={18} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Reset teacher password</Text>
                <Text style={styles.rowSub}>
                  Set a new password for any teacher
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => {
                setSelectedParent(null);
                setParentNewPwd("");
                setParentConfirmPwd("");
                loadParents();
                setParentPwdModal(true);
              }}
            >
              <View style={[styles.rowIcon, { backgroundColor: "#FFF1E6" }]}>
                <Ionicons
                  name="people-circle-outline"
                  size={18}
                  color="#EA580C"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Reset parent password</Text>
                <Text style={styles.rowSub}>
                  Set a new password for any parent
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* ── ABOUT OHPDS ── */}
          <Text style={styles.sectionLabel}>About OHPDS</Text>
          <View style={styles.section}>
            {/* app identity row */}
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
                teachers, parents, classes, subjects, and homework — with
                real-time data at every level.
              </Text>
            </View>

            <View style={styles.rowDivider} />

            {/* detail rows */}
            {[
              {
                label: "Version",
                value: "1.0",
                icon: "code-slash-outline",
                color: "#2563EB",
                bg: "#EEF4FF",
              },
              // { label: "Developer", value: "Mulsol Group",        icon: "business-outline",       color: "#7C3AED", bg: "#EDE9FE" },
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

      {/* ══════ ADMIN CHANGE PASSWORD MODAL ══════ */}
      <Modal
        visible={adminPwdModal}
        animationType="slide"
        transparent
        onRequestClose={() => setAdminPwdModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.overlayBg}
            activeOpacity={1}
            onPress={() => setAdminPwdModal(false)}
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
                <Text style={styles.sheetTitle}>Change admin password</Text>
                <Text style={styles.sheetSub}>
                  Enter and confirm your new password
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAdminPwdModal(false)}
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
                label="New password"
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="At least 6 characters"
              />
              <View style={{ height: 4 }} />
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
                onPress={handleAdminChangePassword}
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

      {/* ══════ TEACHER RESET PASSWORD MODAL ══════ */}
      <Modal
        visible={teacherPwdModal}
        animationType="slide"
        transparent
        onRequestClose={() => setTeacherPwdModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.overlayBg}
            activeOpacity={1}
            onPress={() => setTeacherPwdModal(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View
                style={[styles.sheetIconBox, { backgroundColor: "#DCFCE7" }]}
              >
                <Ionicons name="school-outline" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Reset teacher password</Text>
                <Text style={styles.sheetSub}>
                  Select a teacher and set a new password
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setTeacherPwdModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <SelectPicker
                label="Select teacher"
                items={teachers}
                selected={selectedTeacher}
                onSelect={setSelectedTeacher}
                placeholder="Choose a teacher..."
                loading={loadingTeachers}
              />
              <View style={{ height: 14 }} />
              <PasswordInput
                label="New password"
                value={teacherNewPwd}
                onChangeText={setTeacherNewPwd}
                placeholder="At least 6 characters"
              />
              <View style={{ height: 4 }} />
              <PasswordInput
                label="Confirm password"
                value={teacherConfirmPwd}
                onChangeText={setTeacherConfirmPwd}
                placeholder="Re-enter new password"
              />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: "#16A34A" },
                  savingTeacher && { opacity: 0.6 },
                ]}
                onPress={handleTeacherResetPassword}
                activeOpacity={0.85}
                disabled={savingTeacher}
              >
                {savingTeacher ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="key-outline" size={18} color="#fff" />
                )}
                <Text style={styles.submitBtnText}>Reset password</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════ PARENT RESET PASSWORD MODAL ══════ */}
      <Modal
        visible={parentPwdModal}
        animationType="slide"
        transparent
        onRequestClose={() => setParentPwdModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.overlayBg}
            activeOpacity={1}
            onPress={() => setParentPwdModal(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View
                style={[styles.sheetIconBox, { backgroundColor: "#FFF1E6" }]}
              >
                <Ionicons
                  name="people-circle-outline"
                  size={20}
                  color="#EA580C"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Reset parent password</Text>
                <Text style={styles.sheetSub}>
                  Select a parent and set a new password
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setParentPwdModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <SelectPicker
                label="Select parent"
                items={parents}
                selected={selectedParent}
                onSelect={setSelectedParent}
                placeholder="Choose a parent..."
                loading={loadingParents}
              />
              <View style={{ height: 14 }} />
              <PasswordInput
                label="New password"
                value={parentNewPwd}
                onChangeText={setParentNewPwd}
                placeholder="At least 6 characters"
              />
              <View style={{ height: 4 }} />
              <PasswordInput
                label="Confirm password"
                value={parentConfirmPwd}
                onChangeText={setParentConfirmPwd}
                placeholder="Re-enter new password"
              />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: "#EA580C" },
                  savingParent && { opacity: 0.6 },
                ]}
                onPress={handleParentResetPassword}
                activeOpacity={0.85}
                disabled={savingParent}
              >
                {savingParent ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="key-outline" size={18} color="#fff" />
                )}
                <Text style={styles.submitBtnText}>Reset password</Text>
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

  // header
  profileHeader: {
    backgroundColor: "#1E40AF",
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

  // sections
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

  // info blocks (help & support)
  infoBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  infoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 3,
  },
  infoLink: { fontSize: 14, fontWeight: "600", color: "#2563EB" },

  // about section
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

  // logout
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

  // modals
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
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // select dropdown
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 4,
  },
  selectFieldText: { fontSize: 14, color: "#111827", flex: 1 },
  selectDropdown: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
    marginBottom: 14,
  },
  dropSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropSearchInput: { flex: 1, fontSize: 13, color: "#111827" },
  selectOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  selectDotText: { fontSize: 11, fontWeight: "800" },
  selectOptionText: { fontSize: 14, color: "#111827", fontWeight: "500" },
  selectOptionMeta: { fontSize: 11, color: "#9CA3AF" },
  selectEmpty: { paddingVertical: 16, alignItems: "center" },
  selectEmptyText: { fontSize: 13, color: "#9CA3AF" },
});
