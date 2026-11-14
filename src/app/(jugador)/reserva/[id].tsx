import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import { getCurrentUserSession } from "@/persistencia/session";
import { getEspacioById } from "@/servicios/espacios";
import {
    cancelarReserva,
    getMisReservas,
    guardarReservasEnCache,
    obtenerReservasDesdeCache,
} from "@/servicios/reservas";
import type { Espacio, Reserva } from "@/tipos";

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

function horasHastaReserva(fechaIso: string): number {
  return (new Date(fechaIso).getTime() - Date.now()) / (1000 * 60 * 60);
}

// Los turnos duran una hora. La API acepta el ingreso hasta que el turno termina,
// así que el QR tiene que seguir visible durante todo ese tiempo.
const DURACION_TURNO_MS = 60 * 60 * 1000;

function turnoTerminado(fechaInicioIso: string): boolean {
  return new Date(fechaInicioIso).getTime() + DURACION_TURNO_MS <= Date.now();
}

export default function ReservaDetalleScreen() {
  const router = useRouter();
  const parametros = useLocalSearchParams<{ id?: string | string[] }>();
  const reservaId = obtenerIdParametro(parametros.id);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [loading, setLoading] = useState(true);
  const [modoOffline, setModoOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    async function cargarDetalle() {
      setLoading(true);
      setError(null);

      try {
        const usuario = await getCurrentUserSession();
        if (!usuario) {
          throw new Error("No hay una sesión activa.");
        }

        const reservasCacheadas = await obtenerReservasDesdeCache(usuario.id);
        const reservaCacheada = reservasCacheadas?.find(
          (item) => item.id === reservaId,
        );
        let reservaFinal = reservaCacheada;
        if (reservaCacheada) {
          setReserva(reservaCacheada);
        }

        try {
          const respuesta = await getMisReservas(usuario.id);
          if ("error" in respuesta && respuesta.error) {
            throw new Error(respuesta.error.mensaje);
          }

          await guardarReservasEnCache(respuesta.datos, usuario.id);
          const reservaActual = respuesta.datos.find(
            (item) => item.id === reservaId,
          );
          if (reservaActual) {
            reservaFinal = reservaActual;
            setReserva(reservaActual);
          } else if (!reservaCacheada) {
            throw new Error("No se encontró la reserva solicitada.");
          }
        } catch {
          if (!reservaCacheada) {
            throw new Error(
              "No hay conexión ni datos locales para esta reserva.",
            );
          }
          setModoOffline(true);
        }

        const espacioId = reservaFinal?.espacioId;
        if (espacioId) {
          const respuestaEspacio = await getEspacioById(espacioId);
          if (!("error" in respuestaEspacio) || !respuestaEspacio.error) {
            setEspacio(respuestaEspacio.datos[0] ?? null);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo cargar la reserva.",
        );
      } finally {
        setLoading(false);
      }
    }

    void cargarDetalle();
  }, [reservaId]);

  async function ejecutarCancelacion() {
    if (!reserva || cancelando) {
      return;
    }

    setCancelando(true);
    try {
      const respuesta = await cancelarReserva(reserva.id);
      if ("error" in respuesta && respuesta.error) {
        Alert.alert("No se pudo cancelar", respuesta.error.mensaje);
        return;
      }

      const reservaCancelada = respuesta.datos[0];
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d9f99d" />
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

  const horasRestantes = horasHastaReserva(reserva.fechaHoraInicio);
  const turnoYaTermino = turnoTerminado(reserva.fechaHoraInicio);
  const activa = reserva.estado === "activa";
  const puedeCancelar = activa && horasRestantes > 4;
  const mostrarQr = activa && !turnoYaTermino;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>[ Volver ]</Text>
      </Pressable>

      {modoOffline && <Text style={styles.offlineText}>Modo sin conexión</Text>}
      <Text style={styles.title}>Ticket de reserva</Text>
      <Text style={styles.subtitle}>
        {espacio?.nombre ?? `Cancha ${reserva.espacioId}`}
      </Text>
      <Text style={styles.detailText}>Complejo deportivo</Text>
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

      {mostrarQr ? (
        <View style={styles.qrSection}>
          <QRCode
            value={reserva.qrCode}
            size={230}
            backgroundColor="#ffffff"
            color="#000000"
          />
          <Text style={styles.qrText}>Mostraselo al encargado</Text>
        </View>
      ) : null}

      {puedeCancelar ? (
        <Pressable
          style={[styles.cancelButton, cancelando && styles.disabledButton]}
          disabled={cancelando}
          onPress={ejecutarCancelacion}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1120" },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0b1120",
  },
  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginVertical: 16,
  },
  subtitle: {
    color: "#d9f99d",
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 8,
  },
  detailText: { color: "#e2e8f0", fontSize: 17, lineHeight: 28 },
  price: { color: "#ffffff", fontSize: 18, fontWeight: "900", marginTop: 12 },
  status: { color: "#d9f99d", fontSize: 16, fontWeight: "800", marginTop: 8 },
  offlineText: { color: "#fef08a", fontSize: 15, fontWeight: "800" },
  stateText: { color: "#ffffff", fontSize: 17, marginTop: 12 },
  errorText: {
    color: "#fecaca",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 18,
  },
  qrSection: { alignItems: "center", marginVertical: 28 },
  qrText: { color: "#ffffff", fontSize: 18, fontWeight: "900", marginTop: 18 },
  secondaryButton: {
    alignSelf: "flex-start",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#8fa2bc",
    backgroundColor: "#172238",
  },
  secondaryButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  cancelButton: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fb7185",
    padding: 14,
  },
  cancelButtonText: { color: "#240a12", fontSize: 16, fontWeight: "900" },
  disabledButton: { opacity: 0.5 },
  warningText: {
    color: "#fef08a",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "800",
    marginTop: 24,
  },
});
