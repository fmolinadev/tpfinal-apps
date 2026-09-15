export type EstadoReserva =
  | "confirmada"
  | "cancelada"
  | "ocupada"
  | "ausente"
  | "pendiente";

export type Reserva = {
  id: string;
  espacioId: string;
  usuarioId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoReserva;
  precio: number;
  cantidadPersonas: number;
  qrCode?: string;
  createdAt: string;
};

export type ReservaFija = {
  id: string;
  espacioId: string;
  usuarioId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activa: boolean;
  desde: string;
  hasta: string;
  motivo?: string;
};
