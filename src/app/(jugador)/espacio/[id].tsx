import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { getEspacioById } from "@/servicios/espacios";
import type { Espacio } from "@/tipos";

export default function EspacioDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getEspacioById(id ?? "");
      setEspacio(result.datos?.[0] ?? null);
      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="small"
          color={Colors.light.backgroundSelected}
        />
        <Text>Cargando espacio...</Text>
      </View>
    );
  }

  if (!espacio) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Espacio no encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{espacio.nombre}</Text>
      <Text style={styles.meta}>
        {espacio.deporte} • {espacio.superficie}
      </Text>
      <Text style={styles.meta}>
        Luz nocturna: {espacio.luzNocturna ? "Sí" : "No"}
      </Text>
      <Text style={styles.price}>${espacio.precioPorHora} / hora</Text>

      <Text style={styles.sectionTitle}>Reglas</Text>
      {espacio.reglas.map((item) => (
        <Text key={item} style={styles.text}>
          • {item}
        </Text>
      ))}

      <Text style={styles.sectionTitle}>Video</Text>
      <Text style={styles.text}>
        {espacio.videoUrl ? "Video disponible" : "Sin video disponible"}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  content: { padding: 20, gap: 10 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundElement,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.light.text,
    fontFamily: Fonts.sans,
  },
  meta: { fontSize: 14, color: Colors.light.text, fontFamily: Fonts.sans },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.textSecondary,
    fontFamily: Fonts.sans,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginTop: 8,
  },
  text: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
});
