import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AuthGuard } from "@/components/auth-guard";
import { GestionBloqueos } from "@/components/gestion-bloqueos";
import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { getCurrentUserSession } from "@/persistencia/session";
import { verificarContrasena } from "@/servicios/auth";
import type { Usuario } from "@/tipos/usuario";

const ROLES_ADMIN = ["administrador"] as const;

export default function MantenimientoAdminScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [contrasena, setContrasena] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [preparando, setPreparando] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setUsuario(null);
      setContrasena("");
      setAutorizado(false);
      setPreparando(true);
      setMensaje(null);

      async function cargarUsuario() {
        try {
          const actual = await getCurrentUserSession();
          if (!active) return;
          if (!actual?.email || !actual.id) {
            throw new Error("No se pudo identificar la cuenta actual.");
          }
          setUsuario(actual);
        } catch (error) {
          if (active) {
            setMensaje(
              error instanceof Error
                ? error.message
                : "No se pudo identificar la cuenta actual.",
            );
          }
        } finally {
          if (active) setPreparando(false);
        }
      }

      void cargarUsuario();
      return () => {
        active = false;
      };
    }, []),
  );

  async function confirmarContrasena() {
    if (!usuario) {
      setMensaje("No se pudo identificar la cuenta actual.");
      return;
    }
    setMensaje(null);
    setVerificando(true);
    try {
      await verificarContrasena(usuario, contrasena);
      setContrasena("");
      setAutorizado(true);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo verificar la contraseña.",
      );
    } finally {
      setVerificando(false);
    }
  }

  return (
    <AuthGuard allowedRoles={ROLES_ADMIN}>
      {autorizado ? (
        <GestionBloqueos />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>OPERACIONES</Text>
          <Text style={styles.title}>Mantenimiento y bloqueos</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verificación de identidad</Text>
            {usuario?.email ? (
              <Text style={styles.account}>{usuario.email}</Text>
            ) : null}
            <Text style={styles.helper}>
              Confirmá tu contraseña para consultar y administrar los bloqueos.
            </Text>
            {preparando ? (
              <ActivityIndicator color={palette.backgroundSelected} />
            ) : (
              <>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  value={contrasena}
                  onChangeText={setContrasena}
                  placeholder="Ingresá tu contraseña"
                  placeholderTextColor={palette.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => void confirmarContrasena()}
                  style={styles.input}
                />
                <Pressable
                  style={[
                    styles.primaryButton,
                    verificando && styles.disabled,
                  ]}
                  onPress={() => void confirmarContrasena()}
                  disabled={verificando || !usuario}
                >
                  <Text style={styles.primaryButtonText}>
                    {verificando ? "Verificando..." : "Continuar"}
                  </Text>
                </Pressable>
              </>
            )}
            {mensaje ? (
              <Text accessibilityRole="alert" style={styles.message}>
                {mensaje}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </AuthGuard>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.backgroundElement,
    },
    content: {
      padding: 20,
      paddingBottom: 36,
      gap: 14,
    },
    eyebrow: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.3,
      fontFamily: Fonts.sans,
    },
    title: {
      color: palette.text,
      fontSize: 29,
      fontWeight: "900",
      fontFamily: Fonts.sans,
    },
    card: {
      padding: 18,
      gap: 12,
      borderRadius: 16,
      backgroundColor: palette.background,
    },
    cardTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    account: {
      color: palette.textSecondary,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    helper: {
      color: palette.textSecondary,
      lineHeight: 20,
      fontFamily: Fonts.sans,
    },
    label: {
      color: palette.text,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      padding: 12,
      color: palette.text,
      backgroundColor: palette.background,
      fontFamily: Fonts.sans,
    },
    primaryButton: {
      alignItems: "center",
      padding: 14,
      borderRadius: 10,
      backgroundColor: palette.backgroundSelected,
    },
    primaryButtonText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    disabled: {
      opacity: 0.55,
    },
    message: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
    },
  });
}
