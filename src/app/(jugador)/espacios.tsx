import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
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
import { getEspacios } from "@/servicios/espacios";
import { programarRecordatorioTurno } from "@/servicios/notificaciones";
import {
  agregarReservaACache,
  crearReserva,
  getTurnos,
} from "@/servicios/reservas";
import type { Deporte, Espacio, Turno } from "@/tipos";
import {
  SIN_COMPLEJO,
  complejosDelCatalogo,
  etiquetaComplejo,
  filtrarCatalogoLocal,
  filtrosParaConsulta,
  normalizarComplejo,
  type FiltrosCatalogo,
} from "@/utilidades/filtros-espacios";

type Vista = "espacios" | "disponibilidad";
type HorarioDisponible = { espacio: Espacio; turno: Turno };
type AvisoMantenimiento = { id: string; mensaje: string };
type FiltroDeporte = Deporte | "todas";

const ETIQUETAS_DEPORTE: Record<Deporte, string> = {
  futbol: "Fútbol 5",
  futbol11: "Fútbol 11",
  padel: "Pádel",
  tenis: "Tenis",
  basket: "Básquet",
  voley: "Vóley",
  gimnasio: "Gimnasio",
};

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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

export default function EspaciosScreen({
  vistaInicial = "espacios",
}: {
  vistaInicial?: Vista;
}) {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const esConsultaPublica = usePathname().startsWith("/consulta-disponibilidad");
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [resultadoFiltro, setResultadoFiltro] = useState<{
    clave: string;
    espacios: Espacio[];
  } | null>(null);
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [disciplina, setDisciplina] = useState<FiltroDeporte>("todas");
  const [complejo, setComplejo] = useState<string | null>(null);
  const [fecha, setFecha] = useState(() => inicioDelDia(new Date()));
  const [horarios, setHorarios] = useState<HorarioDisponible[]>([]);
  const [avisosMantenimiento, setAvisosMantenimiento] = useState<
    AvisoMantenimiento[]
  >([]);
  const [errorEspacios, setErrorEspacios] = useState<string | null>(null);
  const [errorFiltro, setErrorFiltro] = useState<string | null>(null);
  const [errorHorarios, setErrorHorarios] = useState<string | null>(null);
  const [intentoCargaHorarios, setIntentoCargaHorarios] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingFiltros, setLoadingFiltros] = useState(false);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [intentoFiltro, setIntentoFiltro] = useState(0);
  const [turnoSeleccionado, setTurnoSeleccionado] =
    useState<HorarioDisponible | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cantidadJugadores, setCantidadJugadores] = useState("1");
  const [reservando, setReservando] = useState(false);
  const [mensajeReserva, setMensajeReserva] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (vistaInicial === "disponibilidad") setVista("disponibilidad");
    }, [vistaInicial]),
  );

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
      setRefreshing(false);
    }
  }, []);

  function reintentarEspacios() {
    setLoading(true);
    setErrorEspacios(null);
    void cargarEspacios();
  }

  const disciplinas = useMemo(
    () => Array.from(new Set(espacios.map((espacio) => espacio.deporte))),
    [espacios],
  );
  const opcionesDisciplina: FiltroDeporte[] = ["todas", ...disciplinas];
  const complejos = useMemo(
    () => complejosDelCatalogo(espacios),
    [espacios],
  );
  const claveFiltro = JSON.stringify([disciplina, complejo]);
  const filtrosActivos = disciplina !== "todas" || complejo !== null;
  const filtros = useMemo(() => {
    const resultado: FiltrosCatalogo = {};
    if (disciplina !== "todas") resultado.deporte = disciplina;
    if (complejo !== null) resultado.complejo = complejo;
    return resultado;
  }, [complejo, disciplina]);
  const espaciosFiltrados = useMemo(() => {
    if (!filtrosActivos) return espacios;
    if (resultadoFiltro?.clave === claveFiltro) return resultadoFiltro.espacios;
    return filtrarCatalogoLocal(espacios, filtros);
  }, [claveFiltro, filtrosActivos, filtros, espacios, resultadoFiltro]);
  const idsEspaciosFiltrados = useMemo(
    () => new Set(espaciosFiltrados.map((espacio) => espacio.id)),
    [espaciosFiltrados],
  );
  const horariosFiltrados = horarios.filter(({ espacio }) =>
    idsEspaciosFiltrados.has(espacio.id),
  );

  function seleccionarDisciplina(opcion: FiltroDeporte) {
    setDisciplina(opcion);
    setErrorFiltro(null);
    if (opcion === "todas" && complejo === null) {
      setLoadingFiltros(false);
    }
  }

  function seleccionarComplejo(opcion: string | null) {
    setComplejo(opcion);
    setErrorFiltro(null);
    if (opcion === null && disciplina === "todas") {
      setLoadingFiltros(false);
    }
  }

  function reintentarFiltro() {
    setLoadingFiltros(true);
    setIntentoFiltro((intento) => intento + 1);
  }

  function refrescarVista() {
    setRefreshing(true);
    if (vista === "espacios" || errorEspacios) {
      setLoading(true);
      setErrorEspacios(null);
      void cargarEspacios();
      return;
    }
    setIntentoCargaHorarios((intento) => intento + 1);
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
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (espacios.length === 0 || !filtrosActivos) return;

    async function filtrarEspacios() {
      setLoadingFiltros(true);
      setErrorFiltro(null);
      try {
        const respuesta = await getEspacios(filtrosParaConsulta(filtros));
        if (!active) return;

        if ("error" in respuesta && respuesta.error) {
          setResultadoFiltro({
            clave: claveFiltro,
            espacios: filtrarCatalogoLocal(espacios, filtros),
          });
          setErrorFiltro(respuesta.error.mensaje);
          return;
        }

        setResultadoFiltro({
          clave: claveFiltro,
          espacios:
            filtros.complejo === SIN_COMPLEJO
              ? filtrarCatalogoLocal(respuesta.datos, filtros)
              : respuesta.datos,
        });
      } catch (error) {
        if (!active) return;
        setResultadoFiltro({
          clave: claveFiltro,
          espacios: filtrarCatalogoLocal(espacios, filtros),
        });
        setErrorFiltro(
          error instanceof Error
            ? error.message
            : "No se pudieron aplicar los filtros.",
        );
      } finally {
        if (active) setLoadingFiltros(false);
      }
    }

    void filtrarEspacios();
    return () => {
      active = false;
    };
  }, [
    claveFiltro,
    complejo,
    disciplina,
    filtros,
    filtrosActivos,
    intentoFiltro,
    espacios,
  ]);

  useEffect(() => {
    if (vista !== "disponibilidad" || loadingFiltros) return;

    let active = true;

    async function cargarHorarios() {
      setLoadingHorarios(true);
      setErrorHorarios(null);
      setAvisosMantenimiento([]);
      const fechaClave = claveFecha(fecha);
      try {
        const resultados = await Promise.all(
          espaciosFiltrados.map(async (espacio) => {
            const respuesta = await getTurnos(
              espacio.id,
              fechaIsoParaHora(fecha, 0),
              fechaIsoParaHora(sumarDias(fecha, 1), 0),
            );
            if ("error" in respuesta && respuesta.error) {
              return {
                horarios: [],
                avisos: [],
                error: respuesta.error.mensaje,
              };
            }

            const turnosDia = respuesta.datos.filter(
              (turno) =>
                claveFecha(new Date(turno.fechaHoraInicio)) === fechaClave,
            );
            const horariosEspacio = respuesta.datos
              .filter(
                (turno) =>
                  claveFecha(new Date(turno.fechaHoraInicio)) === fechaClave &&
                  turno.estado === "libre" &&
                  new Date(turno.fechaHoraInicio).getTime() > Date.now(),
              )
              .map((turno) => ({ espacio, turno }));

            const turnosMantenimiento = turnosDia.filter(
              (turno) => turno.estado === "mantenimiento",
            );
            const motivos = Array.from(
              new Set(
                turnosMantenimiento
                  .map((turno) => turno.motivoBloqueo?.trim())
                  .filter((motivo): motivo is string => Boolean(motivo)),
              ),
            );
            const diaCompletoBloqueado =
              turnosDia.length === 16 &&
              turnosDia.every((turno) => turno.estado === "mantenimiento");
            const avisos =
              motivos.length > 0
                ? motivos.map((motivo) => ({
                    id: `${espacio.id}-${motivo}`,
                    mensaje: diaCompletoBloqueado
                      ? normalizarTexto(motivo).includes("lluvia")
                        ? `${espacio.nombre} está bloqueado por lluvia: ${motivo}.`
                        : `${espacio.nombre} está bloqueado todo el día: ${motivo}.`
                      : `Mantenimiento en ${espacio.nombre}: ${motivo}.`,
                  }))
                : turnosMantenimiento.length > 0
                  ? [
                      {
                        id: `${espacio.id}-mantenimiento`,
                        mensaje: diaCompletoBloqueado
                          ? `${espacio.nombre} está bloqueado todo el día por mantenimiento.`
                          : `Hay turnos de ${espacio.nombre} en mantenimiento.`,
                      },
                    ]
                  : [];

            return { horarios: horariosEspacio, avisos, error: null };
          }),
        );

        if (!active) return;

        const errores = resultados.flatMap((resultado) =>
          resultado.error ? [resultado.error] : [],
        );
        setHorarios(resultados.flatMap((resultado) => resultado.horarios));
        setAvisosMantenimiento(
          Array.from(
            new Map(
              resultados
                .flatMap((resultado) => resultado.avisos)
                .map((aviso) => [aviso.id, aviso]),
            ).values(),
          ),
        );
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
        if (active) {
          setLoadingHorarios(false);
          setRefreshing(false);
        }
      }
    }

    void cargarHorarios();
    return () => {
      active = false;
    };
  }, [espaciosFiltrados, fecha, intentoCargaHorarios, loadingFiltros, vista]);

  async function seleccionarTurno(horario: HorarioDisponible) {
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
                  reservaEspacioId: horario.espacio.id,
                  reservaTurnoId: horario.turno.id,
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

    setTurnoSeleccionado(horario);
    setCantidadJugadores("1");
    setMensajeReserva(null);
    setModalVisible(true);
  }

  async function confirmarReserva() {
    if (!turnoSeleccionado || reservando) return;

    const cantidad = Number.parseInt(cantidadJugadores, 10);
    const capacidad = turnoSeleccionado.espacio.capacidad;
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
        turnoSeleccionado.turno.id,
        cantidad,
      );

      if ("error" in respuesta && respuesta.error) {
        if (respuesta.error.codigo === "TURNO_OCUPADO") {
          setModalVisible(false);
          setTurnoSeleccionado(null);
          setIntentoCargaHorarios((intento) => intento + 1);
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

      const reserva = {
        ...respuesta.datos[0],
        espacioNombre: turnoSeleccionado.espacio.nombre,
        complejo: turnoSeleccionado.espacio.complejo,
        latitud: turnoSeleccionado.espacio.latitud,
        longitud: turnoSeleccionado.espacio.longitud,
      };
      try {
        await agregarReservaACache(reserva, usuario.id);
      } catch (error) {
        console.warn("No se pudo guardar la reserva recién creada en caché.", error);
      }
      const resultadoRecordatorio = await programarRecordatorioTurno(
        reserva.id,
        reserva.fechaHoraInicio,
        turnoSeleccionado.espacio.nombre,
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
                  params: { id: reserva.id },
                }),
            },
          ],
          { cancelable: false },
        );
        return;
      }
      router.replace({
        pathname: "/(jugador)/reserva/[id]",
        params: { id: reserva.id },
      });
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
      <View style={styles.loader}>
        <ActivityIndicator color={palette.backgroundSelected} />
        <Text style={styles.subtitle}>Cargando espacios...</Text>
      </View>
    );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refrescarVista}
          tintColor={palette.backgroundSelected}
          colors={[palette.backgroundSelected]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {vista === "espacios" ? "Elegí tu espacio" : "Buscá un horario"}
        </Text>
        <Text style={styles.subtitle}>
          {vista === "espacios"
            ? "Elegí una cancha para consultar sus horarios."
            : "Filtrá por deporte y complejo para encontrar un turno libre."}
        </Text>
        {esConsultaPublica ? (
          <Text style={styles.subtitle}>
            La consulta es pública. Para reservar, iniciá sesión.
          </Text>
        ) : null}
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

      <Text style={styles.filterLabel}>Deporte</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {opcionesDisciplina.map((opcion) => (
          <Pressable
            key={opcion}
            style={[
              styles.filterChip,
              disciplina === opcion && styles.filterChipActive,
            ]}
            onPress={() => seleccionarDisciplina(opcion)}
          >
            <Text
              style={[
                styles.filterText,
                disciplina === opcion && styles.filterTextActive,
              ]}
            >
              {opcion === "todas" ? "Todos" : ETIQUETAS_DEPORTE[opcion]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>Complejo</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {[null, ...complejos].map((opcion) => (
          <Pressable
            key={opcion === null ? "todos" : `complejo:${opcion}`}
            style={[
              styles.filterChip,
              complejo === opcion && styles.filterChipActive,
            ]}
            onPress={() => seleccionarComplejo(opcion)}
          >
            <Text
              style={[
                styles.filterText,
                complejo === opcion && styles.filterTextActive,
              ]}
            >
              {opcion === null ? "Todos" : etiquetaComplejo(opcion)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {errorFiltro ? (
        <View style={styles.filterError}>
          <Text style={styles.errorText}>
            No se pudo consultar el filtro en línea. Se muestran resultados del
            catálogo disponible. {errorFiltro}
          </Text>
          <Pressable
            style={styles.retryButton}
            onPress={reintentarFiltro}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Reintentar filtro</Text>
          </Pressable>
        </View>
      ) : null}

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
      ) : loadingFiltros ? (
        <ActivityIndicator
          style={styles.loadingInline}
          color={palette.backgroundSelected}
        />
      ) : espaciosFiltrados.length === 0 ? (
        <Text style={styles.empty}>No hay espacios para estos filtros.</Text>
      ) : (
        espaciosFiltrados.map((espacio) => (
          <Pressable
            key={espacio.id}
            style={styles.card}
            onPress={() =>
              router.push(
                esConsultaPublica
                  ? {
                      pathname: "/(public)/consulta-disponibilidad/espacio/[id]",
                      params: { id: espacio.id },
                    }
                  : {
                      pathname: "/(jugador)/espacio/[id]",
                      params: { id: espacio.id },
                    },
              )
            }
          >
            <Image source={{ uri: espacio.fotosUrl[0] }} style={styles.image} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{espacio.nombre}</Text>
              <Text style={styles.meta}>
                {ETIQUETAS_DEPORTE[espacio.deporte]} · {espacio.superficie}
              </Text>
              <Text style={styles.meta}>
                {espacio.luzNocturna ? "Luz nocturna" : "Sin luz nocturna"}
                {espacio.techado !== undefined
                  ? ` · ${espacio.techado ? "Techado" : "Al aire libre"}`
                  : ""}
              </Text>
              <Text style={styles.meta}>
                {etiquetaComplejo(normalizarComplejo(espacio.complejo))}
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
          <Text style={styles.selectedDate}>{formatearFecha(fecha)}</Text>
          {avisosMantenimiento.map((aviso) => (
            <Text key={aviso.id} style={styles.maintenanceNotice}>
              {aviso.mensaje}
            </Text>
          ))}
          {errorEspacios ? (
            <View style={styles.loadError}>
              <Text style={styles.errorText}>{errorEspacios}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={reintentarEspacios}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : loadingFiltros || loadingHorarios ? (
            <ActivityIndicator
              style={styles.loadingInline}
              color={palette.backgroundSelected}
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
                    No hay horarios libres para estos filtros. Probá otro día o
                    ajustá el deporte o el complejo.
                  </Text>
                )
              ) : (
                horariosFiltrados.map(({ espacio, turno }) => (
                  <Pressable
                    key={`${espacio.id}-${turno.id}`}
                    style={styles.availabilityCard}
                    onPress={() => void seleccionarTurno({ espacio, turno })}
                  >
                    <View>
                      <Text style={styles.cardTitle}>
                        {formatearHora(turno.fechaHoraInicio)}
                      </Text>
                      <Text style={styles.meta}>
                        {espacio.nombre} · {ETIQUETAS_DEPORTE[espacio.deporte]}
                      </Text>
                    </View>
                    <View style={styles.availabilityRight}>
                      <Text style={styles.price}>
                        $ {turno.precio.toLocaleString("es-AR")}
                      </Text>
                      <Text style={styles.action}>
                        {esConsultaPublica
                          ? "Iniciá sesión para reservar →"
                          : "Reservar →"}
                      </Text>
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
              onChangeText={(valor) => {
                const capacidad = turnoSeleccionado?.espacio.capacidad;
                const maxLength =
                  capacidad && capacidad > 0
                    ? String(capacidad).length
                    : 3;
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
                turnoSeleccionado?.espacio.capacidad &&
                turnoSeleccionado.espacio.capacidad > 0
                  ? String(turnoSeleccionado.espacio.capacidad).length
                  : 3
              }
              selectTextOnFocus
              style={styles.input}
              placeholder="Cantidad"
              placeholderTextColor={palette.textSecondary}
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
                {turnoSeleccionado.espacio.capacidad ? (
                  <Text style={styles.summaryText}>
                    Capacidad máxima: {turnoSeleccionado.espacio.capacidad}{" "}
                    jugadores
                  </Text>
                ) : null}
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

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.backgroundElement },
    container: { padding: 20, gap: 14 },
    loader: {
      flex: 1,
      backgroundColor: palette.backgroundElement,
      paddingTop: 40,
    },
    header: { gap: 5, marginBottom: 4 },
    eyebrow: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.4,
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
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: palette.background,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
    },
    segment: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      borderRadius: 9,
    },
    segmentActive: { backgroundColor: palette.backgroundSelected },
    segmentText: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      fontFamily: Fonts.sans,
    },
    segmentTextActive: { color: palette.textOnSelected },
    card: {
      backgroundColor: palette.background,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: palette.backgroundElement,
    },
    image: {
      width: "100%",
      height: 150,
      backgroundColor: palette.backgroundElement,
    },
    cardBody: { padding: 16, gap: 5 },
    cardTitle: {
      color: palette.text,
      fontSize: 19,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    meta: {
      color: palette.text,
      textTransform: "capitalize",
      fontFamily: Fonts.sans,
    },
    price: {
      color: palette.textSecondary,
      fontWeight: "800",
      marginTop: 4,
      fontFamily: Fonts.sans,
    },
    action: {
      color: palette.textSecondary,
      fontWeight: "800",
      marginTop: 7,
      fontFamily: Fonts.sans,
    },
    filterLabel: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "800",
      marginTop: 2,
      fontFamily: Fonts.sans,
    },
    filterRow: { gap: 8, paddingBottom: 2 },
    filterChip: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 20,
      paddingVertical: 9,
      paddingHorizontal: 14,
      backgroundColor: palette.background,
    },
    filterChipActive: { backgroundColor: palette.backgroundSelected },
    filterText: {
      color: palette.textSecondary,
      fontWeight: "800",
      textTransform: "capitalize",
      fontFamily: Fonts.sans,
    },
    filterTextActive: { color: palette.textOnSelected },
    dateChip: {
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: palette.background,
    },
    selectedDate: {
      color: palette.text,
      fontWeight: "700",
      marginTop: 4,
      fontFamily: Fonts.sans,
      textTransform: "capitalize",
    },
    maintenanceNotice: {
      color: palette.text,
      backgroundColor: palette.backgroundElement,
      borderRadius: 10,
      padding: 12,
      fontFamily: Fonts.sans,
    },
    loadingInline: { marginTop: 20 },
    empty: {
      color: palette.text,
      textAlign: "center",
      paddingVertical: 24,
      fontFamily: Fonts.sans,
    },
    loadError: {
      gap: 10,
      padding: 14,
      borderRadius: 12,
      backgroundColor: palette.background,
    },
    filterError: {
      alignItems: "flex-start",
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: palette.background,
    },
    retryButton: {
      alignSelf: "flex-start",
      borderRadius: 9,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: palette.backgroundSelected,
    },
    retryText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    availabilityCard: {
      backgroundColor: palette.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
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
      borderColor: palette.backgroundSelected,
      backgroundColor: palette.backgroundElement,
    },
    modalTitle: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    modalQuestion: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    input: {
      padding: 12,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      backgroundColor: palette.background,
      color: palette.text,
      fontSize: 18,
      fontFamily: Fonts.sans,
    },
    summary: {
      gap: 5,
      padding: 14,
      borderRadius: 12,
      backgroundColor: palette.background,
    },
    summaryTitle: {
      color: palette.text,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    summaryText: { color: palette.text, fontFamily: Fonts.sans },
    errorText: {
      color: "#b91c1c",
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    confirmButton: {
      alignItems: "center",
      padding: 14,
      borderRadius: 10,
      backgroundColor: palette.backgroundSelected,
    },
    confirmButtonText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    disabledButton: { opacity: 0.6 },
    cancelButton: { alignItems: "center", padding: 10 },
    cancelButtonText: {
      color: palette.textSecondary,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
  });
}
