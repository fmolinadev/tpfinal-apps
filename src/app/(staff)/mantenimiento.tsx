import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AuthGuard } from "@/components/auth-guard";
import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import {
  authenticateWithBiometrics,
  isBiometricSupported,
  verificarContrasena,
} from "@/servicios/auth";
import {
  eliminarEvidenciaInspeccion,
  guardarEvidenciasInspeccion,
  subirEvidenciasInspeccion,
  type EvidenciaInspeccion,
} from "@/servicios/archivos";
import { getEspacios } from "@/servicios/espacios";
import {
  crearInspeccion,
  listarInspecciones,
  type Inspeccion,
} from "@/servicios/inspecciones";
import { getCurrentUserSession } from "@/persistencia/session";
import type { Usuario } from "@/tipos/usuario";
import type { Espacio } from "@/tipos";

type EstadoAcceso = "verificando" | "contrasena" | "autorizado";

const ROLES_PERSONAL = ["encargado", "administrador"] as const;

function mensajeDeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function MantenimientoStaffScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const generacionPantalla = useRef(0);
  const generacionReportes = useRef(0);
  const espacioReporteRef = useRef<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estadoAcceso, setEstadoAcceso] =
    useState<EstadoAcceso>("verificando");
  const [biometriaDisponible, setBiometriaDisponible] = useState(false);
  const [contrasena, setContrasena] = useState("");
  const [verificandoBiometria, setVerificandoBiometria] = useState(false);
  const [enviandoContrasena, setEnviandoContrasena] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeInspeccion, setMensajeInspeccion] = useState<string | null>(
    null,
  );
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioInspeccion, setEspacioInspeccion] = useState("");
  const [observacion, setObservacion] = useState("");
  const [evidencias, setEvidencias] = useState<EvidenciaInspeccion[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [cargandoInspecciones, setCargandoInspecciones] = useState(false);
  const [seleccionandoEvidencias, setSeleccionandoEvidencias] =
    useState(false);
  const [guardandoInspeccion, setGuardandoInspeccion] = useState(false);

  const cargarInspecciones = useCallback(async (espacioId: string) => {
    const generacion = ++generacionReportes.current;
    setCargandoInspecciones(true);
    setMensajeInspeccion(null);

    try {
      const reportes = await listarInspecciones(espacioId);
      if (generacion === generacionReportes.current) {
        setInspecciones(reportes);
      }
    } catch (error) {
      if (generacion === generacionReportes.current) {
        setMensajeInspeccion(
          mensajeDeError(error, "No se pudo cargar el historial."),
        );
      }
    } finally {
      if (generacion === generacionReportes.current) {
        setCargandoInspecciones(false);
      }
    }
  }, []);

  const cargarResultados = useCallback(
    async (generacion = generacionPantalla.current) => {
    setMensaje(null);

    try {
      const respuestaEspacios = await getEspacios();

      if ("error" in respuestaEspacios) {
        throw new Error(
          respuestaEspacios.error?.mensaje ??
            "No se pudieron cargar los espacios.",
        );
      }

      if (generacion !== generacionPantalla.current) return;

      setEspacios(respuestaEspacios.datos);
      const idEspacio =
        respuestaEspacios.datos.find(
          (espacio) => espacio.id === espacioReporteRef.current,
        )?.id ?? respuestaEspacios.datos[0]?.id;
      if (idEspacio) {
        espacioReporteRef.current = idEspacio;
        setEspacioInspeccion(idEspacio);
        void cargarInspecciones(idEspacio);
      } else {
        espacioReporteRef.current = null;
        setEspacioInspeccion("");
        setInspecciones([]);
      }
    } catch (error) {
      if (generacion === generacionPantalla.current) {
        setMensaje(
          mensajeDeError(error, "No se pudieron cargar los espacios."),
        );
      }
    } finally {
      if (generacion === generacionPantalla.current) {
      }
    }
    },
    [cargarInspecciones],
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
      setMensaje(null);
      setMensajeInspeccion(null);
      setEspacios([]);
      setEspacioInspeccion("");
      setObservacion("");
      setEvidencias([]);
      setInspecciones([]);
      generacionReportes.current += 1;
      espacioReporteRef.current = null;

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
        generacionReportes.current += 1;
        setEstadoAcceso("verificando");
        setContrasena("");
        setVerificandoBiometria(false);
        setEnviandoContrasena(false);
        setEspacios([]);
        setEvidencias([]);
        setInspecciones([]);
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

  async function seleccionarEvidencias() {
    setMensajeInspeccion(null);
    setSeleccionandoEvidencias(true);

    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: 5 - evidencias.length,
        quality: 0.85,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        shouldDownloadFromNetwork: true,
      });

      if (!resultado.canceled) {
        const nuevas = await guardarEvidenciasInspeccion(
          resultado.assets,
          evidencias.length,
        );
        setEvidencias((actuales) => [...actuales, ...nuevas]);
      }
    } catch (error) {
      setMensajeInspeccion(
        mensajeDeError(error, "No se pudieron guardar los archivos."),
      );
    } finally {
      setSeleccionandoEvidencias(false);
    }
  }

  async function quitarEvidencia(evidencia: EvidenciaInspeccion) {
    setMensajeInspeccion(null);
    try {
      await eliminarEvidenciaInspeccion(evidencia);
      setEvidencias((actuales) =>
        actuales.filter((actual) => actual.uri !== evidencia.uri),
      );
    } catch (error) {
      setMensajeInspeccion(
        mensajeDeError(error, "No se pudo quitar el archivo."),
      );
    }
  }

  async function guardarInspeccion() {
    const espacioId = espacioReporteRef.current;
    const texto = observacion.trim();
    if (!espacioId || !texto || evidencias.length === 0) {
      setMensajeInspeccion(
        "Elegí una cancha, escribí una observación y adjuntá al menos una foto o un video.",
      );
      return;
    }

    setMensajeInspeccion(null);
    setGuardandoInspeccion(true);
    try {
      const urls = await subirEvidenciasInspeccion(evidencias);
      await crearInspeccion({
        espacioId,
        observacion: texto,
        evidencias: urls,
      });
      setObservacion("");
      setEvidencias([]);
      setMensajeInspeccion("El reporte quedó guardado.");
      await cargarInspecciones(espacioId);
    } catch (error) {
      setMensajeInspeccion(
        mensajeDeError(error, "No se pudo guardar el reporte."),
      );
    } finally {
      setGuardandoInspeccion(false);
    }
  }

  function seleccionarEspacio(espacioId: string) {
    espacioReporteRef.current = espacioId;
    setEspacioInspeccion(espacioId);
    void cargarInspecciones(espacioId);
  }

  async function abrirVideo(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      setMensajeInspeccion(
        mensajeDeError(error, "No se pudo abrir el video."),
      );
    }
  }

  return (
    <AuthGuard allowedRoles={ROLES_PERSONAL}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>OPERACIONES</Text>
        <Text style={styles.title}>Inspecciones de mantenimiento</Text>
        <Text style={styles.subtitle}>
          Registrá inspecciones con fotos o videos. La gestión de bloqueos está
          disponible en un formulario compartido con administración.
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
                <ActivityIndicator color={palette.backgroundSelected} />
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
                  placeholderTextColor={palette.textSecondary}
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
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bloqueos</Text>
              <Text style={styles.helper}>
                Elegí fecha, horario y uno o más espacios para crear, consultar
                o eliminar bloqueos.
              </Text>
              <Pressable
                accessibilityRole="button"
                style={styles.primaryButton}
                onPress={() =>
                  router.push(
                    usuario?.rol === "administrador"
                      ? "/(admin)/mantenimiento"
                      : "/(staff)/bloqueos",
                  )
                }
              >
                <Text style={styles.primaryButtonText}>
                  Administrar bloqueos
                </Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nuevo reporte de inspección</Text>
              <Text style={styles.label}>Cancha</Text>
              <View style={styles.spaceOptions}>
                {espacios.map((espacio) => (
                  <Pressable
                    key={espacio.id}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: espacio.id === espacioInspeccion,
                    }}
                    onPress={() => seleccionarEspacio(espacio.id)}
                    style={[
                      styles.spaceOption,
                      espacio.id === espacioInspeccion &&
                        styles.spaceOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.spaceOptionText,
                        espacio.id === espacioInspeccion &&
                          styles.spaceOptionTextSelected,
                      ]}
                    >
                      {espacio.nombre}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Observación</Text>
              <TextInput
                value={observacion}
                onChangeText={setObservacion}
                placeholder="Describí el estado de la cancha"
                placeholderTextColor={palette.textSecondary}
                style={[styles.input, styles.observationInput]}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />

              <Text style={styles.helper}>
                Adjuntá hasta cinco archivos: fotos JPG, PNG o WEBP (5 MB) y
                videos MP4 (30 MB). Se guardan en el dispositivo y se suben al
                enviar el reporte.
              </Text>
              {evidencias.map((evidencia) => (
                <View key={evidencia.uri} style={styles.evidenceRow}>
                  <Text style={styles.detail} numberOfLines={1}>
                    {evidencia.tipo === "video" ? "Video" : "Foto"} ·{" "}
                    {evidencia.nombre}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${evidencia.nombre}`}
                    onPress={() => void quitarEvidencia(evidencia)}
                    disabled={guardandoInspeccion}
                  >
                    <Text style={styles.removeText}>Quitar</Text>
                  </Pressable>
                </View>
              ))}

              <Pressable
                style={[
                  styles.secondaryButton,
                  (seleccionandoEvidencias ||
                    guardandoInspeccion ||
                    evidencias.length >= 5) &&
                    styles.buttonDisabled,
                ]}
                onPress={() => void seleccionarEvidencias()}
                disabled={
                  seleccionandoEvidencias ||
                  guardandoInspeccion ||
                  evidencias.length >= 5
                }
              >
                <Text style={styles.secondaryButtonText}>
                  {seleccionandoEvidencias
                    ? "Guardando archivos..."
                    : "Elegir fotos o videos"}
                </Text>
              </Pressable>

              {mensajeInspeccion ? (
                <Text accessibilityRole="alert" style={styles.message}>
                  {mensajeInspeccion}
                </Text>
              ) : null}

              <Pressable
                style={[
                  styles.primaryButton,
                  guardandoInspeccion && styles.buttonDisabled,
                ]}
                onPress={() => void guardarInspeccion()}
                disabled={guardandoInspeccion || seleccionandoEvidencias}
              >
                <Text style={styles.primaryButtonText}>
                  {guardandoInspeccion
                    ? "Subiendo y guardando..."
                    : "Guardar reporte"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>
                Inspecciones de{" "}
                {espacios.find((espacio) => espacio.id === espacioInspeccion)
                  ?.nombre ?? "la cancha"}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (espacioInspeccion) {
                    void cargarInspecciones(espacioInspeccion);
                  }
                }}
                disabled={cargandoInspecciones || !espacioInspeccion}
              >
                <Text style={styles.refreshText}>Actualizar</Text>
              </Pressable>
            </View>

            {cargandoInspecciones ? (
              <ActivityIndicator color={palette.backgroundSelected} />
            ) : inspecciones.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.empty}>
                  Todavía no hay inspecciones para esta cancha.
                </Text>
              </View>
            ) : (
              inspecciones.map((inspeccion) => (
                <View key={inspeccion.id} style={styles.card}>
                  <Text style={styles.detail}>
                    {new Date(inspeccion.creadaEn).toLocaleString("es-AR")}
                  </Text>
                  <Text style={styles.detail}>{inspeccion.observacion}</Text>
                  <View style={styles.evidenceGallery}>
                    {inspeccion.evidencias.map((url) =>
                      url.includes("/videos/") ? (
                        <Pressable
                          key={url}
                          accessibilityRole="button"
                          onPress={() => void abrirVideo(url)}
                          style={styles.videoEvidence}
                        >
                          <Text style={styles.secondaryButtonText}>
                            Abrir video
                          </Text>
                        </Pressable>
                      ) : (
                        <Image
                          key={url}
                          accessibilityLabel="Foto de inspección"
                          source={{ uri: url }}
                          style={styles.evidenceImage}
                          resizeMode="cover"
                        />
                      ),
                    )}
                  </View>
                </View>
              ))
            )}

          </>
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
      backgroundColor: palette.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      padding: 18,
      gap: 9,
    },
    cardTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    account: {
      color: palette.textSecondary,
      fontSize: 14,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    helper: {
      color: palette.textSecondary,
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
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      fontFamily: Fonts.sans,
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
    observationInput: {
      minHeight: 88,
    },
    spaceOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    spaceOption: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: palette.background,
    },
    spaceOptionSelected: {
      backgroundColor: palette.backgroundSelected,
    },
    spaceOptionText: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    spaceOptionTextSelected: {
      color: palette.textOnSelected,
    },
    primaryButton: {
      backgroundColor: palette.backgroundSelected,
      borderRadius: 10,
      padding: 14,
      alignItems: "center",
    },
    primaryButtonText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      padding: 13,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    evidenceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    removeText: {
      color: "#b91c1c",
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    evidenceGallery: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    evidenceImage: {
      width: 88,
      height: 88,
      borderRadius: 10,
      backgroundColor: palette.backgroundElement,
    },
    videoEvidence: {
      minWidth: 88,
      height: 88,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 10,
      padding: 8,
      backgroundColor: palette.backgroundSelected,
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    message: {
      color: palette.textSecondary,
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
      color: palette.text,
      fontSize: 18,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    refreshText: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    detail: {
      color: palette.text,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts.sans,
    },
    empty: {
      color: palette.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts.sans,
    },
  });
}
