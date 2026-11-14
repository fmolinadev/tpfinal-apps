import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
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
import { getEspacios } from "@/servicios/espacios";
import { programarRecordatorioTurno } from "@/servicios/notificaciones";
import { crearReserva, getTurnos } from "@/servicios/reservas";
import type { Espacio, Turno } from "@/tipos";

type Vista = "espacios" | "disponibilidad";
type HorarioDisponible = { espacio: Espacio; turno: Turno };

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return inicioDelDia(resultado);
}

function claveFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
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
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatearHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function EspaciosScreen() {
  const router = useRouter();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [vista, setVista] = useState<Vista>("espacios");
  const [disciplina, setDisciplina] = useState("todas");
  const [fecha, setFecha] = useState(() => inicioDelDia(new Date()));
  const [horarios, setHorarios] = useState<HorarioDisponible[]>([]);
  const [errorEspacios, setErrorEspacios] = useState<string | null>(null);
  const [errorHorarios, setErrorHorarios] = useState<string | null>(null);
  const [intentoCargaHorarios, setIntentoCargaHorarios] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] =
    useState<HorarioDisponible | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cantidadJugadores, setCantidadJugadores] = useState("1");
  const [reservando, setReservando] = useState(false);
  const [mensajeReserva, setMensajeReserva] = useState<string | null>(null);

  const cargarEspacios = useCallback(async () => {
    try {
      const respuesta = await getEspacios();
      if ("error" in respuesta && respuesta.error) {
        setEspacios([]);
        setErrorEspacios(respuesta.error.mensaje);
        return;
      }

      setEspacios(respuesta.datos);
    } catch (error) {
      setEspacios([]);
      setErrorEspacios(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los espacios.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  function reintentarEspacios() {
    setLoading(true);
    setErrorEspacios(null);
    void cargarEspacios();
  }

  useEffect(() => {
    let active = true;

    getEspacios()
      .then((respuesta) => {
        if (!active) return;
        if ("error" in respuesta && respuesta.error) {
          setEspacios([]);
          setErrorEspacios(respuesta.error.mensaje);
          return;
        }

        setEspacios(respuesta.datos);
      })
      .catch((error: unknown) => {
        if (active) {
          setEspacios([]);
          setErrorEspacios(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los espacios.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (vista !== "disponibilidad" || espacios.length === 0) return;

    let active = true;

    async function cargarHorarios() {
      setLoadingHorarios(true);
      setErrorHorarios(null);
      const fechaClave = claveFecha(fecha);
      try {
        const resultados = await Promise.all(
          espacios.map(async (espacio) => {
            const respuesta = await getTurnos(
              espacio.id,
              fechaIsoParaHora(fecha, 0),
              fechaIsoParaHora(sumarDias(fecha, 1), 0),
            );
            if ("error" in respuesta && respuesta.error) {
              return { horarios: [], error: respuesta.error.mensaje };
            }

            const turnosPorHora = new Map(
              respuesta.datos
                .filter(
                  (turno) =>
                    claveFecha(new Date(turno.fechaHoraInicio)) === fechaClave,
                )
                .map((turno) => [
                  new Date(turno.fechaHoraInicio).getHours(),
                  turno,
                ]),
            );

            const horariosEspacio = Array.from({ length: 16 }, (_, indice) => {
              const hora = indice + 8;
              const turno = turnosPorHora.get(hora) ?? {
                id: `libre-${espacio.id}-${fechaClave}-${hora}`,
                espacioId: espacio.id,
                fechaHoraInicio: fechaIsoParaHora(fecha, hora),
                estado: "libre" as const,
                precio: espacio.precioPorHora,
              };
              return { espacio, turno };
            }).filter(
              ({ turno }) =>
                turno.estado === "libre" &&
                new Date(turno.fechaHoraInicio).getTime() > Date.now(),
            );

            return { horarios: horariosEspacio, error: null };
          }),
        );

        if (!active) return;

        const errores = resultados.flatMap((resultado) =>
          resultado.error ? [resultado.error] : [],
        );
        setHorarios(resultados.flatMap((resultado) => resultado.horarios));
        setErrorHorarios(
          errores.length > 0
            ? `No se pudo consultar la disponibilidad de todos los espacios. ${errores[0]}`
            : null,
        );
      } catch (error) {
        if (active) {
          setHorarios([]);
          setErrorHorarios(
            error instanceof Error
              ? error.message
              : "No se pudo cargar la disponibilidad.",
          );
        }
      } finally {
        if (active) setLoadingHorarios(false);
      }
    }

    void cargarHorarios();
    return () => {
      active = false;
    };
  }, [espacios, fecha, intentoCargaHorarios, vista]);

  const disciplinas = useMemo(
    () => [
      "todas",
      ...Array.from(new Set(espacios.map((espacio) => espacio.deporte))),
    ],
    [espacios],
  );
  const horariosFiltrados = horarios.filter(
    ({ espacio }) => disciplina === "todas" || espacio.deporte === disciplina,
  );

  function seleccionarTurno(horario: HorarioDisponible) {
    setTurnoSeleccionado(horario);
    setCantidadJugadores("1");
    setMensajeReserva(null);
    setModalVisible(true);
  }

  async function confirmarReserva() {
    if (!turnoSeleccionado || reservando) return;

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
      turnoSeleccionado.turno.id,
      cantidad,
      );

      if ("error" in respuesta && respuesta.error) {
        setMensajeReserva(respuesta.error.mensaje);
        return;
      }

      const reserva = respuesta.datos[0];
      await programarRecordatorioTurno(
        reserva.id,
        reserva.fechaHoraInicio,
        turnoSeleccionado.espacio.nombre,
      );

      setModalVisible(false);
      router.replace("/(jugador)/reservas");
    } catch (err) {
      setMensajeReserva(
        err instanceof Error ? err.message : "No se pudo confirmar la reserva.",
      );
    } finally {
      setReservando(false);
    }
  }

  if (loading)
    return (
      <ActivityIndicator
        style={styles.loader}
        color={Colors.light.backgroundSelected}
      />
    );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {vista === "espacios" ? "Elegí tu espacio" : "Buscá un horario"}
        </Text>
        <Text style={styles.subtitle}>
          {vista === "espacios"
            ? "Elegí una cancha para ver sus horarios y reservar."
            : "Filtrá por disciplina y encontrá un turno libre."}
        </Text>
      </View>

      <View style={styles.segmentedControl}>
        <Pressable
          style={[styles.segment, vista === "espacios" && styles.segmentActive]}
          onPress={() => setVista("espacios")}
        >
          <Text
            style={[
              styles.segmentText,
              vista === "espacios" && styles.segmentTextActive,
            ]}
          >
            Ver por espacio
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segment,
            vista === "disponibilidad" && styles.segmentActive,
          ]}
          onPress={() => setVista("disponibilidad")}
        >
          <Text
            style={[
              styles.segmentText,
              vista === "disponibilidad" && styles.segmentTextActive,
            ]}
          >
            Ver por disponibilidad
          </Text>
        </Pressable>
      </View>

      {vista === "espacios" ? errorEspacios ? (
        <View style={styles.loadError}>
          <Text style={styles.errorText}>{errorEspacios}</Text>
          <Pressable
            style={styles.retryButton}
          onPress={reintentarEspacios}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : espacios.length === 0 ? (
        <Text style={styles.empty}>No hay espacios disponibles.</Text>
      ) : (
        espacios.map((espacio) => (
          <Pressable
            key={espacio.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/(jugador)/espacio/[id]",
                params: { id: espacio.id },
              })
            }
          >
            <Image source={{ uri: espacio.fotosUrl[0] }} style={styles.image} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{espacio.nombre}</Text>
              <Text style={styles.meta}>
                {espacio.deporte} · {espacio.superficie}
              </Text>
              <Text style={styles.price}>
                $ {espacio.precioPorHora.toLocaleString("es-AR")} / hora
              </Text>
              <Text style={styles.action}>Ver disponibilidad →</Text>
            </View>
          </Pressable>
        ))
      ) : (
        <>
          <Text style={styles.filterLabel}>Disciplina</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {disciplinas.map((opcion) => (
              <Pressable
                key={opcion}
                style={[
                  styles.filterChip,
                  disciplina === opcion && styles.filterChipActive,
                ]}
                onPress={() => setDisciplina(opcion)}
              >
                <Text
                  style={[
                    styles.filterText,
                    disciplina === opcion && styles.filterTextActive,
                  ]}
                >
                  {opcion === "todas" ? "Todas" : opcion}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.filterLabel}>Fecha</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {Array.from({ length: 7 }, (_, indice) =>
              sumarDias(inicioDelDia(new Date()), indice),
            ).map((dia) => {
              const activa = claveFecha(dia) === claveFecha(fecha);
              return (
                <Pressable
                  key={claveFecha(dia)}
                  style={[styles.dateChip, activa && styles.filterChipActive]}
                  onPress={() => setFecha(dia)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activa && styles.filterTextActive,
                    ]}
                  >
                    {formatearFecha(dia)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {loadingHorarios ? (
            <ActivityIndicator
              style={styles.loadingInline}
              color={Colors.light.backgroundSelected}
            />
          ) : (
            <>
              {errorHorarios ? (
                <View style={styles.loadError}>
                  <Text style={styles.errorText}>{errorHorarios}</Text>
                  <Pressable
                    style={styles.retryButton}
                    onPress={() =>
                      setIntentoCargaHorarios((intento) => intento + 1)
                    }
                  >
                    <Text style={styles.retryText}>Reintentar</Text>
                  </Pressable>
                </View>
              ) : null}
              {horariosFiltrados.length === 0 ? (
                errorHorarios ? null : (
                  <Text style={styles.empty}>
                    No hay horarios libres para estos filtros.
                  </Text>
                )
              ) : (
                horariosFiltrados.map(({ espacio, turno }) => (
                  <Pressable
                    key={`${espacio.id}-${turno.id}`}
                    style={styles.availabilityCard}
                    onPress={() => seleccionarTurno({ espacio, turno })}
                  >
                    <View>
                      <Text style={styles.cardTitle}>
                        {formatearHora(turno.fechaHoraInicio)}
                      </Text>
                      <Text style={styles.meta}>
                        {espacio.nombre} · {espacio.deporte}
                      </Text>
                    </View>
                    <View style={styles.availabilityRight}>
                      <Text style={styles.price}>
                        $ {turno.precio.toLocaleString("es-AR")}
                      </Text>
                      <Text style={styles.action}>Reservar →</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </>
          )}
        </>
      )}
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

            {turnoSeleccionado && (
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Resumen</Text>
                <Text style={styles.summaryText}>
                  Espacio: {turnoSeleccionado.espacio.nombre}
                </Text>
                <Text style={styles.summaryText}>
                  Fecha:{" "}
                  {formatearFecha(
                    new Date(turnoSeleccionado.turno.fechaHoraInicio),
                  )}
                </Text>
                <Text style={styles.summaryText}>
                  Hora: {formatearHora(turnoSeleccionado.turno.fechaHoraInicio)}
                </Text>
                <Text style={styles.summaryText}>
                  Precio a pagar en el lugar: ${" "}
                  {turnoSeleccionado.turno.precio.toLocaleString("es-AR")}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  container: { padding: 20, gap: 14 },
  loader: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    paddingTop: 40,
  },
  header: { gap: 5, marginBottom: 4 },
  eyebrow: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    fontFamily: Fonts.sans,
  },
  title: {
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  subtitle: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 9,
  },
  segmentActive: { backgroundColor: Colors.light.backgroundSelected },
  segmentText: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: Fonts.sans,
  },
  segmentTextActive: { color: Colors.light.background },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
  },
  image: {
    width: "100%",
    height: 150,
    backgroundColor: Colors.light.backgroundElement,
  },
  cardBody: { padding: 16, gap: 5 },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 19,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  meta: {
    color: Colors.light.text,
    textTransform: "capitalize",
    fontFamily: Fonts.sans,
  },
  price: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    marginTop: 4,
    fontFamily: Fonts.sans,
  },
  action: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    marginTop: 7,
    fontFamily: Fonts.sans,
  },
  filterLabel: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
    fontFamily: Fonts.sans,
  },
  filterRow: { gap: 8, paddingBottom: 2 },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.background,
  },
  filterChipActive: { backgroundColor: Colors.light.backgroundSelected },
  filterText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    textTransform: "capitalize",
    fontFamily: Fonts.sans,
  },
  filterTextActive: { color: Colors.light.background },
  dateChip: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.background,
  },
  loadingInline: { marginTop: 20 },
  empty: {
    color: Colors.light.text,
    textAlign: "center",
    paddingVertical: 24,
    fontFamily: Fonts.sans,
  },
  loadError: {
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.backgroundSelected,
  },
  retryText: {
    color: Colors.light.background,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  availabilityCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  availabilityRight: { alignItems: "flex-end" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  modalCard: {
    gap: 12,
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
  },
  modalTitle: {
    color: Colors.light.text,
    fontSize: 22,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  modalQuestion: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    backgroundColor: Colors.light.background,
    color: Colors.light.text,
    fontSize: 18,
    fontFamily: Fonts.sans,
  },
  summary: {
    gap: 5,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
  },
  summaryTitle: {
    color: Colors.light.text,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  summaryText: { color: Colors.light.text, fontFamily: Fonts.sans },
  errorText: {
    color: "#b91c1c",
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
  confirmButton: {
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundSelected,
  },
  confirmButtonText: {
    color: Colors.light.background,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  disabledButton: { opacity: 0.6 },
  cancelButton: { alignItems: "center", padding: 10 },
  cancelButtonText: {
    color: Colors.light.textSecondary,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
});
