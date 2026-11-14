import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";

import { apiPost } from "@/servicios/api";

type ModuloNotificaciones = typeof import("expo-notifications");

let moduloNotificaciones: Promise<ModuloNotificaciones | null> | null = null;

async function cargarNotificaciones(): Promise<ModuloNotificaciones | null> {
  if (!moduloNotificaciones) {
    moduloNotificaciones = import("expo-notifications")
      .then((modulo) => {
        modulo.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        return modulo;
      })
      .catch((error) => {
        console.warn("No se pudo cargar expo-notifications:", error);
        return null;
      });
  }

  return moduloNotificaciones;
}

async function prepararCanalAndroid(
  notifications: ModuloNotificaciones,
): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  await notifications.setNotificationChannelAsync("reservas", {
    name: "Reservas deportivas",
    importance: notifications.AndroidImportance.HIGH,
    sound: "default",
  });
}

export async function solicitarPermisosNotificaciones(): Promise<boolean> {
  const notifications = await cargarNotificaciones();

  if (!notifications) {
    return false;
  }

  await prepararCanalAndroid(notifications);

  const permisosActuales = await notifications.getPermissionsAsync();

  if (permisosActuales.granted) {
    return true;
  }

  const permisosSolicitados =
    await notifications.requestPermissionsAsync();

  return permisosSolicitados.granted;
}

/**
 * Obtiene el Expo Push Token y registra el dispositivo
 * en la API para el usuario que inició sesión.
 */
export async function registrarDispositivoPush(): Promise<boolean> {
  try {
    if (!Device.isDevice) {
      console.warn(
        "Las notificaciones push requieren un dispositivo físico.",
      );
      return false;
    }

    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      return false;
    }

    const tienePermiso = await solicitarPermisosNotificaciones();

    if (!tienePermiso) {
      console.warn("No se autorizaron las notificaciones.");
      return false;
    }

    const notifications = await cargarNotificaciones();

    if (!notifications) {
      return false;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      throw new Error(
        "No se encontró el identificador del proyecto Expo.",
      );
    }

    const respuestaToken = await notifications.getExpoPushTokenAsync({
      projectId,
    });

    const plataforma: "ios" | "android" =
      Platform.OS === "ios" ? "ios" : "android";

    await apiPost("/dispositivos", {
      tokenExpo: respuestaToken.data,
      plataforma,
    });

    console.info("Dispositivo registrado para notificaciones push.");

    return true;
  } catch (error) {
    // Un error de notificaciones nunca debe impedir el acceso.
    console.warn("No se pudo registrar el dispositivo:", error);
    return false;
  }
}

export async function programarRecordatorioTurno(
  reservaId: string,
  fechaHoraInicio: string,
  nombreCancha: string,
): Promise<string | null> {
  const notifications = await cargarNotificaciones();

  if (!notifications) {
    return null;
  }

  const tienePermiso = await solicitarPermisosNotificaciones();

  if (!tienePermiso) {
    return null;
  }

  const fechaRecordatorio =
    new Date(fechaHoraInicio).getTime() - 2 * 60 * 60 * 1000;

  if (fechaRecordatorio <= Date.now()) {
    return null;
  }

  return notifications.scheduleNotificationAsync({
    content: {
      title: "Recordatorio de reserva",
      body: `Tu turno en ${nombreCancha} comienza en 2 horas.`,
      data: {
        reservaId,
        tipo: "recordatorio-turno",
      },
      sound: "default",
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(fechaRecordatorio),
      ...(Platform.OS === "android" ? { channelId: "reservas" } : {}),
    },
  });
}

export async function simularNotificacionPush(
  titulo: string,
  cuerpo: string,
): Promise<string | null> {
  const notifications = await cargarNotificaciones();

  if (!notifications) {
    return null;
  }

  const tienePermiso = await solicitarPermisosNotificaciones();

  if (!tienePermiso) {
    return null;
  }

  return notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: cuerpo,
      data: {
        tipo: "simulacion-push",
      },
      sound: "default",
    },
    trigger: null,
  });
}