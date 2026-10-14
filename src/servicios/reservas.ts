import { reservas, turnos } from "@/mocks";
import type { Reserva, RespuestaApi, Turno } from "@/tipos";
import Storage from "expo-sqlite/kv-store";

import { simularFetch } from "./api";

const usuarioDemoId = "usuario-100";
const RESERVAS_CACHE_KEY = "reservas-cache-v1";

export async function guardarReservasEnCache(
  reservasUsuario: Reserva[],
): Promise<void> {
  await Storage.setItem(RESERVAS_CACHE_KEY, JSON.stringify(reservasUsuario));
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
  const fechaInicioMs = new Date(fechaInicio).getTime();
  const fechaFinMs = new Date(fechaFin).getTime();

  const grilla = turnos.filter((turno) => {
    if (turno.espacioId !== espacioId) {
      return false;
    }

    const fechaTurnoMs = new Date(turno.fechaHoraInicio).getTime();
    return fechaTurnoMs >= fechaInicioMs && fechaTurnoMs <= fechaFinMs;
  });

  return simularFetch(grilla, undefined, 500);
}

export async function getMisReservas(
  usuarioId: string,
): Promise<RespuestaApi<Reserva>> {
  const misReservas = reservas.filter(
    (reserva) => reserva.usuarioId === usuarioId,
  );

  return simularFetch(misReservas, undefined, 500);
}

export async function crearReserva(
  espacioId: string,
  fechaHora: string,
  cantidadJugadores: number,
): Promise<RespuestaApi<Reserva>> {
  const fechaHoraMs = new Date(fechaHora).getTime();
  if (!Number.isFinite(fechaHoraMs) || fechaHoraMs <= Date.now()) {
    return simularFetch([], {
      codigo: "TURNO_NO_DISPONIBLE",
      mensaje: "No se puede reservar un turno que ya pasó.",
    });
  }

  const reservasActivas = reservas.filter(
    (reserva) =>
      reserva.usuarioId === usuarioDemoId && reserva.estado === "activa",
  );

  if (reservasActivas.length >= 3) {
    return simularFetch([], {
      codigo: "MAXIMO_RESERVAS_ACTIVAS",
      mensaje: "Ya alcanzaste el máximo de 3 reservas activas.",
    });
  }

  const nuevaReserva: Reserva = {
    id: `reserva-${Date.now()}`,
    usuarioId: usuarioDemoId,
    espacioId,
    fechaHoraInicio: fechaHora,
    cantidadJugadores,
    estado: "activa",
    qrCode: `qr-${Date.now()}`,
  };

  reservas.push(nuevaReserva);

  return simularFetch([nuevaReserva], undefined, 500);
}

export async function cancelarReserva(
  reservaId: string,
): Promise<RespuestaApi<Reserva>> {
  const reserva = reservas.find((item) => item.id === reservaId);

  if (!reserva) {
    return simularFetch([], {
      codigo: "RESERVA_NO_ENCONTRADA",
      mensaje: "La reserva no existe o ya fue eliminada.",
    });
  }

  if (new Date(reserva.fechaHoraInicio).getTime() <= Date.now()) {
    return simularFetch([], {
      codigo: "RESERVA_YA_PASADA",
      mensaje: "No se puede cancelar una reserva cuyo turno ya pasó.",
    });
  }

  reserva.estado = "cancelada";

  return simularFetch([reserva], undefined, 500);
}
