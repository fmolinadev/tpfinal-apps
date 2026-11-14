import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

import { Colors, Fonts } from "@/constants/theme";
import { getEspacios } from "@/servicios/espacios";
import type { Espacio } from "@/tipos";

function tieneCoordenadasValidas(espacio: Espacio): boolean {
  return (
    Number.isFinite(espacio.latitud) &&
    Number.isFinite(espacio.longitud) &&
    Math.abs(espacio.latitud) <= 90 &&
    Math.abs(espacio.longitud) <= 180
  );
}

export default function MapaScreen() {
  const router = useRouter();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intentoCarga, setIntentoCarga] = useState(0);

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

  const espaciosUbicados = espacios.filter(tieneCoordenadasValidas);

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mapa de espacios</Text>
        <Text style={styles.subtitle}>
          Tocá un marcador para ver la ficha y reservar.
        </Text>
      </View>

      {loading ? (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color={Colors.light.backgroundSelected} />
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
      ) : (
        <MapView
          style={styles.mapa}
          initialRegion={{
            latitude: espaciosUbicados[0].latitud,
            longitude: espaciosUbicados[0].longitud,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          }}
          accessibilityLabel="Mapa de espacios deportivos"
        >
          {espaciosUbicados.map((espacio) => (
            <Marker
              key={espacio.id}
              coordinate={{
                latitude: espacio.latitud,
                longitude: espacio.longitud,
              }}
              title={espacio.nombre}
              description={`${espacio.deporte} · $${espacio.precioPorHora} por hora`}
              onCalloutPress={() => abrirEspacio(espacio)}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{espacio.nombre}</Text>
                  <Text style={styles.calloutText}>
                    {espacio.deporte} · ${espacio.precioPorHora} / hora
                  </Text>
                  <Text style={styles.calloutAction}>Ver ficha →</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  header: { gap: 6, padding: 20, paddingBottom: 14 },
  title: {
    color: Colors.light.text,
    fontFamily: Fonts.sans,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: Colors.light.text,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21,
  },
  mapa: { flex: 1 },
  estado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    padding: 24,
  },
  mensaje: {
    color: Colors.light.text,
    fontFamily: Fonts.sans,
    fontSize: 16,
    textAlign: "center",
  },
  error: {
    color: Colors.light.textSecondary,
    fontFamily: Fonts.sans,
    fontSize: 15,
    textAlign: "center",
  },
  boton: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  botonTexto: {
    color: Colors.light.text,
    fontFamily: Fonts.sans,
    fontWeight: "800",
  },
  callout: { gap: 4, padding: 4 },
  calloutTitle: { color: "#111827", fontWeight: "800" },
  calloutText: { color: "#475569" },
  calloutAction: { color: "#4f46e5", fontWeight: "800", marginTop: 4 },
});
