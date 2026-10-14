import { useFocusEffect, useRouter, useSegments } from "expo-router";
import { type ReactNode, useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getSessionToken, getSessionUser } from "@/servicios/auth";
import type { RolUsuario } from "@/tipos/usuario";

type AuthGuardProps = {
  children: ReactNode;
  allowedRoles?: RolUsuario[];
};

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function verifyAccess() {
        const token = await getSessionToken();
        const user = await getSessionUser();
        const inJugadorRoute = segments[0] === "(jugador)";
        const inStaffRoute = segments[0] === "(staff)";

        if (!token || !user) {
          router.replace("/(auth)/login");
          return;
        }

        if (allowedRoles && !allowedRoles.includes(user.rol ?? "jugador")) {
          if (user.rol === "jugador") {
            router.replace("/(jugador)/inicio");
          } else if (user.rol === "administrador") {
            router.replace("/(admin)/agenda");
          } else if (user.rol === "encargado") {
            router.replace("/(staff)/agenda");
          } else {
            router.replace("/(auth)/login");
          }
          return;
        }

        if (inJugadorRoute && user.rol !== "jugador") {
          router.replace(
            user.rol === "administrador"
              ? "/(admin)/agenda"
              : "/(staff)/agenda",
          );
          return;
        }

        if (inStaffRoute && user.rol === "jugador") {
          router.replace("/(jugador)/inicio");
          return;
        }

        if (active) {
          setIsReady(true);
        }
      }

      verifyAccess();

      return () => {
        active = false;
      };
    }, [allowedRoles, router, segments]),
  );

  if (!isReady) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Validando sesión...</Text>
        <ActivityIndicator size="small" color="#4f46e5" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    gap: 12,
  },
  text: {
    fontSize: 16,
    color: "#0f172a",
    fontWeight: "600",
  },
});
