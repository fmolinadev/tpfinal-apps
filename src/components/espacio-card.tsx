import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import type { Espacio } from "@/tipos";

export function EspacioCard({ espacio }: { espacio: Espacio }) {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push(`/(jugador)/espacio/${String(espacio.id)}` as any)
      }
    >
      {espacio.fotosUrl[0] ? (
        <Image
          source={{ uri: espacio.fotosUrl[0] }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.content}>
        <Text style={styles.name}>{espacio.nombre}</Text>
        <Text style={styles.meta}>
          {espacio.deporte} • {espacio.complejo}
        </Text>
        <Text style={styles.meta}>
          {espacio.superficie} •{" "}
          {espacio.luzNocturna ? "Iluminada" : "Sin iluminación"}
        </Text>
        <Text style={styles.price}>
          ${espacio.precioPorHora.toLocaleString("es-AR")} / hora
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.backgroundElement,
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 16,
      shadowColor: palette.text,
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
      color: palette.text,
    },
    meta: {
      color: palette.textSecondary,
      fontSize: 13,
    },
    price: {
      marginTop: 4,
      color: palette.backgroundSelected,
      fontWeight: "700",
    },
  });
}
