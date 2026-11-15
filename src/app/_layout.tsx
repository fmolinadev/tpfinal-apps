import { Stack, useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreenModule from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { NetworkStatusBanner } from "@/components/network-status-banner";
import { Colors } from "@/constants/theme";
import { AppThemeProvider, useTheme } from "@/hooks/use-theme";
import {
  clearAppSession,
  getCurrentUserSession,
} from "@/persistencia/session";
import { onSessionExpired } from "@/servicios/api";
import { registrarDispositivoPushEnSegundoPlano } from "@/servicios/dispositivos";
import {
  escucharNotificaciones,
  type DatosNotificacion,
} from "@/servicios/notificaciones";
import {
  getMisReservas,
  guardarReservasEnCache,
} from "@/servicios/reservas";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

void SplashScreenModule.preventAutoHideAsync().catch((error: unknown) => {
  console.warn("No se pudo mantener visible el splash nativo.", error);
});

export default function RootLayout() {
  const router = useRouter();
  const segmentos = useSegments();
  const segmentosActuales = useRef(segmentos);
  const notificacionPendiente = useRef<DatosNotificacion | null>(null);
  const respuestasAtendidas = useRef(new Set<string>());

  useEffect(() => {
    segmentosActuales.current = segmentos;
  }, [segmentos]);

  const grupoActual = segmentos[0];
  useEffect(() => {
    if (grupoActual !== "(jugador)") return;

    let activo = true;
    void getCurrentUserSession()
      .then((usuario) => {
        if (activo && usuario) registrarDispositivoPushEnSegundoPlano();
      })
      .catch((error: unknown) => {
        console.error(
          "No se pudo comprobar la sesión para registrar notificaciones.",
          error,
        );
      });

    return () => {
      activo = false;
    };
  }, [grupoActual]);

  const sincronizarReservas = useCallback(async () => {
    try {
      const usuario = await getCurrentUserSession();
      if (!usuario) return;

      const respuesta = await getMisReservas(usuario.id);
      if ("error" in respuesta && respuesta.error) {
        console.warn(
          "No se pudieron sincronizar las reservas al reanudar la app.",
          respuesta.error.mensaje,
        );
        return;
      }

      await guardarReservasEnCache(respuesta.datos, usuario.id);
    } catch (error) {
      console.warn(
        "No se pudieron sincronizar las reservas al reanudar la app.",
        error,
      );
    }
  }, []);

  const navegarDesdeNotificacion = useCallback(
    (datos: DatosNotificacion) => {
      if (segmentosActuales.current[0] !== "(jugador)") {
        notificacionPendiente.current = datos;
        return;
      }

      notificacionPendiente.current = null;
      if (typeof datos.reservaId === "string") {
        router.push({
          pathname: "/(jugador)/reserva/[id]",
          params: { id: datos.reservaId },
        });
        return;
      }

      if (typeof datos.espacioId === "string") {
        if (typeof datos.turnoId === "string") {
          router.push({
            pathname: "/(jugador)/espacio/[id]/disponibilidad",
            params: {
              id: datos.espacioId,
              turnoId: datos.turnoId,
            },
          });
        } else {
          router.push({
            pathname: "/(jugador)/espacio/[id]",
            params: { id: datos.espacioId },
          });
        }
      }
    },
    [router],
  );

  useEffect(
    () =>
      onSessionExpired(() => {
        router.replace({
          pathname: "/(auth)/login",
          params: { motivo: "sesion-expirada" },
        });
        void clearAppSession().catch((error: unknown) => {
          Alert.alert(
            "Sesión finalizada",
            error instanceof Error
              ? `No se pudo borrar toda la caché local: ${error.message}`
              : "No se pudo borrar toda la caché local.",
          );
        });
      }),
    [router],
  );

  useEffect(() => {
    if (segmentos[0] !== "(jugador)" || !notificacionPendiente.current) return;
    const pendiente = notificacionPendiente.current;
    notificacionPendiente.current = null;
    navegarDesdeNotificacion(pendiente);
  }, [segmentos, navegarDesdeNotificacion]);

  useEffect(() => {
    let activo = true;
    let quitarEscuchas: (() => void) | null = null;

    void escucharNotificaciones(
      (datos) => {
        if (
          datos.tipo !== "recordatorio-turno" &&
          (typeof datos.reservaId === "string" ||
            typeof datos.espacioId === "string") &&
          segmentosActuales.current[0] === "(jugador)"
        ) {
          void sincronizarReservas();
        }
      },
      (datos, identificador) => {
        if (respuestasAtendidas.current.has(identificador)) return;
        respuestasAtendidas.current.add(identificador);
        if (respuestasAtendidas.current.size > 20) {
          const masAntigua = respuestasAtendidas.current.values().next().value;
          if (masAntigua) respuestasAtendidas.current.delete(masAntigua);
        }
        notificacionPendiente.current = datos;
        if (segmentosActuales.current[0] === "(jugador)") {
          void sincronizarReservas();
        }
        navegarDesdeNotificacion(datos);
      },
    )
      .then((quitar) => {
        if (activo) quitarEscuchas = quitar;
        else quitar();
      })
      .catch((error: unknown) => {
        console.error(
          "No se pudieron activar los eventos de notificaciones.",
          error,
        );
      });

    return () => {
      activo = false;
      quitarEscuchas?.();
    };
  }, [navegarDesdeNotificacion, sincronizarReservas]);

  useEffect(() => {
    let estadoAnterior = AppState.currentState;
    const suscripcion = AppState.addEventListener("change", (estado) => {
      const estabaEnSegundoPlano =
        estadoAnterior === "background" || estadoAnterior === "inactive";
      estadoAnterior = estado;
      if (
        estabaEnSegundoPlano &&
        estado === "active" &&
        segmentosActuales.current[0] === "(jugador)"
      ) {
        void sincronizarReservas();
      }
    });

    return () => suscripcion.remove();
  }, [sincronizarReservas]);

  const grupoAnterior = useRef<string | undefined>(undefined);
  useEffect(() => {
    const grupoActual = segmentos[0];
    if (
      grupoActual === "(jugador)" &&
      grupoAnterior.current !== "(jugador)"
    ) {
      void sincronizarReservas();
    }
    grupoAnterior.current = grupoActual;
  }, [segmentos, sincronizarReservas]);

  return (
    <AppThemeProvider>
      <SafeAreaProvider>
        <RootStack />
      </SafeAreaProvider>
    </AppThemeProvider>
  );
}

function RootStack() {
  const palette = useTheme();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.backgroundElement }}
      edges={["top"]}
    >
      <StatusBar style={palette === Colors.dark ? "light" : "dark"} />
      <NetworkStatusBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(jugador)" options={{ headerShown: false }} />
        <Stack.Screen name="(staff)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  );
}
