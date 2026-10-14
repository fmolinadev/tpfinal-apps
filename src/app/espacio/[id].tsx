import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import MapView from "react-native-maps";

import { Colors, Fonts } from "@/constants/theme";
import { getEspacioById } from "@/servicios/espacios";
import type { Espacio } from "@/tipos";

export default function EspacioDetalleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [videoReproduciendo, setVideoReproduciendo] = useState(false);
  const videoUrl = espacio?.videoUrl ?? null;
  const player = useVideoPlayer(videoUrl ? { uri: videoUrl } : null);

  useEffect(() => {
    async function loadEspacio() {
      setLoading(true);
      setError(null);

      try {
        const respuesta = await getEspacioById(id ?? "");

        if ("error" in respuesta && respuesta.error) {
          setError(respuesta.error.mensaje);
          setEspacio(null);
          return;
        }

        setEspacio(respuesta.datos[0] ?? null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el espacio.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadEspacio();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color={Colors.light.backgroundSelected}
        />
        <Text style={styles.loaderText}>Cargando espacio...</Text>
      </View>
    );
  }

  if (error || !espacio) {
    return (
      <View style={styles.loader}>
        <Text style={styles.title}>Espacio no disponible</Text>
        <Text style={styles.errorText}>{error ?? "Sin información."}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>[ Volver ]</Text>
        </Pressable>
      </View>
    );
  }

  const fotos =
    espacio.fotosUrl.length > 0
      ? espacio.fotosUrl
      : ["https://placehold.co/800x500/111827/ffffff?text=Sin+foto"];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>[ Volver ]</Text>
      </Pressable>

      <Text style={styles.title}>{espacio.nombre}</Text>
      <Text style={styles.meta}>
        {espacio.deporte} • {espacio.superficie}
      </Text>
      <Text style={styles.meta}>Luz: {espacio.luzNocturna ? "Sí" : "No"}</Text>
      <Text style={styles.price}>${espacio.precioPorHora} por hora</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photoStrip}
      >
        {fotos.map((foto, index) => (
          <Pressable
            key={`${foto}-${index}`}
            onPress={() => setFotoActiva(index)}
            style={[
              styles.photoWrapper,
              fotoActiva === index && styles.photoWrapperActive,
            ]}
          >
            <Image source={{ uri: foto }} style={styles.photo} />
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Características</Text>
        {espacio.reglas.map((regla) => (
          <Text key={regla} style={styles.text}>
            • {regla}
          </Text>
        ))}
      </View>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Video</Text>
        {videoUrl ? (
          <View>
            <VideoView
              player={player}
              style={styles.video}
              nativeControls={false}
              contentFit="cover"
            />
            <Pressable
              style={styles.videoButton}
              onPress={() => {
                if (videoReproduciendo) {
                  player.pause();
                } else {
                  player.play();
                }
                setVideoReproduciendo(!videoReproduciendo);
              }}
            >
              <Text style={styles.videoButtonText}>
                {videoReproduciendo ? "[ Pausa ]" : "[ Play ]"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.text}>Video no disponible</Text>
        )}
      </View>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Mapa</Text>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: espacio.latitud,
            longitude: espacio.longitud,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        />
        <Text style={styles.coordsText}>
          Coordenadas: {espacio.latitud}, {espacio.longitud}
        </Text>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() =>
          router.push({
            pathname: "/espacio/[id]/disponibilidad",
            params: { id: espacio.id },
          })
        }
      >
        <Text style={styles.primaryButtonText}>
          [ VER DISPONIBILIDAD Y RESERVAR ]
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  content: {
    padding: 20,
    paddingBottom: 28,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundElement,
    padding: 24,
  },
  loaderText: {
    color: Colors.light.text,
    marginTop: 12,
    fontSize: 16,
    fontFamily: Fonts.sans,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    marginBottom: 18,
  },
  backButtonText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.light.text,
    marginBottom: 8,
    fontFamily: Fonts.sans,
  },
  meta: {
    fontSize: 15,
    color: Colors.light.text,
    marginBottom: 6,
    textTransform: "capitalize",
    fontFamily: Fonts.sans,
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.textSecondary,
    marginBottom: 18,
  },
  photoStrip: {
    marginBottom: 16,
  },
  photoWrapper: {
    marginRight: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  photoWrapperActive: {
    borderColor: Colors.light.backgroundSelected,
  },
  photo: {
    width: 220,
    height: 140,
    backgroundColor: Colors.light.backgroundElement,
  },
  sectionBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.text,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 6,
    fontFamily: Fonts.sans,
  },
  video: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
  },
  videoButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  videoButtonText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  coordsText: {
    color: Colors.light.text,
    fontSize: 12,
    marginTop: 10,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: Colors.light.text,
    fontWeight: "900",
    fontSize: 14,
    textAlign: "center",
  },
  errorText: {
    color: Colors.light.textSecondary,
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },
});
