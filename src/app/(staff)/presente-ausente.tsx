
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import {
  listarReservasPorFecha,
  marcarReservaAusente,
  type ReservaAsistencia,
} from "@/servicios/reservas";
import {
  fechaHoraTurnoDesdeId,
  puedeMarcarAusente,
} from "@/utilidades/ausencias";

function nombreEstado(estado: string): string {
  const normalizado = estado.toLowerCase();

  switch (normalizado) {
    case "confirmada":
      return "Confirmada";
    case "cumplida":
      return "Presente";
    case "ausente":
      return "Ausente";
    case "cancelada":
      return "Cancelada";
    default:
      return estado;
  }
}

function fechaHoy(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

export default function PresenteAusenteScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const [reservas, setReservas] = useState<ReservaAsistencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [reservaProcesando, setReservaProcesando] = useState<string | null>(
    null,
  );
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ahora, setAhora] = useState(Date.now);

  const cargarReservas = useCallback(
    async (estaActiva: () => boolean = () => true) => {
      try {
        const datos = await listarReservasPorFecha(fechaHoy());
        if (estaActiva()) setReservas(datos);
      } catch (error) {
        if (estaActiva()) {
          setMensaje(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las reservas.",
          );
        }
      } finally {
        if (estaActiva()) setCargando(false);
      }
    },
    [],
  );

  function actualizarReservas() {
    setCargando(true);
    setMensaje(null);
    void cargarReservas();
  }

  useFocusEffect(
    useCallback(() => {
    let active = true;
    setCargando(true);
    setMensaje(null);
    void cargarReservas(() => active);
    const timer = setInterval(() => setAhora(Date.now()), 15_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
    }, [cargarReservas]),
  );

  function confirmarAusencia(
    reserva: ReservaAsistencia,
    turno: { fecha: string; inicio: string },
  ) {
    if (
      reserva.estado.toLowerCase() !== "confirmada" ||
      reserva.ingresoEn ||
      !puedeMarcarAusente(turno.fecha, turno.inicio)
    ) {
      setMensaje(
        "La ausencia solo se puede registrar desde 15 minutos después del inicio, si no hubo ingreso.",
      );
      return;
    }

    Alert.alert(
      "Registrar ausencia",
      `¿Confirmás que ${reserva.nombreJugador ?? "el jugador"} no se presentó al turno de las ${turno.inicio}?`,
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Marcar ausente",
          style: "destructive",
          onPress: () => void marcarAusente(reserva),
        },
      ],
    );
  }

  async function marcarAusente(reserva: ReservaAsistencia) {
    try {
      setReservaProcesando(reserva.id);
      setMensaje(null);

      await marcarReservaAusente(reserva.id);

      setMensaje("La ausencia se registró correctamente.");
      await cargarReservas();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la ausencia.",
      );
    } finally {
      setReservaProcesando(null);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.eyebrow}>CONTROL DE ASISTENCIA</Text>

      <Text style={styles.title}>Presente / Ausente</Text>

      <Text style={styles.subtitle}>
        Consultá las reservas y registrá las ausencias. Los ingresos se
        registran mediante la validación del código QR.
      </Text>

      <Pressable
        style={styles.refreshButton}
        onPress={actualizarReservas}
        disabled={cargando}
      >
        <Text style={styles.refreshText}>
          {cargando ? "Actualizando..." : "Actualizar reservas"}
        </Text>
      </Pressable>

      {mensaje ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{mensaje}</Text>
        </View>
      ) : null}

      {cargando ? (
        <Text style={styles.info}>Cargando reservas...</Text>
      ) : reservas.length === 0 ? (
        <Text style={styles.info}>No hay reservas para mostrar.</Text>
      ) : (
        reservas.map((reserva) => {
          const confirmada =
            reserva.estado.toLowerCase() === "confirmada";
          const turno = fechaHoraTurnoDesdeId(reserva.turnoId);
          const puedeRegistrarAusencia =
            confirmada &&
            !reserva.ingresoEn &&
            turno !== null &&
            puedeMarcarAusente(turno.fecha, turno.inicio, ahora);

          const procesando = reservaProcesando === reserva.id;

          return (
            <View key={reserva.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                Reserva {reserva.id}
              </Text>

              <Text style={styles.detail}>
                Espacio: {reserva.espacioId}
              </Text>

              <Text style={styles.detail}>
                Jugador: {reserva.nombreJugador ?? reserva.usuarioId}
              </Text>
              <Text style={styles.detail}>
                Teléfono: {reserva.telefonoJugador ?? "No disponible"}
              </Text>
              <Text style={styles.detail}>
                Ausencias: {reserva.ausenciasJugador ?? "No disponible"} ·
                Cancelaciones tardías:{" "}
                {reserva.cancelacionesTardiasJugador ?? "No disponible"}
              </Text>

              <Text style={styles.detail}>
                {turno
                  ? `Turno: ${turno.fecha} · ${turno.inicio}`
                  : "Horario del turno no disponible"}
              </Text>

              <Text style={styles.detail}>
                Personas: {reserva.cantidadPersonas}
              </Text>

              <Text style={styles.detail}>
                Estado: {nombreEstado(reserva.estado)}
              </Text>

              {reserva.ingresoEn ? (
                <Text style={styles.detail}>
                  Ingreso registrado:{" "}
                  {new Date(reserva.ingresoEn).toLocaleString("es-AR")}
                </Text>
              ) : null}

              {puedeRegistrarAusencia && turno ? (
                <Pressable
                  style={[
                    styles.action,
                    procesando && styles.disabled,
                  ]}
                  disabled={procesando || reservaProcesando !== null}
                  onPress={() => confirmarAusencia(reserva, turno)}
                >
                  <Text style={styles.actionText}>
                    {procesando ? "Registrando..." : "Marcar ausente"}
                  </Text>
                </Pressable>
              ) : confirmada && !reserva.ingresoEn ? (
                <Text style={styles.info}>
                  {turno
                    ? `Se habilita 15 minutos después del inicio (${turno.inicio}).`
                    : "No se puede determinar el horario para registrar la ausencia."}
                </Text>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.backgroundElement,
    },
    content: {
      padding: 20,
      gap: 14,
    },
    eyebrow: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.3,
      fontFamily: Fonts.sans,
    },
    title: {
      fontSize: 30,
      fontWeight: "800",
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    subtitle: {
      color: palette.text,
      fontSize: 15,
      lineHeight: 21,
      fontFamily: Fonts.sans,
    },
    refreshButton: {
      backgroundColor: palette.backgroundSelected,
      borderRadius: 10,
      padding: 13,
      alignItems: "center",
    },
    refreshText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    messageBox: {
      backgroundColor: palette.background,
      borderRadius: 12,
      padding: 14,
      borderLeftWidth: 5,
      borderLeftColor: palette.textSecondary,
    },
    messageText: {
      color: palette.text,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    info: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      marginTop: 8,
    },
    card: {
      backgroundColor: palette.background,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      gap: 8,
    },
    cardTitle: {
      color: palette.text,
      fontWeight: "800",
      fontSize: 17,
      fontFamily: Fonts.sans,
    },
    detail: {
      color: palette.text,
      marginTop: 2,
      fontFamily: Fonts.sans,
    },
    action: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      padding: 11,
      alignItems: "center",
      marginTop: 6,
    },
    disabled: {
      opacity: 0.5,
    },
    actionText: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
  });
}