import { espacios, reservas, turnos } from "@/mocks";
import { mantenimientosMock } from "@/mocks/turnos";
import { reservasFijasMock } from "@/mocks/reservas";
import type { EstadoReserva, RespuestaApi, Turno } from "@/tipos";
import type { Mantenimiento } from "@/tipos/turno";
import type { ReservaFija } from "@/tipos/reserva";

import { simularFetch } from "./api";

export type EstadoAsistencia = "presente" | "ausente";

export type ResultadoValidacionQr = {
  valido: boolean;
  reservaId: string | null;
  espacioId: string | null;
  mensaje: string;
};

function claveFechaActual(): string {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, "0");
  const day = String(ahora.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function claveFecha(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function estadoReservaDesdeAsistencia(estado: EstadoAsistencia): EstadoReserva {
  return estado === "presente" ? "completada" : "ausente";
}

export async function validarQrIngreso(
  qrCode: string,
  espacioEsperadoId?: string,
): Promise<RespuestaApi<ResultadoValidacionQr>> {
  const reserva = reservas.find((item) => item.qrCode === qrCode);

  if (!reserva) {
    return simularFetch([], {
      codigo: "QR_NO_ENCONTRADO",
      mensaje: "ACCESO DENEGADO - QR NO ENCONTRADO",
    });
  }

  if (reserva.estado !== "activa") {
    return simularFetch([], {
      codigo: "RESERVA_NO_ACTIVA",
      mensaje: "ACCESO DENEGADO - RESERVA NO ACTIVA",
    });
  }

  if (claveFecha(reserva.fechaHoraInicio) !== claveFechaActual()) {
    return simularFetch([], {
      codigo: "DIA_INCORRECTO",
      mensaje: "ACCESO DENEGADO - DÍA INCORRECTO",
    });
  }

  if (espacioEsperadoId && reserva.espacioId !== espacioEsperadoId) {
    return simularFetch([], {
      codigo: "CANCHA_INCORRECTA",
      mensaje: "ACCESO DENEGADO - CANCHA INCORRECTA",
    });
  }

  if (new Date(reserva.fechaHoraInicio).getTime() < Date.now()) {
    return simularFetch([], {
      codigo: "TURNO_PASADO",
      mensaje: "ACCESO DENEGADO - TURNO PASADO",
    });
  }

  return simularFetch([
    {
      valido: true,
      reservaId: reserva.id,
      espacioId: reserva.espacioId,
      mensaje: "ACCESO PERMITIDO",
    },
  ]);
}

export async function marcarAsistencia(
  reservaId: string,
  estado: EstadoAsistencia,
): Promise<RespuestaApi<(typeof reservas)[number]>> {
  const reserva = reservas.find((item) => item.id === reservaId);

  if (!reserva) {
    return simularFetch([], {
      codigo: "RESERVA_NO_ENCONTRADA",
      mensaje: "No se encontró la reserva.",
    });
  }

  reserva.estado = estadoReservaDesdeAsistencia(estado);
  return simularFetch([reserva]);
}

export async function bloquearTurno(
  espacioId: string,
  fechaHora: string,
  motivo: string,
): Promise<RespuestaApi<Turno>> {
  const turnoExistente = turnos.find(
    (item) =>
      item.espacioId === espacioId &&
      new Date(item.fechaHoraInicio).getTime() ===
        new Date(fechaHora).getTime(),
  );

  if (turnoExistente) {
    turnoExistente.estado = "mantenimiento";
  } else {
    turnos.push({
      id: `turno-bloqueado-${Date.now()}`,
      espacioId,
      fechaHoraInicio: fechaHora,
      estado: "mantenimiento",
      precio: 0,
    });
  }

  return simularFetch(
    turnoExistente ? [turnoExistente] : [turnos[turnos.length - 1]],
    undefined,
    500,
  );
}

export async function actualizarPrecio(
  espacioId: string,
  nuevoPrecio: number,
): Promise<RespuestaApi<(typeof espacios)[number]>> {
  if (!Number.isFinite(nuevoPrecio) || nuevoPrecio < 0) {
    return simularFetch([], {
      codigo: "PRECIO_INVALIDO",
      mensaje: "El precio debe ser un número mayor o igual a cero.",
    });
  }

  const espacio = espacios.find((item) => item.id === espacioId);
  if (!espacio) {
    return simularFetch([], {
      codigo: "ESPACIO_NO_ENCONTRADO",
      mensaje: "No se encontró el espacio.",
    });
  }

  espacio.precioPorHora = nuevoPrecio;
  turnos
    .filter(
      (turno) => turno.espacioId === espacioId && turno.estado === "libre",
    )
    .forEach((turno) => {
      turno.precio = nuevoPrecio;
    });

  return simularFetch([espacio]);
}

export type ResultadoOperacionAdmin =
  | { ok: true; mensaje: string }
  | { ok: false; mensaje: string };

export type MantenimientoInput = Omit<Mantenimiento, "id">;
export type ReservaFijaInput = Omit<ReservaFija, "id">;

function minutos(hora: string): number {
  const [horas, minutosHora] = hora.split(":").map(Number);
  return horas * 60 + minutosHora;
}

function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [year, month, day] = fecha.split("-").map(Number);
  const fechaParseada = new Date(year, month - 1, day);
  return fechaParseada.getFullYear() === year && fechaParseada.getMonth() === month - 1 && fechaParseada.getDate() === day;
}

function validarFranja(fecha: string, horaInicio: string, horaFin: string): string | null {
  if (!fechaValida(fecha)) return "Ingresá una fecha válida con formato AAAA-MM-DD.";
  if (!/^\d{2}:\d{2}$/.test(horaInicio) || !/^\d{2}:\d{2}$/.test(horaFin)) return "Las horas deben tener formato HH:MM.";
  if (minutos(horaInicio) < 0 || minutos(horaFin) > 24 * 60 || minutos(horaInicio) >= minutos(horaFin)) return "La hora de inicio debe ser menor que la hora de fin.";
  return null;
}

function espacioExiste(espacioId: string): boolean {
  return espacios.some((espacio) => espacio.id === espacioId);
}

export async function crearMantenimiento(input: MantenimientoInput): Promise<ResultadoOperacionAdmin> {
  const errorFranja = validarFranja(input.fecha, input.horaInicio, input.horaFin);
  if (errorFranja) return { ok: false, mensaje: errorFranja };
  if (!espacioExiste(input.espacioId)) return { ok: false, mensaje: "Seleccioná un espacio válido." };
  if (!input.motivo.trim()) return { ok: false, mensaje: "Ingresá el motivo del mantenimiento." };
  if (mantenimientosMock.some((item) => item.espacioId === input.espacioId && item.fecha === input.fecha && item.activo && minutos(item.horaInicio) < minutos(input.horaFin) && minutos(input.horaInicio) < minutos(item.horaFin))) return { ok: false, mensaje: "Ya existe un mantenimiento solapado en ese horario." };
  mantenimientosMock.push({ ...input, motivo: input.motivo.trim(), id: `mant_${Date.now()}` });
  return { ok: true, mensaje: "Mantenimiento creado correctamente." };
}

export async function actualizarMantenimiento(id: string, input: MantenimientoInput): Promise<ResultadoOperacionAdmin> {
  const errorFranja = validarFranja(input.fecha, input.horaInicio, input.horaFin);
  if (errorFranja) return { ok: false, mensaje: errorFranja };
  if (!espacioExiste(input.espacioId)) return { ok: false, mensaje: "Seleccioná un espacio válido." };
  if (!input.motivo.trim()) return { ok: false, mensaje: "Ingresá el motivo del mantenimiento." };
  const mantenimiento = mantenimientosMock.find((item) => item.id === id);
  if (!mantenimiento) return { ok: false, mensaje: "No se encontró el mantenimiento." };
  if (mantenimientosMock.some((item) => item.id !== id && item.espacioId === input.espacioId && item.fecha === input.fecha && item.activo && minutos(item.horaInicio) < minutos(input.horaFin) && minutos(input.horaInicio) < minutos(item.horaFin))) return { ok: false, mensaje: "Ya existe un mantenimiento solapado en ese horario." };
  Object.assign(mantenimiento, { ...input, motivo: input.motivo.trim() });
  return { ok: true, mensaje: "Mantenimiento actualizado correctamente." };
}

export async function eliminarMantenimiento(id: string): Promise<ResultadoOperacionAdmin> {
  const indice = mantenimientosMock.findIndex((item) => item.id === id);
  if (indice < 0) return { ok: false, mensaje: "No se encontró el mantenimiento." };
  mantenimientosMock.splice(indice, 1);
  return { ok: true, mensaje: "Mantenimiento eliminado." };
}

function validarReservaFija(input: ReservaFijaInput): string | null {
  if (!espacioExiste(input.espacioId)) return "Seleccioná un espacio válido.";
  if (!Number.isInteger(input.diaSemana) || input.diaSemana < 0 || input.diaSemana > 6) return "Seleccioná un día de la semana válido.";
  if (!fechaValida(input.desde) || !fechaValida(input.hasta) || input.desde > input.hasta) return "El rango de fechas no es válido.";
  if (!/^\d{2}:\d{2}$/.test(input.horaInicio) || !/^\d{2}:\d{2}$/.test(input.horaFin) || minutos(input.horaInicio) >= minutos(input.horaFin)) return "La franja horaria no es válida.";
  if (!input.usuarioId.trim()) return "Ingresá el identificador del jugador.";
  return null;
}

export async function crearReservaFija(input: ReservaFijaInput): Promise<ResultadoOperacionAdmin> {
  const error = validarReservaFija(input);
  if (error) return { ok: false, mensaje: error };
  if (reservasFijasMock.some((item) => item.activa && input.activa && item.espacioId === input.espacioId && item.diaSemana === input.diaSemana && item.desde <= input.hasta && input.desde <= item.hasta && minutos(item.horaInicio) < minutos(input.horaFin) && minutos(input.horaInicio) < minutos(item.horaFin))) return { ok: false, mensaje: "Ya existe una reserva fija solapada para ese espacio y horario." };
  reservasFijasMock.push({ ...input, id: `reserva_fija_${Date.now()}` });
  return { ok: true, mensaje: "Reserva fija creada correctamente." };
}

export async function actualizarReservaFija(id: string, input: ReservaFijaInput): Promise<ResultadoOperacionAdmin> {
  const error = validarReservaFija(input);
  if (error) return { ok: false, mensaje: error };
  const reservaFija = reservasFijasMock.find((item) => item.id === id);
  if (!reservaFija) return { ok: false, mensaje: "No se encontró la reserva fija." };
  if (reservasFijasMock.some((item) => item.id !== id && item.activa && input.activa && item.espacioId === input.espacioId && item.diaSemana === input.diaSemana && item.desde <= input.hasta && input.desde <= item.hasta && minutos(item.horaInicio) < minutos(input.horaFin) && minutos(input.horaInicio) < minutos(item.horaFin))) return { ok: false, mensaje: "Ya existe una reserva fija solapada para ese espacio y horario." };
  Object.assign(reservaFija, input);
  return { ok: true, mensaje: "Reserva fija actualizada correctamente." };
}

export async function eliminarReservaFija(id: string): Promise<ResultadoOperacionAdmin> {
  const indice = reservasFijasMock.findIndex((item) => item.id === id);
  if (indice < 0) return { ok: false, mensaje: "No se encontró la reserva fija." };
  reservasFijasMock.splice(indice, 1);
  return { ok: true, mensaje: "Reserva fija eliminada." };
}
