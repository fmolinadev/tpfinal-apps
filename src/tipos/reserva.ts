export type EstadoReserva =
  | "confirmada"
  | "cancelada"
  | "cumplida"
  | "ausente";

export interface Reserva {
  id: string;
  turnoId: string;
  espacioId: string;
  usuarioId: string;
  cantidadPersonas: number;
  codigoQr: string;
  estado: EstadoReserva;
  ingresoEn: string | null;
  creadaEn: string;
  cancelableHasta: string;
}

export interface ReservaFija {
  id: string;
  espacioId: string;
  titular: string;
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa: boolean;
}

export interface DatosReservaFija {
  titular: string;
  dia: number;
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa?: boolean;
}
