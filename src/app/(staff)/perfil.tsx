import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { clearAppSession, getCurrentUserSession } from "@/persistencia/session";
import type { Usuario } from "@/tipos/usuario";

export default function PerfilStaffScreen() {
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
      <Text style={styles.eyebrow}>CUENTA OPERATIVA</Text>
      <Text style={styles.title}>Mi perfil</Text>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {usuario?.nombre?.charAt(0).toUpperCase() ?? "E"}
          </Text>
        </View>
        <Text style={styles.name}>{usuario?.nombre ?? "Encargado"}</Text>
        <Text style={styles.role}>{usuario?.rol ?? "encargado"}</Text>
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
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: Fonts.sans,
  },
  title: {
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    padding: 22,
    alignItems: "center",
    gap: 7,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.light.backgroundSelected,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  avatarText: {
    color: Colors.light.background,
    fontSize: 34,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  name: {
    color: Colors.light.text,
    fontSize: 22,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  role: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: Fonts.sans,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: Colors.light.backgroundElement,
    marginVertical: 10,
  },
  label: {
    alignSelf: "stretch",
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    fontFamily: Fonts.sans,
  },
  value: {
    alignSelf: "stretch",
    color: Colors.light.text,
    fontSize: 16,
    marginBottom: 7,
    fontFamily: Fonts.sans,
  },
  logout: {
    borderWidth: 1,
    borderColor: Colors.light.textSecondary,
    borderRadius: 11,
    padding: 15,
    alignItems: "center",
    marginTop: 5,
  },
  logoutText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
});
