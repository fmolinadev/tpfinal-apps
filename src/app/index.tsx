import { useRouter } from "expo-router";
import * as SplashScreenModule from "expo-splash-screen";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AppSplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(async () => {
      await SplashScreenModule.hideAsync();
      router.replace("/(auth)/login");
    }, 1200);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Final Integrador</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#a55890",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 1,
  },
});
