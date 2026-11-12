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

import { AuthGuard } from "@/components/auth-guard";
import { Colors, Fonts } from "@/constants/theme";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from "@/servicios/api";

type ReservaFijaApi = {
  id: string;
  espacioId: string;
  titular: string;
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa: boolean;
};

type EspacioApi = {
  id: string;
  nombre: string;
};

type RespuestaLista<T> = {
  datos: T[];
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
  };
};

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
  desde: "",
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

export default function ReservasFijasAdminScreen() {
  const router = useRouter();

  const [reservas, setReservas] = useState<ReservaFijaApi[]>([]);
  const [espacios, setEspacios] = useState<EspacioApi[]>([]);
  const [formulario, setFormulario] =
    useState<FormularioReservaFija>(formularioInicial);

  const [editando, setEditando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);

    try {
      const [respuestaFijas, respuestaEspacios] = await Promise.all([
        apiGet<RespuestaLista<ReservaFijaApi>>("/fijas"),
        apiGet<RespuestaLista<EspacioApi>>("/espacios"),
      ]);

      setReservas(respuestaFijas.datos);
      setEspacios(respuestaEspacios.datos);

      setFormulario((actual) => ({
        ...actual,
        espacioId:
          actual.espacioId ||
          respuestaEspacios.datos[0]?.id ||
          "",
      }));
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las reservas fijas.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
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

  function comenzarEdicion(item: ReservaFijaApi) {
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
    });
    setMensaje(null);
  }

  async function guardar() {
    const dia = Number(formulario.dia);

    if (!editando && !formulario.espacioId) {
      setMensaje("Seleccioná un espacio.");
      return;
    }

    if (!formulario.titular.trim()) {
      setMensaje("Ingresá el nombre del titular.");
      return;
    }

    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      setMensaje("El día debe ser un número entre 0 y 6.");
      return;
    }

    if (!formulario.desde.trim()) {
      setMensaje("Ingresá la fecha de inicio.");
      return;
    }

    if (!formulario.inicio.trim() || !formulario.fin.trim()) {
      setMensaje("Completá el horario de inicio y de fin.");
      return;
    }

    const datos = {
      titular: formulario.titular.trim(),
      dia,
      inicio: formulario.inicio.trim(),
      fin: formulario.fin.trim(),
      desde: formulario.desde.trim(),
      hasta: formulario.hasta.trim() || null,
      ...(editando ? { activa: formulario.activa } : {}),
    };

    setGuardando(true);
    setMensaje(null);

    try {
      if (editando) {
        await apiPatch(`/fijas/${editando}`, datos);
        setMensaje("Reserva fija actualizada correctamente.");
      } else {
        await apiPost("/fijas", {
          espacioId: formulario.espacioId,
          ...datos,
        });
        setMensaje("Reserva fija creada correctamente.");
      }

      setEditando(null);
      setFormulario({
        ...formularioInicial,
        espacioId: espacios[0]?.id ?? "",
      });

      await cargarDatos();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la reserva fija.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    setMensaje(null);

    try {
      await apiDelete(`/fijas/${id}`);

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
          Administrá turnos recurrentes con fechas y horarios controlados.
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
            placeholderTextColor={Colors.light.textSecondary}
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
            <TextInput
              value={formulario.inicio}
              onChangeText={(valor) => actualizarCampo("inicio", valor)}
              style={styles.halfInput}
              placeholder="Inicio HH:MM"
              placeholderTextColor={Colors.light.textSecondary}
            />
            <TextInput
              value={formulario.fin}
              onChangeText={(valor) => actualizarCampo("fin", valor)}
              style={styles.halfInput}
              placeholder="Fin HH:MM"
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>

          <Text style={styles.label}>Vigencia</Text>
          <View style={styles.fieldsRow}>
            <TextInput
              value={formulario.desde}
              onChangeText={(valor) => actualizarCampo("desde", valor)}
              style={styles.halfInput}
              placeholder="Desde AAAA-MM-DD"
              placeholderTextColor={Colors.light.textSecondary}
            />
            <TextInput
              value={formulario.hasta}
              onChangeText={(valor) => actualizarCampo("hasta", valor)}
              style={styles.halfInput}
              placeholder="Hasta AAAA-MM-DD"
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>

          <Text style={styles.hint}>
            Dejá la fecha final vacía si la reserva no tiene vencimiento.
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  back: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  eyebrow: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: Fonts.sans,
  },
  title: {
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  subtitle: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  formCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    padding: 16,
    gap: 10,
  },
  formTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  label: {
    color: Colors.light.text,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 9,
    padding: 12,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    fontFamily: Fonts.sans,
  },
  readOnly: {
    padding: 12,
    color: Colors.light.textSecondary,
    fontFamily: Fonts.sans,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  option: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  optionSelected: {
    backgroundColor: Colors.light.backgroundSelected,
  },
  optionText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
  optionTextSelected: {
    color: Colors.light.background,
  },
  fieldsRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 9,
    padding: 12,
    color: Colors.light.text,
    fontFamily: Fonts.sans,
  },
  hint: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  statusButton: {
    borderWidth: 1,
    borderColor: Colors.light.textSecondary,
    borderRadius: 9,
    padding: 11,
  },
  statusActive: {
    borderColor: Colors.light.backgroundSelected,
  },
  statusText: {
    color: Colors.light.text,
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
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 9,
    padding: 13,
    alignItems: "center",
  },
  primaryText: {
    color: Colors.light.background,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  disabled: {
    opacity: 0.5,
  },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 9,
    padding: 13,
    alignItems: "center",
  },
  secondaryText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  message: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 8,
    fontFamily: Fonts.sans,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    padding: 15,
    gap: 12,
  },
  cardInfo: {
    gap: 4,
  },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  detail: {
    color: Colors.light.text,
    fontFamily: Fonts.sans,
  },
  activeText: {
    color: "#23834B",
    fontWeight: "800",
  },
  inactiveText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
  },
  smallButton: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  smallText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: Colors.light.text,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  deleteText: {
    color: Colors.light.text,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
});