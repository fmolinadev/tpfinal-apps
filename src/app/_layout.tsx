import { Stack, useRouter } from "expo-router";
import * as SplashScreenModule from "expo-splash-screen";
import { useEffect } from "react";
import { Alert } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { NetworkStatusBanner } from "@/components/network-status-banner";
import { clearAppSession } from "@/persistencia/session";
import { onSessionExpired } from "@/servicios/api";

void SplashScreenModule.preventAutoHideAsync().catch((error: unknown) => {
  console.warn("No se pudo mantener visible el splash nativo.", error);
});

export default function RootLayout() {
  const router = useRouter();

  useEffect(
    () =>
      onSessionExpired(() => {
        router.replace({
          pathname: "/(auth)/login",
          params: { motivo: "sesion-expirada" },
        });
        void clearAppSession().catch((error: unknown) => {
          Alert.alert(
            "Sesión finalizada",
            error instanceof Error
              ? `No se pudo borrar toda la caché local: ${error.message}`
              : "No se pudo borrar toda la caché local.",
          );
        });
      }),
    [router],
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <NetworkStatusBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(jugador)" options={{ headerShown: false }} />
          <Stack.Screen name="(staff)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
