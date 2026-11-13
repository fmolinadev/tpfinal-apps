 import { useFocusEffect, useRouter } from "expo-router";
 import { useCallback, useRef, useState } from "react";
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
import { SpaceSelect } from "@/components/space-select";
import { getCurrentUserSession } from "@/persistencia/session";
import {
  crearBloqueo,
  eliminarBloqueo,
  listarBloqueos,
  type Bloqueo,
} from "@/servicios/admin-bloqueos";
import { verificarContrasena } from "@/servicios/auth";
import { getEspacios } from "@/servicios/espacios";
import type { Espacio } from "@/tipos";
import type { Usuario } from "@/tipos/usuario";

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
  const generacionPantalla = useRef(0);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [contrasena, setContrasena] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [verificandoContrasena, setVerificandoContrasena] = useState(false);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [formulario, setFormulario] =
    useState<Formulario>(formularioInicial);
  const [diaCompleto, setDiaCompleto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargarBloqueos = useCallback(
    async (fecha: string, generacion = generacionPantalla.current) => {
      const resultado = await listarBloqueos(fecha);
      if (generacion === generacionPantalla.current) setBloqueos(resultado);
    },
    [],
  );

  const cargarDatos = useCallback(
    async (generacion = generacionPantalla.current) => {
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
      if (generacion !== generacionPantalla.current) return;
      setEspacios(espaciosActivos);

      setFormulario((actual) => ({
        ...actual,
        espacioId: "",
      }));

      await cargarBloqueos(fechaLocal(), generacion);
    } catch (error) {
      if (generacion === generacionPantalla.current) {
        setMensaje(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos.",
        );
      }
    } finally {
      if (generacion === generacionPantalla.current) setCargando(false);
    }
    },
    [cargarBloqueos],
  );

  useFocusEffect(
    useCallback(() => {
      const generacion = ++generacionPantalla.current;
      setUsuario(null);
      setContrasena("");
      setAutorizado(false);
      setVerificandoContrasena(false);
      setCargando(false);
      setEspacios([]);
      setBloqueos([]);
      setFormulario({ ...formularioInicial, fecha: fechaLocal() });
      setDiaCompleto(false);
      setMensaje(null);

      async function cargarUsuario() {
        try {
          const usuarioActual = await getCurrentUserSession();
          if (generacion !== generacionPantalla.current) return;

          if (!usuarioActual?.email || !usuarioActual.id) {
            throw new Error("No se pudo identificar la cuenta actual.");
          }

          setUsuario(usuarioActual);
        } catch (error) {
          if (generacion === generacionPantalla.current) {
            setMensaje(
              error instanceof Error
                ? error.message
                : "No se pudo identificar la cuenta actual.",
            );
          }
        }
      }

      void cargarUsuario();

      return () => {
        generacionPantalla.current += 1;
        setAutorizado(false);
        setContrasena("");
        setEspacios([]);
        setBloqueos([]);
      };
    }, []),
  );

  async function confirmarContrasena() {
    const generacion = generacionPantalla.current;

    if (!usuario) {
      setMensaje("No se pudo identificar la cuenta actual.");
      return;
    }

    setMensaje(null);
    setVerificandoContrasena(true);

    try {
      await verificarContrasena(usuario, contrasena);
      if (generacion !== generacionPantalla.current) return;

      setContrasena("");
      setAutorizado(true);
      await cargarDatos(generacion);
    } catch (error) {
      if (generacion === generacionPantalla.current) {
        setMensaje(
          error instanceof Error
            ? error.message
            : "No se pudo verificar la contraseña.",
        );
      }
    } finally {
      if (generacion === generacionPantalla.current) {
        setVerificandoContrasena(false);
      }
    }
  }

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
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>OPERACIONES</Text>
        <Text style={styles.title}>Mantenimiento y bloqueos</Text>
        <Text style={styles.description}>
          Administrá los horarios en los que los espacios no estarán
          disponibles.
        </Text>

        {!autorizado ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verificación de identidad</Text>
            {usuario?.email ? (
              <Text style={styles.account}>{usuario.email}</Text>
            ) : null}
            <Text style={styles.helper}>
              Para consultar y administrar los bloqueos, volvé a ingresar la
              contraseña de tu cuenta.
            </Text>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              value={contrasena}
              onChangeText={setContrasena}
              placeholder="Ingresá tu contraseña"
              placeholderTextColor={Colors.light.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => void confirmarContrasena()}
              style={styles.input}
            />
            <Pressable
              style={[
                styles.primaryButton,
                verificandoContrasena && styles.disabled,
              ]}
              onPress={() => void confirmarContrasena()}
              disabled={verificandoContrasena || !usuario}
            >
              <Text style={styles.primaryButtonText}>
                {verificandoContrasena ? "Verificando..." : "Continuar"}
              </Text>
            </Pressable>
            {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}
          </View>
        ) : (
          <>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.back}>← Volver</Text>
            </Pressable>

            {mensaje ? (
              <View style={styles.messageBox}>
                <Text style={styles.message}>{mensaje}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Crear bloqueo</Text>
              <Text style={styles.label}>Espacio</Text>
              <SpaceSelect
                spaces={espacios}
                selectedId={formulario.espacioId}
                onSelect={(id) => actualizarCampo("espacioId", id)}
                disabled={cargando || espacios.length === 0}
                placeholder={
                  cargando
                    ? "Cargando espacios..."
                    : espacios.length === 0
                      ? "No hay espacios disponibles"
                      : "Seleccioná un espacio"
                }
              />

              {formulario.espacioId ? (
                <>
                  <Text style={styles.label}>Fecha (AAAA-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={formulario.fecha}
                    onChangeText={(valor) => actualizarCampo("fecha", valor)}
                    placeholder="2026-11-15"
                    placeholderTextColor={Colors.light.textSecondary}
                  />

                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: diaCompleto }}
                    style={[
                      styles.option,
                      diaCompleto && styles.optionSelected,
                    ]}
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

                  {!diaCompleto ? (
                    <>
                      <Text style={styles.label}>Hora de inicio</Text>
                      <TextInput
                        style={styles.input}
                        value={formulario.inicio}
                        onChangeText={(valor) =>
                          actualizarCampo("inicio", valor)
                        }
                        placeholder="09:00"
                        placeholderTextColor={Colors.light.textSecondary}
                      />
                      <Text style={styles.label}>Hora de finalización</Text>
                      <TextInput
                        style={styles.input}
                        value={formulario.fin}
                        onChangeText={(valor) =>
                          actualizarCampo("fin", valor)
                        }
                        placeholder="10:00"
                        placeholderTextColor={Colors.light.textSecondary}
                      />
                    </>
                  ) : null}

                  <Text style={styles.label}>Motivo</Text>
                  <TextInput
                    style={styles.input}
                    value={formulario.motivo}
                    onChangeText={(valor) => actualizarCampo("motivo", valor)}
                    placeholder="Ej. Reparación del espacio"
                    placeholderTextColor={Colors.light.textSecondary}
                  />

                  <Pressable
                    accessibilityRole="button"
                    style={[
                      styles.primaryButton,
                      guardando && styles.disabled,
                    ]}
                    onPress={() => void guardarBloqueo()}
                    disabled={guardando || cargando}
                  >
                    <Text style={styles.primaryButtonText}>
                      {guardando ? "Guardando..." : "Confirmar bloqueo"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.helper}>
                  Seleccioná un espacio para completar el bloqueo.
                </Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Bloqueos existentes</Text>

            {cargando ? (
              <Text style={styles.empty}>Cargando información...</Text>
            ) : bloqueos.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.empty}>
                  No hay bloqueos registrados desde hoy.
                </Text>
              </View>
            ) : (
              bloqueos.map((bloqueo) => (
                <View key={bloqueo.id} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {nombreEspacio(bloqueo.espacioId)}
                  </Text>
                  <Text style={styles.blockText}>Fecha: {bloqueo.fecha}</Text>
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
                    onPress={() => void quitarBloqueo(bloqueo.id)}
                  >
                    <Text style={styles.deleteButtonText}>
                      Eliminar bloqueo
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </>
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
    paddingBottom: 36,
    gap: 14,
  },
  eyebrow: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.3,
    fontFamily: Fonts.sans,
  },
  back: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontFamily: Fonts.sans,
  },
  title: {
    color: Colors.light.text,
    fontSize: 29,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  description: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    padding: 18,
    gap: 9,
  },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  account: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
  helper: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.sans,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontSize: 19,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  label: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    fontFamily: Fonts.sans,
  },
  input: {
    backgroundColor: Colors.light.background,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
  options: {
    gap: 8,
  },
  option: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  optionSelected: {
    backgroundColor: Colors.light.backgroundSelected,
    borderColor: Colors.light.backgroundSelected,
  },
  optionText: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
  optionTextSelected: {
    fontWeight: "800",
    color: Colors.light.background,
  },
  primaryButton: {
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: Colors.light.background,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  disabled: {
    opacity: 0.55,
  },
  messageBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    padding: 14,
  },
  message: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },
  empty: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    marginVertical: 12,
    fontFamily: Fonts.sans,
  },
  blockText: {
    color: Colors.light.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },
  deleteButton: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  deleteButtonText: {
    color: Colors.light.background,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
});