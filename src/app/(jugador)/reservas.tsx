import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { getCurrentUserSession } from "@/persistencia/session";
import {
  enriquecerReservasDesdeCacheLocal,
  getMisReservas,
  guardarReservasEnCache,
  obtenerReservasDesdeCache,
} from "@/servicios/reservas";
import type { Reserva } from "@/tipos";

const DURACION_TURNO_MS = 60 * 60 * 1000;

function esProxima(reserva: Reserva): boolean {
  return (
    (reserva.estado === "activa" || reserva.estado === "confirmada") &&
    new Date(reserva.fechaHoraInicio).getTime() + DURACION_TURNO_MS > Date.now()
  );
}

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatearHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function etiquetaEstado(estado: Reserva["estado"]): string {
  switch (estado) {
    case "activa":
    case "confirmada":
      return "Confirmada";
    case "cancelada":
      return "Cancelada";
    case "completada":
    case "cumplida":
      return "Completada";
    case "ausente":
      return "No se presentó";
  }
}

export default function ReservasScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [vista, setVista] = useState<"proximas" | "pasadas">("proximas");
  const [loading, setLoading] = useState(true);
  const [modoOffline, setModoOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarReservas = useCallback(async () => {
    setLoading(true);
    setError(null);
    setModoOffline(false);

    try {
      const usuario = await getCurrentUserSession();
      if (!usuario) {
        setError("No hay una sesión activa.");
        return;
      }

      const reservasCacheadasSinEspacios = await obtenerReservasDesdeCache(
        usuario.id,
      );
      const reservasCacheadas =
        reservasCacheadasSinEspacios === null
          ? null
          : await enriquecerReservasDesdeCacheLocal(
              reservasCacheadasSinEspacios,
            );
      if (reservasCacheadas !== null) {
        setReservas(reservasCacheadas);
        setLoading(false);
      }

      try {
        const respuesta = await getMisReservas(usuario.id);
        if ("error" in respuesta && respuesta.error) {
          throw new Error(respuesta.error.mensaje);
        }

        setReservas(respuesta.datos);
        setModoOffline(false);
        try {
          await guardarReservasEnCache(respuesta.datos, usuario.id);
        } catch (cacheError) {
          console.warn(
            "No se pudo actualizar la caché local de reservas.",
            cacheError,
          );
        }
      } catch (remoteError) {
        if (reservasCacheadas === null) {
          throw remoteError;
        }
        setReservas(reservasCacheadas);
        setModoOffline(true);
        try {
          await guardarReservasEnCache(reservasCacheadas, usuario.id);
        } catch (cacheError) {
          console.warn(
            "No se pudo guardar el nombre de espacio en la caché de reservas.",
            cacheError,
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar tus reservas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargarReservas();
    }, [cargarReservas]),
  );

  const reservasFiltradas = reservas.filter((reserva) =>
    vista === "proximas" ? esProxima(reserva) : !esProxima(reserva),
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mis reservas</Text>
          <Text style={styles.subtitle}>
            Consultá tus próximos turnos y el historial de reservas.
          </Text>
        </View>
        {modoOffline ? (
          <View style={styles.offline}>
            <Text style={styles.offlineTexto}>
              Modo sin conexión · Mostrando reservas guardadas
            </Text>
          </View>
        ) : null}

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, vista === "proximas" && styles.tabActivo]}
            onPress={() => setVista("proximas")}
            accessibilityRole="button"
            accessibilityState={{ selected: vista === "proximas" }}
          >
            <Text style={[styles.tabTexto, vista === "proximas" && styles.tabTextoActivo]}>
              Próximas
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, vista === "pasadas" && styles.tabActivo]}
            onPress={() => setVista("pasadas")}
            accessibilityRole="button"
            accessibilityState={{ selected: vista === "pasadas" }}
          >
            <Text style={[styles.tabTexto, vista === "pasadas" && styles.tabTextoActivo]}>
              Pasadas
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.estado}>
            <ActivityIndicator
              size="large"
              color={palette.backgroundSelected}
            />
            <Text style={styles.textoEstado}>Cargando reservas...</Text>
          </View>
        ) : error ? (
          <View style={styles.estado}>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" style={styles.botonSecundario} onPress={() => void cargarReservas()}>
              <Text style={styles.textoBoton}>Reintentar</Text>
            </Pressable>
          </View>
        ) : reservasFiltradas.length === 0 ? (
          <View style={styles.estado}>
            <Text style={styles.textoEstado}>
              No tenés reservas {vista === "proximas" ? "próximas" : "pasadas"}.
            </Text>
          </View>
        ) : (
          reservasFiltradas.map((reserva) => (
            <Pressable
              key={reserva.id}
              style={styles.tarjeta}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/(jugador)/reserva/[id]",
                  params: { id: reserva.id },
                })
              }
            >
              <View style={styles.tarjetaHeader}>
                <Text style={styles.nombreEspacio}>
                  {reserva.espacioNombre ?? "Espacio sin nombre disponible"}
                </Text>
                <View style={styles.estadoBadge}>
                  <Text style={styles.estadoReserva}>
                    {etiquetaEstado(reserva.estado)}
                  </Text>
                </View>
              </View>
              {reserva.complejo ? (
                <Text style={styles.detalle}>{reserva.complejo}</Text>
              ) : null}
              <Text style={styles.fecha}>
                {formatearFecha(reserva.fechaHoraInicio)} ·{" "}
                {formatearHora(reserva.fechaHoraInicio)}
              </Text>
              <Text style={styles.detalle}>
                Jugadores: {reserva.cantidadJugadores}
              </Text>
              <Text style={styles.accion}>Ver reserva →</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.backgroundElement },
    content: { padding: 20, paddingBottom: 36, gap: 14 },
    header: { gap: 5, marginBottom: 4 },
    title: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 30,
      fontWeight: "900",
    },
    subtitle: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 15,
      lineHeight: 21,
    },
    offline: {
      backgroundColor: palette.background,
      borderRadius: 12,
      padding: 12,
    },
    offlineTexto: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 14,
      fontWeight: "800",
    },
    tabs: {
      flexDirection: "row",
      backgroundColor: palette.background,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
    },
    tab: {
      flex: 1,
      minHeight: 48,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 9,
    },
    tabActivo: { backgroundColor: palette.backgroundSelected },
    tabTexto: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 15,
      fontWeight: "800",
    },
    tabTextoActivo: { color: palette.textOnSelected },
    tarjeta: {
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      borderRadius: 16,
      padding: 16,
      gap: 5,
    },
    tarjetaHeader: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    nombreEspacio: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 19,
      fontWeight: "800",
      flexShrink: 1,
    },
    detalle: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 15,
      lineHeight: 23,
    },
    fecha: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 15,
      fontWeight: "800",
      marginTop: 4,
    },
    estadoBadge: {
      alignSelf: "flex-start",
      backgroundColor: palette.backgroundElement,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    estadoReserva: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 12,
      fontWeight: "800",
    },
    accion: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontWeight: "800",
      marginTop: 7,
    },
    estado: {
      alignItems: "center",
      padding: 24,
      gap: 14,
      backgroundColor: palette.background,
      borderRadius: 16,
    },
    textoEstado: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 17,
      textAlign: "center",
    },
    error: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 16,
      textAlign: "center",
    },
    botonSecundario: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: palette.backgroundSelected,
      borderRadius: 9,
    },
    textoBoton: {
      color: palette.textOnSelected,
      fontFamily: Fonts.sans,
      fontWeight: "800",
    },
  });
}
