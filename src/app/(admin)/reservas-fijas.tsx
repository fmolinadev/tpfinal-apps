import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { DateSelector, HourSelector } from "@/components/administrative-pickers";
import { AuthGuard } from "@/components/auth-guard";
import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { ApiError } from "@/servicios/api";
import {
  actualizarReservaFija,
  crearReservaFija,
  eliminarReservaFija,
  listarEspaciosReservaFija,
  listarReservasFijas,
  type EspacioReservaFija,
  type ReservaFija,
} from "@/servicios/admin-reservas-fijas";

type FormularioReservaFija = {
  espacioId: string;
  titular: string;
  dia: string;
  inicio: string;
  fin: string;
  desde: string;
  hasta: string;
  activa: boolean;
};

const formularioInicial: FormularioReservaFija = {
  espacioId: "",
  titular: "",
  dia: "2",
  inicio: "18:00",
  fin: "19:00",
  desde: fechaLocal(new Date()),
  hasta: "",
  activa: true,
};

const diasSemana = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function fechaLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function mensajeDeErrorApi(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.codigo === "FIJA_SUPERPUESTA") {
      return "Ya existe una reserva fija activa que se superpone con ese horario.";
    }
    if (error.codigo === "CONFLICTO_CON_RESERVAS") {
      return "No se puede guardar: el horario se superpone con reservas confirmadas futuras.";
    }
  }
  return error instanceof Error
    ? error.message
    : "No se pudo guardar la reserva fija.";
}

function fechaIsoValida(valor: string): boolean {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!coincidencia) return false;

  const [, anio, mes, dia] = coincidencia;
  const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));

  return (
    fecha.getUTCFullYear() === Number(anio) &&
    fecha.getUTCMonth() === Number(mes) - 1 &&
    fecha.getUTCDate() === Number(dia)
  );
}

function horaEnteraValida(
  valor: string,
  horaMinima: number,
  horaMaxima: number,
): boolean {
  const coincidencia = /^(0\d|1\d|2[0-4]):00$/.exec(valor);
  if (!coincidencia) return false;

  const hora = Number(coincidencia[1]);
  return hora >= horaMinima && hora <= horaMaxima;
}

export default function ReservasFijasAdminScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();

  const [reservas, setReservas] = useState<ReservaFija[]>([]);
  const [espacios, setEspacios] = useState<EspacioReservaFija[]>([]);
  const [formulario, setFormulario] = useState<FormularioReservaFija>(() => ({
    ...formularioInicial,
    desde: fechaLocal(new Date()),
  }));

  const [editando, setEditando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = useCallback(
    async (estaActiva: () => boolean = () => true) => {
      try {
        const [respuestaFijas, respuestaEspacios] = await Promise.all([
          listarReservasFijas(),
          listarEspaciosReservaFija(),
        ]);

        if (!estaActiva()) return;
        setMensaje(null);
        setReservas(respuestaFijas);
        setEspacios(respuestaEspacios);

        setFormulario((actual) => ({
          ...actual,
          espacioId: actual.espacioId || respuestaEspacios[0]?.id || "",
        }));
      } catch (error) {
        if (estaActiva()) {
          setMensaje(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las reservas fijas.",
          );
        }
      } finally {
        if (estaActiva()) setCargando(false);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => cargarDatos(() => active));
    return () => {
      active = false;
    };
  }, [cargarDatos]);

  function actualizarCampo(
    campo: keyof FormularioReservaFija,
    valor: string,
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function comenzarEdicion(item: ReservaFija) {
    setEditando(item.id);

    setFormulario({
      espacioId: item.espacioId,
      titular: item.titular,
      dia: String(item.dia),
      inicio: item.inicio,
      fin: item.fin,
      desde: item.desde,
      hasta: item.hasta ?? "",
      activa: item.activa,
    });

    setMensaje(null);
  }

  function limpiarFormulario() {
    setEditando(null);
    setFormulario({
      ...formularioInicial,
      espacioId: espacios[0]?.id ?? "",
      desde: fechaLocal(new Date()),
    });
    setMensaje(null);
  }

  async function guardar() {
    const dia = Number(formulario.dia);

    if (!formulario.espacioId) {
      setMensaje("Seleccioná un espacio.");
      return;
    }

    if (!formulario.titular.trim()) {
      setMensaje("Ingresá el nombre del titular.");
      return;
    }

    if (formulario.titular.trim().length > 120) {
      setMensaje("El nombre del titular no puede superar los 120 caracteres.");
      return;
    }

    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      setMensaje("El día debe ser un número entre 0 y 6.");
      return;
    }

    if (!horaEnteraValida(formulario.inicio.trim(), 8, 23)) {
      setMensaje("El inicio debe ser una hora en punto entre 08:00 y 23:00.");
      return;
    }

    if (!horaEnteraValida(formulario.fin.trim(), 9, 24)) {
      setMensaje("El fin debe ser una hora en punto entre 09:00 y 24:00.");
      return;
    }

    if (formulario.inicio.trim() >= formulario.fin.trim()) {
      setMensaje("El horario de inicio debe ser anterior al de fin.");
      return;
    }

    const desde = formulario.desde.trim();
    const hasta = formulario.hasta.trim();

    if (!fechaIsoValida(desde)) {
      setMensaje("La fecha Desde debe ser una fecha real con formato AAAA-MM-DD.");
      return;
    }

    if (hasta && !fechaIsoValida(hasta)) {
      setMensaje("La fecha Hasta debe ser una fecha real con formato AAAA-MM-DD.");
      return;
    }

    if (hasta && hasta < desde) {
      setMensaje("La fecha Hasta no puede ser anterior a Desde.");
      return;
    }

    const datos = {
      titular: formulario.titular.trim(),
      dia,
      inicio: formulario.inicio.trim(),
      fin: formulario.fin.trim(),
      desde,
      hasta: hasta || null,
      ...(editando ? { activa: formulario.activa } : {}),
    };

    setGuardando(true);
    setMensaje(null);

    try {
      if (editando) {
        await actualizarReservaFija(editando, datos);
        setMensaje("Reserva fija actualizada correctamente.");
      } else {
        await crearReservaFija(formulario.espacioId, datos);
        setMensaje("Reserva fija creada correctamente.");
      }

      setEditando(null);
      setFormulario({
        ...formularioInicial,
        espacioId: espacios[0]?.id ?? "",
      });

      await cargarDatos();
    } catch (error) {
      setMensaje(mensajeDeErrorApi(error));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    setMensaje(null);

    try {
      await eliminarReservaFija(id);

      if (editando === id) {
        limpiarFormulario();
      }

      setMensaje("Reserva fija dada de baja correctamente.");
      await cargarDatos();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo dar de baja la reserva fija.",
      );
    }
  }

  function nombreEspacio(espacioId: string) {
    return (
      espacios.find((espacio) => espacio.id === espacioId)?.nombre ??
      espacioId
    );
  }

  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Volver</Text>
        </Pressable>

        <Text style={styles.eyebrow}>PROGRAMACIÓN</Text>
        <Text style={styles.title}>Reservas fijas</Text>
        <Text style={styles.subtitle}>
          Administrá turnos recurrentes. La API recibe día 0–6, horarios en
          punto y fechas reales en formato AAAA-MM-DD.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editando ? "Editar reserva fija" : "Nueva reserva fija"}
          </Text>

          <Text style={styles.label}>Espacio</Text>
          {editando ? (
            <Text style={styles.readOnly}>
              {nombreEspacio(formulario.espacioId)}
            </Text>
          ) : (
            <View style={styles.options}>
              {espacios.map((espacio) => (
                <Pressable
                  key={espacio.id}
                  style={[
                    styles.option,
                    formulario.espacioId === espacio.id &&
                      styles.optionSelected,
                  ]}
                  onPress={() =>
                    actualizarCampo("espacioId", espacio.id)
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      formulario.espacioId === espacio.id &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {espacio.nombre}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.label}>Titular</Text>
          <TextInput
            value={formulario.titular}
            onChangeText={(valor) => actualizarCampo("titular", valor)}
            style={styles.input}
            placeholder="Nombre del titular o grupo"
            placeholderTextColor={palette.textSecondary}
          />

          <Text style={styles.label}>Día de la semana</Text>
          <View style={styles.options}>
            {diasSemana.map((dia, indice) => (
              <Pressable
                key={dia}
                style={[
                  styles.option,
                  formulario.dia === String(indice) &&
                    styles.optionSelected,
                ]}
                onPress={() =>
                  actualizarCampo("dia", String(indice))
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    formulario.dia === String(indice) &&
                      styles.optionTextSelected,
                  ]}
                >
                  {dia}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Horario</Text>
          <View style={styles.fieldsRow}>
            <View style={styles.pickerColumn}>
              <HourSelector
                label="Inicio"
                value={formulario.inicio}
                minHour={8}
                maxHour={23}
                onChange={(valor) => actualizarCampo("inicio", valor)}
              />
            </View>
            <View style={styles.pickerColumn}>
              <HourSelector
                label="Fin"
                value={formulario.fin}
                minHour={9}
                maxHour={24}
                onChange={(valor) => actualizarCampo("fin", valor)}
              />
            </View>
          </View>

          <Text style={styles.label}>Vigencia</Text>
          <DateSelector
            label="Desde"
            value={formulario.desde}
            onChange={(valor) => actualizarCampo("desde", valor)}
          />
          {formulario.hasta ? (
            <>
              <DateSelector
                label="Hasta"
                value={formulario.hasta}
                minDate={formulario.desde}
                onChange={(valor) => actualizarCampo("hasta", valor)}
              />
              <Pressable
                style={styles.clearEndDate}
                onPress={() => actualizarCampo("hasta", "")}
              >
                <Text style={styles.secondaryText}>Quitar fecha final</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={styles.clearEndDate}
              onPress={() =>
                actualizarCampo("hasta", formulario.desde || fechaLocal(new Date()))
              }
            >
              <Text style={styles.secondaryText}>Agregar fecha final</Text>
            </Pressable>
          )}

          <Text style={styles.hint}>
            Usá fechas reales con formato AAAA-MM-DD. Dejá Hasta vacía si no
            tiene vencimiento. El fin puede ser 24:00.
          </Text>

          {editando ? (
            <Pressable
              style={[
                styles.statusButton,
                formulario.activa && styles.statusActive,
              ]}
              onPress={() =>
                setFormulario((actual) => ({
                  ...actual,
                  activa: !actual.activa,
                }))
              }
            >
              <Text style={styles.statusText}>
                {formulario.activa
                  ? "Reserva activa · Tocar para desactivar"
                  : "Reserva inactiva · Tocar para reactivar"}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.primary, guardando && styles.disabled]}
              onPress={() => void guardar()}
              disabled={guardando}
            >
              <Text style={styles.primaryText}>
                {guardando
                  ? "Guardando..."
                  : editando
                    ? "Guardar cambios"
                    : "Crear reserva"}
              </Text>
            </Pressable>

            {editando ? (
              <Pressable
                style={styles.secondary}
                onPress={limpiarFormulario}
              >
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
            ) : null}
          </View>

          {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Reservas programadas</Text>

        {cargando ? (
          <Text style={styles.detail}>Cargando reservas...</Text>
        ) : reservas.length === 0 ? (
          <Text style={styles.detail}>
            No hay reservas fijas registradas.
          </Text>
        ) : (
          reservas.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>
                  {nombreEspacio(item.espacioId)}
                </Text>

                <Text style={styles.detail}>
                  Titular: {item.titular}
                </Text>

                <Text style={styles.detail}>
                  {diasSemana[item.dia]} · {item.inicio} a {item.fin}
                </Text>

                <Text style={styles.detail}>
                  Desde {item.desde}
                  {item.hasta ? ` hasta ${item.hasta}` : " · Sin fecha final"}
                </Text>

                <Text
                  style={[
                    styles.detail,
                    item.activa ? styles.activeText : styles.inactiveText,
                  ]}
                >
                  {item.activa ? "Activa" : "Inactiva"}
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => comenzarEdicion(item)}
                >
                  <Text style={styles.smallText}>Editar</Text>
                </Pressable>

                {item.activa ? (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => void eliminar(item.id)}
                  >
                    <Text style={styles.deleteText}>Dar de baja</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </AuthGuard>
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
    back: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    eyebrow: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.2,
      fontFamily: Fonts.sans,
    },
    title: {
      color: palette.text,
      fontSize: 30,
      fontWeight: "900",
      fontFamily: Fonts.sans,
    },
    subtitle: {
      color: palette.text,
      fontSize: 15,
      lineHeight: 21,
      fontFamily: Fonts.sans,
    },
    formCard: {
      backgroundColor: palette.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      padding: 16,
      gap: 10,
    },
    formTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    label: {
      color: palette.text,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 9,
      padding: 12,
      color: palette.text,
      backgroundColor: palette.background,
      fontFamily: Fonts.sans,
    },
    readOnly: {
      padding: 12,
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
    },
    options: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },
    option: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 8,
      paddingVertical: 9,
      paddingHorizontal: 11,
    },
    optionSelected: {
      backgroundColor: palette.backgroundSelected,
    },
    optionText: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    optionTextSelected: {
      color: palette.textOnSelected,
    },
    fieldsRow: {
      flexDirection: "row",
      gap: 10,
    },
    pickerColumn: {
      flex: 1,
      gap: 7,
    },
    clearEndDate: {
      alignSelf: "flex-start",
      paddingVertical: 8,
    },
    halfInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 9,
      padding: 12,
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    hint: {
      color: palette.textSecondary,
      fontSize: 12,
      fontFamily: Fonts.sans,
    },
    statusButton: {
      borderWidth: 1,
      borderColor: palette.textSecondary,
      borderRadius: 9,
      padding: 11,
    },
    statusActive: {
      borderColor: palette.backgroundSelected,
    },
    statusText: {
      color: palette.text,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    actions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    primary: {
      flex: 1,
      backgroundColor: palette.backgroundSelected,
      borderRadius: 9,
      padding: 13,
      alignItems: "center",
    },
    primaryText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    disabled: {
      opacity: 0.5,
    },
    secondary: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 9,
      padding: 13,
      alignItems: "center",
    },
    secondaryText: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    message: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    sectionTitle: {
      color: palette.text,
      fontSize: 19,
      fontWeight: "800",
      marginTop: 8,
      fontFamily: Fonts.sans,
    },
    card: {
      backgroundColor: palette.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      padding: 15,
      gap: 12,
    },
    cardInfo: {
      gap: 4,
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
    activeText: {
      color: "#23834B",
      fontWeight: "800",
    },
    inactiveText: {
      color: palette.textSecondary,
      fontWeight: "800",
    },
    smallButton: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 8,
      padding: 10,
      alignItems: "center",
    },
    smallText: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    deleteButton: {
      borderWidth: 1,
      borderColor: palette.text,
      borderRadius: 8,
      padding: 10,
      alignItems: "center",
    },
    deleteText: {
      color: palette.text,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
  });
}