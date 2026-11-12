export type Coordenadas = {
  lat: number;
  lng: number;
};

export type TipoDeporte =
  | "futbol"
  | "futbol11"
  | "tenis"
  | "paddle"
  | "padel"
  | "basket"
  | "voley"
  | "gimnasio";

export type TipoSuperficie =
  | "cesped"
  | "sintetico"
  | "cemento"
  | "parquet"
  | "arena"
  | "polvo-ladrillo"
  | "piso-flotante"
  | "cesped-natural"
  | "cemento-alisado";

export type Espacio = {
  id: string;
  nombre: string;
  deporte: TipoDeporte;
  superficie: TipoSuperficie;
  iluminacion: boolean;
  complejo: string;
  capacidad: number;
  descripcion: string;
  precioHora: number;
  foto: string;
  videoUrl: string | null;
  ubicacion: string;
  coordenadas: Coordenadas;
  caracteristicas: string[];
  activo: boolean;
};