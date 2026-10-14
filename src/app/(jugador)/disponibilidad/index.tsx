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

import { Colors, Fonts } from "@/constants/theme";
import { getEspacios } from "@/servicios/espacios";
import type { Espacio } from "@/tipos";

export default function DisponibilidadScreen() {
  const router = useRouter();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEspacios().then((respuesta) => {
      if (!("error" in respuesta)) setEspacios(respuesta.datos);
      setLoading(false);
    });
  }, []);

  if (loading)
    return (
      <ActivityIndicator
        style={styles.loader}
        color={Colors.light.backgroundSelected}
      />
    );

  return (
    <FlatList
      data={espacios}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Disponibilidad para reservar</Text>
          <Text style={styles.subtitle}>
            Elegí un espacio para consultar turnos libres y confirmar tu
            reserva.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/espacio/[id]/disponibilidad",
              params: { id: item.id },
            })
          }
        >
          <View>
            <Text style={styles.cardTitle}>{item.nombre}</Text>
            <Text style={styles.meta}>
              {item.deporte} · ${item.precioPorHora.toLocaleString("es-AR")} /
              hora
            </Text>
          </View>
          <Text style={styles.action}>Ver turnos →</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 14,
    backgroundColor: Colors.light.backgroundElement,
  },
  loader: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    paddingTop: 40,
  },
  header: { gap: 5, marginBottom: 8 },
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
  subtitle: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    gap: 8,
  },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 19,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  meta: {
    color: Colors.light.text,
    textTransform: "capitalize",
    fontFamily: Fonts.sans,
  },
  action: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    marginTop: 5,
    fontFamily: Fonts.sans,
  },
});
