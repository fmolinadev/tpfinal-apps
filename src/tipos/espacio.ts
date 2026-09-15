export type Coordenadas = {
  lat: number;
  lng: number;
};

export type TipoDeporte = "futbol" | "tenis" | "paddle" | "basket" | "voley";
export type TipoSuperficie = "cesped" | "sintetico" | "cemento" | "parquet";

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
