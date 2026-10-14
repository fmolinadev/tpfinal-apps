import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { obtenerTurnos } from "@/servicios/turnos";
import type { Turno } from "@/tipos/turno";

export default function DisponibilidadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const hoy = new Date();
      const fecha = [
        hoy.getFullYear(),
        String(hoy.getMonth() + 1).padStart(2, "0"),
        String(hoy.getDate()).padStart(2, "0"),
      ].join("-");
      const result = await obtenerTurnos(id ?? "espacio_1", fecha);
      setTurnos(
        result.filter(
          (turno) =>
            new Date(`${turno.fecha}T${turno.hora}:00`).getTime() > Date.now(),
        ),
      );
      setLoading(false);
    }

    void load();
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
        <ActivityIndicator
          size="large"
          color={Colors.light.backgroundSelected}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Disponibilidad</Text>
      <Text style={styles.subtitle}>
        Cancha 1 •{" "}
        {new Date().toLocaleDateString("es-AR", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
        })}
      </Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    padding: 18,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 6,
    fontFamily: Fonts.sans,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 18,
    fontFamily: Fonts.sans,
  },
  list: { gap: 10 },
  turnoCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  turnoLibre: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.backgroundSelected,
  },
  turnoBloqueado: {
    backgroundColor: Colors.light.backgroundElement,
    borderColor: Colors.light.background,
  },
  hora: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    fontFamily: Fonts.sans,
  },
  estado: {
    textTransform: "uppercase",
    fontWeight: "700",
    color: Colors.light.text,
    fontFamily: Fonts.sans,
  },
  precio: {
    color: Colors.light.textSecondary,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
});
