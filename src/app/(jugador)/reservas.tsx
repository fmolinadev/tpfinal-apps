import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { getCurrentUserSession } from "@/persistencia/session";
import { getMisReservas } from "@/servicios/reservas";
import type { Reserva } from "@/tipos";
import { Colors, Fonts } from "@/constants/theme";

export default function ReservasScreen() {
  const router = useRouter();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const usuario = await getCurrentUserSession();
      if (usuario) {
        const respuesta = await getMisReservas(usuario.id);
        if (!("error" in respuesta)) setReservas(respuesta.datos);
      }
      setLoading(false);
    }
    void load();
  }, []);

  if (loading)
    return <ActivityIndicator style={styles.loader} color={Colors.light.backgroundSelected} />;

  return (
    <FlatList
      data={reservas}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={<Text style={styles.title}>Mis reservas</Text>}
      ListEmptyComponent={
        <Text style={styles.empty}>Todavía no tenés reservas activas.</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() =>
            router.push({ pathname: "/reserva/[id]", params: { id: item.id } })
          }
        >
          <View>
            <Text style={styles.cardTitle}>Reserva {item.id}</Text>
            <Text style={styles.detail}>
              {new Date(item.fechaHoraInicio).toLocaleString("es-AR")}
            </Text>
            <Text style={styles.detail}>
              Jugadores: {item.cantidadJugadores}
            </Text>
          </View>
          <Text
            style={[
              styles.status,
              item.estado === "activa" ? styles.active : styles.cancelled,
            ]}
          >
            {item.estado}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, backgroundColor: Colors.light.backgroundElement },
  loader: { flex: 1, backgroundColor: Colors.light.backgroundElement, paddingTop: 40 },
  title: { fontSize: 30, fontWeight: "800", color: Colors.light.text, marginBottom: 8, fontFamily: Fonts.sans },
  empty: { color: Colors.light.text, fontSize: 16, paddingTop: 20, fontFamily: Fonts.sans },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
    fontFamily: Fonts.sans,
  },
  detail: { color: Colors.light.text, marginTop: 3, fontFamily: Fonts.sans },
  status: { fontWeight: "800", textTransform: "capitalize", fontFamily: Fonts.sans },
  active: { color: Colors.light.textSecondary },
  cancelled: { color: Colors.light.textSecondary },
});
