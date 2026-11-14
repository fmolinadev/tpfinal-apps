import { useRouter } from "expo-router";
import * as SplashScreenModule from "expo-splash-screen";
import { useEffect } from "react";
import { Alert } from "react-native";

import {
  restoreSession,
} from "@/persistencia/session";

export default function AppSplashScreen() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function redirigirSegunSesion() {
      let destino: "/(auth)/login" | "/(auth)/biometria" =
        "/(auth)/login";
      let errorRestauracion: unknown;
      let restauracionFallida = false;

      try {
        const sesion = await restoreSession();
        destino = sesion.hasSession
          ? "/(auth)/biometria"
          : "/(auth)/login";
      } catch (error) {
        errorRestauracion = error;
        restauracionFallida = true;
      }

      if (!active) return;

      try {
        await SplashScreenModule.hideAsync();
      } catch (error) {
        console.warn("No se pudo ocultar el splash nativo.", error);
      }

      if (!active) return;
      if (restauracionFallida) {
        Alert.alert(
          "No se pudo restaurar la sesión",
          errorRestauracion instanceof Error
            ? errorRestauracion.message
            : "Volvé a iniciar sesión para continuar.",
        );
      }
      router.replace(destino);
    }

    void redirigirSegunSesion();

    return () => {
      active = false;
    };
  }, [router]);

  return null;
}
