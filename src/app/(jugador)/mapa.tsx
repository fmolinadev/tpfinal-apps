import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";

import { MapaLeaflet, type CentroMapa } from "@/components/mapa-leaflet";
import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { getEspacios } from "@/servicios/espacios";
import type { Espacio } from "@/tipos";
import {
  abrirIndicaciones,
  tieneCoordenadasValidas,
} from "@/utilidades/mapas";

function etiquetaComplejo(complejo: string): string {
  return complejo === "—" ? "Sin complejo asignado" : complejo;
}

type GrupoComplejo = {
  key: string;
  nombre: string;
  latitude: number;
  longitude: number;
  espacios: Espacio[];
};

function agruparPorComplejo(espacios: Espacio[]): GrupoComplejo[] {
  const grupos = new Map<string, { nombre: string; espacios: Espacio[] }>();

  for (const espacio of espacios) {
    const nombre = espacio.complejo?.trim() || "—";
    const key =
      nombre === "—"
        ? `espacio:${espacio.id}`
        : `complejo:${nombre.toLocaleLowerCase("es-AR")}`;
    const grupo = grupos.get(key) ?? { nombre, espacios: [] };
    grupo.espacios.push(espacio);
    grupos.set(key, grupo);
  }

  return Array.from(grupos, ([key, grupo]) => ({
    key,
    nombre: grupo.nombre,
    latitude:
      grupo.espacios.reduce((total, espacio) => total + espacio.latitud, 0) /
      grupo.espacios.length,
    longitude:
      grupo.espacios.reduce((total, espacio) => total + espacio.longitud, 0) /
      grupo.espacios.length,
    espacios: grupo.espacios,
  }));
}

function distanciaKm(
  origen: { latitude: number; longitude: number },
  destino: { latitude: number; longitude: number },
): number {
  const radianes = Math.PI / 180;
  const deltaLatitud = (destino.latitude - origen.latitude) * radianes;
  const deltaLongitud = (destino.longitude - origen.longitude) * radianes;
  const aSinLimite =
    Math.sin(deltaLatitud / 2) ** 2 +
    Math.cos(origen.latitude * radianes) *
      Math.cos(destino.latitude * radianes) *
      Math.sin(deltaLongitud / 2) ** 2;
  const a = Math.min(1, Math.max(0, aSinLimite));
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapaScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intentoCarga, setIntentoCarga] = useState(0);
  const [complejoSeleccionado, setComplejoSeleccionado] = useState("todos");
  const [ubicacionUsuario, setUbicacionUsuario] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [centro, setCentro] = useState<CentroMapa | null>(null);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getEspacios()
      .then((respuesta) => {
        if (!active) {
          return;
        }
        if ("error" in respuesta && respuesta.error) {
          throw new Error(respuesta.error.mensaje);
        }
        setEspacios(respuesta.datos);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los espacios.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [intentoCarga]);

  const espaciosUbicados = useMemo(
    () => espacios.filter(tieneCoordenadasValidas),
    [espacios],
  );
  const gruposComplejo = useMemo(
    () => agruparPorComplejo(espaciosUbicados),
    [espaciosUbicados],
  );
  const complejos = Array.from(
    new Set(espacios.map((espacio) => espacio.complejo?.trim() || "—")),
  ).sort((a, b) => a.localeCompare(b, "es"));
  const gruposDelComplejo = useMemo(
    () =>
      complejoSeleccionado === "todos"
        ? gruposComplejo
        : gruposComplejo.filter(
            (grupo) => grupo.nombre === complejoSeleccionado,
          ),
    [complejoSeleccionado, gruposComplejo],
  );
  const complejoMasCercano = useMemo(() => {
    if (!ubicacionUsuario || gruposComplejo.length === 0) return null;
    return gruposComplejo
      .map((grupo) => ({
        grupo,
        distancia: distanciaKm(ubicacionUsuario, grupo),
      }))
      .sort((a, b) => a.distancia - b.distancia)[0];
  }, [gruposComplejo, ubicacionUsuario]);

  function centrar(coordenadas: { latitude: number; longitude: number }) {
    setCentro((anterior) => ({
      ...coordenadas,
      zoom: 16,
      secuencia: (anterior?.secuencia ?? 0) + 1,
    }));
  }

  function seleccionarComplejo(complejo: string) {
    setComplejoSeleccionado(complejo);
    if (complejo !== "todos") {
      const grupo = gruposComplejo.find((item) => item.nombre === complejo);
      if (grupo) centrar(grupo);
    }
  }

  function reintentarCarga() {
    setLoading(true);
    setError(null);
    setIntentoCarga((intento) => intento + 1);
  }

  function abrirEspacio(espacio: Espacio) {
    router.push({
      pathname: "/(jugador)/espacio/[id]",
      params: { id: espacio.id },
    });
  }

  function mostrarIndicaciones(espacio: Espacio) {
    void abrirIndicaciones(espacio).catch((err: unknown) => {
      Alert.alert(
        "No se pudieron abrir las indicaciones",
        err instanceof Error
          ? err.message
          : "Volvé a intentarlo en unos instantes.",
      );
    });
  }

  function centrarEnComplejo(grupo: GrupoComplejo) {
    setComplejoSeleccionado(grupo.nombre === "—" ? "todos" : grupo.nombre);
    centrar(grupo);
  }

  async function centrarEnMiUbicacion() {
    if (buscandoUbicacion) return;
    setBuscandoUbicacion(true);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== "granted") {
        Alert.alert(
          "Ubicación no permitida",
          "Podés seguir viendo los espacios y sus ubicaciones en el mapa.",
        );
        return;
      }

      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordenadas = {
        latitude: posicion.coords.latitude,
        longitude: posicion.coords.longitude,
      };
      setUbicacionUsuario(coordenadas);
      centrar(coordenadas);
    } catch (err) {
      Alert.alert(
        "No se pudo obtener tu ubicación",
        err instanceof Error
          ? err.message
          : "Comprobá que la ubicación esté activa e intentá de nuevo.",
      );
    } finally {
      setBuscandoUbicacion(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mapa de espacios</Text>
        <Text style={styles.subtitle}>
          Filtrá por complejo y tocá un marcador para ver su ficha.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={buscandoUbicacion}
          onPress={() => void centrarEnMiUbicacion()}
          style={styles.locationButton}
        >
          <Text style={styles.locationButtonText}>
            {buscandoUbicacion
              ? "Buscando ubicación..."
              : "Centrar en mi ubicación"}
          </Text>
        </Pressable>
        {complejoMasCercano ? (
          <Pressable
            accessibilityRole="button"
            style={styles.closestComplex}
            onPress={() => centrarEnComplejo(complejoMasCercano.grupo)}
          >
            <Text style={styles.closestComplexText}>
              Complejo más cercano:{" "}
              {etiquetaComplejo(complejoMasCercano.grupo.nombre)} ·{" "}
              {complejoMasCercano.distancia.toFixed(1)} km
            </Text>
            <Text style={styles.closestComplexAction}>Ver en el mapa</Text>
          </Pressable>
        ) : null}
        <Text style={styles.filterLabel}>Complejo</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtros}
        >
          {["todos", ...complejos].map((complejo) => (
            <Pressable
              key={complejo}
              style={[
                styles.filtro,
                complejoSeleccionado === complejo && styles.filtroActivo,
              ]}
              onPress={() => seleccionarComplejo(complejo)}
            >
              <Text
                style={[
                  styles.filtroTexto,
                  complejoSeleccionado === complejo && styles.filtroTextoActivo,
                ]}
              >
                {complejo === "todos" ? "Todos" : etiquetaComplejo(complejo)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color={palette.backgroundSelected} />
          <Text style={styles.mensaje}>Cargando espacios...</Text>
        </View>
      ) : error ? (
        <View style={styles.estado}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.boton} onPress={reintentarCarga}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : espaciosUbicados.length === 0 ? (
        <View style={styles.estado}>
          <Text style={styles.mensaje}>
            No hay espacios con una ubicación disponible.
          </Text>
        </View>
      ) : gruposDelComplejo.length === 0 ? (
        <View style={styles.estado}>
          <Text style={styles.mensaje}>
            Este complejo no tiene espacios con ubicación disponible.
          </Text>
        </View>
      ) : (
        <MapaLeaflet
          style={styles.mapa}
          centro={centro ?? {
            latitude: gruposDelComplejo[0].latitude,
            longitude: gruposDelComplejo[0].longitude,
            zoom: 15,
          }}
          marcadores={[
            ...(ubicacionUsuario
              ? [{ id: "usuario", ...ubicacionUsuario, titulo: "Tu ubicación", esUsuario: true }]
              : []),
            ...gruposDelComplejo.map((grupo) => ({
              id: grupo.key,
              latitude: grupo.latitude,
              longitude: grupo.longitude,
              titulo: etiquetaComplejo(grupo.nombre),
            })),
          ]}
          onSeleccionarMarcador={setGrupoSeleccionado}
        />
      )}
      <Modal
        visible={grupoSeleccionado !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setGrupoSeleccionado(null)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.callout}>
            {gruposDelComplejo.filter((grupo) => grupo.key === grupoSeleccionado).map((grupo) => (
              <View key={grupo.key}>
                <Text style={styles.calloutTitle}>{etiquetaComplejo(grupo.nombre)}</Text>
                <Text style={styles.calloutText}>{grupo.espacios.length} espacio(s) deportivo(s)</Text>
                <ScrollView style={styles.listaEspacios}>
                  {grupo.espacios.map((espacio) => (
                    <View key={espacio.id} style={styles.calloutSpace}>
                      <Pressable accessibilityRole="button" onPress={() => {
                        setGrupoSeleccionado(null);
                        abrirEspacio(espacio);
                      }}>
                        <Text style={styles.calloutAction}>{espacio.nombre}</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" style={styles.calloutDirection} onPress={() => mostrarIndicaciones(espacio)}>
                        <Text style={styles.calloutText}>Cómo llegar</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={() => setGrupoSeleccionado(null)} style={styles.calloutDirection}>
              <Text style={styles.calloutText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.backgroundElement },
    header: { gap: 6, padding: 20, paddingBottom: 14 },
    title: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 28,
      fontWeight: "900",
    },
    subtitle: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 15,
      lineHeight: 21,
    },
    filterLabel: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 14,
      fontWeight: "800",
      marginTop: 6,
    },
    filtros: { gap: 8, paddingVertical: 2 },
    locationButton: {
      alignSelf: "flex-start",
      borderRadius: 10,
      backgroundColor: palette.backgroundSelected,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    locationButtonText: {
      color: palette.textOnSelected,
      fontFamily: Fonts.sans,
      fontWeight: "800",
    },
    closestComplex: {
      alignSelf: "stretch",
      padding: 10,
      borderRadius: 10,
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
    },
    closestComplexText: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontWeight: "800",
    },
    closestComplexAction: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      marginTop: 3,
    },
    filtro: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 20,
      paddingVertical: 9,
      paddingHorizontal: 14,
      backgroundColor: palette.background,
    },
    filtroActivo: { backgroundColor: palette.backgroundSelected },
    filtroTexto: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontWeight: "800",
    },
    filtroTextoActivo: { color: palette.textOnSelected },
    mapa: { flex: 1 },
    estado: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 14,
      padding: 24,
    },
    mensaje: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 16,
      textAlign: "center",
    },
    error: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 15,
      textAlign: "center",
    },
    boton: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      paddingVertical: 12,
      paddingHorizontal: 18,
    },
    botonTexto: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontWeight: "800",
    },
    modalFondo: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    callout: {
      gap: 8,
      padding: 16,
      borderRadius: 12,
      backgroundColor: palette.background,
    },
    listaEspacios: { maxHeight: 300 },
    calloutSpace: {
      borderTopWidth: 1,
      borderTopColor: palette.backgroundElement,
      paddingTop: 5,
      gap: 4,
    },
    calloutTitle: { color: palette.text, fontWeight: "800" },
    calloutText: { color: palette.textSecondary },
    calloutAction: {
      color: palette.text,
      fontWeight: "800",
      marginTop: 4,
    },
    calloutDirection: {
      marginTop: 4,
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: palette.backgroundElement,
      borderRadius: 6,
    },
  });
}
