import type {
  Espacio,
  Reserva,
  RespuestaApi,
  Turno,
} from "@/tipos";
import type { Reserva as ReservaApi } from "@/tipos/reserva";
import type { Turno as TurnoApi } from "@/tipos/turno";
import Storage from "expo-sqlite/kv-store";
import {
  guardarReservasLocales,
  limpiarReservasLocales,
  obtenerCatalogoEspaciosLocal,
  obtenerEspacioLocal,
  obtenerReservasLocales,
} from "@/persistencia/base-local";
import {
  ApiError,
  apiGetAll,
  apiPost,
} from "./api";
import { getEspacios } from "./espacios";
import { obtenerUsuario } from "./usuarios";
import {
  cancelarRecordatorioTurno,
  notificarSuspensionReserva,
  reconciliarRecordatoriosReservas,
} from "./notificaciones";
import {
  reconciliarAvisosSuspension,
  type CancelacionPorBloqueo,
  type EstadoAvisosSuspension,
} from "@/utilidades/avisos-suspension";
import type { Usuario } from "@/tipos/usuario";

const RESERVAS_CACHE_PREFIX = "reservas-cache-v1:";
const RESERVAS_CACHE_KEY_ANTERIOR = "reservas-cache-v1";
const AVISOS_SUSPENSION_PREFIX = "avisos-suspension-v1:";
let colaSincronizacionReservas: Promise<void> = Promise.resolve();
let versionSesionAvisos = 0;

function encolarSincronizacion<T>(operacion: () => Promise<T>): Promise<T> {
  const resultado = colaSincronizacionReservas.then(operacion, operacion);
  colaSincronizacionReservas = resultado.then(() => undefined, () => undefined);
  return resultado;
}

async function sincronizarAvisosSuspension(
  usuarioId: string,
  reservas: Reserva[],
  version: number,
): Promise<void> {
  const clave = `${AVISOS_SUSPENSION_PREFIX}${encodeURIComponent(usuarioId)}`;
  const guardado = await Storage.getItem(clave);
  let anteriores: EstadoAvisosSuspension = {};
  if (guardado !== null) {
    const datos: unknown = JSON.parse(guardado);
    if (
      typeof datos !== "object" ||
      datos === null ||
      Array.isArray(datos) ||
      Object.values(datos).some((estado) => typeof estado !== "string")
    ) {
      throw new Error("El estado local de avisos de suspensión es inválido.");
    }
    anteriores = Object.fromEntries(Object.entries(datos));
  }
  const cache = await obtenerReservasLocales(usuarioId);
  for (const reserva of cache ?? []) {
    if (!(reserva.id in anteriores)) anteriores[reserva.id] = reserva.estado;
  }

  await reconciliarAvisosSuspension(
    anteriores,
    reservas,
    async (reservaIds) => (
      await Promise.all(reservaIds.map((reservaId) =>
        apiGetAll<CancelacionPorBloqueo>(
          `/yo/reservas/cancelaciones-por-bloqueo?reservaId=${encodeURIComponent(reservaId)}`,
        ),
      ))
    ).flat(),
    async (reservaId, motivo) => {
      if (version !== versionSesionAvisos) return false;
      return notificarSuspensionReserva(reservaId, motivo);
    },
    async (estado) => {
      if (version === versionSesionAvisos) {
        await Storage.setItem(clave, JSON.stringify(estado));
      }
    },
  );
}

export async function limpiarAvisosSuspension(): Promise<void> {
  versionSesionAvisos += 1;
  await encolarSincronizacion(async () => {
    const claves = (await Storage.getAllKeys()).filter((clave) =>
      clave.startsWith(AVISOS_SUSPENSION_PREFIX),
    );
    if (claves.length > 0) await Storage.multiRemove(claves);
  });
}

type RespuestaUnoApi<T> = {
  datos: T;
  meta: null;
};

export type ReservaAsistencia = {
  id: string;
  turnoId: string;
  espacioId: string;
  usuarioId: string;
  cantidadPersonas: number;
  estado: string;
  ingresoEn: string | null;
  nombreJugador?: string;
  telefonoJugador?: string;
  ausenciasJugador?: number;
  cancelacionesTardiasJugador?: number;
};

export type EstadoReservaDia = Pick<ReservaApi, "id" | "estado">;

function errorRespuesta(
  mensaje: string,
  codigo = "ERROR_API",
): RespuestaApi<Reserva> {
  return {
    error: { codigo, mensaje },
  };
}

export async function agregarReservaACache(
  reserva: Reserva,
  usuarioId: string,
): Promise<void> {
  const reservasExistentes = await obtenerReservasLocales(usuarioId);
  await guardarReservasLocales(
    [
      ...(reservasExistentes ?? []).filter((item) => item.id !== reserva.id),
      reserva,
    ],
    usuarioId,
  );
}

function respuestaErrorApi<T>(
  error: unknown,
  codigoPredeterminado: string,
  mensajePredeterminado: string,
): RespuestaApi<T> {
  return {
    error: {
      codigo:
        error instanceof ApiError && error.codigo
          ? error.codigo
          : codigoPredeterminado,
      mensaje:
        error instanceof Error ? error.message : mensajePredeterminado,
    },
  };
}

export async function listarReservasPorFecha(
  fecha: string,
): Promise<ReservaAsistencia[]> {
  const reservas = await apiGetAll<ReservaAsistencia>(
    `/reservas?fecha=${encodeURIComponent(fecha)}`,
  );
  const usuariosPorId = new Map<string, Usuario>();
  const usuarioIds = Array.from(
    new Set(reservas.map((reserva) => reserva.usuarioId)),
  );
  for (let indice = 0; indice < usuarioIds.length; indice += 10) {
    const usuarios = await Promise.all(
      usuarioIds
        .slice(indice, indice + 10)
        .map(async (usuarioId) => [usuarioId, await obtenerUsuario(usuarioId)] as const),
    );
    for (const [usuarioId, usuario] of usuarios) {
      usuariosPorId.set(usuarioId, usuario);
    }
  }

  return reservas.map((reserva) => {
    const usuario = usuariosPorId.get(reserva.usuarioId);
    return {
      ...reserva,
      nombreJugador: usuario?.nombre,
      telefonoJugador: usuario?.telefono,
      ausenciasJugador: usuario?.ausencias,
      cancelacionesTardiasJugador: usuario?.cancelacionesTardias,
    };
  });
}

export async function listarEstadosReservasPorFecha(
  fecha: string,
): Promise<EstadoReservaDia[]> {
  return apiGetAll<EstadoReservaDia>(
    `/reservas?fecha=${encodeURIComponent(fecha)}`,
  );
}

export async function marcarReservaAusente(
  reservaId: string,
): Promise<void> {
  await apiPost(`/reservas/${encodeURIComponent(reservaId)}/ausente`);
}

export async function cancelarReservaPorPedido(
  reservaId: string,
): Promise<void> {
  await apiPost(
    `/reservas/${encodeURIComponent(reservaId)}/cancelacion`,
    {},
  );
}

function fechaClave(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function obtenerFechaDesdeTurnoId(turnoId: string): string {
  const coincidencia =
    /^tur-(esp-[A-Za-z0-9_-]{1,36})-(\d{8})-(\d{2})$/.exec(turnoId);

  if (!coincidencia) {
    throw new Error("La API devolvió un identificador de turno inválido.");
  }

  const fecha = coincidencia[2];
  const hora = coincidencia[3];

  return `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}T${hora}:00:00-03:00`;
}

function adaptarReserva(reserva: ReservaApi, espacio?: Espacio): Reserva {
  let fechaHoraInicio: string;

  try {
    fechaHoraInicio = obtenerFechaDesdeTurnoId(reserva.turnoId);
  } catch {
    fechaHoraInicio = reserva.creadaEn;
  }

  return {
    id: reserva.id,
    usuarioId: reserva.usuarioId,
    espacioId: reserva.espacioId,
    espacioNombre: espacio?.nombre,
    complejo: espacio?.complejo,
    latitud: espacio?.latitud,
    longitud: espacio?.longitud,
    fechaHoraInicio,
    cantidadJugadores: reserva.cantidadPersonas,
    cancelableHasta: reserva.cancelableHasta,
    estado:
      reserva.estado === "confirmada"
        ? "activa"
        : reserva.estado === "cumplida"
          ? "completada"
          : reserva.estado,
    qrCode: reserva.codigoQr,
  };
}

async function obtenerEspaciosLocalesParaReservas(
  espacioIds: string[],
): Promise<Map<string, Espacio>> {
  const espaciosPorId = new Map<string, Espacio>();
  if (espacioIds.length === 0) return espaciosPorId;

  try {
    const espaciosLocales = await obtenerCatalogoEspaciosLocal();
    if (espaciosLocales?.length) {
      for (const espacio of espaciosLocales) {
        espaciosPorId.set(espacio.id, espacio);
      }
    }
  } catch (error) {
    console.warn("No se pudo leer el catálogo local para las reservas.", error);
  }

  for (const espacioId of new Set(espacioIds)) {
    if (espaciosPorId.has(espacioId)) continue;
    try {
      const espacioLocal = await obtenerEspacioLocal(espacioId);
      if (espacioLocal) espaciosPorId.set(espacioId, espacioLocal);
    } catch (error) {
      console.warn("No se pudo leer el espacio local de una reserva.", error);
    }
  }

  return espaciosPorId;
}

async function obtenerEspaciosParaReservas(
  espacioIds: string[],
): Promise<Map<string, Espacio>> {
  const espaciosPorId =
    await obtenerEspaciosLocalesParaReservas(espacioIds);
  if (espacioIds.every((espacioId) => espaciosPorId.has(espacioId))) {
    return espaciosPorId;
  }

  const respuesta = await getEspacios();
  if ("error" in respuesta && respuesta.error) {
    return espaciosPorId;
  }
  for (const espacio of respuesta.datos) {
    espaciosPorId.set(espacio.id, espacio);
  }
  return espaciosPorId;
}

export async function enriquecerReservasDesdeCacheLocal(
  reservas: Reserva[],
): Promise<Reserva[]> {
  const espaciosPorId = await obtenerEspaciosLocalesParaReservas(
    reservas
      .filter(
        (reserva) =>
          !reserva.espacioNombre ||
          reserva.latitud === undefined ||
          reserva.longitud === undefined,
      )
      .map((reserva) => reserva.espacioId),
  );
  return reservas.map((reserva) => {
    const espacio = espaciosPorId.get(reserva.espacioId);
    if (!espacio) return reserva;
    return {
      ...reserva,
      espacioNombre: reserva.espacioNombre ?? espacio.nombre,
      complejo: reserva.complejo ?? espacio.complejo,
      latitud: reserva.latitud ?? espacio.latitud,
      longitud: reserva.longitud ?? espacio.longitud,
    };
  });
}

export async function guardarReservasEnCache(
  reservasUsuario: Reserva[],
  usuarioId: string,
): Promise<void> {
  await guardarReservasLocales(reservasUsuario, usuarioId);
}

export async function obtenerReservasDesdeCache(
  usuarioId: string,
): Promise<Reserva[] | null> {
  return obtenerReservasLocales(usuarioId);
}

export async function limpiarCacheReservas(): Promise<void> {
  await limpiarReservasLocales();
  const claves = await Storage.getAllKeys();
  const clavesReservas = claves.filter(
    (clave) =>
      clave === RESERVAS_CACHE_KEY_ANTERIOR ||
      clave.startsWith(RESERVAS_CACHE_PREFIX),
  );

  if (clavesReservas.length > 0) {
    await Storage.multiRemove(clavesReservas);
  }
}

export async function getTurnos(
  espacioId: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<RespuestaApi<Turno>> {
  try {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (
      !Number.isFinite(inicio.getTime()) ||
      !Number.isFinite(fin.getTime()) ||
      inicio >= fin
    ) {
      return {
        error: {
          codigo: "FECHA_INVALIDA",
          mensaje: "El rango de fechas no es válido.",
        },
      };
    }

    const fechas: string[] = [];
    const actual = new Date(
      inicio.getFullYear(),
      inicio.getMonth(),
      inicio.getDate(),
    );

    const limite = new Date(
      fin.getFullYear(),
      fin.getMonth(),
      fin.getDate(),
    );

    while (actual < limite) {
      fechas.push(fechaClave(actual));
      actual.setDate(actual.getDate() + 1);
    }

    const respuestas = await Promise.all(
      fechas.map((fecha) =>
        apiGetAll<TurnoApi>(
          `/espacios/${encodeURIComponent(espacioId)}/turnos?fecha=${fecha}`,
        ),
      ),
    );

    const turnos: Turno[] = respuestas.flatMap((respuesta) =>
      respuesta.map((turno) => ({
        id: turno.id,
        espacioId: turno.espacioId,
        fechaHoraInicio: `${turno.fecha}T${turno.inicio}:00-03:00`,
        estado: turno.estado,
        precio: turno.precio,
        motivoBloqueo: turno.motivoBloqueo,
      })),
    );

    return {
      datos: turnos,
      meta: {
        total: turnos.length,
        pagina: 1,
        porPagina: turnos.length,
      },
    };
  } catch (error) {
    return respuestaErrorApi(
      error,
      "ERROR_TURNOS",
      "No se pudieron obtener los turnos.",
    );
  }
}

export async function getMisReservas(
  usuarioId: string,
): Promise<RespuestaApi<Reserva>> {
  const version = versionSesionAvisos;
  return encolarSincronizacion(() => obtenerMisReservas(usuarioId, version));
}

async function obtenerMisReservas(
  usuarioId: string,
  version: number,
): Promise<RespuestaApi<Reserva>> {
  try {
    const [proximas, pasadas] = await Promise.all([
      apiGetAll<ReservaApi>("/yo/reservas?cuando=proximas"),
      apiGetAll<ReservaApi>("/yo/reservas?cuando=pasadas"),
    ]);

    const reservasApi = [...proximas, ...pasadas];
    const espaciosPorId = await obtenerEspaciosParaReservas(
      reservasApi.map((reserva) => reserva.espacioId),
    );
    const reservasUsuario = reservasApi.map((reserva) =>
      adaptarReserva(reserva, espaciosPorId.get(reserva.espacioId)),
    );
    if (reservasUsuario.some((reserva) => reserva.usuarioId !== usuarioId)) {
      throw new Error("La API devolvió reservas de otro usuario.");
    }
    if (version === versionSesionAvisos) {
      try {
        await sincronizarAvisosSuspension(usuarioId, reservasUsuario, version);
      } catch (error) {
        console.warn("No se pudieron sincronizar los avisos de suspensión.", error);
      }
    }
    try {
      if (version === versionSesionAvisos) {
        await reconciliarRecordatoriosReservas(reservasUsuario);
      }
    } catch (error) {
      console.warn("No se pudieron reconciliar los recordatorios locales.", error);
    }
    return {
      datos: reservasUsuario,
      meta: {
        total: reservasUsuario.length,
        pagina: 1,
        porPagina: reservasUsuario.length,
      },
    };
  } catch (error) {
    return respuestaErrorApi(
      error,
      "ERROR_RESERVAS",
      "No se pudieron obtener tus reservas.",
    );
  }
}

export async function crearReserva(
  turnoId: string,
  cantidadJugadores: number,
): Promise<RespuestaApi<Reserva>> {
  try {
    const respuesta = await apiPost<RespuestaUnoApi<ReservaApi>>(
      "/reservas",
      {
        turnoId,
        cantidadPersonas: cantidadJugadores,
      },
    );

    return {
      datos: [adaptarReserva(respuesta.datos)],
      meta: {
        total: 1,
        pagina: 1,
        porPagina: 1,
      },
    };
  } catch (error) {
    return respuestaErrorApi(
      error,
      "ERROR_CREAR_RESERVA",
      "No se pudo crear la reserva.",
    );
  }
}

export async function validarAccesoPorQrEspacio(
  espacioId: string,
  usuarioId: string,
  ahora = Date.now(),
): Promise<RespuestaApi<Reserva>> {
  const espacioIdNormalizado = espacioId.trim();
  if (!/^esp-[A-Za-z0-9_-]{1,36}$/.test(espacioIdNormalizado)) {
    return errorRespuesta("El código no corresponde a un espacio válido.", "CODIGO_INVALIDO");
  }

  const respuesta = await getMisReservas(usuarioId);
  if ("error" in respuesta && respuesta.error) return respuesta;

  const reservasActivas = respuesta.datos.filter(
    (reserva) =>
      reserva.usuarioId === usuarioId &&
      (reserva.estado === "activa" || reserva.estado === "confirmada"),
  );
  const reservaValida = reservasActivas.find((reserva) => {
    if (reserva.espacioId !== espacioIdNormalizado) return false;
    const inicio = new Date(reserva.fechaHoraInicio).getTime();
    return (
      Number.isFinite(inicio) &&
      inicio - 30 * 60 * 1000 <= ahora &&
      ahora < inicio + 60 * 60 * 1000
    );
  });

  if (reservaValida) {
    return {
      datos: [reservaValida],
      meta: { total: 1, pagina: 1, porPagina: 1 },
    };
  }

  if (reservasActivas.some((reserva) => reserva.espacioId === espacioIdNormalizado)) {
    return errorRespuesta(
      "Tu reserva para esta cancha todavía no está dentro del horario de ingreso.",
      "FUERA_DE_HORARIO",
    );
  }

  if (reservasActivas.length > 0) {
    return errorRespuesta(
      "No tenés una reserva activa para esta cancha.",
      "CODIGO_DE_OTRO_ESPACIO",
    );
  }

  return errorRespuesta(
    "No encontramos una reserva activa para esta cancha.",
    "RESERVA_NO_ENCONTRADA",
  );
}

export async function cancelarReserva(
  reservaId: string,
): Promise<RespuestaApi<Reserva>> {
  try {
    const respuesta = await apiPost<RespuestaUnoApi<ReservaApi>>(
      `/reservas/${encodeURIComponent(reservaId)}/cancelacion`,
    );
    const reservaCancelada = adaptarReserva(respuesta.datos);
    try {
      await cancelarRecordatorioTurno(reservaId);
    } catch (error) {
      console.warn("No se pudo cancelar el recordatorio local.", error);
    }

    return {
      datos: [reservaCancelada],
      meta: {
        total: 1,
        pagina: 1,
        porPagina: 1,
      },
    };
  } catch (error) {
    return respuestaErrorApi(
      error,
      "ERROR_CANCELAR_RESERVA",
      "No se pudo cancelar la reserva.",
    );
  }
}