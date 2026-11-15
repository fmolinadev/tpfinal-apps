import { apiGetAll } from "@/servicios/api";
import type { TurnoAgenda } from "@/tipos/turno";

export type { TurnoAgenda } from "@/tipos/turno";

export async function obtenerAgenda(fecha: string): Promise<TurnoAgenda[]> {
  return apiGetAll<TurnoAgenda>(
    `/agenda?fecha=${encodeURIComponent(fecha)}`,
  );
}