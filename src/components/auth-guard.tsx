import { useFocusEffect, useRouter, useSegments } from "expo-router";
import { type ReactNode, useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getSessionToken } from "@/servicios/auth";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function verifyAccess() {
        const token = await getSessionToken();
        const inJugadorRoute = segments[0] === "(jugador)";

        if (inJugadorRoute && !token) {
          router.replace("/(auth)/login");
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
    }, [router, segments]),
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
