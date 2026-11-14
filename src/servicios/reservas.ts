import type {
  EstadoTurno,
  Reserva,
  RespuestaApi,
  Turno,
} from "@/tipos";
import Storage from "expo-sqlite/kv-store";
import {
  guardarReservasLocales,
  limpiarReservasLocales,
  obtenerReservasLocales,
} from "@/persistencia/base-local";
import {
  ApiError,
  apiGetAll,
  apiPost,
} from "./api";
import {
  cancelarRecordatorioTurno,
  reconciliarRecordatoriosReservas,
} from "./notificaciones";

const RESERVAS_CACHE_PREFIX = "reservas-cache-v1:";
const RESERVAS_CACHE_KEY_ANTERIOR = "reservas-cache-v1";

type RespuestaUnoApi<T> = {
  datos: T;
  meta: null;
};

type TurnoApi = {
  id: string;
  espacioId: string;
  fecha: string;
  inicio: string;
  fin: string;
  estado: EstadoTurno;
  reservaId: string | null;
  motivoBloqueo: string | null;
  precio: number;
};

type ReservaApi = {
  id: string;
  turnoId: string;
  espacioId: string;
  usuarioId: string;
  cantidadPersonas: number;
  codigoQr: string;
  estado: "confirmada" | "cancelada" | "cumplida" | "ausente";
  ingresoEn: string | null;
  creadaEn: string;
  cancelableHasta: string;
};

export type ReservaAsistencia = {
  id: string;
  turnoId: string;
  espacioId: string;
  usuarioId: string;
  cantidadPersonas: number;
  estado: string;
  ingresoEn: string | null;
};

function errorRespuesta(
  mensaje: string,
  codigo = "ERROR_API",
): RespuestaApi<Reserva> {
  return {
    error: { codigo, mensaje },
  };
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
  return apiGetAll<ReservaAsistencia>(
    `/reservas?fecha=${encodeURIComponent(fecha)}`,
  );
}

export async function marcarReservaAusente(
  reservaId: string,
): Promise<void> {
  await apiPost(`/reservas/${encodeURIComponent(reservaId)}/ausente`);
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

function obtenerIdTurno(
  espacioId: string,
  fechaHora: string,
): string {
  const fecha = new Date(fechaHora);

  if (!Number.isFinite(fecha.getTime())) {
    throw new Error("La fecha del turno no es válida.");
  }

  const fechaCompacta = fechaClave(fecha).replaceAll("-", "");
  const hora = String(fecha.getHours()).padStart(2, "0");

  return `tur-${espacioId}-${fechaCompacta}-${hora}`;
}

function adaptarReserva(reserva: ReservaApi): Reserva {
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
    fechaHoraInicio,
    cantidadJugadores: reserva.cantidadPersonas,
    estado:
      reserva.estado === "confirmada"
        ? "activa"
        : reserva.estado === "cumplida"
          ? "completada"
          : reserva.estado,
    qrCode: reserva.codigoQr,
  };
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
  _usuarioId: string,
): Promise<RespuestaApi<Reserva>> {
  try {
    const [proximas, pasadas] = await Promise.all([
      apiGetAll<ReservaApi>("/yo/reservas?cuando=proximas"),
      apiGetAll<ReservaApi>("/yo/reservas?cuando=pasadas"),
    ]);

    const reservasUsuario = [...proximas, ...pasadas].map(adaptarReserva);
    try {
      await reconciliarRecordatoriosReservas(reservasUsuario);
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