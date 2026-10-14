import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { getCurrentUserSession } from "@/persistencia/session";
import { getEspacioById } from "@/servicios/espacios";
import { programarRecordatorioTurno } from "@/servicios/notificaciones";
import { crearReserva, getTurnos } from "@/servicios/reservas";
import type { Espacio, EstadoTurno, Turno } from "@/tipos";

const HORA_INICIO = 8;
const HORA_FIN = 24;
const DIAS_VISIBLES = 7;

function obtenerIdParametro(id: string | string[] | undefined): string {
  return Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
}

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function sumarDias(fecha: Date, cantidad: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + cantidad);
  return inicioDelDia(resultado);
}

function claveFecha(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fechaIsoParaHora(fecha: Date, hora: number): string {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    hora,
  ).toISOString();
}

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", {
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

function formatearPrecio(precio: number): string {
  return `$ ${precio.toLocaleString("es-AR")}`;
}

function textoEstado(estado: EstadoTurno, precio: number): string {
  switch (estado) {
    case "libre":
      return `Libre - ${formatearPrecio(precio)}`;
    case "ocupado":
      return "OCUPADO";
    case "mantenimiento":
      return "MANTENIMIENTO";
    case "fijo":
      return "FIJO - Grupo del martes";
  }
}

function esTurnoPasado(fechaIso: string): boolean {
  return new Date(fechaIso).getTime() <= Date.now();
}

export default function DisponibilidadEspacioScreen() {
  const router = useRouter();
  const parametros = useLocalSearchParams<{ id?: string | string[] }>();
  const espacioId = obtenerIdParametro(parametros.id);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() =>
    inicioDelDia(new Date()),
  );
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(
    null,
  );
  const [cantidadJugadores, setCantidadJugadores] = useState("1");
  const [reservando, setReservando] = useState(false);
  const [mensajeReserva, setMensajeReserva] = useState<string | null>(null);

  const fechasVisibles = useMemo(
    () =>
      Array.from({ length: DIAS_VISIBLES }, (_, indice) =>
        sumarDias(fechaSeleccionada, indice),
      ),
    [fechaSeleccionada],
  );

  async function cargarDisponibilidad() {
    if (!espacioId) {
      setError("No se recibió el espacio a consultar.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fechaFin = sumarDias(fechaSeleccionada, 1);
      const [respuestaTurnos, respuestaEspacio] = await Promise.all([
        getTurnos(
          espacioId,
          fechaIsoParaHora(fechaSeleccionada, 0),
          fechaIsoParaHora(fechaFin, 0),
        ),
        getEspacioById(espacioId),
      ]);

      if ("error" in respuestaTurnos && respuestaTurnos.error) {
        setError(respuestaTurnos.error.mensaje);
        setTurnos([]);
        return;
      }

      if ("error" in respuestaEspacio && respuestaEspacio.error) {
        setError(respuestaEspacio.error.mensaje);
        setTurnos([]);
        return;
      }

      const espacioActual = respuestaEspacio.datos[0] ?? null;
      setEspacio(espacioActual);

      const turnosDelDia = respuestaTurnos.datos.filter(
        (turno) =>
          claveFecha(new Date(turno.fechaHoraInicio)) ===
          claveFecha(fechaSeleccionada),
      );
      const turnosPorHora = new Map(
        turnosDelDia.map((turno) => [
          new Date(turno.fechaHoraInicio).getHours(),
          turno,
        ]),
      );
      const precioBase = espacioActual?.precioPorHora ?? 0;
      const grilla = Array.from(
        { length: HORA_FIN - HORA_INICIO },
        (_, indice) => {
          const hora = HORA_INICIO + indice;
          return turnosPorHora.get(hora) ?? {
            id: `libre-${espacioId}-${claveFecha(fechaSeleccionada)}-${hora}`,
            espacioId,
            fechaHoraInicio: fechaIsoParaHora(fechaSeleccionada, hora),
            estado: "libre" as const,
            precio: precioBase,
          };
        },
      ).filter((turno) => !esTurnoPasado(turno.fechaHoraInicio));

      setTurnos(grilla);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la disponibilidad.",
      );
      setTurnos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDisponibilidad();
  }, [espacioId, fechaSeleccionada]);

  function seleccionarTurno(turno: Turno) {
    if (turno.estado !== "libre" || esTurnoPasado(turno.fechaHoraInicio)) {
      return;
    }

    setTurnoSeleccionado(turno);
    setCantidadJugadores("1");
    setMensajeReserva(null);
    setModalVisible(true);
  }

  async function confirmarReserva() {
    if (!turnoSeleccionado || reservando) {
      return;
    }

    const cantidad = Number.parseInt(cantidadJugadores, 10);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setMensajeReserva("Ingresá una cantidad de jugadores válida.");
      return;
    }

    setReservando(true);
    setMensajeReserva(null);

    try {
      const usuario = await getCurrentUserSession();
      if (!usuario) {
        setMensajeReserva("La sesión expiró. Volvé a iniciar sesión.");
        return;
      }

      const respuesta = await crearReserva(
        turnoSeleccionado.espacioId,
        turnoSeleccionado.fechaHoraInicio,
        cantidad,
      );

      if ("error" in respuesta && respuesta.error) {
        setMensajeReserva(respuesta.error.mensaje);
        return;
      }

      await programarRecordatorioTurno(
        respuesta.datos[0].id,
        respuesta.datos[0].fechaHoraInicio,
        espacio?.nombre ?? "el espacio deportivo",
      );

      setModalVisible(false);
      router.replace("/(tabs)/reservas");
    } catch (err) {
      setMensajeReserva(
        err instanceof Error ? err.message : "No se pudo confirmar la reserva.",
      );
    } finally {
      setReservando(false);
    }
  }

  const hoy = inicioDelDia(new Date());
  const puedeIrAlDiaAnterior = fechaSeleccionada.getTime() > hoy.getTime();
  const fechaResumen = turnoSeleccionado
    ? new Date(turnoSeleccionado.fechaHoraInicio)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>[ &lt; Atrás ]</Text>
        </Pressable>

        <Text style={styles.title}>Disponibilidad</Text>
        <Text style={styles.subtitle}>
          {espacio?.nombre ?? "Espacio deportivo"}
        </Text>
        <Text style={styles.helperText}>
          Seleccioná un turno libre para reservar.
        </Text>

        <View style={styles.navigationRow}>
          <Pressable
            style={[
              styles.navigationButton,
              !puedeIrAlDiaAnterior && styles.disabledButton,
            ]}
            disabled={!puedeIrAlDiaAnterior}
            onPress={() =>
              setFechaSeleccionada(sumarDias(fechaSeleccionada, -1))
            }
          >
            <Text style={styles.navigationText}>[ &lt; Día anterior ]</Text>
          </Pressable>
          <Pressable
            style={styles.navigationButton}
            onPress={() =>
              setFechaSeleccionada(sumarDias(fechaSeleccionada, 1))
            }
          >
            <Text style={styles.navigationText}>[ Día siguiente &gt; ]</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {fechasVisibles.map((fecha) => {
            const activa = claveFecha(fecha) === claveFecha(fechaSeleccionada);
            return (
              <Pressable
                key={claveFecha(fecha)}
                style={[styles.dateButton, activa && styles.dateButtonActive]}
                onPress={() => setFechaSeleccionada(fecha)}
              >
                <Text
                  style={[styles.dateText, activa && styles.dateTextActive]}
                >
                  {fecha.toLocaleDateString("es-AR", { weekday: "short" })}
                </Text>
                <Text
                  style={[styles.dateNumber, activa && styles.dateTextActive]}
                >
                  {fecha.getDate()}/{fecha.getMonth() + 1}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.selectedDate}>
          {formatearFecha(fechaSeleccionada)}
        </Text>

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator
              size="large"
              color={Colors.light.backgroundSelected}
            />
            <Text style={styles.stateText}>Cargando disponibilidad...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={cargarDisponibilidad}
            >
              <Text style={styles.secondaryButtonText}>[ Reintentar ]</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {turnos.map((turno) => {
              const deshabilitado = turno.estado !== "libre";
              return (
                <Pressable
                  key={turno.id}
                  disabled={deshabilitado}
                  onPress={() => seleccionarTurno(turno)}
                  style={[
                    styles.turno,
                    styles[`turno_${turno.estado}`],
                  ]}
                >
                  <Text style={styles.turnoHora}>
                    {formatearHora(turno.fechaHoraInicio)}
                  </Text>
                  <Text style={styles.turnoEstado}>
                    {textoEstado(turno.estado, turno.precio)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmar reserva</Text>
            <Text style={styles.modalQuestion}>¿Cuántos van a ser?</Text>
            <TextInput
              value={cantidadJugadores}
              onChangeText={setCantidadJugadores}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              style={styles.input}
              placeholder="Cantidad"
              placeholderTextColor={Colors.light.textSecondary}
              accessibilityLabel="Cantidad de jugadores"
            />

            {fechaResumen && turnoSeleccionado && (
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Resumen</Text>
                <Text style={styles.summaryText}>
                  Cancha: {espacio?.nombre ?? espacioId}
                </Text>
                <Text style={styles.summaryText}>
                  Fecha: {formatearFecha(fechaResumen)}
                </Text>
                <Text style={styles.summaryText}>
                  Hora: {formatearHora(turnoSeleccionado.fechaHoraInicio)}
                </Text>
                <Text style={styles.summaryText}>
                  Precio a pagar en el lugar:{" "}
                  {formatearPrecio(turnoSeleccionado.precio)}
                </Text>
              </View>
            )}

            {mensajeReserva && (
              <Text style={styles.errorText}>{mensajeReserva}</Text>
            )}

            <Pressable
              style={[
                styles.confirmButton,
                reservando && styles.disabledButton,
              ]}
              disabled={reservando}
              onPress={confirmarReserva}
            >
              <Text style={styles.confirmButtonText}>
                {reservando ? "Cargando..." : "[ CONFIRMAR RESERVA ]"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              disabled={reservando}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>[ Cancelar ]</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  content: { padding: 20, paddingBottom: 36 },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
    marginBottom: 18,
  },
  backButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  title: {
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 4,
    fontFamily: Fonts.sans,
  },
  subtitle: {
    color: Colors.light.text,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 6,
    fontFamily: Fonts.sans,
  },
  helperText: {
    color: Colors.light.text,
    fontSize: 15,
    marginBottom: 18,
    fontFamily: Fonts.sans,
  },
  navigationRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  navigationButton: {
    flex: 1,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
  },
  navigationText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  disabledButton: { opacity: 0.45 },
  dateRow: { gap: 8, paddingBottom: 14 },
  dateButton: {
    minWidth: 72,
    minHeight: 64,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    backgroundColor: Colors.light.background,
  },
  dateButtonActive: {
    backgroundColor: Colors.light.backgroundSelected,
    borderColor: Colors.light.backgroundSelected,
  },
  dateText: {
    color: Colors.light.text,
    fontSize: 13,
    textTransform: "capitalize",
    fontFamily: Fonts.sans,
  },
  dateNumber: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  dateTextActive: { color: Colors.light.background, fontWeight: "900" },
  selectedDate: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 14,
    textTransform: "capitalize",
  },
  grid: { gap: 10 },
  turno: {
    minHeight: 74,
    padding: 14,
    justifyContent: "center",
    borderWidth: 2,
  },
  turno_libre: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.textSecondary,
  },
  turno_ocupado: {
    backgroundColor: Colors.light.backgroundElement,
    borderColor: Colors.light.text,
  },
  turno_mantenimiento: {
    backgroundColor: Colors.light.backgroundElement,
    borderColor: Colors.light.backgroundSelected,
  },
  turno_fijo: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.backgroundSelected,
  },
  turnoHora: {
    color: Colors.light.text,
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 5,
  },
  turnoEstado: {
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  stateContainer: { alignItems: "center", paddingVertical: 44 },
  stateText: {
    color: Colors.light.text,
    fontSize: 17,
    marginTop: 12,
    fontFamily: Fonts.sans,
  },
  errorText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    marginVertical: 10,
  },
  secondaryButton: {
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  secondaryButtonText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(59, 55, 58, 0.55)",
  },
  modalCard: {
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    padding: 20,
  },
  modalTitle: {
    color: Colors.light.text,
    fontSize: 25,
    fontWeight: "900",
    marginBottom: 16,
  },
  modalQuestion: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  input: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: "900",
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
    padding: 12,
    marginBottom: 16,
  },
  summary: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundElement,
    paddingTop: 14,
    marginBottom: 16,
  },
  summaryTitle: {
    color: Colors.light.textSecondary,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  summaryText: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: Fonts.sans,
  },
  confirmButton: {
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSelected,
    padding: 14,
  },
  confirmButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  cancelButton: { alignItems: "center", padding: 15, marginTop: 5 },
  cancelButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
});
