import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { MapaLeaflet } from "@/components/mapa-leaflet";
import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { getCurrentUserSession } from "@/persistencia/session";
import { actualizarUsuarioSesion } from "@/servicios/auth";
import { getEspacioById } from "@/servicios/espacios";
import { establecerFavoritoEspacio } from "@/servicios/favoritos";
import type { Espacio } from "@/tipos";
import {
  abrirIndicaciones,
  tieneCoordenadasValidas,
} from "@/utilidades/mapas";

export default function EspacioDetalleScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const esConsultaPublica = usePathname().startsWith(
    "/consulta-disponibilidad/espacio",
  );
  const { id } = useLocalSearchParams<{ id: string }>();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [espaciosFavoritos, setEspaciosFavoritos] = useState<string[]>([]);
  const [actualizandoFavorito, setActualizandoFavorito] = useState(false);
  const videoUrl = espacio?.videoUrl ?? null;
  const player = useVideoPlayer(videoUrl ? { uri: videoUrl } : null);

  function mostrarIndicaciones(ubicacion: Espacio) {
    void abrirIndicaciones(ubicacion).catch((err: unknown) => {
      Alert.alert(
        "No se pudieron abrir las indicaciones",
        err instanceof Error
          ? err.message
          : "Volvé a intentarlo en unos instantes.",
      );
    });
  }

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

  useEffect(() => {
    let activo = true;

    async function cargarFavoritos() {
      const usuarioGuardado = await getCurrentUserSession();
      if (!activo || !usuarioGuardado) return;
      setEspaciosFavoritos(usuarioGuardado.espaciosFavoritos ?? []);

      try {
        const usuarioActualizado = await actualizarUsuarioSesion();
        if (activo) {
          setEspaciosFavoritos(usuarioActualizado.espaciosFavoritos ?? []);
        }
      } catch (error) {
        console.warn("No se pudieron actualizar los espacios favoritos.", error);
      }
    }

    void cargarFavoritos().catch((error: unknown) => {
      console.warn("No se pudieron cargar los espacios favoritos.", error);
    });

    return () => {
      activo = false;
    };
  }, []);

  async function alternarFavorito() {
    if (!espacio || actualizandoFavorito) return;
    setActualizandoFavorito(true);

    try {
      const esFavorito = espaciosFavoritos.includes(espacio.id);
      const usuario = await establecerFavoritoEspacio(espacio.id, esFavorito);
      setEspaciosFavoritos(usuario.espaciosFavoritos ?? []);
    } catch (error) {
      Alert.alert(
        "No se pudo actualizar el favorito",
        error instanceof Error ? error.message : "Volvé a intentarlo.",
      );
    } finally {
      setActualizandoFavorito(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color={palette.backgroundSelected}
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
      {espacio.complejo ? (
        <Text style={styles.meta}>Complejo: {espacio.complejo}</Text>
      ) : null}
      {!esConsultaPublica ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            selected: espaciosFavoritos.includes(espacio.id),
            disabled: actualizandoFavorito,
          }}
          disabled={actualizandoFavorito}
          style={styles.favoriteButton}
          onPress={() => void alternarFavorito()}
        >
          <Text style={styles.favoriteButtonText}>
            {actualizandoFavorito
              ? "Actualizando..."
              : espaciosFavoritos.includes(espacio.id)
                ? "★ Quitar de favoritos"
                : "☆ Avisarme si se libera un turno"}
          </Text>
        </Pressable>
      ) : null}
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
        {espacio.techado !== undefined ? (
          <Text style={styles.text}>
            Techado: {espacio.techado ? "Sí" : "No"}
          </Text>
        ) : null}
        {espacio.capacidad !== undefined ? (
          <Text style={styles.text}>Capacidad: {espacio.capacidad} personas</Text>
        ) : null}
        <Text style={styles.sectionTitle}>Reglas</Text>
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
              nativeControls
              contentFit="cover"
            />
          </View>
        ) : (
          <Text style={styles.text}>Video no disponible</Text>
        )}
      </View>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Mapa</Text>
        {tieneCoordenadasValidas(espacio) ? (
          <>
            <MapaLeaflet
              style={styles.map}
              centro={{
                latitude: espacio.latitud,
                longitude: espacio.longitud,
                zoom: 16,
              }}
              marcadores={[{
                id: espacio.id,
                  latitude: espacio.latitud,
                  longitude: espacio.longitud,
                titulo: espacio.nombre,
              }]}
            />
            <Text style={styles.coordsText}>
              Coordenadas: {espacio.latitud}, {espacio.longitud}
            </Text>
            <Pressable
              style={styles.directionsButton}
              onPress={() => mostrarIndicaciones(espacio)}
            >
              <Text style={styles.directionsButtonText}>Cómo llegar</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.text}>Ubicación no disponible.</Text>
        )}
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() =>
          router.push(
            esConsultaPublica
              ? {
                  pathname: "/(public)/consulta-disponibilidad/[id]",
                  params: { id: espacio.id },
                }
              : {
                  pathname: "/(jugador)/espacio/[id]/disponibilidad",
                  params: { id: espacio.id },
                },
          )
        }
      >
        <Text style={styles.primaryButtonText}>
          {esConsultaPublica
            ? "[ VER DISPONIBILIDAD ]"
            : "[ VER DISPONIBILIDAD Y RESERVAR ]"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.backgroundElement },
    content: {
      padding: 20,
      paddingBottom: 28,
    },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: palette.backgroundElement,
      padding: 24,
    },
    loaderText: {
      color: palette.text,
      marginTop: 12,
      fontSize: 16,
      fontFamily: Fonts.sans,
    },
    backButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.background,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      marginBottom: 18,
    },
    backButtonText: {
      color: palette.textSecondary,
      fontWeight: "800",
    },
    title: {
      fontSize: 30,
      fontWeight: "800",
      color: palette.text,
      marginBottom: 8,
      fontFamily: Fonts.sans,
    },
    meta: {
      fontSize: 15,
      color: palette.text,
      marginBottom: 6,
      textTransform: "capitalize",
      fontFamily: Fonts.sans,
    },
    price: {
      fontSize: 22,
      fontWeight: "800",
      color: palette.textSecondary,
      marginBottom: 18,
    },
    favoriteButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.background,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      borderWidth: 1,
      marginTop: 8,
      marginBottom: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    favoriteButtonText: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontWeight: "800",
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
      borderColor: palette.backgroundSelected,
    },
    photo: {
      width: 220,
      height: 140,
      backgroundColor: palette.backgroundElement,
    },
    sectionBox: {
      backgroundColor: palette.background,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: palette.text,
      marginBottom: 8,
    },
    text: {
      fontSize: 14,
      color: palette.text,
      lineHeight: 22,
      marginBottom: 6,
      fontFamily: Fonts.sans,
    },
    video: {
      width: "100%",
      height: 220,
      borderRadius: 12,
      backgroundColor: palette.backgroundElement,
    },
    videoButton: {
      alignSelf: "flex-start",
      marginTop: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      backgroundColor: palette.background,
    },
    videoButtonText: {
      color: palette.textSecondary,
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
      color: palette.text,
      fontSize: 12,
      marginTop: 10,
    },
    directionsButton: {
      alignSelf: "flex-start",
      marginTop: 12,
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: palette.backgroundSelected,
    },
    directionsButtonText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    primaryButton: {
      marginTop: 8,
      backgroundColor: palette.background,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
    },
    primaryButtonText: {
      color: palette.text,
      fontWeight: "900",
      fontSize: 14,
      textAlign: "center",
    },
    errorText: {
      color: palette.textSecondary,
      marginTop: 8,
      fontSize: 14,
      textAlign: "center",
    },
  });
}
