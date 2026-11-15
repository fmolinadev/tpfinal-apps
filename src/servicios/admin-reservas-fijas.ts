import {
  apiDelete,
  apiGetAll,
  apiPatch,
  apiPost,
} from "@/servicios/api";
import type {
  DatosReservaFija,
  ReservaFija,
} from "@/tipos/reserva";

export type { ReservaFija } from "@/tipos/reserva";

export type EspacioReservaFija = {
  id: string;
  nombre: string;
};

export type { DatosReservaFija } from "@/tipos/reserva";

type EspacioApi = {
  id: string;
  nombre: string;
};

export async function listarReservasFijas(): Promise<ReservaFija[]> {
  return apiGetAll<ReservaFija>("/fijas");
}

export async function listarEspaciosReservaFija(): Promise<
  EspacioReservaFija[]
> {
  const espacios = await apiGetAll<EspacioApi>("/espacios");
  return espacios.map(({ id, nombre }) => ({ id, nombre }));
}

export async function crearReservaFija(
  espacioId: string,
  datos: DatosReservaFija,
): Promise<void> {
  await apiPost("/fijas", { espacioId, ...datos });
}

export async function actualizarReservaFija(
  id: string,
  datos: DatosReservaFija,
): Promise<void> {
  await apiPatch(`/fijas/${encodeURIComponent(id)}`, datos);
}

export async function eliminarReservaFija(id: string): Promise<void> {
  await apiDelete(`/fijas/${encodeURIComponent(id)}`);
}
