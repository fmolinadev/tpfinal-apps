import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  authenticateWithBiometrics,
  isBiometricSupported,
  verificarContrasena,
} from "@/servicios/auth";
import { listarBloqueos, type Bloqueo } from "@/servicios/admin-bloqueos";
import { getEspacios } from "@/servicios/espacios";
import { getCurrentUserSession } from "@/persistencia/session";
import type { Usuario } from "@/tipos/usuario";
import type { Espacio } from "@/tipos";

type EstadoAcceso = "verificando" | "contrasena" | "autorizado";

function fechaLocal(): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function mensajeDeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function MantenimientoStaffScreen() {
  const generacionPantalla = useRef(0);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estadoAcceso, setEstadoAcceso] =
    useState<EstadoAcceso>("verificando");
  const [biometriaDisponible, setBiometriaDisponible] = useState(false);
  const [contrasena, setContrasena] = useState("");
  const [verificandoBiometria, setVerificandoBiometria] = useState(false);
  const [enviandoContrasena, setEnviandoContrasena] = useState(false);
  const [cargandoResultados, setCargandoResultados] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);

  const cargarResultados = useCallback(
    async (generacion = generacionPantalla.current) => {
    setMensaje(null);
    setCargandoResultados(true);

    try {
      const [bloqueosActuales, respuestaEspacios] = await Promise.all([
        listarBloqueos(fechaLocal()),
        getEspacios(),
      ]);

      if ("error" in respuestaEspacios) {
        throw new Error(
          respuestaEspacios.error?.mensaje ??
            "No se pudieron cargar los espacios.",
        );
      }

      if (generacion !== generacionPantalla.current) return;

      setBloqueos(bloqueosActuales);
      setEspacios(respuestaEspacios.datos);
    } catch (error) {
      if (generacion === generacionPantalla.current) {
        setMensaje(
          mensajeDeError(error, "No se pudieron cargar los bloqueos."),
        );
      }
    } finally {
      if (generacion === generacionPantalla.current) {
        setCargandoResultados(false);
      }
    }
    },
    [],
  );

  const autenticarConHuella = useCallback(
    async (generacion = generacionPantalla.current) => {
    setMensaje(null);
    setVerificandoBiometria(true);

    try {
      const autenticada = await authenticateWithBiometrics({
        disableDeviceFallback: true,
      });

      if (generacion !== generacionPantalla.current) return;

      if (!autenticada) {
        setEstadoAcceso("contrasena");
        setMensaje("No se pudo validar la huella. Ingresá tu contraseña.");
        return;
      }

      setEstadoAcceso("autorizado");
      await cargarResultados(generacion);
    } catch (error) {
      if (generacion === generacionPantalla.current) {
        setEstadoAcceso("contrasena");
        setMensaje(
          mensajeDeError(error, "No se pudo verificar la huella."),
        );
      }
    } finally {
      if (generacion === generacionPantalla.current) {
        setVerificandoBiometria(false);
      }
    }
    },
    [cargarResultados],
  );

  useFocusEffect(
    useCallback(() => {
      const generacion = ++generacionPantalla.current;
      setUsuario(null);
      setEstadoAcceso("verificando");
      setBiometriaDisponible(false);
      setContrasena("");
      setVerificandoBiometria(false);
      setEnviandoContrasena(false);
      setCargandoResultados(false);
      setMensaje(null);
      setBloqueos([]);
      setEspacios([]);

      async function prepararAcceso() {
        try {
          const usuarioActual = await getCurrentUserSession();

          if (generacion !== generacionPantalla.current) return;

          if (!usuarioActual?.email || !usuarioActual.id) {
            throw new Error("No se pudo identificar la cuenta actual.");
          }

          setUsuario(usuarioActual);

          const disponible = await isBiometricSupported();

          if (generacion !== generacionPantalla.current) return;

          setBiometriaDisponible(disponible);

          if (disponible) {
            await autenticarConHuella(generacion);
          } else {
            setEstadoAcceso("contrasena");
          }
        } catch (error) {
          if (generacion === generacionPantalla.current) {
            setEstadoAcceso("contrasena");
            setMensaje(
              mensajeDeError(error, "No se pudo iniciar la verificación."),
            );
          }
        }
      }

      void prepararAcceso();

      return () => {
        generacionPantalla.current += 1;
        setEstadoAcceso("verificando");
        setContrasena("");
        setVerificandoBiometria(false);
        setEnviandoContrasena(false);
        setCargandoResultados(false);
        setBloqueos([]);
        setEspacios([]);
      };
    }, [autenticarConHuella]),
  );

  async function confirmarContrasena() {
    const generacion = generacionPantalla.current;

    if (!usuario) {
      setMensaje("No se pudo identificar la cuenta actual.");
      return;
    }

    setMensaje(null);
    setEnviandoContrasena(true);

    try {
      await verificarContrasena(usuario, contrasena);

      if (generacion !== generacionPantalla.current) return;

      setContrasena("");
      setEstadoAcceso("autorizado");
      await cargarResultados(generacion);
    } catch (error) {
      if (generacion === generacionPantalla.current) {
        setMensaje(
          mensajeDeError(error, "No se pudo verificar la contraseña."),
        );
      }
    } finally {
      if (generacion === generacionPantalla.current) {
        setEnviandoContrasena(false);
      }
    }
  }

  function nombreEspacio(espacioId: string): string {
    return espacios.find((espacio) => espacio.id === espacioId)?.nombre
      ?? espacioId;
  }

  return (
    <AuthGuard allowedRoles={["encargado"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>OPERACIONES</Text>
        <Text style={styles.title}>Mantenimiento y bloqueos</Text>
        <Text style={styles.subtitle}>
          Consultá los espacios y horarios bloqueados desde hoy.
        </Text>

        {estadoAcceso !== "autorizado" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verificación de identidad</Text>
            {usuario?.email ? (
              <Text style={styles.account}>{usuario.email}</Text>
            ) : null}
            <Text style={styles.helper}>
              Para ver esta información, confirmá tu identidad con la huella
              registrada en el dispositivo o con la contraseña de tu cuenta.
            </Text>

            {estadoAcceso === "verificando" ? (
              <View style={styles.loading}>
                <ActivityIndicator color={Colors.light.backgroundSelected} />
                <Text style={styles.helper}>Preparando verificación...</Text>
              </View>
            ) : null}

            {biometriaDisponible && estadoAcceso === "contrasena" ? (
              <Pressable
                style={[
                  styles.secondaryButton,
                  verificandoBiometria && styles.buttonDisabled,
                ]}
                onPress={() => void autenticarConHuella()}
                disabled={verificandoBiometria || enviandoContrasena}
              >
                <Text style={styles.secondaryButtonText}>
                  {verificandoBiometria
                    ? "Verificando huella..."
                    : "Intentar con huella"}
                </Text>
              </Pressable>
            ) : null}

            {estadoAcceso === "contrasena" ? (
              <>
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
                    enviandoContrasena && styles.buttonDisabled,
                  ]}
                  onPress={() => void confirmarContrasena()}
                  disabled={enviandoContrasena || verificandoBiometria}
                >
                  <Text style={styles.primaryButtonText}>
                    {enviandoContrasena ? "Verificando..." : "Continuar"}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}
          </View>
        ) : (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>Bloqueos vigentes y futuros</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void cargarResultados()}
                disabled={cargandoResultados}
              >
                <Text style={styles.refreshText}>Actualizar</Text>
              </Pressable>
            </View>

            {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}

            {cargandoResultados ? (
              <ActivityIndicator color={Colors.light.backgroundSelected} />
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
                  <Text style={styles.detail}>Fecha: {bloqueo.fecha}</Text>
                  <Text style={styles.detail}>
                    Horario:{" "}
                    {bloqueo.inicio && bloqueo.fin
                      ? `${bloqueo.inicio} a ${bloqueo.fin}`
                      : "Día completo"}
                  </Text>
                  <Text style={styles.detail}>Motivo: {bloqueo.motivo}</Text>
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
  title: {
    color: Colors.light.text,
    fontSize: 29,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  subtitle: {
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
  loading: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  label: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    fontFamily: Fonts.sans,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: 12,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    fontFamily: Fonts.sans,
  },
  primaryButton: {
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: Colors.light.background,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  message: {
    color: Colors.light.textSecondary,
    fontWeight: "700",
    lineHeight: 19,
    fontFamily: Fonts.sans,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  refreshText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  detail: {
    color: Colors.light.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },
  empty: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },
});
