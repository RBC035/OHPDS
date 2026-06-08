import { useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { router } from "expo-router";

export default function SplashScreen() {
  const fade = new Animated.Value(0);
  const scale = new Animated.Value(0.9);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace("/");
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[styles.logo, { opacity: fade, transform: [{ scale }] }]}
      >
        OHPDS
      </Animated.Text>

      <Text style={styles.sub}>Online Home Package Delivery System </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
  },
  sub: {
    marginTop: 10,
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
});
