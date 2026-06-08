import React, { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import { TabBar, Tab } from "./TabBar";
import { ChildrenTab } from "./children/ChildrenTab";
import { SettingsTab } from "./SettingsTab";
import { Colors } from "@/constants";
import { HomeTab }  from "./HomeTab";

export default function ParentDashboard() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <SafeAreaView style={styles.safe}>
      {tab === "home"     && <HomeTab />}
      {tab === "children" && <ChildrenTab />}
      {tab === "settings" && <SettingsTab />}
      <TabBar active={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
});