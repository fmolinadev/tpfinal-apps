import { Linking } from "react-native";

type Coordenadas = {
  latitud: number;
  longitud: number;
};

export function tieneCoordenadasValidas(
  ubicacion: Coordenadas,
): boolean {
  return (
    Number.isFinite(ubicacion.latitud) &&
    Number.isFinite(ubicacion.longitud) &&
    Math.abs(ubicacion.latitud) <= 90 &&
    Math.abs(ubicacion.longitud) <= 180
  );
}

export async function abrirIndicaciones(
  ubicacion: Coordenadas,
): Promise<void> {
  if (!tieneCoordenadasValidas(ubicacion)) {
    throw new Error("Este espacio no tiene una ubicación válida.");
  }

  const destino = encodeURIComponent(
    `${ubicacion.latitud},${ubicacion.longitud}`,
  );
  await Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${destino}`,
  );
}
