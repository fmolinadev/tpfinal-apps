 import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AuthGuard } from "@/components/auth-guard";
import {
  crearBloqueo,
  eliminarBloqueo,
  listarBloqueos,
  type Bloqueo,
} from "@/servicios/admin-bloqueos";
import { getEspacios } from "@/servicios/espacios";
import type { Espacio } from "@/tipos";

function fechaLocal(): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

type Formulario = {
  espacioId: string;
  fecha: string;
  inicio: string;
  fin: string;
  motivo: string;
};

const formularioInicial: Formulario = {
  espacioId: "",
  fecha: fechaLocal(),
  inicio: "09:00",
  fin: "10:00",
  motivo: "",
};

export default function MantenimientoAdminScreen() {
  const router = useRouter();

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [formulario, setFormulario] =
    useState<Formulario>(formularioInicial);
  const [diaCompleto, setDiaCompleto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function cargarBloqueos(fecha: string) {
    try {
      const resultado = await listarBloqueos(fecha);
      setBloqueos(resultado);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los bloqueos.",
      );
    }
  }

  async function cargarDatos() {
    setCargando(true);
    setMensaje(null);

    try {
      const respuesta = await getEspacios();

      if (!respuesta.datos) {
        throw new Error(
          respuesta.error?.mensaje ??
            "No se pudieron cargar los espacios.",
        );
      }

      const espaciosActivos = respuesta.datos;
      setEspacios(espaciosActivos);

      setFormulario((actual) => ({
        ...actual,
        espacioId: actual.espacioId || espaciosActivos[0]?.id || "",
      }));

      await cargarBloqueos(fechaLocal());
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los datos.",
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarDatos();
  }, []);

  function actualizarCampo(campo: keyof Formulario, valor: string) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  async function guardarBloqueo() {
    setMensaje(null);

    if (!formulario.espacioId) {
      setMensaje("Seleccioná un espacio.");
      return;
    }

    if (!formulario.fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setMensaje("Ingresá una fecha válida con formato AAAA-MM-DD.");
      return;
    }

    if (!formulario.motivo.trim()) {
      setMensaje("Ingresá el motivo del bloqueo.");
      return;
    }

    if (
      !diaCompleto &&
      (!formulario.inicio ||
        !formulario.fin ||
        formulario.inicio >= formulario.fin)
    ) {
      setMensaje(
        "Ingresá un horario válido. El fin debe ser posterior al inicio.",
      );
      return;
    }

    setGuardando(true);

    try {
      await crearBloqueo({
        espacioIds: [formulario.espacioId],
        fecha: formulario.fecha,
        ...(diaCompleto
          ? {}
          : {
              inicio: formulario.inicio,
              fin: formulario.fin,
            }),
        motivo: formulario.motivo.trim(),
      });

      setMensaje("Bloqueo creado correctamente.");

      setFormulario((actual) => ({
        ...actual,
        fecha: fechaLocal(),
        motivo: "",
      }));

      await cargarBloqueos(fechaLocal());
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo crear el bloqueo.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function quitarBloqueo(id: string) {
    setMensaje(null);

    try {
      await eliminarBloqueo(id);
      setMensaje("Bloqueo eliminado correctamente.");
      await cargarBloqueos(fechaLocal());
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el bloqueo.",
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

        <Text style={styles.title}>Mantenimiento y bloqueos</Text>

        <Text style={styles.description}>
          Administrá los horarios en los que los espacios no estarán disponibles.
        </Text>

        {mensaje && (
          <View style={styles.messageBox}>
            <Text style={styles.message}>{mensaje}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Crear bloqueo</Text>

        <Text style={styles.label}>Espacio</Text>

        {espacios.length === 0 && !cargando ? (
          <Text style={styles.empty}>
            No hay espacios disponibles.
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
                onPress={() => actualizarCampo("espacioId", espacio.id)}
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

        <Text style={styles.label}>Fecha (AAAA-MM-DD)</Text>

        <TextInput
          style={styles.input}
          value={formulario.fecha}
          onChangeText={(valor) => actualizarCampo("fecha", valor)}
          placeholder="2026-11-15"
          placeholderTextColor="#888"
        />

        <Pressable
          style={[styles.option, diaCompleto && styles.optionSelected]}
          onPress={() => setDiaCompleto((actual) => !actual)}
        >
          <Text
            style={[
              styles.optionText,
              diaCompleto && styles.optionTextSelected,
            ]}
          >
            {diaCompleto
              ? "✓ Bloquear el día completo"
              : "Bloquear el día completo"}
          </Text>
        </Pressable>

        {!diaCompleto && (
          <>
            <Text style={styles.label}>Hora de inicio</Text>

            <TextInput
              style={styles.input}
              value={formulario.inicio}
              onChangeText={(valor) => actualizarCampo("inicio", valor)}
              placeholder="09:00"
              placeholderTextColor="#888"
            />

            <Text style={styles.label}>Hora de finalización</Text>

            <TextInput
              style={styles.input}
              value={formulario.fin}
              onChangeText={(valor) => actualizarCampo("fin", valor)}
              placeholder="10:00"
              placeholderTextColor="#888"
            />
          </>
        )}

        <Text style={styles.label}>Motivo</Text>

        <TextInput
          style={styles.input}
          value={formulario.motivo}
          onChangeText={(valor) => actualizarCampo("motivo", valor)}
          placeholder="Ej. Reparación del espacio"
          placeholderTextColor="#888"
        />

        <Pressable
          style={[styles.primaryButton, guardando && styles.disabled]}
          onPress={guardarBloqueo}
          disabled={guardando || cargando}
        >
          <Text style={styles.primaryButtonText}>
            {guardando ? "Guardando..." : "Confirmar bloqueo"}
          </Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Bloqueos existentes</Text>

        {cargando ? (
          <Text style={styles.empty}>Cargando información...</Text>
        ) : bloqueos.length === 0 ? (
          <Text style={styles.empty}>
            No hay bloqueos registrados desde hoy.
          </Text>
        ) : (
          bloqueos.map((bloqueo) => (
            <View key={bloqueo.id} style={styles.blockCard}>
              <Text style={styles.blockTitle}>
                {nombreEspacio(bloqueo.espacioId)}
              </Text>

              <Text style={styles.blockText}>
                Fecha: {bloqueo.fecha}
              </Text>

              <Text style={styles.blockText}>
                Horario:{" "}
                {bloqueo.inicio && bloqueo.fin
                  ? `${bloqueo.inicio} a ${bloqueo.fin}`
                  : "Día completo"}
              </Text>

              <Text style={styles.blockText}>
                Motivo: {bloqueo.motivo}
              </Text>

              <Pressable
                style={styles.deleteButton}
                onPress={() => quitarBloqueo(bloqueo.id)}
              >
                <Text style={styles.deleteButtonText}>
                  Eliminar bloqueo
                </Text>
              </Pressable>
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
    backgroundColor: "#101820",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  back: {
    color: "#9BCBCE",
    fontSize: 16,
    marginBottom: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "bold",
    marginBottom: 8,
  },
  description: {
    color: "#B9C4CC",
    fontSize: 14,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 14,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#202D38",
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#42515E",
    borderRadius: 9,
    padding: 12,
    fontSize: 15,
  },
  options: {
    gap: 8,
  },
  option: {
    backgroundColor: "#202D38",
    borderColor: "#42515E",
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    marginTop: 8,
  },
  optionSelected: {
    backgroundColor: "#244B50",
    borderColor: "#9BCBCE",
  },
  optionText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  optionTextSelected: {
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  primaryButton: {
    backgroundColor: "#287D73",
    borderRadius: 9,
    padding: 15,
    alignItems: "center",
    marginTop: 22,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
  messageBox: {
    backgroundColor: "#202D38",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  message: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  empty: {
    color: "#B9C4CC",
    fontSize: 14,
    marginVertical: 12,
  },
  blockCard: {
    backgroundColor: "#202D38",
    borderColor: "#42515E",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  blockTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  blockText: {
    color: "#D1D9DF",
    fontSize: 14,
    marginBottom: 5,
  },
  deleteButton: {
    backgroundColor: "#713B40",
    padding: 11,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});