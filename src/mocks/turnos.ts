import type { Mantenimiento, Turno } from "@/tipos/turno";

export const turnosMock: Turno[] = [
  {
    id: "turno_1",
    espacioId: "espacio_1",
    fecha: "2026-09-15",
    hora: "09:00",
    precio: 12000,
    estado: "ocupado",
    motivo: "Reserva existente",
  },
  {
    id: "turno_2",
    espacioId: "espacio_1",
    fecha: "2026-09-15",
    hora: "10:00",
    precio: 12000,
    estado: "libre",
  },
];

export const mantenimientosMock: Mantenimiento[] = [
  {
    id: "mant_1",
    espacioId: "espacio_1",
    fecha: "2026-09-15",
    horaInicio: "18:00",
    horaFin: "20:00",
    motivo: "Mantenimiento programado",
    activo: true,
  },
];
