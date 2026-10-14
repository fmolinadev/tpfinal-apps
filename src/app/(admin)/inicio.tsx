import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { getCurrentUserSession } from "@/persistencia/session";
import type { Usuario } from "@/tipos/usuario";

export default function InicioAdminScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    getCurrentUserSession().then(setUsuario);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>VILLAGUAY · ADMINISTRACIÓN</Text>
      <Text style={styles.title}>Panel de control</Text>
      <Text style={styles.subtitle}>
        Gestioná la operación general del complejo desde un solo lugar.
      </Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {usuario?.nombre?.charAt(0).toUpperCase() ?? "A"}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{usuario?.nombre ?? "Administrador"}</Text>
          <Text style={styles.email}>
            {usuario?.email ?? "Cuenta administrativa"}
          </Text>
          <Text style={styles.role}>Administrador</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Accesos rápidos</Text>
      <View style={styles.grid}>
        <Pressable
          style={styles.card}
          onPress={() => router.push("/(admin)/agenda")}
        >
          <Text style={styles.cardNumber}>Agenda</Text>
          <Text style={styles.cardLabel}>Turnos, precios y bloqueos</Text>
        </Pressable>
        <Pressable
          style={styles.card}
          onPress={() => router.push("/(admin)/escaner")}
        >
          <Text style={styles.cardNumber}>QR</Text>
          <Text style={styles.cardLabel}>Validar ingresos</Text>
        </Pressable>
      </View>
      <Text style={styles.sectionTitle}>Administración avanzada</Text>
      <Pressable style={styles.managementCard} onPress={() => router.push("/(admin)/precios")}>
        <Text style={styles.managementTitle}>Precios</Text>
        <Text style={styles.managementText}>Editar tarifas por espacio</Text>
      </Pressable>
      <Pressable style={styles.managementCard} onPress={() => router.push("/(admin)/mantenimiento")}>
        <Text style={styles.managementTitle}>Mantenimiento</Text>
        <Text style={styles.managementText}>Crear, editar y eliminar bloqueos técnicos</Text>
      </Pressable>
      <Pressable style={styles.managementCard} onPress={() => router.push("/(admin)/reservas-fijas")}>
        <Text style={styles.managementTitle}>Reservas fijas</Text>
        <Text style={styles.managementText}>Gestionar turnos recurrentes</Text>
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
  subtitle: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  profileCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.light.backgroundSelected,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.light.background,
    fontSize: 24,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  profileInfo: { flex: 1, gap: 3 },
  name: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  email: { color: Colors.light.text, fontSize: 13, fontFamily: Fonts.sans },
  role: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: Fonts.sans,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 8,
    fontFamily: Fonts.sans,
  },
  grid: { flexDirection: "row", gap: 12 },
  card: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    padding: 16,
    minHeight: 110,
    justifyContent: "space-between",
  },
  cardNumber: {
    color: Colors.light.backgroundSelected,
    fontSize: 21,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  cardLabel: {
    color: Colors.light.text,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.sans,
  },
  managementCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    padding: 16,
    gap: 5,
  },
  managementTitle: {
    color: Colors.light.textSecondary,
    fontSize: 17,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  managementText: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
});
