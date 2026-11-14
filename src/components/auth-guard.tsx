import { useFocusEffect, useRouter } from "expo-router";
import { type ReactNode, useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getSessionToken, getSessionUser } from "@/servicios/auth";
import type { RolUsuario } from "@/tipos/usuario";
import { rutaInicioPorRol } from "@/utilidades/rutas";

type AuthGuardProps = {
  children: ReactNode;
  allowedRoles?: RolUsuario[];
};

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function verifyAccess() {
        const token = await getSessionToken();
        const user = await getSessionUser();
        if (!active) {
          return;
        }

        if (!token || !user || !user.rol) {
          router.replace("/(auth)/login");
          return;
        }

        if (allowedRoles && !allowedRoles.includes(user.rol)) {
          router.replace(rutaInicioPorRol(user.rol));
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
    }, [allowedRoles, router]),
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
