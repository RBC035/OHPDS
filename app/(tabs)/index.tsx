import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Welcome Back 👋</Text>
            <Text style={styles.subtitle}>
              OHPDS School Management System
            </Text>
          </View>

          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color="#fff" />
          </View>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={[styles.card, { backgroundColor: "#2563EB" }]}>
            <Ionicons name="people" size={30} color="#fff" />
            <Text style={styles.cardNumber}>680+</Text>
            <Text style={styles.cardText}>Students</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#10B981" }]}>
            <Ionicons name="school" size={30} color="#fff" />
            <Text style={styles.cardNumber}>42</Text>
            <Text style={styles.cardText}>Teachers</Text>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="person-add" size={24} color="#2563EB" />
            <Text style={styles.actionText}>Students</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="school-outline" size={24} color="#2563EB" />
            <Text style={styles.actionText}>Teachers</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <MaterialIcons name="class" size={24} color="#2563EB" />
            <Text style={styles.actionText}>Classes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="settings-outline" size={24} color="#2563EB" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* RECENT ACTIVITY */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>

        <View style={styles.activityCard}>
          <Text style={styles.activityText}>
            ✅ Student registration completed
          </Text>
        </View>

        <View style={styles.activityCard}>
          <Text style={styles.activityText}>
            📚 Teacher uploaded assignments
          </Text>
        </View>

        <View style={styles.activityCard}>
          <Text style={styles.activityText}>
            🗓️ Timetable updated successfully
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  header: {
    backgroundColor: "#2563EB",
    padding: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  welcome: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },

  subtitle: {
    color: "#DCE7FF",
    marginTop: 6,
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
  },

  card: {
    width: "48%",
    borderRadius: 20,
    padding: 20,
  },

  cardNumber: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10,
  },

  cardText: {
    color: "#fff",
    marginTop: 5,
    fontSize: 15,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 30,
    marginBottom: 15,
    paddingHorizontal: 20,
  },

  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  actionBtn: {
    width: "48%",
    backgroundColor: "#fff",
    paddingVertical: 25,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 15,
    elevation: 3,
  },

  actionText: {
    marginTop: 10,
    fontWeight: "600",
    color: "#374151",
  },

  activityCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 18,
    marginBottom: 15,
    elevation: 2,
  },

  activityText: {
    color: "#374151",
    fontSize: 15,
  },
});