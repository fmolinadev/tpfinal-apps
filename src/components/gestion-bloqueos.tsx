import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { DateSelector, HourSelector } from "@/components/administrative-pickers";
import { SpaceSelect } from "@/components/space-select";
import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import {
  crearBloqueo,
  eliminarBloqueo,
  listarBloqueos,
  type Bloqueo,
  type CrearBloqueoInput,
} from "@/servicios/admin-bloqueos";
import { getEspacios } from "@/servicios/espacios";
import { listarEstadosReservasPorFecha } from "@/servicios/reservas";
import { obtenerAgenda } from "@/servicios/turnos";
import type { Espacio } from "@/tipos";
import type { TurnoAgenda } from "@/tipos/turno";
import {
  complejosDelCatalogo,
  etiquetaComplejo,
  normalizarComplejo,
} from "@/utilidades/filtros-espacios";

function fechaLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function finDelTurnoEpoch(turno: TurnoAgenda): number {
  return turno.fin === "24:00"
    ? Date.parse(`${turno.fecha}T00:00:00-03:00`) + 24 * 60 * 60 * 1000
    : Date.parse(`${turno.fecha}T${turno.fin}:00-03:00`);
}

function reservasAfectadasPrevias(
  turnos: TurnoAgenda[],
  input: CrearBloqueoInput,
): string[] {
  const espaciosSeleccionados = new Set(input.espacioIds);
  const reservas = new Set<string>();
  const ahora = Date.now();

  for (const turno of turnos) {
    if (
      !espaciosSeleccionados.has(turno.espacioId) ||
      turno.reservaEstado !== "confirmada" ||
      !turno.reservaId ||
      finDelTurnoEpoch(turno) <= ahora
    ) {
      continue;
    }

    if (
      input.inicio &&
      input.fin &&
      (turno.inicio < input.inicio || turno.inicio >= input.fin)
    ) {
      continue;
    }

    reservas.add(turno.reservaId);
  }

  return Array.from(reservas);
}

function horaSiguiente(hora: string): string {
  const siguiente = Number(hora.slice(0, 2)) + 1;
  return `${String(siguiente).padStart(2, "0")}:00`;
}

type Mensaje = { texto: string; tipo: "error" | "exito" };

export function GestionBloqueos() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [complejo, setComplejo] = useState("");
  const [espacioIds, setEspacioIds] = useState<string[]>([]);
  const [fecha, setFecha] = useState(() => fechaLocal(new Date()));
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("10:00");
  const [diaCompleto, setDiaCompleto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [cargandoEspacios, setCargandoEspacios] = useState(true);
  const [cargandoBloqueos, setCargandoBloqueos] = useState(true);
  const [previsualizando, setPrevisualizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const generacionBloqueos = useRef(0);

  const nombresPorId = useMemo(
    () => new Map(espacios.map((espacio) => [espacio.id, espacio.nombre])),
    [espacios],
  );
  const complejos = useMemo(
    () => complejosDelCatalogo(espacios).map((nombre) => ({
      id: nombre,
      nombre: etiquetaComplejo(nombre),
    })),
    [espacios],
  );
  const espaciosDelComplejo = useMemo(
    () => espacios.filter((espacio) => complejo !== "" &&
      normalizarComplejo(espacio.complejo) === complejo),
    [espacios, complejo],
  );

  const cargarBloqueos = useCallback(async () => {
    const generacion = ++generacionBloqueos.current;
    setCargandoBloqueos(true);
    try {
      const resultado = await listarBloqueos(fecha);
      if (generacion === generacionBloqueos.current) {
        setBloqueos(resultado);
      }
    } catch (error) {
      if (generacion === generacionBloqueos.current) {
        setMensaje({
          tipo: "error",
          texto:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los bloqueos.",
        });
      }
    } finally {
      if (generacion === generacionBloqueos.current) {
        setCargandoBloqueos(false);
      }
    }
  }, [fecha]);

  useEffect(() => {
    let active = true;
    async function cargarEspacios() {
      try {
        const respuesta = await getEspacios();
        if (!active) return;
        if ("error" in respuesta) {
          throw new Error(
            respuesta.error?.mensaje ?? "No se pudieron cargar los espacios.",
          );
        }
        setEspacios(respuesta.datos);
      } catch (error) {
        if (active) {
          setMensaje({
            tipo: "error",
            texto:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar los espacios.",
          });
        }
      } finally {
        if (active) setCargandoEspacios(false);
      }
    }
    void cargarEspacios();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => cargarBloqueos());
    return () => {
      generacionBloqueos.current += 1;
    };
  }, [cargarBloqueos]);

  function cambiarEspacio(id: string) {
    setEspacioIds((actuales) =>
      actuales.includes(id)
        ? actuales.filter((actual) => actual !== id)
        : [...actuales, id],
    );
  }

  function alternarTodosLosEspacios() {
    setEspacioIds((actuales) =>
      actuales.length === espaciosDelComplejo.length
        ? []
        : espaciosDelComplejo.map(({ id }) => id),
    );
  }

  function alternarEspaciosDescubiertos() {
    const descubiertos = espaciosDelComplejo
      .filter((espacio) => espacio.techado === false)
      .map(({ id }) => id);
    if (descubiertos.length === 0) {
      setMensaje({
        tipo: "error",
        texto: "No se pudieron identificar espacios descubiertos en este complejo.",
      });
      return;
    }

    setEspacioIds((actuales) =>
      descubiertos.every((id) => actuales.includes(id))
        ? actuales.filter((id) => !descubiertos.includes(id))
        : Array.from(new Set([...actuales, ...descubiertos])),
    );
  }

  async function guardarBloqueo(
    input: CrearBloqueoInput,
    reservasPrevias: string[],
  ) {
    setGuardando(true);
    setMensaje(null);
    try {
      const creados = await crearBloqueo(input);
      let resultadoCancelaciones: string;
      try {
        const reservasActualizadas = await listarEstadosReservasPorFecha(
          input.fecha,
        );
        const canceladas = new Set(
          reservasActualizadas
            .filter(
              (reserva) =>
                reservasPrevias.includes(reserva.id) &&
                reserva.estado === "cancelada",
            )
            .map((reserva) => reserva.id),
        );
        resultadoCancelaciones = `Se confirmaron ${canceladas.size} reserva(s) cancelada(s) entre las que estaban afectadas antes de guardar.`;
      } catch (error) {
        resultadoCancelaciones = `No se pudo confirmar el total real de cancelaciones: ${
          error instanceof Error ? error.message : "error de consulta"
        }`;
      }
      setMensaje({
        tipo: "exito",
        texto: `Se crearon ${creados.length} bloqueo(s). ${resultadoCancelaciones}`,
      });
      setEspacioIds([]);
      setMotivo("");
      await cargarBloqueos();
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el bloqueo.",
      });
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarBloqueo() {
    setMensaje(null);
    if (espacioIds.length === 0) {
      setMensaje({ tipo: "error", texto: "Seleccioná uno o más espacios." });
      return;
    }
    if (!motivo.trim()) {
      setMensaje({ tipo: "error", texto: "Ingresá el motivo del bloqueo." });
      return;
    }
    if (!diaCompleto && inicio >= fin) {
      setMensaje({
        tipo: "error",
        texto: "La hora de finalización debe ser posterior al inicio.",
      });
      return;
    }

    const input: CrearBloqueoInput = {
      espacioIds,
      fecha,
      ...(diaCompleto ? {} : { inicio, fin }),
      motivo: motivo.trim(),
    };
    setPrevisualizando(true);
    try {
      const agenda = await obtenerAgenda(fecha);
      const reservasPrevias = reservasAfectadasPrevias(agenda, input);
      Alert.alert(
        "Confirmar bloqueo",
        `Se aplicará a ${espacioIds.length} espacio(s). La agenda muestra ${reservasPrevias.length} reserva(s) confirmada(s) que podrían cancelarse.`,
        [
          { text: "Volver", style: "cancel" },
          {
            text: "Confirmar bloqueo",
            style: "destructive",
            onPress: () => void guardarBloqueo(input, reservasPrevias),
          },
        ],
      );
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? `No se pudo calcular cuántas reservas podrían cancelarse: ${error.message}`
            : "No se pudo consultar la agenda para previsualizar las cancelaciones.",
      });
    } finally {
      setPrevisualizando(false);
    }
  }

  function confirmarEliminacion(bloqueo: Bloqueo) {
    Alert.alert(
      "Eliminar bloqueo",
      "Las reservas que se cancelaron al crear este bloqueo no se restaurarán.",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => void quitarBloqueo(bloqueo.id),
        },
      ],
    );
  }

  async function quitarBloqueo(id: string) {
    setEliminando(id);
    setMensaje(null);
    try {
      await eliminarBloqueo(id);
      setMensaje({ tipo: "exito", texto: "Bloqueo eliminado correctamente." });
      await cargarBloqueos();
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el bloqueo.",
      });
    } finally {
      setEliminando(null);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>OPERACIONES</Text>
      <Text style={styles.title}>Bloqueos de espacios</Text>
      <Text style={styles.subtitle}>
        Seleccioná uno o más espacios. Se cancelarán las reservas
        confirmadas que cubra el bloqueo.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nuevo bloqueo</Text>
        <Text style={styles.label}>Complejo</Text>
        <SpaceSelect
          spaces={complejos}
          selectedId={complejo}
          onSelect={(seleccion) => {
            if (seleccion !== complejo) {
              setComplejo(seleccion);
              setEspacioIds([]);
            }
          }}
          disabled={cargandoEspacios || complejos.length === 0}
          placeholder={cargandoEspacios ? "Cargando complejos..." : "Seleccioná un complejo"}
        />
        <Text style={styles.label}>Espacios</Text>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{
            checked:
              espaciosDelComplejo.length > 0 && espacioIds.length === espaciosDelComplejo.length,
          }}
          disabled={espaciosDelComplejo.length === 0}
          onPress={alternarTodosLosEspacios}
          style={[
            styles.selectAll,
            espacioIds.length === espaciosDelComplejo.length &&
              espaciosDelComplejo.length > 0 &&
              styles.optionSelected,
          ]}
        >
          <Text
            style={[
              styles.optionText,
              espacioIds.length === espaciosDelComplejo.length &&
                espaciosDelComplejo.length > 0 &&
                styles.optionTextSelected,
            ]}
          >
            {espacioIds.length === espaciosDelComplejo.length && espaciosDelComplejo.length > 0
              ? "✓ Todos los espacios"
              : "Seleccionar todos los espacios"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={espaciosDelComplejo.length === 0}
          onPress={alternarEspaciosDescubiertos}
          style={styles.selectAll}
        >
          <Text style={styles.optionText}>Seleccionar espacios descubiertos</Text>
        </Pressable>
        <SpaceSelect
          multiple
          spaces={espaciosDelComplejo}
          selectedIds={espacioIds}
          onSelect={cambiarEspacio}
          disabled={espaciosDelComplejo.length === 0}
          placeholder={cargandoEspacios
            ? "Cargando espacios..."
            : !complejo
              ? "Seleccioná primero un complejo"
              : espaciosDelComplejo.length === 0
                ? "No hay espacios disponibles"
              : "Seleccioná uno o más espacios"}
        />
        {cargandoEspacios ? (
          <ActivityIndicator color={palette.backgroundSelected} />
        ) : null}

        <DateSelector
          label="Fecha"
          value={fecha}
          minDate={fechaLocal(new Date())}
          onChange={setFecha}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: diaCompleto }}
          onPress={() => setDiaCompleto((actual) => !actual)}
          style={[styles.option, diaCompleto && styles.optionSelected]}
        >
          <Text
            style={[
              styles.optionText,
              diaCompleto && styles.optionTextSelected,
            ]}
          >
            {diaCompleto ? "✓ Bloquear el día completo" : "Bloquear el día completo"}
          </Text>
        </Pressable>
        {!diaCompleto ? (
          <>
            <HourSelector
              label="Hora de inicio"
              value={inicio}
              minHour={8}
              maxHour={23}
              onChange={(hora) => {
                setInicio(hora);
                if (hora >= fin) setFin(horaSiguiente(hora));
              }}
            />
            <HourSelector
              label="Hora de finalización"
              value={fin}
              minHour={9}
              maxHour={24}
              onChange={setFin}
            />
          </>
        ) : null}
        <Text style={styles.label}>Motivo</Text>
        <TextInput
          value={motivo}
          onChangeText={setMotivo}
          placeholder="Ej. lluvia o mantenimiento"
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
          maxLength={300}
        />
        <Pressable
          accessibilityRole="button"
          disabled={
            guardando ||
            previsualizando ||
            cargandoEspacios ||
            espacioIds.length === 0
          }
          onPress={() => void confirmarBloqueo()}
          style={[
            styles.primaryButton,
            (guardando || previsualizando) && styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {previsualizando
              ? "Consultando agenda..."
              : guardando
                ? "Guardando..."
                : "Previsualizar y bloquear"}
          </Text>
        </Pressable>
      </View>

      {mensaje ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.messageBox,
            mensaje.tipo === "error" ? styles.errorBox : styles.successBox,
          ]}
        >
          <Text style={styles.messageText}>{mensaje.texto}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Bloqueos desde {fecha}</Text>
      {cargandoBloqueos ? (
        <ActivityIndicator color={palette.backgroundSelected} />
      ) : bloqueos.length === 0 ? (
        <Text style={styles.empty}>
          No hay bloqueos registrados desde esta fecha.
        </Text>
      ) : (
        bloqueos.map((bloqueo) => (
          <View key={bloqueo.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {nombresPorId.get(bloqueo.espacioId) ?? bloqueo.espacioId}
            </Text>
            <Text style={styles.detail}>Fecha: {bloqueo.fecha}</Text>
            <Text style={styles.detail}>
              Horario:{" "}
              {bloqueo.inicio && bloqueo.fin
                ? `${bloqueo.inicio} a ${bloqueo.fin}`
                : "Día completo"}
            </Text>
            <Text style={styles.detail}>Motivo: {bloqueo.motivo}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={eliminando !== null}
              onPress={() => confirmarEliminacion(bloqueo)}
              style={[styles.deleteButton, eliminando && styles.disabled]}
            >
              <Text style={styles.deleteText}>
                {eliminando === bloqueo.id ? "Eliminando..." : "Eliminar bloqueo"}
              </Text>
            </Pressable>
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
      fontSize: 29,
      fontWeight: "900",
      fontFamily: Fonts.sans,
    },
    subtitle: {
      color: palette.text,
      fontSize: 15,
      lineHeight: 21,
      fontFamily: Fonts.sans,
    },
    card: {
      padding: 16,
      gap: 10,
      borderRadius: 14,
      backgroundColor: palette.background,
    },
    sectionTitle: {
      color: palette.text,
      fontSize: 19,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    label: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      fontFamily: Fonts.sans,
    },
    selectAll: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      padding: 12,
      backgroundColor: palette.background,
    },
    option: {
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      borderRadius: 10,
      padding: 12,
    },
    optionSelected: {
      borderColor: palette.backgroundSelected,
      backgroundColor: palette.backgroundSelected,
    },
    optionText: {
      color: palette.text,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    optionTextSelected: {
      color: palette.textOnSelected,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      padding: 12,
      color: palette.text,
      backgroundColor: palette.background,
      fontFamily: Fonts.sans,
    },
    primaryButton: {
      padding: 14,
      alignItems: "center",
      borderRadius: 10,
      backgroundColor: palette.backgroundSelected,
    },
    primaryButtonText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    disabled: {
      opacity: 0.55,
    },
    messageBox: {
      padding: 13,
      borderRadius: 10,
      backgroundColor: palette.background,
    },
    errorBox: {
      borderLeftWidth: 4,
      borderLeftColor: palette.textSecondary,
    },
    successBox: {
      borderLeftWidth: 4,
      borderLeftColor: palette.backgroundSelected,
    },
    messageText: {
      color: palette.text,
      lineHeight: 20,
      fontFamily: Fonts.sans,
    },
    empty: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
    },
    cardTitle: {
      color: palette.text,
      fontSize: 17,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    detail: {
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    deleteButton: {
      alignItems: "center",
      padding: 11,
      borderWidth: 1,
      borderColor: palette.textSecondary,
      borderRadius: 9,
    },
    deleteText: {
      color: palette.text,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
  });
}
