import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AppModal() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
        <Text style={styles.title}>Modal</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.text}>
          This is a generic modal route. Replace with your modal UI.
        </Text>
        <TouchableOpacity
          style={styles.close}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  body: { alignItems: "center" },
  text: { color: "#6B7280", textAlign: "center", marginBottom: 16 },
  close: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeText: { color: "#fff", fontWeight: "700" },
});
