import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

import { ConectividadProvider } from "@/components/conectividad";
import { getCurrentUserSession } from "@/persistencia/session";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    let activo = true;

    let suscripcionRespuesta:
      | { remove: () => void }
      | undefined;

    async function configurarNotificaciones() {
      try {
        const notifications = await import("expo-notifications");

        if (!activo) {
          return;
        }

        suscripcionRespuesta =
          notifications.addNotificationResponseReceivedListener(() => {
            void (async () => {
              try {
                const usuario = await getCurrentUserSession();

                if (!activo || usuario?.rol !== "jugador") {
                  return;
                }

                router.push("/(jugador)/reservas");
              } catch (error) {
                console.warn(
                  "No se pudo abrir la pantalla de reservas:",
                  error,
                );
              }
            })();
          });
      } catch (error) {
        console.warn(
          "No se pudieron configurar las respuestas de notificaciones:",
          error,
        );
      }
    }

    void configurarNotificaciones();

    return () => {
      activo = false;
      suscripcionRespuesta?.remove();
    };
  }, [router]);

  return (
    <SafeAreaProvider>
      <ConectividadProvider>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />

            <Stack.Screen
              name="(auth)"
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="(jugador)"
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="(staff)"
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="(admin)"
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="espacio/[id]"
              options={{ headerShown: false }}
            />
          </Stack>
        </SafeAreaView>
      </ConectividadProvider>
    </SafeAreaProvider>
  );
}