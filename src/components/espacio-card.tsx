import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { Espacio } from "@/tipos/espacio";

export function EspacioCard({ espacio }: { espacio: Espacio }) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push(`/(jugador)/espacio/${String(espacio.id)}` as any)
      }
    >
      <Image
        source={{ uri: espacio.foto }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text style={styles.name}>{espacio.nombre}</Text>
        <Text style={styles.meta}>
          {espacio.deporte} • {espacio.complejo}
        </Text>
        <Text style={styles.meta}>
          {espacio.superficie} •{" "}
          {espacio.iluminacion ? "Iluminada" : "Sin iluminación"}
        </Text>
        <Text style={styles.price}>
          ${espacio.precioHora.toLocaleString("es-AR")} / hora
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  image: {
    width: "100%",
    height: 150,
  },
  content: {
    padding: 14,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  meta: {
    color: "#475569",
    fontSize: 13,
  },
  price: {
    marginTop: 4,
    color: "#4f46e5",
    fontWeight: "700",
  },
});
