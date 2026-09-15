import { espaciosMock } from "@/mocks/espacios";
import type { Espacio } from "@/tipos/espacio";

export async function obtenerEspacios(): Promise<Espacio[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return espaciosMock;
}

export async function obtenerEspacio(id: string): Promise<Espacio | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return espaciosMock.find((espacio) => espacio.id === id);
}

export async function obtenerEspaciosPorDeporte(
  deporte: string,
): Promise<Espacio[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return espaciosMock.filter((espacio) => espacio.deporte === deporte);
}
