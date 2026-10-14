import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { getCurrentUserSession } from "@/persistencia/session";
import type { Usuario } from "@/tipos/usuario";

export default function InicioScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    async function loadUser() {
      const actualUser = await getCurrentUserSession();
      setUsuario(actualUser);
    }

    loadUser();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Image
          source={require("@/assets/images/villaguay_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.eyebrow}>Villaguay</Text>
        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.subtitle}>{usuario?.nombre ?? "Jugador"}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Tu resumen</Text>
        <Text style={styles.summaryText}>
          Reserva espacios deportivos, consulta disponibilidad y organizá tu
          próxima actividad en un solo lugar.
        </Text>
      </View>

      <View style={styles.grid}>
        <Pressable
          style={styles.card}
          onPress={() => router.push("/(jugador)/espacios")}
        >
          <Text style={styles.cardNumber}>08</Text>
          <Text style={styles.cardLabel}>Espacios</Text>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => router.push("/(jugador)/reservas")}
        >
          <Text style={styles.cardNumber}>03</Text>
          <Text style={styles.cardLabel}>Reservas</Text>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => router.push("/(jugador)/perfil")}
        >
          <Text style={styles.cardNumber}>Perfil</Text>
          <Text style={styles.cardLabel}>Tu cuenta</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/(jugador)/espacios")}
      >
        <Text style={styles.primaryButtonText}>Explorar espacios</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ebeaeb",
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  logo: {
    width: 170,
    height: 75,
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8f3c78",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#3b373a",
    marginTop: 6,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    color: "#3b373a",
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 6,
    borderLeftColor: "#a55890",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8f3c78",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#3b373a",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#a55890",
    textAlign: "center",
  },
  cardLabel: {
    marginTop: 6,
    fontSize: 13,
    color: "#3b373a",
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#a55890",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
