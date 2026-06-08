import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants";

export type Tab = "home" | "children" | "settings";

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const TABS: { key: Tab; icon: string; label: string }[] = [
    { key: "children", icon: "people-outline",  label: "Children" },
    { key: "home",     icon: "home",             label: "Home"     },
    { key: "settings", icon: "settings-outline", label: "Settings" },
  ];

  return (
    <View style={tb.bar}>
      {TABS.map((tab) => {
        const isHome   = tab.key === "home";
        const isActive = active === tab.key;

        if (isHome) {
          return (
            <TouchableOpacity
              key="home"
              style={tb.homeWrap}
              onPress={() => onChange("home")}
              activeOpacity={0.85}
            >
              <View style={[tb.homeBtn, isActive && tb.homeBtnActive]}>
                <Ionicons name="home" size={26} color={Colors.white} />
              </View>
              <Text style={[tb.homeLabel, isActive && { color: Colors.primary }]}>Home</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.key}
            style={tb.tabItem}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.75}
          >
            <View style={[tb.iconWrap, isActive && tb.iconWrapActive]}>
              <Ionicons name={tab.icon as any} size={22} color={isActive ? Colors.tabActive : Colors.tabInactive} />
            </View>
            <Text style={[tb.tabLabel, isActive && tb.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 84,
    backgroundColor: Colors.tabBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 14,
    paddingBottom: 12,
  },
  tabItem:        { alignItems: "center", flex: 1 },
  iconWrap:       { width: 40, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  iconWrapActive: { backgroundColor: Colors.blueSoft },
  tabLabel:       { fontSize: 11, color: Colors.tabInactive, marginTop: 3, fontWeight: "600" },
  tabLabelActive: { color: Colors.tabActive },
  homeWrap:       { alignItems: "center", flex: 1, marginTop: -20 },
  homeBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primaryDark,
    justifyContent: "center", alignItems: "center",
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  homeBtnActive: { backgroundColor: Colors.primary },
  homeLabel:     { fontSize: 11, color: Colors.tabInactive, marginTop: 5, fontWeight: "600" },
});