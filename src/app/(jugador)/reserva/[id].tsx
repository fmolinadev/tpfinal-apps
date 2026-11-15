import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { getCurrentUserSession } from "@/persistencia/session";
import { getEspacioById } from "@/servicios/espacios";
import {
    enriquecerReservasDesdeCacheLocal,
    cancelarReserva,
    getMisReservas,
    guardarReservasEnCache,
    obtenerReservasDesdeCache,
} from "@/servicios/reservas";
import type { Espacio, Reserva } from "@/tipos";
import {
  abrirIndicaciones,
  tieneCoordenadasValidas,
} from "@/utilidades/mapas";

function obtenerIdParametro(id: string | string[] | undefined): string {
  return Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
}

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString("es-AR", {
    weekday: "long",
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

function formatearLimiteCancelacion(fechaIso: string | undefined): string | null {
  if (!fechaIso) return null;
  const fecha = new Date(fechaIso);
  if (!Number.isFinite(fecha.getTime())) return null;
  const hora = fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  });
  return `${hora} del ${fecha.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  })}`;
}

function horasHastaReserva(fechaIso: string, ahora: number): number {
  return (new Date(fechaIso).getTime() - ahora) / (1000 * 60 * 60);
}

function obtenerLimiteCancelacion(reserva: Reserva): number {
  const limiteApi = Date.parse(reserva.cancelableHasta ?? "");
  if (Number.isFinite(limiteApi)) {
    return limiteApi;
  }

  const inicio = Date.parse(reserva.fechaHoraInicio);
  return Number.isFinite(inicio) ? inicio - 4 * 60 * 60 * 1000 : Number.NaN;
}

// Los turnos duran una hora. La API acepta el ingreso hasta que el turno termina,
// así que el QR tiene que seguir visible durante todo ese tiempo.
const DURACION_TURNO_MS = 60 * 60 * 1000;

function turnoTerminado(fechaInicioIso: string, ahora: number): boolean {
  return new Date(fechaInicioIso).getTime() + DURACION_TURNO_MS <= ahora;
}

export default function ReservaDetalleScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const parametros = useLocalSearchParams<{ id?: string | string[] }>();
  const reservaId = obtenerIdParametro(parametros.id);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [loading, setLoading] = useState(true);
  const [modoOffline, setModoOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      const intervalo = setInterval(() => setAhora(Date.now()), 1000);
      return () => clearInterval(intervalo);
    }, []),
  );

  useEffect(() => {
    let active = true;

    async function cargarDetalle() {
      setLoading(true);
      setReserva(null);
      setEspacio(null);
      setError(null);
      setModoOffline(false);

      try {
        const usuario = await getCurrentUserSession();
        if (!active) return;
        if (!usuario) {
          throw new Error("No hay una sesión activa.");
        }

        const reservasCacheadasOriginales = await obtenerReservasDesdeCache(
          usuario.id,
        );
        const reservasCacheadas =
          reservasCacheadasOriginales === null
            ? null
            : await enriquecerReservasDesdeCacheLocal(
                reservasCacheadasOriginales,
              );
        if (!active) return;
        const reservaCacheada = reservasCacheadas?.find(
          (item) => item.id === reservaId,
        );
        let reservaFinal = reservaCacheada;
        if (reservaCacheada) {
          setReserva(reservaCacheada);
          setLoading(false);
        }

        try {
          const respuesta = await getMisReservas(usuario.id);
          if (!active) return;
          if ("error" in respuesta && respuesta.error) {
            throw new Error(respuesta.error.mensaje);
          }

          const reservaActual = respuesta.datos.find(
            (item) => item.id === reservaId,
          );
          if (!reservaActual) {
            setReserva(null);
            setError("No se encontró la reserva solicitada.");
            return;
          }

          reservaFinal = reservaActual;
          setReserva(reservaActual);
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
          if (!active) return;
          if (!reservaCacheada) {
            throw remoteError;
          }
          setModoOffline(true);
        }

        const espacioId = reservaFinal?.espacioId;
        if (espacioId) {
          try {
            const respuestaEspacio = await getEspacioById(espacioId);
            if (!active) return;
            if (!("error" in respuestaEspacio) || !respuestaEspacio.error) {
              setEspacio(respuestaEspacio.datos[0] ?? null);
            }
          } catch (spaceError) {
            console.warn("No se pudo cargar el espacio de la reserva.", spaceError);
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar la reserva.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void cargarDetalle();

    return () => {
      active = false;
    };
  }, [reservaId]);

  async function ejecutarCancelacion() {
    if (!reserva || cancelando) {
      return;
    }

    const ahoraActual = Date.now();
    if (ahoraActual > obtenerLimiteCancelacion(reserva)) {
      setAhora(ahoraActual);
      Alert.alert(
        "Plazo de cancelación vencido",
        "Para cancelar, comunicate con el complejo.",
      );
      return;
    }

    setCancelando(true);
    try {
      const respuesta = await cancelarReserva(reserva.id);
      if ("error" in respuesta && respuesta.error) {
        Alert.alert("No se pudo cancelar", respuesta.error.mensaje);
        return;
      }

      const reservaCancelada = {
        ...respuesta.datos[0],
        espacioNombre: reserva.espacioNombre,
        complejo: reserva.complejo,
        latitud: reserva.latitud,
        longitud: reserva.longitud,
      };
      setReserva(reservaCancelada);
      const usuario = await getCurrentUserSession();
      if (usuario) {
        const cache = await obtenerReservasDesdeCache(usuario.id);
        if (cache) {
          await guardarReservasEnCache(
            cache.map((item) =>
              item.id === reservaCancelada.id ? reservaCancelada : item,
            ),
            usuario.id,
          );
        }
      }
      Alert.alert(
        "Reserva cancelada",
        "La reserva fue cancelada correctamente.",
      );
    } catch (err) {
      Alert.alert(
        "No se pudo cancelar",
        err instanceof Error ? err.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setCancelando(false);
    }
  }

  function confirmarCancelacion() {
    Alert.alert(
      "Cancelar reserva",
      "¿Seguro que querés cancelar este turno?",
      [
        { text: "Conservar reserva", style: "cancel" },
        {
          text: "Cancelar reserva",
          style: "destructive",
          onPress: () => void ejecutarCancelacion(),
        },
      ],
    );
  }

  function mostrarIndicaciones(
    ubicacion: Pick<Espacio, "latitud" | "longitud">,
  ) {
    void abrirIndicaciones(ubicacion).catch((error: unknown) => {
      Alert.alert(
        "No se pudieron abrir las indicaciones",
        error instanceof Error ? error.message : "Volvé a intentarlo.",
      );
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.backgroundSelected} />
        <Text style={styles.stateText}>Cargando reserva...</Text>
      </View>
    );
  }

  if (error || !reserva) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Reserva no disponible</Text>
        <Text style={styles.errorText}>
          {error ?? "No se encontró la reserva."}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>[ Volver ]</Text>
        </Pressable>
      </View>
    );
  }

  const horasRestantes = horasHastaReserva(reserva.fechaHoraInicio, ahora);
  const limiteCancelacion = obtenerLimiteCancelacion(reserva);
  const turnoYaTermino = turnoTerminado(reserva.fechaHoraInicio, ahora);
  const activa = reserva.estado === "activa";
  const puedeCancelar = activa && ahora <= limiteCancelacion;
  const mostrarQr = activa && !turnoYaTermino;
  const fechaLimiteCancelacion = formatearLimiteCancelacion(
    reserva.cancelableHasta,
  );
  const ubicacionReserva =
    espacio && tieneCoordenadasValidas(espacio)
      ? espacio
      : typeof reserva.latitud === "number" &&
          typeof reserva.longitud === "number" &&
          tieneCoordenadasValidas({
            latitud: reserva.latitud,
            longitud: reserva.longitud,
          })
        ? { latitud: reserva.latitud, longitud: reserva.longitud }
        : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>[ Volver ]</Text>
      </Pressable>

      {modoOffline && <Text style={styles.offlineText}>Modo sin conexión</Text>}
      <Text style={styles.title}>Ticket de reserva</Text>
      <Text style={styles.subtitle}>
        {espacio?.nombre ?? reserva.espacioNombre ?? "Espacio deportivo"}
      </Text>
      <Text style={styles.detailText}>
        Complejo: {espacio?.complejo ?? reserva.complejo ?? "No disponible"}
      </Text>
      {ubicacionReserva ? (
        <Pressable
          style={styles.directionsButton}
          onPress={() => mostrarIndicaciones(ubicacionReserva)}
        >
          <Text style={styles.directionsButtonText}>Cómo llegar</Text>
        </Pressable>
      ) : null}
      <Text style={styles.detailText}>
        Fecha: {formatearFecha(reserva.fechaHoraInicio)}
      </Text>
      <Text style={styles.detailText}>
        Hora: {formatearHora(reserva.fechaHoraInicio)}
      </Text>
      <Text style={styles.detailText}>
        Jugadores: {reserva.cantidadJugadores}
      </Text>
      <Text style={styles.price}>Precio: se paga en el lugar</Text>
      <Text style={styles.status}>Estado: {reserva.estado}</Text>
      {activa && fechaLimiteCancelacion ? (
        <Text style={styles.limitText}>
          {puedeCancelar
            ? `Se puede cancelar sin aviso hasta las ${fechaLimiteCancelacion}.`
            : `El plazo para cancelar sin aviso venció el ${fechaLimiteCancelacion}.`}
        </Text>
      ) : null}

      {mostrarQr ? (
        <View style={styles.qrSection}>
          <View style={styles.qrFrame}>
            <QRCode
              value={reserva.qrCode}
              size={230}
              backgroundColor="#ffffff"
              color="#000000"
            />
          </View>
          <Text style={styles.qrText}>Mostraselo al encargado</Text>
        </View>
      ) : null}

      {puedeCancelar ? (
        <Pressable
          style={[styles.cancelButton, cancelando && styles.disabledButton]}
          disabled={cancelando}
          onPress={confirmarCancelacion}
        >
          <Text style={styles.cancelButtonText}>
            {cancelando ? "Cancelando..." : "[ Cancelar reserva ]"}
          </Text>
        </Pressable>
      ) : activa && horasRestantes >= 0 ? (
        <Text style={styles.warningText}>
          Para cancelar con menos de 4 horas de anticipación, comunicate con el
          complejo.
        </Text>
      ) : activa && !turnoYaTermino ? (
        <Text style={styles.warningText}>
          Este turno ya empezó y no se puede cancelar.
        </Text>
      ) : activa ? (
        <Text style={styles.warningText}>
          Este turno ya pasó y no se puede cancelar.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.backgroundElement },
    content: { padding: 20, paddingBottom: 40 },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: palette.backgroundElement,
    },
    title: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 30,
      fontWeight: "900",
      marginVertical: 16,
    },
    subtitle: {
      color: palette.textOnSelected,
      fontFamily: Fonts.sans,
      fontSize: 23,
      fontWeight: "900",
      marginBottom: 8,
    },
    detailText: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 17,
      lineHeight: 28,
    },
    price: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 12,
    },
    status: {
      color: palette.textOnSelected,
      fontFamily: Fonts.sans,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 8,
    },
    limitText: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "700",
      marginTop: 12,
    },
    directionsButton: {
      alignSelf: "flex-start",
      marginTop: 8,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: palette.backgroundSelected,
    },
    directionsButtonText: {
      color: palette.textOnSelected,
      fontFamily: Fonts.sans,
      fontWeight: "800",
    },
    offlineText: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 15,
      fontWeight: "800",
    },
    stateText: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 17,
      marginTop: 12,
    },
    errorText: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 16,
      textAlign: "center",
      lineHeight: 23,
      marginBottom: 18,
    },
    qrSection: { alignItems: "center", marginVertical: 28 },
    qrFrame: {
      backgroundColor: "#ffffff",
      borderRadius: 12,
      padding: 16,
    },
    qrText: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 18,
    },
    secondaryButton: {
      alignSelf: "flex-start",
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      backgroundColor: palette.background,
    },
    secondaryButtonText: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 15,
      fontWeight: "800",
    },
    cancelButton: {
      minHeight: 58,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fb7185",
      padding: 14,
    },
    cancelButtonText: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 16,
      fontWeight: "900",
    },
    disabledButton: { opacity: 0.5 },
    warningText: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "800",
      marginTop: 24,
    },
  });
}
