import type { EstadoReserva } from "./reserva";

export type EstadoTurno =
  | "libre"
  | "reservado"
  | "fijo"
  | "mantenimiento";

export interface TitularTurno {
  usuarioId: string | null;
  nombre: string;
  telefono: string | null;
  cantidadPersonas: number | null;
}

export interface Turno {
  id: string;
  espacioId: string;
  fecha: string;
  inicio: string;
  fin: string;
  estado: EstadoTurno;
  reservaId: string | null;
  motivoBloqueo: string | null;
  precio: number;
  espacioNombre?: string;
  titular?: TitularTurno | null;
  reservaEstado?: EstadoReserva | null;
  ingresoEn?: string | null;
}

export type TurnoAgenda = Turno;
