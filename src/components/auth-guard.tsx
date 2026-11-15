import { useFocusEffect, useRouter } from "expo-router";
import { type ReactNode, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { getSessionToken, getSessionUser } from "@/servicios/auth";
import type { RolUsuario } from "@/tipos/usuario";
import { rutaInicioPorRol } from "@/utilidades/rutas";

type AuthGuardProps = {
  children: ReactNode;
  allowedRoles?: readonly RolUsuario[];
};

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const [isReady, setIsReady] = useState(false);
  const [hasAuthorized, setHasAuthorized] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);
  const allowedRolesKey = allowedRoles?.join("|");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setIsReady(false);
      if (attempt > 0) setVerificationError(null);

      async function verifyAccess() {
        try {
          const [token, user] = await Promise.all([
            getSessionToken(),
            getSessionUser(),
          ]);
          if (!active) return;

          if (!token || !user || !user.rol) {
            router.replace("/(auth)/login");
            return;
          }

          if (
            allowedRolesKey &&
            !allowedRolesKey.split("|").includes(user.rol)
          ) {
            router.replace(rutaInicioPorRol(user.rol));
            return;
          }

          setHasAuthorized(true);
          setIsReady(true);
        } catch (error) {
          if (active) {
            setVerificationError(
              error instanceof Error
                ? error.message
                : "No se pudo verificar la sesión.",
            );
          }
        }
      }

      void verifyAccess();

      return () => {
        active = false;
      };
    }, [allowedRolesKey, attempt, router]),
  );

  const validation = (
      <View style={styles.container} accessibilityViewIsModal>
        {verificationError ? (
          <>
            <Text accessibilityRole="alert" style={styles.text}>
              {verificationError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAttempt((actual) => actual + 1)}
              style={styles.retry}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.text}>Validando sesión...</Text>
            <ActivityIndicator size="small" color={palette.backgroundSelected} />
          </>
        )}
      </View>
  );

  if (!hasAuthorized) {
    return validation;
  }

  return (
    <View style={styles.content}>
      <View
        style={styles.content}
        pointerEvents={isReady ? "auto" : "none"}
        accessibilityElementsHidden={!isReady}
        importantForAccessibility={isReady ? "auto" : "no-hide-descendants"}
      >
        {children}
      </View>
      {!isReady ? <View style={styles.overlay}>{validation}</View> : null}
    </View>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    content: { flex: 1 },
    overlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: palette.backgroundElement,
      gap: 12,
    },
    text: {
      fontSize: 16,
      color: palette.text,
      fontWeight: "600",
      textAlign: "center",
      fontFamily: Fonts.sans,
    },
    retry: {
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 9,
      backgroundColor: palette.backgroundSelected,
    },
    retryText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
  });
}
