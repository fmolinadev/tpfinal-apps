import { apiGetAll } from "@/servicios/api";
import type { EstadoTurno, Turno } from "@/tipos/turno";

type TurnoApi = {
  id: string;
  espacioId: string;
  fecha: string;
  inicio: string;
  fin: string;
  estado: EstadoTurno;
  reservaId: string | null;
  motivoBloqueo: string | null;
  precio: number;
};

export async function obtenerTurnos(
  espacioId: string,
  fecha: string,
): Promise<Turno[]> {
  const turnos = await apiGetAll<TurnoApi>(
    `/espacios/${encodeURIComponent(espacioId)}/turnos?fecha=${encodeURIComponent(fecha)}`,
  );

  return turnos.map((turno) => ({
    id: turno.id,
    espacioId: turno.espacioId,
    fecha: turno.fecha,
    hora: turno.inicio,
    precio: turno.precio,
    estado: turno.estado,
    motivo: turno.motivoBloqueo ?? undefined,
  }));
}

export type TurnoAgenda = {
  id: string;
  espacioId: string;
  fecha: string;
  inicio: string;
  fin: string;
  estado: "libre" | "reservado" | "fijo" | "mantenimiento";
  reservaId: string | null;
  motivoBloqueo: string | null;
  precio: number;
};

export async function obtenerAgenda(fecha: string): Promise<TurnoAgenda[]> {
  return apiGetAll<TurnoAgenda>(
    `/agenda?fecha=${encodeURIComponent(fecha)}`,
  );
}