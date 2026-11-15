import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Fonts } from "@/constants/theme";
import { ThemePreferenceControl } from "@/components/theme-preference-control";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { clearAppSession, getCurrentUserSession } from "@/persistencia/session";
import type { Usuario } from "@/tipos/usuario";

export default function PerfilAdminScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    getCurrentUserSession().then(setUsuario);
  }, []);

  async function cerrarSesion() {
    try {
      await clearAppSession();
    } catch (error) {
      Alert.alert(
        "Sesión cerrada",
        error instanceof Error
          ? `No se pudo borrar toda la caché local: ${error.message}`
          : "No se pudo borrar toda la caché local.",
      );
    } finally {
      router.replace("/(auth)/login");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>CUENTA ADMINISTRATIVA</Text>
      <Text style={styles.title}>Mi perfil</Text>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {usuario?.nombre?.charAt(0).toUpperCase() ?? "A"}
          </Text>
        </View>
        <Text style={styles.name}>{usuario?.nombre ?? "Administrador"}</Text>
        <Text style={styles.role}>Administrador</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{usuario?.email ?? "Sin email"}</Text>
        <Text style={styles.label}>Teléfono</Text>
        <Text style={styles.value}>{usuario?.telefono ?? "Sin teléfono"}</Text>
      </View>
      <ThemePreferenceControl />
      <Pressable
        style={styles.logoutButton}
        onPress={() => void cerrarSesion()}
      >
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
      <Pressable
        style={styles.homeButton}
        onPress={() => router.push("/(admin)/inicio")}
      >
        <Text style={styles.homeText}>Volver a Inicio</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.backgroundElement },
    content: { padding: 20, gap: 14 },
    eyebrow: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.2,
      fontFamily: Fonts.sans,
    },
    title: {
      color: palette.text,
      fontSize: 30,
      fontWeight: "900",
      fontFamily: Fonts.sans,
    },
    card: {
      backgroundColor: palette.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      padding: 22,
      alignItems: "center",
      gap: 7,
    },
    avatar: {
      width: 82,
      height: 82,
      borderRadius: 41,
      backgroundColor: palette.backgroundSelected,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 5,
    },
    avatarText: {
      color: palette.textOnSelected,
      fontSize: 34,
      fontWeight: "900",
      fontFamily: Fonts.sans,
    },
    name: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "900",
      fontFamily: Fonts.sans,
    },
    role: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 1,
      fontFamily: Fonts.sans,
    },
    divider: {
      width: "100%",
      height: 1,
      backgroundColor: palette.backgroundElement,
      marginVertical: 10,
    },
    label: {
      alignSelf: "stretch",
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      fontFamily: Fonts.sans,
    },
    value: {
      alignSelf: "stretch",
      color: palette.text,
      fontSize: 16,
      marginBottom: 7,
      fontFamily: Fonts.sans,
    },
    logoutButton: {
      borderWidth: 1,
      borderColor: palette.textSecondary,
      borderRadius: 11,
      padding: 15,
      alignItems: "center",
      marginTop: 6,
    },
    logoutText: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    homeButton: {
      backgroundColor: palette.backgroundSelected,
      borderRadius: 11,
      padding: 15,
      alignItems: "center",
    },
    homeText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
  });
}
