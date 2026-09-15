import type { Reserva, ReservaFija } from "@/tipos/reserva";

export const reservasMock: Reserva[] = [
  {
    id: "reserva_1",
    espacioId: "espacio_1",
    usuarioId: "user_jugador_1",
    fecha: "2026-09-15",
    horaInicio: "09:00",
    horaFin: "10:00",
    estado: "confirmada",
    precio: 12000,
    cantidadPersonas: 6,
    qrCode: "qr_reserva_1",
    createdAt: "2026-09-12T14:00:00.000Z",
  },
  {
    id: "reserva_2",
    espacioId: "espacio_2",
    usuarioId: "user_jugador_1",
    fecha: "2026-09-16",
    horaInicio: "18:00",
    horaFin: "19:00",
    estado: "confirmada",
    precio: 9500,
    cantidadPersonas: 4,
    qrCode: "qr_reserva_2",
    createdAt: "2026-09-13T09:30:00.000Z",
  },
  {
    id: "reserva_3",
    espacioId: "espacio_3",
    usuarioId: "user_jugador_1",
    fecha: "2026-09-18",
    horaInicio: "20:00",
    horaFin: "21:00",
    estado: "cancelada",
    precio: 7000,
    cantidadPersonas: 2,
    qrCode: "qr_reserva_3",
    createdAt: "2026-09-10T12:00:00.000Z",
  },
];

export const reservasFijasMock: ReservaFija[] = [
  {
    id: "reserva_fija_1",
    espacioId: "espacio_1",
    usuarioId: "user_jugador_1",
    diaSemana: 2,
    horaInicio: "18:00",
    horaFin: "19:00",
    activa: true,
    desde: "2026-09-01",
    hasta: "2026-12-31",
    motivo: "Reserva semanal habitual",
  },
];
