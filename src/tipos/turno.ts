export type EstadoTurno =
  | "libre"
  | "ocupado"
  | "reservado"
  | "mantenimiento"
  | "fijo";

export type Turno = {
  id: string;
  espacioId: string;
  fecha: string;
  hora: string;
  precio: number;
  estado: EstadoTurno;
  motivo?: string;
};

export type Mantenimiento = {
  id: string;
  espacioId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo: string;
  activo: boolean;
};
