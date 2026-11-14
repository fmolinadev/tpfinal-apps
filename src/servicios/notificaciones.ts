import { Platform } from "react-native";
import Storage from "expo-sqlite/kv-store";
import type { Reserva } from "@/tipos";

type ModuloNotificaciones = typeof import("expo-notifications");
type SolicitudProgramada = {
  identifier: string;
  content: { data?: unknown };
};

let moduloNotificaciones: Promise<ModuloNotificaciones | null> | null = null;
const RECORDATORIO_PREFIX = "recordatorio-turno-v1:";

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
      .catch(() => null);
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

function esRecordatorioDeReserva(
  solicitud: SolicitudProgramada,
): string | null {
  const data = solicitud.content.data;
  if (
    typeof data === "object" &&
    data !== null &&
    "tipo" in data &&
    data.tipo === "recordatorio-turno" &&
    "reservaId" in data &&
    typeof data.reservaId === "string"
  ) {
    return data.reservaId;
  }
  return null;
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

  const permisosSolicitados = await notifications.requestPermissionsAsync();
  return permisosSolicitados.granted;
}

async function programarRecordatorioTurnoInterno(
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
    await cancelarRecordatorioTurno(reservaId);
    return null;
  }

  await cancelarRecordatorioTurno(reservaId);
  const identificador = await notifications.scheduleNotificationAsync({
    content: {
      title: "Recordatorio de reserva",
      body: `Tu turno en ${nombreCancha} comienza en 2 horas.`,
      data: { reservaId, tipo: "recordatorio-turno" },
      sound: "default",
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(fechaRecordatorio),
      ...(Platform.OS === "android" ? { channelId: "reservas" } : {}),
    },
  });

  try {
    await Storage.setItem(
      `${RECORDATORIO_PREFIX}${encodeURIComponent(reservaId)}`,
      identificador,
    );
  } catch (error) {
    try {
      await notifications.cancelScheduledNotificationAsync(identificador);
    } catch (errorCancelacion) {
      console.error(
        "No se pudo cancelar el recordatorio tras fallar su persistencia.",
        errorCancelacion,
      );
    }
    throw error;
  }

  return identificador;
}

export async function programarRecordatorioTurno(
  reservaId: string,
  fechaHoraInicio: string,
  nombreCancha: string,
): Promise<string | null> {
  try {
    return await programarRecordatorioTurnoInterno(
      reservaId,
      fechaHoraInicio,
      nombreCancha,
    );
  } catch (error) {
    console.error("No se pudo programar el recordatorio local.", error);
    return null;
  }
}

export async function cancelarRecordatorioTurno(
  reservaId: string,
): Promise<void> {
  const notifications = await cargarNotificaciones();
  if (!notifications) {
    await Storage.removeItem(
      `${RECORDATORIO_PREFIX}${encodeURIComponent(reservaId)}`,
    );
    return;
  }

  const clave = `${RECORDATORIO_PREFIX}${encodeURIComponent(reservaId)}`;
  const identificadorGuardado = await Storage.getItem(clave);
  const programadas = await notifications.getAllScheduledNotificationsAsync();
  const idsProgramados = new Set(
    programadas.map((solicitud) => solicitud.identifier),
  );
  const identificadores = new Set(
    programadas
      .filter((solicitud) => esRecordatorioDeReserva(solicitud) === reservaId)
      .map((solicitud) => solicitud.identifier),
  );
  if (identificadorGuardado && idsProgramados.has(identificadorGuardado)) {
    identificadores.add(identificadorGuardado);
  }

  await Promise.all(
    [...identificadores].map((identificador) =>
      notifications.cancelScheduledNotificationAsync(identificador),
    ),
  );
  await Storage.removeItem(clave);
}

export async function reconciliarRecordatoriosReservas(
  reservas: readonly Reserva[],
): Promise<void> {
  const notifications = await cargarNotificaciones();
  if (!notifications) return;

  const reservasActivas = new Set(
    reservas
      .filter(
        (reserva) =>
          reserva.estado === "activa" || reserva.estado === "confirmada",
      )
      .map((reserva) => reserva.id),
  );
  const programadas = await notifications.getAllScheduledNotificationsAsync();
  const idsProgramados = new Set(
    programadas.map((solicitud) => solicitud.identifier),
  );
  const reservasConRecordatorio = new Set<string>();
  const idsParaCancelar = new Set<string>();

  for (const solicitud of programadas) {
    const reservaId = esRecordatorioDeReserva(solicitud);
    if (!reservaId) continue;
    if (reservasActivas.has(reservaId)) {
      reservasConRecordatorio.add(reservaId);
    } else {
      idsParaCancelar.add(solicitud.identifier);
    }
  }

  const claves = (await Storage.getAllKeys()).filter((clave) =>
    clave.startsWith(RECORDATORIO_PREFIX),
  );
  const clavesParaBorrar: string[] = [];

  for (const clave of claves) {
    const reservaId = decodeURIComponent(
      clave.slice(RECORDATORIO_PREFIX.length),
    );
    const identificador = await Storage.getItem(clave);
    if (!reservasActivas.has(reservaId)) {
      if (identificador && idsProgramados.has(identificador)) {
        idsParaCancelar.add(identificador);
      }
      clavesParaBorrar.push(clave);
    } else if (!reservasConRecordatorio.has(reservaId)) {
      clavesParaBorrar.push(clave);
    }
  }

  await Promise.all([
    ...[...idsParaCancelar].map((identificador) =>
      notifications.cancelScheduledNotificationAsync(identificador),
    ),
    ...clavesParaBorrar.map((clave) => Storage.removeItem(clave)),
  ]);
}

export async function limpiarRecordatoriosLocales(): Promise<void> {
  const notifications = await cargarNotificaciones();
  const claves = (await Storage.getAllKeys()).filter((clave) =>
    clave.startsWith(RECORDATORIO_PREFIX),
  );

  if (notifications) {
    const programadas = await notifications.getAllScheduledNotificationsAsync();
    const identificadores = programadas
      .filter((solicitud) => esRecordatorioDeReserva(solicitud) !== null)
      .map((solicitud) => solicitud.identifier);
    await Promise.all(
      identificadores.map((identificador) =>
        notifications.cancelScheduledNotificationAsync(identificador),
      ),
    );
  }

  await Promise.all(claves.map((clave) => Storage.removeItem(clave)));
}
