import type { Reserva, ReservaFija } from "@/tipos/reserva";
import type { Mantenimiento, Turno } from "@/tipos/turno";

function toMinutes(hora: string): number {
  const [hours, minutes] = hora.split(":").map(Number);
  return hours * 60 + minutes;
}

function horariosSolapan(
  inicioA: string,
  finA: string,
  inicioB: string,
  finB: string,
): boolean {
  return (
    toMinutes(inicioA) < toMinutes(finB) && toMinutes(inicioB) < toMinutes(finA)
  );
}

function esTurnoPasado(fecha: string, hora: string): boolean {
  const fechaHora = new Date(`${fecha}T${hora}:00`);
  return fechaHora.getTime() < Date.now();
}

export function calcularEstadoTurno({
  turno,
  reservas,
  reservasFijas,
  mantenimientos,
}: {
  turno: Pick<Turno, "id" | "espacioId" | "fecha" | "hora" | "precio">;
  reservas: Reserva[];
  reservasFijas: ReservaFija[];
  mantenimientos: Mantenimiento[];
}): Turno["estado"] {
  if (esTurnoPasado(turno.fecha, turno.hora)) {
    return "ocupado";
  }

  const mantenimientoActivo = mantenimientos.some(
    (mantenimiento) =>
      mantenimiento.espacioId === turno.espacioId &&
      mantenimiento.activo &&
      mantenimiento.fecha === turno.fecha &&
      horariosSolapan(
        mantenimiento.horaInicio,
        mantenimiento.horaFin,
        turno.hora,
        `${turno.hora.split(":")[0]}:59`,
      ),
  );

  if (mantenimientoActivo) {
    return "mantenimiento";
  }

  const reservaFijaActiva = reservasFijas.some(
    (reservaFija) =>
      reservaFija.espacioId === turno.espacioId &&
      reservaFija.activa &&
      new Date(turno.fecha).getDay() === reservaFija.diaSemana &&
      horariosSolapan(
        reservaFija.horaInicio,
        reservaFija.horaFin,
        turno.hora,
        `${turno.hora.split(":")[0]}:59`,
      ),
  );

  if (reservaFijaActiva) {
    return "fijo";
  }

  const reservaExistente = reservas.some(
    (reserva) =>
      reserva.espacioId === turno.espacioId &&
      reserva.estado !== "cancelada" &&
      reserva.fecha === turno.fecha &&
      horariosSolapan(
        reserva.horaInicio,
        reserva.horaFin,
        turno.hora,
        `${turno.hora.split(":")[0]}:59`,
      ),
  );

  if (reservaExistente) {
    return "ocupado";
  }

  return "libre";
}

export function generarTurnosBase(espacioId: string, fecha: string): Turno[] {
  const turnoHoraInicio = 8;
  const turnoHoraFin = 24;
  const turnos: Turno[] = [];

  for (let hora = turnoHoraInicio; hora < turnoHoraFin; hora += 1) {
    const horaInicio = `${String(hora).padStart(2, "0")}:00`;
    const horaFin = `${String(hora + 1).padStart(2, "0")}:00`;

    turnos.push({
      id: `${espacioId}_${fecha}_${horaInicio}`,
      espacioId,
      fecha,
      hora: horaInicio,
      precio: 12000,
      estado: "libre",
      motivo: `Turno ${horaInicio} - ${horaFin}`,
    });
  }

  return turnos;
}

export function calcularTurnosDisponibles({
  espacioId,
  fecha,
  reservas,
  reservasFijas,
  mantenimientos,
}: {
  espacioId: string;
  fecha: string;
  reservas: Reserva[];
  reservasFijas: ReservaFija[];
  mantenimientos: Mantenimiento[];
}): Turno[] {
  return generarTurnosBase(espacioId, fecha).map((turno) => ({
    ...turno,
    estado: calcularEstadoTurno({
      turno,
      reservas,
      reservasFijas,
      mantenimientos,
    }),
  }));
}
