import {
  apiDelete,
  apiGetAll,
  apiPatch,
  apiPost,
} from "@/servicios/api";

export type ReservaFija = {
  id: string;
  espacioId: string;
  titular: string;
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa: boolean;
};

export type EspacioReservaFija = {
  id: string;
  nombre: string;
};

export type DatosReservaFija = {
  titular: string;
  dia: number;
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa?: boolean;
};

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
