export type FechaISO = string;

export type Deporte =
  | "futbol"
  | "futbol11"
  | "padel"
  | "tenis"
  | "basket"
  | "voley"
  | "gimnasio";

export type Superficie =
  | "cesped"
  | "sintetico"
  | "madera"
  | "cemento"
  | "arena"
  | "parquet"
  | "polvo-ladrillo"
  | "piso-flotante"
  | "cesped-natural"
  | "cemento-alisado";

export type EstadoTurno =
  | "libre"
  | "ocupado"
  | "reservado"
  | "mantenimiento"
  | "fijo";

export type EstadoReserva =
  | "activa"
  | "confirmada"
  | "cancelada"
  | "completada"
  | "cumplida"
  | "ausente";

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

  // Datos adicionales que proporciona la API
  complejo?: string;
  techado?: boolean;
  capacidad?: number;
}

export interface Turno {
  id: string;
  espacioId: string;
  fechaHoraInicio: FechaISO;
  estado: EstadoTurno;
  precio: number;
  motivoBloqueo?: string | null;
}

export interface Reserva {
  id: string;
  usuarioId: string;
  espacioId: string;
  espacioNombre?: string;
  complejo?: string;
  latitud?: number;
  longitud?: number;
  fechaHoraInicio: FechaISO;
  cancelableHasta?: FechaISO;
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