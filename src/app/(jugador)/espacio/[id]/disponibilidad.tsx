import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { getCurrentUserSession } from "@/persistencia/session";
import { getSessionToken } from "@/servicios/auth";
import { ApiError } from "@/servicios/api";
import { getEspacioById } from "@/servicios/espacios";
import { programarRecordatorioTurno } from "@/servicios/notificaciones";
import {
  agregarReservaACache,
  crearReserva,
  getTurnos,
} from "@/servicios/reservas";
import type { Espacio, Turno } from "@/tipos";

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

function fechaDesdeTurnoId(
  turnoId: string,
  hoy: Date,
): Date | null {
  const coincidencia = /-(\d{4})(\d{2})(\d{2})-\d{2}$/.exec(turnoId);
  if (!coincidencia) return null;

  const fecha = new Date(
    Number(coincidencia[1]),
    Number(coincidencia[2]) - 1,
    Number(coincidencia[3]),
  );
  if (
    fecha.getFullYear() !== Number(coincidencia[1]) ||
    fecha.getMonth() !== Number(coincidencia[2]) - 1 ||
    fecha.getDate() !== Number(coincidencia[3]) ||
    fecha < hoy ||
    fecha > sumarDias(hoy, DIAS_VISIBLES - 1)
  ) {
    return null;
  }
  return fecha;
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

function textoEstado(turno: Turno): string {
  switch (turno.estado) {
    case "libre":
      return `Libre · ${formatearPrecio(turno.precio)}`;
    case "ocupado":
    case "reservado":
      return "Reservado";
    case "mantenimiento":
      return `Mantenimiento${turno.motivoBloqueo ? `: ${turno.motivoBloqueo}` : ""}`;
    case "fijo":
      return "Fijo";
  }
}

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function esTurnoPasado(fechaIso: string): boolean {
  return new Date(fechaIso).getTime() <= Date.now();
}

export default function DisponibilidadEspacioScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const esConsultaPublica = usePathname().startsWith("/consulta-disponibilidad");
  const parametros = useLocalSearchParams<{
    id?: string | string[];
    turnoId?: string | string[];
  }>();
  const espacioId = obtenerIdParametro(parametros.id);
  const turnoId = obtenerIdParametro(parametros.turnoId);

  const [hoy] = useState(() => inicioDelDia(new Date()));
  const ultimaFechaVisible = sumarDias(hoy, DIAS_VISIBLES - 1);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() =>
    fechaDesdeTurnoId(turnoId, hoy) ?? hoy,
  );
  const [intentoCarga, setIntentoCarga] = useState(0);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{
    mensaje: string;
    codigo?: string;
  } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(
    null,
  );
  const [cantidadJugadores, setCantidadJugadores] = useState("1");
  const [reservando, setReservando] = useState(false);
  const [mensajeReserva, setMensajeReserva] = useState<string | null>(null);
  const turnoRestaurado = useRef<string | null>(null);

  const fechasVisibles = useMemo(
    () =>
      Array.from({ length: DIAS_VISIBLES }, (_, indice) =>
        sumarDias(hoy, indice),
      ),
    [hoy],
  );

  const cargarDisponibilidad = useCallback(async () => {
    if (!espacioId) {
      throw new Error("No se recibió el espacio a consultar.");
    }

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
      throw new ApiError(
        respuestaTurnos.error.mensaje,
        0,
        respuestaTurnos.error.codigo,
      );
    }

    if ("error" in respuestaEspacio && respuestaEspacio.error) {
      throw new ApiError(
        respuestaEspacio.error.mensaje,
        0,
        respuestaEspacio.error.codigo,
      );
    }

    const turnosDelDia = respuestaTurnos.datos.filter(
      (turno) =>
        claveFecha(new Date(turno.fechaHoraInicio)) ===
        claveFecha(fechaSeleccionada),
    );

    return {
      espacio: respuestaEspacio.datos[0] ?? null,
      turnos: turnosDelDia.filter(
        (turno) => !esTurnoPasado(turno.fechaHoraInicio),
      ),
    };
  }, [espacioId, fechaSeleccionada]);

  useEffect(() => {
    if (!espacioId) {
      return;
    }

    let active = true;

    cargarDisponibilidad()
      .then((resultado) => {
        if (active) {
          setError(null);
          setEspacio(resultado.espacio);
          setTurnos(resultado.turnos);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError({
            mensaje:
              err instanceof Error
                ? err.message
                : "No se pudo cargar la disponibilidad.",
            codigo: err instanceof ApiError ? err.codigo : undefined,
          });
          setTurnos([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [cargarDisponibilidad, intentoCarga, espacioId]);

  useEffect(() => {
    if (
      !turnoId ||
      turnoRestaurado.current === turnoId ||
      loading ||
      error
    ) {
      return;
    }

    turnoRestaurado.current = turnoId;
    const turno = turnos.find((item) => item.id === turnoId);
    if (!turno || turno.estado !== "libre") {
      Alert.alert(
        "Turno no disponible",
        "El horario que elegiste ya no está disponible. Seleccioná otro turno.",
      );
      return;
    }

    const timer = setTimeout(() => {
      setTurnoSeleccionado(turno);
      setCantidadJugadores("1");
      setMensajeReserva(null);
      setModalVisible(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [error, loading, turnoId, turnos]);

  function cambiarFecha(fecha: Date) {
    const fechaNormalizada = inicioDelDia(fecha);
    if (
      fechaNormalizada.getTime() < hoy.getTime() ||
      fechaNormalizada.getTime() > ultimaFechaVisible.getTime()
    ) {
      return;
    }

    setError(null);
    setLoading(true);
    setFechaSeleccionada(fechaNormalizada);
  }

  function reintentarCarga() {
    setError(null);
    setLoading(true);
    setIntentoCarga((intento) => intento + 1);
  }

  function refrescarDisponibilidad() {
    setRefreshing(true);
    setError(null);
    setIntentoCarga((intento) => intento + 1);
  }

  async function seleccionarTurno(turno: Turno) {
    if (turno.estado !== "libre" || esTurnoPasado(turno.fechaHoraInicio)) {
      return;
    }

    let usuario: Awaited<ReturnType<typeof getCurrentUserSession>>;
    let token: string | null;
    try {
      [usuario, token] = await Promise.all([
        getCurrentUserSession(),
        getSessionToken(),
      ]);
    } catch (error) {
      Alert.alert(
        "No se pudo verificar la sesión",
        error instanceof Error
          ? error.message
          : "Volvé a intentarlo para continuar.",
      );
      return;
    }

    if (!usuario || !token) {
      Alert.alert(
        "Iniciá sesión para reservar",
        "Podés consultar la disponibilidad sin cuenta. Para reservar, necesitás iniciar sesión.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Iniciar sesión",
            onPress: () =>
              router.push({
                pathname: "/(auth)/login",
                params: {
                  reservaEspacioId: espacioId,
                  reservaTurnoId: turno.id,
                },
              }),
          },
        ],
      );
      return;
    }

    if (usuario.rol !== "jugador") {
      Alert.alert(
        "Reserva no disponible",
        "Solo los jugadores pueden reservar un turno.",
      );
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
    const capacidad = espacio?.capacidad;

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setMensajeReserva("Ingresá una cantidad de jugadores válida.");
      return;
    }
    if (capacidad && cantidad > capacidad) {
      setMensajeReserva(`La capacidad máxima es de ${capacidad} jugadores.`);
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
        turnoSeleccionado.id,
        cantidad,
      );

      if ("error" in respuesta && respuesta.error) {
        if (respuesta.error.codigo === "TURNO_OCUPADO") {
          setModalVisible(false);
          setTurnoSeleccionado(null);
          reintentarCarga();
          Alert.alert(
            "El turno ya no está disponible",
            "Actualizamos la grilla. Elegí otro horario libre.",
          );
          return;
        }
        if (respuesta.error.codigo === "LIMITE_DE_RESERVAS") {
          setMensajeReserva(
            `Alcanzaste el límite de reservas permitido. ${respuesta.error.mensaje}`,
          );
          return;
        }
        if (respuesta.error.codigo === "CAPACIDAD_EXCEDIDA") {
          setMensajeReserva(
            `La cantidad supera la capacidad permitida. ${respuesta.error.mensaje}`,
          );
          return;
        }
        setMensajeReserva(respuesta.error.mensaje);
        return;
      }

      const reservaCreada = {
        ...respuesta.datos[0],
        espacioNombre: espacio?.nombre,
        complejo: espacio?.complejo,
        latitud: espacio?.latitud,
        longitud: espacio?.longitud,
      };
      try {
        await agregarReservaACache(reservaCreada, usuario.id);
      } catch (error) {
        console.warn("No se pudo guardar la reserva recién creada en caché.", error);
      }

      const resultadoRecordatorio = await programarRecordatorioTurno(
        reservaCreada.id,
        reservaCreada.fechaHoraInicio,
        espacio?.nombre ?? "el espacio deportivo",
      );

      setModalVisible(false);
      if (
        resultadoRecordatorio === "permiso-denegado" ||
        resultadoRecordatorio === "error"
      ) {
        Alert.alert(
          "Reserva confirmada, sin recordatorio",
          "La reserva quedó confirmada, pero no pudimos programar el recordatorio. Revisá los permisos en Perfil > Notificaciones.",
          [
            {
              text: "Ver reservas",
              onPress: () =>
                router.replace({
                  pathname: "/(jugador)/reserva/[id]",
                  params: { id: reservaCreada.id },
                }),
            },
          ],
          { cancelable: false },
        );
        return;
      }
      router.replace({
        pathname: "/(jugador)/reserva/[id]",
        params: { id: reservaCreada.id },
      });
    } catch (err) {
      setMensajeReserva(
        err instanceof Error
          ? err.message
          : "No se pudo confirmar la reserva.",
      );
    } finally {
      setReservando(false);
    }
  }

  const puedeIrAlDiaAnterior =
    fechaSeleccionada.getTime() > hoy.getTime();
  const puedeIrAlDiaSiguiente =
    fechaSeleccionada.getTime() < ultimaFechaVisible.getTime();

  const fechaResumen = turnoSeleccionado
    ? new Date(turnoSeleccionado.fechaHoraInicio)
    : null;
  const capacidad = espacio?.capacidad;
  const turnosMantenimiento = turnos.filter(
    (turno) => turno.estado === "mantenimiento",
  );
  const diaBloqueado =
    turnos.length > 0 && turnos.every((turno) => turno.estado === "mantenimiento");
  const motivosBloqueo = Array.from(
    new Set(
      turnosMantenimiento
        .map((turno) => turno.motivoBloqueo?.trim())
        .filter((motivo): motivo is string => Boolean(motivo)),
    ),
  );
  const motivoDiaBloqueado = motivosBloqueo.join("; ") || "Mantenimiento";
  const bloqueadoPorLluvia = normalizarTexto(motivoDiaBloqueado).includes(
    "lluvia",
  );
  const sinTurnosLibres =
    turnos.length > 0 &&
    !diaBloqueado &&
    !turnos.some((turno) => turno.estado === "libre");

  if (!espacioId) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.errorText}>No se recibió el espacio a consultar.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refrescarDisponibilidad}
            tintColor={palette.backgroundSelected}
            colors={[palette.backgroundSelected]}
          />
        }
      >
        <Pressable
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </Pressable>

        <Text style={styles.title}>Disponibilidad</Text>
        <Text style={styles.subtitle}>
          {espacio?.nombre ?? "Espacio deportivo"}
        </Text>
        <Text style={styles.helperText}>
          {esConsultaPublica
            ? "Consultá los horarios sin cuenta. Para reservar, iniciá sesión."
            : "Seleccioná un turno libre para reservar."}
        </Text>

        <View style={styles.navigationRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !puedeIrAlDiaAnterior }}
            style={[
              styles.navigationButton,
              !puedeIrAlDiaAnterior && styles.disabledButton,
            ]}
            disabled={!puedeIrAlDiaAnterior}
            onPress={() => cambiarFecha(sumarDias(fechaSeleccionada, -1))}
          >
            <Text style={styles.navigationText}>Día anterior</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !puedeIrAlDiaSiguiente }}
            style={[
              styles.navigationButton,
              !puedeIrAlDiaSiguiente && styles.disabledButton,
            ]}
            disabled={!puedeIrAlDiaSiguiente}
            onPress={() => cambiarFecha(sumarDias(fechaSeleccionada, 1))}
          >
            <Text style={styles.navigationText}>Día siguiente</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {fechasVisibles.map((fecha) => {
            const activa =
              claveFecha(fecha) === claveFecha(fechaSeleccionada);

            return (
              <Pressable
                key={claveFecha(fecha)}
                accessibilityRole="button"
                accessibilityState={{ selected: activa }}
                style={[styles.dateButton, activa && styles.dateButtonActive]}
                onPress={() => cambiarFecha(fecha)}
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
              color={palette.backgroundSelected}
            />
            <Text style={styles.stateText}>Cargando disponibilidad...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.errorText}>{error.mensaje}</Text>

            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={reintentarCarga}
            >
              <Text style={styles.secondaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : turnos.length === 0 ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              No quedan turnos para esta fecha. Probá otro día o consultá otro
              espacio.
            </Text>
          </View>
        ) : (
          <>
            {diaBloqueado ? (
              <Text style={styles.blockedDay}>
                {bloqueadoPorLluvia
                  ? `Este día está bloqueado por lluvia: ${motivoDiaBloqueado}.`
                  : `Este día está bloqueado: ${motivoDiaBloqueado}.`}
              </Text>
            ) : null}
            {sinTurnosLibres ? (
              <Text style={styles.noFreeSlots}>
                No hay turnos libres. Probá otro día o consultá otro espacio.
              </Text>
            ) : null}
            <View style={styles.grid}>
              {turnos.map((turno) => {
                const deshabilitado = turno.estado !== "libre";

                return (
                  <Pressable
                    key={turno.id}
                    disabled={deshabilitado}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: deshabilitado }}
                    accessibilityLabel={`${formatearHora(turno.fechaHoraInicio)}. ${textoEstado(turno)}`}
                    onPress={() => void seleccionarTurno(turno)}
                    style={[
                      styles.turno,
                      turno.estado === "libre"
                        ? styles.turno_libre
                        : turno.estado === "fijo"
                          ? styles.turno_fijo
                          : turno.estado === "mantenimiento"
                            ? styles.turno_mantenimiento
                            : styles.turno_ocupado,
                    ]}
                  >
                    <Text style={styles.turnoHora}>
                      {formatearHora(turno.fechaHoraInicio)}
                    </Text>

                    <Text style={styles.turnoEstado}>
                      {textoEstado(turno)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
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
              onChangeText={(valor) => {
                const maxLength =
                  capacidad && capacidad > 0 ? String(capacidad).length : 3;
                const digitos = valor.replace(/\D/g, "").slice(0, maxLength);
                if (!digitos) {
                  setCantidadJugadores("");
                  return;
                }
                const cantidad = Number.parseInt(digitos, 10);
                setCantidadJugadores(
                  String(
                    capacidad && capacidad > 0
                      ? Math.min(cantidad, capacidad)
                      : cantidad,
                  ),
                );
              }}
              keyboardType="number-pad"
              maxLength={
                capacidad && capacidad > 0 ? String(capacidad).length : 3
              }
              selectTextOnFocus
              style={styles.input}
              placeholder="Cantidad"
              placeholderTextColor={palette.textSecondary}
              accessibilityLabel="Cantidad de jugadores"
            />
            {capacidad ? (
              <Text style={styles.summaryText}>
                Capacidad máxima: {capacidad} jugadores
              </Text>
            ) : null}

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
              accessibilityRole="button"
              style={[
                styles.confirmButton,
                reservando && styles.disabledButton,
              ]}
              disabled={reservando}
              onPress={confirmarReserva}
            >
              <Text style={styles.confirmButtonText}>
                {reservando ? "Cargando..." : "Confirmar reserva"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={styles.cancelButton}
              disabled={reservando}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
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
    content: { padding: 20, paddingBottom: 36 },
    backButton: {
      alignSelf: "flex-start",
      minHeight: 44,
      justifyContent: "center",
      paddingRight: 12,
      marginBottom: 10,
    },
    backButtonText: {
      color: palette.textSecondary,
      fontSize: 16,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    title: {
      color: palette.text,
      fontSize: 30,
      fontWeight: "900",
      marginBottom: 4,
      fontFamily: Fonts.sans,
    },
    subtitle: {
      color: palette.text,
      fontSize: 19,
      fontWeight: "800",
      marginBottom: 6,
      fontFamily: Fonts.sans,
    },
    helperText: {
      color: palette.text,
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
      borderColor: palette.backgroundSelected,
      borderRadius: 12,
      backgroundColor: palette.background,
      paddingHorizontal: 8,
    },
    navigationText: {
      color: palette.textSecondary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "center",
      fontFamily: Fonts.sans,
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
      borderColor: palette.backgroundElement,
      borderRadius: 10,
      backgroundColor: palette.background,
    },
    dateButtonActive: {
      backgroundColor: palette.backgroundSelected,
      borderColor: palette.backgroundSelected,
    },
    dateText: {
      color: palette.text,
      fontSize: 13,
      textTransform: "capitalize",
      fontFamily: Fonts.sans,
    },
    dateNumber: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 3,
    },
    dateTextActive: { color: palette.textOnSelected, fontWeight: "900" },
    selectedDate: {
      color: palette.text,
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
      borderWidth: 1,
      borderRadius: 14,
    },
    turno_libre: {
      backgroundColor: palette.background,
      borderColor: palette.backgroundElement,
    },
    turno_ocupado: {
      backgroundColor: palette.backgroundElement,
      borderColor: palette.text,
    },
    turno_mantenimiento: {
      backgroundColor: palette.backgroundElement,
      borderColor: palette.backgroundSelected,
    },
    turno_fijo: {
      backgroundColor: palette.background,
      borderColor: palette.backgroundSelected,
    },
    turnoHora: {
      color: palette.text,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 5,
      fontFamily: Fonts.sans,
    },
    turnoEstado: {
      color: palette.text,
      fontSize: 15,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    stateContainer: { alignItems: "center", paddingVertical: 44 },
    stateText: {
      color: palette.text,
      fontSize: 17,
      marginTop: 12,
      fontFamily: Fonts.sans,
    },
    errorText: {
      color: palette.textSecondary,
      fontSize: 15,
      lineHeight: 21,
      textAlign: "center",
      marginVertical: 10,
    },
    blockedDay: {
      color: palette.text,
      backgroundColor: palette.background,
      borderColor: palette.backgroundSelected,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      fontWeight: "800",
      lineHeight: 22,
    },
    noFreeSlots: {
      color: palette.text,
      backgroundColor: palette.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      fontWeight: "700",
      lineHeight: 22,
    },
    secondaryButton: {
      padding: 14,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      backgroundColor: palette.background,
    },
    secondaryButtonText: {
      color: palette.textSecondary,
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
      backgroundColor: palette.backgroundElement,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 18,
      padding: 22,
    },
    modalTitle: {
      color: palette.text,
      fontSize: 25,
      fontWeight: "900",
      marginBottom: 16,
      fontFamily: Fonts.sans,
    },
    modalQuestion: {
      color: palette.text,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 8,
      fontFamily: Fonts.sans,
    },
    input: {
      color: palette.text,
      fontSize: 24,
      fontWeight: "900",
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      backgroundColor: palette.background,
      padding: 12,
      marginBottom: 16,
      fontFamily: Fonts.sans,
    },
    summary: {
      borderRadius: 12,
      backgroundColor: palette.background,
      padding: 14,
      marginBottom: 16,
    },
    summaryTitle: {
      color: palette.textSecondary,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 8,
      fontFamily: Fonts.sans,
    },
    summaryText: {
      color: palette.text,
      fontSize: 15,
      lineHeight: 23,
      fontFamily: Fonts.sans,
    },
    confirmButton: {
      minHeight: 60,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: palette.backgroundSelected,
      borderRadius: 10,
      padding: 14,
    },
    confirmButtonText: {
      color: palette.textOnSelected,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
      fontFamily: Fonts.sans,
    },
    cancelButton: { alignItems: "center", padding: 15, marginTop: 5 },
    cancelButtonText: {
      color: palette.textSecondary,
      fontSize: 15,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
  });
}
