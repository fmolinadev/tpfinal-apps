import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { clearAppSession, getCurrentUserSession } from "@/persistencia/session";
import type { Usuario } from "@/tipos/usuario";

export default function PerfilScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    getCurrentUserSession().then(setUsuario);
  }, []);

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
      <Pressable style={styles.logout} onPress={() => void cerrarSesion()}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  content: { padding: 20, gap: 14 },
  eyebrow: {
    color: Colors.light.textSecondary,
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.light.text,
    fontFamily: Fonts.sans,
  },
  avatar: {
    alignSelf: "center",
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.light.backgroundSelected,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  avatarText: {
    color: Colors.light.background,
    fontSize: 36,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    gap: 7,
  },
  name: {
    color: Colors.light.text,
    fontSize: 22,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  role: {
    color: Colors.light.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: Fonts.sans,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.backgroundElement,
    marginVertical: 10,
  },
  label: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: Fonts.sans,
  },
  value: {
    color: Colors.light.text,
    fontSize: 16,
    marginBottom: 7,
    fontFamily: Fonts.sans,
  },
  logout: {
    borderWidth: 1,
    borderColor: Colors.light.textSecondary,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
  },
  logoutText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
});
