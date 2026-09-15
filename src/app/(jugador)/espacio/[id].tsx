import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { obtenerEspacio } from "@/servicios/espacios";
import type { Espacio } from "@/tipos/espacio";

export default function EspacioDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await obtenerEspacio(id ?? "");
      setEspacio(result ?? null);
      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
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
      <Image source={{ uri: espacio.foto }} style={styles.image} />
      <Text style={styles.title}>{espacio.nombre}</Text>
      <Text style={styles.meta}>
        {espacio.deporte} • {espacio.complejo}
      </Text>
      <Text style={styles.meta}>
        {espacio.superficie} •{" "}
        {espacio.iluminacion ? "Con iluminación" : "Sin iluminación"}
      </Text>
      <Text style={styles.price}>
        ${espacio.precioHora.toLocaleString("es-AR")} / hora
      </Text>
      <Text style={styles.sectionTitle}>Descripción</Text>
      <Text style={styles.text}>{espacio.descripcion}</Text>
      <Text style={styles.sectionTitle}>Características</Text>
      {espacio.caracteristicas.map((item) => (
        <Text key={item} style={styles.text}>
          • {item}
        </Text>
      ))}
      <Text style={styles.sectionTitle}>Ubicación</Text>
      <Text style={styles.text}>{espacio.ubicacion}</Text>
      {espacio.videoUrl && (
        <Text style={styles.sectionTitle}>Video disponible</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, gap: 10 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  image: { width: "100%", height: 220, borderRadius: 18 },
  title: { fontSize: 28, fontWeight: "700", color: "#0f172a" },
  meta: { fontSize: 14, color: "#475569" },
  price: { fontSize: 20, fontWeight: "700", color: "#4f46e5" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 8,
  },
  text: { fontSize: 15, color: "#334155", lineHeight: 22 },
});
