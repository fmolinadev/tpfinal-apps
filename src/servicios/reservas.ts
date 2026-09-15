import { reservasFijasMock, reservasMock } from "@/mocks/reservas";
import type { Reserva, ReservaFija } from "@/tipos/reserva";

export async function obtenerMisReservas(
  usuarioId: string,
): Promise<Reserva[]> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return reservasMock.filter((reserva) => reserva.usuarioId === usuarioId);
}

export async function obtenerReservasFijas(
  espacioId?: string,
): Promise<ReservaFija[]> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (!espacioId) {
    return reservasFijasMock;
  }

  return reservasFijasMock.filter((reserva) => reserva.espacioId === espacioId);
}

export async function crearReserva(
  payload: Partial<Reserva>,
): Promise<Reserva> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const reserva: Reserva = {
    id: `reserva_${Date.now()}`,
    espacioId: payload.espacioId ?? "espacio_1",
    usuarioId: payload.usuarioId ?? "user_jugador_1",
    fecha: payload.fecha ?? "2026-09-20",
    horaInicio: payload.horaInicio ?? "10:00",
    horaFin: payload.horaFin ?? "11:00",
    estado: payload.estado ?? "confirmada",
    precio: payload.precio ?? 12000,
    cantidadPersonas: payload.cantidadPersonas ?? 2,
    qrCode: payload.qrCode ?? `qr_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  reservasMock.push(reserva);
  return reserva;
}

export async function cancelarReserva(id: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const reserva = reservasMock.find((item) => item.id === id);

  if (!reserva) {
    return false;
  }

  reserva.estado = "cancelada";
  return true;
}
