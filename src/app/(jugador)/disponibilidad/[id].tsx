import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { obtenerTurnos } from "@/servicios/turnos";
import type { Turno } from "@/tipos/turno";

export default function DisponibilidadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await obtenerTurnos(id ?? "espacio_1", "2026-09-15");
      setTurnos(result);
      setLoading(false);
    }

    load();
  }, [id]);

  const renderItem = ({ item }: { item: Turno }) => (
    <View
      style={[
        styles.turnoCard,
        item.estado === "libre" ? styles.turnoLibre : styles.turnoBloqueado,
      ]}
    >
      <Text style={styles.hora}>{item.hora}</Text>
      <Text style={styles.estado}>{item.estado}</Text>
      <Text style={styles.precio}>${item.precio.toLocaleString("es-AR")}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Disponibilidad</Text>
      <Text style={styles.subtitle}>Cancha 1 • Sábado 15/09</Text>
      <FlatList
        data={turnos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 18 },
  centered: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "700", color: "#0f172a", marginBottom: 6 },
  subtitle: { fontSize: 16, color: "#475569", marginBottom: 18 },
  list: { gap: 10 },
  turnoCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  turnoLibre: { backgroundColor: "#ecfdf5", borderColor: "#86efac" },
  turnoBloqueado: { backgroundColor: "#f8fafc", borderColor: "#cbd5e1" },
  hora: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  estado: { textTransform: "uppercase", fontWeight: "700", color: "#334155" },
  precio: { color: "#4f46e5", fontWeight: "700" },
});
