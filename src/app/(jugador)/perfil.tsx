import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { ThemePreferenceControl } from "@/components/theme-preference-control";
import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { clearAppSession, getCurrentUserSession } from "@/persistencia/session";
import { apiPatch, apiPost } from "@/servicios/api";
import { actualizarUsuarioSesion, saveSessionUser } from "@/servicios/auth";
import { registrarDispositivoPush } from "@/servicios/dispositivos";
import { getEspacios } from "@/servicios/espacios";
import { establecerFavoritoEspacio } from "@/servicios/favoritos";
import {
    getMisReservas,
    guardarReservasEnCache,
    obtenerReservasDesdeCache,
} from "@/servicios/reservas";
import type { Espacio, Reserva } from "@/tipos";
import type { Usuario } from "@/tipos/usuario";

type RespuestaPruebaPush = {
  datos: { dispositivos: number };
  meta: null;
};

type RespuestaUsuario = {
  datos: Usuario;
  meta: null;
};

const DURACION_TURNO_MS = 60 * 60 * 1000;

function esReservaProxima(reserva: Reserva): boolean {
  return (
    (reserva.estado === "activa" || reserva.estado === "confirmada") &&
    Date.parse(reserva.fechaHoraInicio) + DURACION_TURNO_MS > Date.now()
  );
}

export default function PerfilScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargandoEspacios, setCargandoEspacios] = useState(true);
  const [reservasProximas, setReservasProximas] = useState<number | null>(null);
  const [probandoNotificaciones, setProbandoNotificaciones] = useState(false);
  const [errorActualizacion, setErrorActualizacion] = useState<string | null>(
    null,
  );
  const [errorFavoritos, setErrorFavoritos] = useState<string | null>(null);
  const [errorReservas, setErrorReservas] = useState<string | null>(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [nombreEditado, setNombreEditado] = useState("");
  const [telefonoEditado, setTelefonoEditado] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarPerfil() {
        try {
          const usuarioGuardado = await getCurrentUserSession();
          if (!activo) return;
          setUsuario(usuarioGuardado);
          setErrorActualizacion(null);

          if (!usuarioGuardado) return;

          setCargandoEspacios(true);
          const [usuarioResult, espaciosResult, reservasResult] =
            await Promise.allSettled([
              actualizarUsuarioSesion(),
              getEspacios(),
              getMisReservas(usuarioGuardado.id),
            ]);
          if (!activo) return;

          if (usuarioResult.status === "fulfilled") {
            setUsuario(usuarioResult.value);
          } else {
            setErrorActualizacion(
              usuarioResult.reason instanceof Error
                ? usuarioResult.reason.message
                : "No se pudo actualizar el perfil.",
            );
          }

          if (espaciosResult.status === "fulfilled") {
            if ("error" in espaciosResult.value && espaciosResult.value.error) {
              setErrorFavoritos(espaciosResult.value.error.mensaje);
            } else {
              setEspacios(espaciosResult.value.datos);
              setErrorFavoritos(null);
            }
          } else {
            setErrorFavoritos(
              espaciosResult.reason instanceof Error
                ? espaciosResult.reason.message
                : "No se pudieron cargar los espacios favoritos.",
            );
          }

          if (reservasResult.status === "fulfilled") {
            if ("error" in reservasResult.value && reservasResult.value.error) {
              const reservasCacheadas = await obtenerReservasDesdeCache(
                usuarioGuardado.id,
              );
              if (!activo) return;
              if (reservasCacheadas !== null) {
                setReservasProximas(
                  reservasCacheadas.filter(esReservaProxima).length,
                );
                setErrorReservas(null);
              } else {
                setErrorReservas(reservasResult.value.error.mensaje);
              }
            } else {
              setReservasProximas(
                reservasResult.value.datos.filter(esReservaProxima).length,
              );
              setErrorReservas(null);
            }
          } else {
            setErrorReservas(
              reservasResult.reason instanceof Error
                ? reservasResult.reason.message
                : "No se pudieron cargar las reservas.",
            );
          }
        } catch (error) {
          if (activo) {
            setErrorActualizacion(
              error instanceof Error
                ? error.message
                : "No se pudo actualizar el contador de cancelaciones.",
            );
          }
        } finally {
          if (activo) setCargandoEspacios(false);
        }
      }

      void cargarPerfil();

      return () => {
        activo = false;
      };
    }, []),
  );

  const espaciosFavoritos = espacios.filter((espacio) =>
    usuario?.espaciosFavoritos?.includes(espacio.id),
  );

  function abrirEditorPerfil() {
    setNombreEditado(usuario?.nombre ?? "");
    setTelefonoEditado(usuario?.telefono ?? "");
    setEditandoPerfil(true);
  }

  async function guardarPerfil() {
    if (guardandoPerfil) return;
    const nombre = nombreEditado.trim();
    const telefono = telefonoEditado.trim();
    if (!nombre || !telefono) {
      Alert.alert("Datos incompletos", "Ingresá tu nombre y teléfono.");
      return;
    }

    setGuardandoPerfil(true);
    try {
      const respuesta = await apiPatch<RespuestaUsuario>("/yo", {
        nombre,
        telefono,
      });
      await saveSessionUser(respuesta.datos);
      setUsuario(respuesta.datos);
      setEditandoPerfil(false);
      Alert.alert(
        "Perfil actualizado",
        "Tus datos se guardaron correctamente.",
      );
    } catch (error) {
      Alert.alert(
        "No se pudo actualizar el perfil",
        error instanceof Error ? error.message : "Volvé a intentarlo.",
      );
    } finally {
      setGuardandoPerfil(false);
    }
  }

  async function quitarFavorito(espacio: Espacio) {
    try {
      const usuarioActualizado = await establecerFavoritoEspacio(
        espacio.id,
        true,
      );
      setUsuario(usuarioActualizado);
    } catch (error) {
      Alert.alert(
        "No se pudo quitar el favorito",
        error instanceof Error ? error.message : "Volvé a intentarlo.",
      );
    }
  }

  async function probarNotificaciones() {
    if (probandoNotificaciones) return;
    setProbandoNotificaciones(true);

    try {
      const resultado = await registrarDispositivoPush();
      if (resultado === "permiso-denegado") {
        Alert.alert(
          "Permiso de notificaciones desactivado",
          "Habilitalo en los ajustes del teléfono para recibir recordatorios y avisos.",
          [
            { text: "Ahora no", style: "cancel" },
            {
              text: "Abrir ajustes",
              onPress: () => {
                void Linking.openSettings().catch((error: unknown) => {
                  Alert.alert(
                    "No se pudieron abrir los ajustes",
                    error instanceof Error
                      ? error.message
                      : "Volvé a intentarlo.",
                  );
                });
              },
            },
          ],
        );
        return;
      }

      if (resultado === "dispositivo-no-compatible") {
        Alert.alert(
          "Push no disponible",
          "Usá un teléfono físico con un build de desarrollo o APK. Expo Go en Android no admite notificaciones push.",
        );
        return;
      }

      const usuarioActual = await getCurrentUserSession();
      if (usuarioActual) {
        const reservas = await getMisReservas(usuarioActual.id);
        if ("error" in reservas && reservas.error) {
          console.warn(
            "No se pudieron sincronizar recordatorios al habilitar notificaciones.",
            reservas.error.mensaje,
          );
        } else {
          await guardarReservasEnCache(reservas.datos, usuarioActual.id);
        }
      }

      const respuesta = await apiPost<RespuestaPruebaPush>(
        "/dispositivos/prueba",
      );
      if (respuesta.datos.dispositivos === 0) {
        Alert.alert(
          "No hay dispositivos registrados",
          "No encontramos teléfonos habilitados para esta cuenta.",
        );
        return;
      }

      Alert.alert(
        "Prueba solicitada",
        `La App pidió enviar una notificación a ${respuesta.datos.dispositivos} dispositivo(s). Si no llega, no estarias viendo este mensaje.`,
      );
    } catch (error) {
      Alert.alert(
        "No se pudo probar la notificación",
        error instanceof Error ? error.message : "Volvé a intentarlo.",
      );
    } finally {
      setProbandoNotificaciones(false);
    }
  }

  async function cerrarSesion() {
    try {
      await clearAppSession();
    } catch (error) {
      Alert.alert(
        "Sesión cerrada",
        error instanceof Error
          ? `No se pudo borrar toda la caché local: ${error.message}`
          : "No se pudo borrar toda la caché local.",
      );
    } finally {
      router.replace("/(auth)/login");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Perfil</Text>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {usuario?.nombre?.charAt(0).toUpperCase() ?? "J"}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.name}>{usuario?.nombre ?? "Jugador"}</Text>
        <Text style={styles.role}>Jugador</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{usuario?.email ?? "Sin email"}</Text>
        <Text style={styles.label}>Teléfono</Text>
        <Text style={styles.value}>{usuario?.telefono ?? "Sin teléfono"}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.editButton}
          onPress={abrirEditorPerfil}
        >
          <Text style={styles.editButtonText}>Editar nombre y teléfono</Text>
        </Pressable>
        <View style={styles.counter}>
          <View style={styles.counterText}>
            <Text style={styles.label}>Cancelaciones tardías</Text>
            <Text style={styles.counterDescription}>
              Registradas por el complejo fuera del plazo.
            </Text>
          </View>
          <Text style={styles.counterValue}>
            {usuario?.cancelacionesTardias ?? "—"}
          </Text>
        </View>
        <View style={styles.counter}>
          <View style={styles.counterText}>
            <Text style={styles.label}>Reservas próximas</Text>
            <Text style={styles.counterDescription}>
              Turnos confirmados que todavía no terminaron.
            </Text>
          </View>
          <Text style={styles.counterValue}>{reservasProximas ?? "—"}</Text>
        </View>
        <View style={styles.counter}>
          <View style={styles.counterText}>
            <Text style={styles.label}>Espacios favoritos</Text>
          </View>
          <Text style={styles.counterValue}>
            {usuario?.espaciosFavoritos?.length ?? 0}
          </Text>
        </View>
      </View>
      {errorActualizacion ? (
        <Text style={styles.syncError}>
          No se pudo actualizar el contador. Se muestra el último dato guardado.
          {"\n"}
          {errorActualizacion}
        </Text>
      ) : null}
      {errorReservas ? (
        <Text style={styles.syncError}>
          No se pudo actualizar el contador de reservas.{"\n"}
          {errorReservas}
        </Text>
      ) : null}
      <View style={styles.favoritesCard}>
        <Text style={styles.notificationsTitle}>Mis espacios favoritos</Text>
        {errorFavoritos ? (
          <Text style={styles.syncError}>{errorFavoritos}</Text>
        ) : cargandoEspacios ? (
          <Text style={styles.notificationsDescription}>
            Cargando favoritos...
          </Text>
        ) : espaciosFavoritos.length === 0 ? (
          <Text style={styles.notificationsDescription}>
            Todavía no tenés espacios favoritos.
          </Text>
        ) : (
          espaciosFavoritos.map((espacio) => (
            <View key={espacio.id} style={styles.favoriteRow}>
              <Pressable
                style={styles.favoriteInfo}
                onPress={() =>
                  router.push({
                    pathname: "/(jugador)/espacio/[id]",
                    params: { id: espacio.id },
                  })
                }
              >
                <Text style={styles.favoriteName}>{espacio.nombre}</Text>
                <Text style={styles.favoriteMeta}>
                  {espacio.complejo ?? "Complejo no disponible"} ·{" "}
                  {espacio.deporte}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void quitarFavorito(espacio)}
              >
                <Text style={styles.removeFavorite}>Quitar</Text>
              </Pressable>
            </View>
          ))
        )}
        <Pressable
          accessibilityRole="button"
          style={styles.editButton}
          onPress={() => router.push("/(jugador)/espacios")}
        >
          <Text style={styles.editButtonText}>Buscar espacios</Text>
        </Pressable>
      </View>
      <ThemePreferenceControl />
      <View style={styles.notificationsCard}>
        <Text style={styles.notificationsTitle}>Notificaciones</Text>
        <Text style={styles.notificationsDescription}>
          Recibí recordatorios dos horas antes y avisos del complejo o de turnos
          liberados en tus espacios favoritos.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={probandoNotificaciones}
          style={[
            styles.notificationsButton,
            probandoNotificaciones && styles.disabledButton,
          ]}
          onPress={() => void probarNotificaciones()}
        >
          <Text style={styles.notificationsButtonText}>
            {probandoNotificaciones
              ? "Comprobando..."
              : "Activar y probar notificaciones"}
          </Text>
        </Pressable>
      </View>
      <Pressable style={styles.logout} onPress={() => void cerrarSesion()}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
      <Modal
        visible={editandoPerfil}
        transparent
        animationType="fade"
        onRequestClose={() => setEditandoPerfil(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.notificationsTitle}>Editar perfil</Text>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              value={nombreEditado}
              onChangeText={setNombreEditado}
              autoCapitalize="words"
              maxLength={80}
              style={styles.input}
              accessibilityLabel="Nombre"
            />
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              value={telefonoEditado}
              onChangeText={setTelefonoEditado}
              keyboardType="phone-pad"
              maxLength={29}
              style={styles.input}
              accessibilityLabel="Teléfono"
            />
            <Pressable
              accessibilityRole="button"
              disabled={guardandoPerfil}
              style={styles.notificationsButton}
              onPress={() => void guardarPerfil()}
            >
              <Text style={styles.notificationsButtonText}>
                {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
              </Text>
            </Pressable>
            <Pressable
              disabled={guardandoPerfil}
              style={styles.cancelEditButton}
              onPress={() => setEditandoPerfil(false)}
            >
              <Text style={styles.editButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.backgroundElement },
    content: { padding: 20, gap: 14 },
    eyebrow: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.4,
    },
    title: {
      fontSize: 30,
      fontWeight: "800",
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    avatar: {
      alignSelf: "center",
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: palette.backgroundSelected,
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 8,
    },
    avatarText: {
      color: palette.textOnSelected,
      fontSize: 36,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    card: {
      backgroundColor: palette.background,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      gap: 7,
    },
    name: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    role: {
      color: palette.textSecondary,
      fontWeight: "700",
      textTransform: "uppercase",
      fontSize: 12,
      letterSpacing: 1,
      fontFamily: Fonts.sans,
    },
    divider: {
      height: 1,
      backgroundColor: palette.backgroundElement,
      marginVertical: 10,
    },
    label: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      fontFamily: Fonts.sans,
    },
    value: {
      color: palette.text,
      fontSize: 16,
      marginBottom: 7,
      fontFamily: Fonts.sans,
    },
    counter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 4,
      padding: 14,
      borderRadius: 12,
      backgroundColor: palette.backgroundElement,
    },
    counterText: { flex: 1, gap: 4 },
    counterDescription: {
      color: palette.text,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: Fonts.sans,
    },
    counterValue: {
      minWidth: 42,
      color: palette.textSecondary,
      fontSize: 28,
      fontWeight: "900",
      textAlign: "right",
      fontFamily: Fonts.sans,
    },
    syncError: {
      color: "#b42318",
      fontSize: 13,
      lineHeight: 19,
      fontFamily: Fonts.sans,
    },
    notificationsCard: {
      backgroundColor: palette.background,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      gap: 10,
    },
    editButton: {
      alignSelf: "flex-start",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: palette.backgroundSelected,
      marginTop: 6,
    },
    editButtonText: {
      color: palette.textOnSelected,
      fontFamily: Fonts.sans,
      fontWeight: "800",
    },
    favoritesCard: {
      backgroundColor: palette.background,
      borderRadius: 16,
      padding: 18,
      gap: 10,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
    },
    favoriteRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: palette.backgroundElement,
    },
    favoriteInfo: { flex: 1, gap: 3 },
    favoriteName: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontWeight: "800",
    },
    favoriteMeta: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 13,
    },
    removeFavorite: {
      color: palette.backgroundSelected,
      fontFamily: Fonts.sans,
      fontWeight: "800",
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    modalCard: {
      padding: 20,
      borderRadius: 16,
      gap: 10,
      backgroundColor: palette.backgroundElement,
    },
    input: {
      color: palette.text,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 8,
      padding: 12,
      backgroundColor: palette.background,
      fontFamily: Fonts.sans,
    },
    cancelEditButton: {
      alignSelf: "center",
      padding: 10,
    },
    notificationsTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    notificationsDescription: {
      color: palette.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts.sans,
    },
    notificationsButton: {
      backgroundColor: palette.backgroundSelected,
      borderRadius: 10,
      padding: 13,
      alignItems: "center",
    },
    notificationsButtonText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    disabledButton: { opacity: 0.6 },
    logout: {
      borderWidth: 1,
      borderColor: palette.textSecondary,
      borderRadius: 12,
      padding: 15,
      alignItems: "center",
      marginTop: 4,
    },
    logoutText: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
  });
}
