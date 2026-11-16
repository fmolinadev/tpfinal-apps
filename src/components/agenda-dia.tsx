import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DateSelector } from "@/components/administrative-pickers";
import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { cancelarReservaPorPedido } from "@/servicios/reservas";
import { obtenerAgenda } from "@/servicios/turnos";
import type { TurnoAgenda } from "@/tipos/turno";

function fechaLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function inicioEpoch(turno: TurnoAgenda): number {
  return Date.parse(`${turno.fecha}T${turno.inicio}:00-03:00`);
}

function finEpoch(turno: TurnoAgenda): number {
  return turno.fin === "24:00"
    ? Date.parse(`${turno.fecha}T00:00:00-03:00`) + 24 * 60 * 60 * 1000
    : Date.parse(`${turno.fecha}T${turno.fin}:00-03:00`);
}

function estaEnCurso(turno: TurnoAgenda, ahora: number): boolean {
  return (
    turno.reservaId !== null &&
    (turno.reservaEstado === "confirmada" ||
      turno.reservaEstado === "cumplida") &&
    ahora >= inicioEpoch(turno) &&
    ahora < finEpoch(turno)
  );
}

function etiquetaEstado(turno: TurnoAgenda): string {
  switch (turno.reservaEstado) {
    case "confirmada":
      return "Confirmada";
    case "cumplida":
      return "Presente";
    case "ausente":
      return "Ausente";
    case "cancelada":
      return "Cancelada";
    default:
      return turno.estado === "mantenimiento"
        ? "Mantenimiento"
        : turno.estado === "fijo"
          ? "Reserva fija"
          : turno.estado === "reservado"
            ? "Reservado"
            : "Libre";
  }
}

function agruparPorEspacio(turnos: TurnoAgenda[]) {
  const grupos = new Map<
    string,
    { espacioId: string; espacioNombre: string; turnos: TurnoAgenda[] }
  >();

  for (const turno of turnos) {
    const grupo = grupos.get(turno.espacioId);
    if (grupo) {
      grupo.turnos.push(turno);
    } else {
      grupos.set(turno.espacioId, {
        espacioId: turno.espacioId,
        espacioNombre: turno.espacioNombre ?? turno.espacioId,
        turnos: [turno],
      });
    }
  }

  return Array.from(grupos.values());
}

export function AgendaDia() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const [fecha, setFecha] = useState(() => fechaLocal(new Date()));
  const [turnos, setTurnos] = useState<TurnoAgenda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ahora, setAhora] = useState(Date.now);

  const cargarAgenda = useCallback(
    async (estaActiva: () => boolean = () => true) => {
      try {
        const resultado = await obtenerAgenda(fecha);
        if (!estaActiva()) return;
        setTurnos(resultado);
        setMensaje(null);
      } catch (error) {
        if (estaActiva()) {
          setMensaje(
            error instanceof Error
              ? error.message
              : "No se pudo cargar la agenda.",
          );
        }
      } finally {
        if (estaActiva()) {
          setCargando(false);
          setRefreshing(false);
        }
      }
    },
    [fecha],
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => cargarAgenda(() => active));
    return () => {
      active = false;
    };
  }, [cargarAgenda]);

  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const grupos = useMemo(() => agruparPorEspacio(turnos), [turnos]);
  const reservasDelDia = turnos.filter(
    (turno) => turno.reservaId !== null,
  ).length;
  const reservasEnCurso = turnos.filter((turno) =>
    estaEnCurso(turno, ahora),
  ).length;

  function refrescar() {
    setRefreshing(true);
    void cargarAgenda();
  }

  function solicitarCancelacion(turno: TurnoAgenda) {
    const reservaId = turno.reservaId;
    if (!reservaId || inicioEpoch(turno) <= ahora) return;

    const limiteSinTardia = inicioEpoch(turno) - 4 * 60 * 60 * 1000;
    const cancelacionTardia = ahora > limiteSinTardia;
    Alert.alert(
      "Cancelar a pedido",
      `¿Confirmás la cancelación de la reserva de ${turno.titular?.nombre ?? "este jugador"}? ${
        cancelacionTardia
          ? "Se registrará una cancelación tardía en su perfil."
          : "Se determinará si corresponde registrar una cancelación tardía."
      }`,
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Cancelar reserva",
          style: "destructive",
          onPress: () => void cancelar(reservaId),
        },
      ],
    );
  }

  async function cancelar(reservaId: string) {
    setProcesando(reservaId);
    setMensaje(null);
    try {
      await cancelarReservaPorPedido(reservaId);
      setMensaje("La reserva se canceló correctamente.");
      await cargarAgenda();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo cancelar la reserva.",
      );
    } finally {
      setProcesando(null);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refrescar}
          tintColor={palette.backgroundSelected}
          colors={[palette.backgroundSelected]}
        />
      }
    >
      <Text style={styles.eyebrow}>OPERACIONES</Text>
      <Text style={styles.title}>Agenda del complejo</Text>
      <Text style={styles.subtitle}>
        Consultá los turnos, sus estados y titulares.
      </Text>

      <DateSelector
        label="Fecha de la agenda"
        value={fecha}
        onChange={(nuevaFecha) => {
          setCargando(true);
          setMensaje(null);
          setFecha(nuevaFecha);
        }}
      />

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{grupos.length}</Text>
          <Text style={styles.summaryLabel}>Espacios</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{reservasDelDia}</Text>
          <Text style={styles.summaryLabel}>Reservas</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{reservasEnCurso}</Text>
          <Text style={styles.summaryLabel}>En curso</Text>
        </View>
      </View>

      <Pressable
        style={[styles.refreshButton, cargando && styles.disabled]}
        disabled={cargando}
        onPress={refrescar}
      >
        <Text style={styles.refreshText}>
          {cargando ? "Actualizando..." : "Actualizar agenda"}
        </Text>
      </Pressable>

      {mensaje ? (
        <View style={styles.messageBox}>
          <Text style={styles.message}>{mensaje}</Text>
        </View>
      ) : null}

      {cargando ? (
        <ActivityIndicator color={palette.backgroundSelected} />
      ) : grupos.length === 0 ? (
        <Text style={styles.empty}>No hay turnos para esta fecha.</Text>
      ) : (
        grupos.map((grupo) => (
          <View key={grupo.espacioId} style={styles.group}>
            <View>
              <Text style={styles.groupTitle}>{grupo.espacioNombre}</Text>
              <Text style={styles.identifier}>ID: {grupo.espacioId}</Text>
            </View>
            {grupo.turnos.map((turno) => {
              const cancelable =
                turno.reservaId !== null &&
                turno.reservaEstado === "confirmada" &&
                inicioEpoch(turno) > ahora;
              const cancelando = procesando === turno.reservaId;

              return (
                <View key={turno.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.time}>
                      {turno.inicio}–{turno.fin}
                    </Text>
                    <Text style={styles.status}>{etiquetaEstado(turno)}</Text>
                  </View>
                  {turno.reservaId ? (
                    <>
                      <Text style={styles.detail}>
                        Jugador: {turno.titular?.nombre ?? "No disponible"}
                      </Text>
                      {turno.titular?.telefono ? (
                        <Text style={styles.detail}>
                          Teléfono: {turno.titular.telefono}
                        </Text>
                      ) : null}
                      <Text style={styles.detail}>
                        Reserva: {turno.reservaId}
                      </Text>
                      {turno.titular?.cantidadPersonas != null ? (
                        <Text style={styles.detail}>
                          Personas: {turno.titular.cantidadPersonas}
                        </Text>
                      ) : null}
                      {turno.ingresoEn ? (
                        <Text style={styles.detail}>
                          Ingreso:{" "}
                          {new Date(turno.ingresoEn).toLocaleString("es-AR")}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                  {turno.estado === "fijo" && turno.titular?.nombre ? (
                    <Text style={styles.detail}>
                      Titular: {turno.titular.nombre} · Reserva fija
                    </Text>
                  ) : null}
                  {turno.motivoBloqueo ? (
                    <Text style={styles.detail}>
                      Motivo: {turno.motivoBloqueo}
                    </Text>
                  ) : null}
                  {cancelable ? (
                    <Pressable
                      style={[
                        styles.cancelButton,
                        cancelando && styles.disabled,
                      ]}
                      disabled={cancelando || procesando !== null}
                      onPress={() => solicitarCancelacion(turno)}
                    >
                      <Text style={styles.cancelText}>
                        {cancelando ? "Cancelando..." : "Cancelar a pedido"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))
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
      paddingBottom: 36,
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
      color: palette.text,
      fontSize: 30,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    subtitle: {
      color: palette.text,
      fontSize: 15,
      lineHeight: 21,
      fontFamily: Fonts.sans,
    },
    summary: {
      flexDirection: "row",
      justifyContent: "space-around",
      borderRadius: 14,
      padding: 14,
      backgroundColor: palette.background,
    },
    summaryItem: {
      alignItems: "center",
    },
    summaryNumber: {
      color: palette.text,
      fontSize: 23,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    summaryLabel: {
      color: palette.textSecondary,
      fontSize: 12,
      fontFamily: Fonts.sans,
    },
    refreshButton: {
      backgroundColor: palette.backgroundSelected,
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
    },
    refreshText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    messageBox: {
      backgroundColor: palette.background,
      padding: 12,
      borderRadius: 10,
    },
    message: {
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    empty: {
      color: palette.textSecondary,
      textAlign: "center",
      paddingVertical: 24,
      fontFamily: Fonts.sans,
    },
    group: {
      gap: 10,
    },
    groupTitle: {
      color: palette.text,
      fontSize: 19,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    identifier: {
      color: palette.textSecondary,
      fontSize: 12,
      fontFamily: Fonts.sans,
    },
    card: {
      padding: 14,
      gap: 6,
      borderRadius: 12,
      backgroundColor: palette.background,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 4,
    },
    time: {
      color: palette.text,
      fontSize: 17,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    status: {
      color: palette.textOnSelected,
      backgroundColor: palette.backgroundSelected,
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 5,
      fontSize: 12,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    detail: {
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    cancelButton: {
      alignItems: "center",
      marginTop: 6,
      padding: 11,
      borderWidth: 1,
      borderColor: palette.textSecondary,
      borderRadius: 9,
    },
    cancelText: {
      color: palette.text,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    disabled: {
      opacity: 0.55,
    },
  });
}
