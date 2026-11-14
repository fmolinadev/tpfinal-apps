import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { clearAppSession, getCurrentUserSession, persistUserSession } from "@/persistencia/session";
import { apiGet } from "@/servicios/api";
import type { Usuario } from "@/tipos/usuario";

type RespuestaUsuario = {
  datos: Usuario;
  meta: null;
};

export default function PerfilScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarUsuario() {
        try {
          const guardado = await getCurrentUserSession();

          if (activo && guardado) {
            setUsuario(guardado);
          }

          const respuesta = await apiGet<RespuestaUsuario>("/yo");

          if (!activo) return;

          setUsuario(respuesta.datos);
          await persistUserSession(respuesta.datos);
        } catch {
          // Si la API no está disponible, se conservan los datos guardados.
        }
      }

      void cargarUsuario();

      return () => {
        activo = false;
      };
    }, []),
  );

  async function cerrarSesion() {
    await clearAppSession();
    router.replace("/(auth)/login");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {usuario?.nombre?.charAt(0).toUpperCase() ?? "J"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.name}>{usuario?.nombre ?? "Jugador"}</Text>
        <Text style={styles.role}>Jugador</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{usuario?.email ?? "Sin email"}</Text>

        <Text style={styles.label}>Teléfono</Text>
        <Text style={styles.value}>{usuario?.telefono ?? "Sin teléfono"}</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Actividad de la cuenta</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {usuario?.cancelacionesTardias ?? 0}
            </Text>
            <Text style={styles.statLabel}>Cancelaciones tardías</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{usuario?.ausencias ?? 0}</Text>
            <Text style={styles.statLabel}>Ausencias</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.logout} onPress={() => void cerrarSesion()}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.sans,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 24,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.light.backgroundSelected,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: Fonts.sans,
    fontWeight: "700",
  },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontFamily: Fonts.sans,
    fontWeight: "700",
    color: Colors.light.text,
  },
  role: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.textSecondary,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 10,
  },
  value: {
    fontSize: 15,
    color: Colors.light.text,
    marginTop: 3,
  },
  statsCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 17,
    fontFamily: Fonts.sans,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontFamily: Fonts.sans,
    fontWeight: "700",
    color: Colors.light.textSecondary,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 5,
  },
  logout: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: Fonts.sans,
    fontWeight: "700",
  },
});