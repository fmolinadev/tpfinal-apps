import type {
  EstadoTurno,
  Reserva,
  RespuestaApi,
  Turno,
} from "@/tipos";
import Storage from "expo-sqlite/kv-store";
import { apiGet, apiPost } from "./api";

const RESERVAS_CACHE_KEY = "reservas-cache-v1";

type RespuestaListaApi<T> = {
  datos: T[];
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
  };
};

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

function errorRespuesta(
  mensaje: string,
  codigo = "ERROR_API",
): RespuestaApi<Reserva> {
  return {
    error: { codigo, mensaje },
  };
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
): Promise<void> {
  await Storage.setItem(
    RESERVAS_CACHE_KEY,
    JSON.stringify(reservasUsuario),
  );
}

export async function obtenerReservasDesdeCache(): Promise<Reserva[] | null> {
  const reservasGuardadas = await Storage.getItem(RESERVAS_CACHE_KEY);

  if (!reservasGuardadas) {
    return null;
  }

  try {
    const reservasParseadas: unknown = JSON.parse(reservasGuardadas);

    return Array.isArray(reservasParseadas)
      ? (reservasParseadas as Reserva[])
      : null;
  } catch {
    return null;
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
        apiGet<RespuestaListaApi<TurnoApi>>(
          `/espacios/${encodeURIComponent(espacioId)}/turnos?fecha=${fecha}`,
        ),
      ),
    );

    const turnos: Turno[] = respuestas.flatMap((respuesta) =>
      respuesta.datos.map((turno) => ({
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
    return {
      error: {
        codigo: "ERROR_TURNOS",
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudieron obtener los turnos.",
      },
    };
  }
}

export async function getMisReservas(
  _usuarioId: string,
): Promise<RespuestaApi<Reserva>> {
  try {
    const [proximas, pasadas] = await Promise.all([
      apiGet<RespuestaListaApi<ReservaApi>>(
        "/yo/reservas?cuando=proximas",
      ),
      apiGet<RespuestaListaApi<ReservaApi>>(
        "/yo/reservas?cuando=pasadas",
      ),
    ]);

    const reservasUsuario = [
      ...proximas.datos,
      ...pasadas.datos,
    ].map(adaptarReserva);

    return {
      datos: reservasUsuario,
      meta: {
        total: reservasUsuario.length,
        pagina: 1,
        porPagina: reservasUsuario.length,
      },
    };
  } catch (error) {
    return {
      error: {
        codigo: "ERROR_RESERVAS",
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudieron obtener tus reservas.",
      },
    };
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
    return {
      error: {
        codigo: "ERROR_CREAR_RESERVA",
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudo crear la reserva.",
      },
    };
  }
}

export async function validarAccesoPorQrEspacio(
  _espacioId: string,
  _usuarioId: string,
  _ahora = Date.now(),
): Promise<RespuestaApi<Reserva>> {
  return errorRespuesta(
    "La validación del QR de espacios para jugadores no está disponible en la API.",
    "FUNCIONALIDAD_NO_DISPONIBLE",
  );
}

export async function cancelarReserva(
  reservaId: string,
): Promise<RespuestaApi<Reserva>> {
  try {
    const respuesta = await apiPost<RespuestaUnoApi<ReservaApi>>(
      `/reservas/${encodeURIComponent(reservaId)}/cancelacion`,
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
    return {
      error: {
        codigo: "ERROR_CANCELAR_RESERVA",
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudo cancelar la reserva.",
      },
    };
  }
}