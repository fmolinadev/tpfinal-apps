import { useRouter } from "expo-router";
import * as SplashScreenModule from "expo-splash-screen";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";

import {
  clearAppSession,
  restoreSession,
} from "@/persistencia/session";

export default function AppSplashScreen() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function iniciarAplicacion() {
      let destino = "/(tabs)";

      try {
        const sesion = await restoreSession();

        if (sesion.hasSession) {
          destino = "/(auth)/biometria";
        }
      } catch (error) {
        console.error("Error al recuperar la sesión:", error);

        try {
          await clearAppSession();
        } catch (clearError) {
          console.error("Error al limpiar la sesión:", clearError);
        }
      }

      if (!mounted) return;

      router.replace(destino);

      await SplashScreenModule.hideAsync().catch(() => undefined);
    }

    void iniciarAplicacion();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image
          source={require("@/assets/images/logo_complejo_villaguay_blanco.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Logo de Villaguay Deportes"
        />
      </View>
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
  logoWrap: {
    flex: 1,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  logo: {
    width: 572,
    height: 90,
  },
});