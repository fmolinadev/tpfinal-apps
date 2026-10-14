export type FechaISO = string;

export type Deporte = "futbol" | "padel" | "tenis" | "basket";
export type Superficie = "cesped" | "sintetico" | "madera" | "cemento";
export type EstadoTurno = "libre" | "ocupado" | "mantenimiento" | "fijo";
export type EstadoReserva = "activa" | "cancelada" | "completada" | "ausente";

export interface Espacio {
  id: string;
  nombre: string;
  deporte: Deporte;
  superficie: Superficie;
  luzNocturna: boolean;
  precioPorHora: number;
  reglas: string[];
  fotosUrl: string[];
  videoUrl: string | null;
  latitud: number;
  longitud: number;
}

export interface Turno {
  id: string;
  espacioId: string;
  fechaHoraInicio: FechaISO;
  estado: EstadoTurno;
  precio: number;
}

export interface Reserva {
  id: string;
  usuarioId: string;
  espacioId: string;
  fechaHoraInicio: FechaISO;
  cantidadJugadores: number;
  estado: EstadoReserva;
  qrCode: string;
}

export interface MetaPaginacion {
  total: number;
  pagina: number;
  porPagina: number;
}

export type RespuestaApi<T> =
  | {
      datos: T[];
      meta: MetaPaginacion;
      error?: never;
    }
  | {
      error: {
        codigo: string;
        mensaje: string;
      };
      datos?: never;
      meta?: never;
    };
