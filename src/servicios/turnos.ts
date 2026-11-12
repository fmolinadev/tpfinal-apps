import { apiGet } from "@/servicios/api";
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

type RespuestaTurnosApi = {
  datos: TurnoApi[];
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
  };
};

export async function obtenerTurnos(
  espacioId: string,
  fecha: string,
): Promise<Turno[]> {
  const respuesta = await apiGet<RespuestaTurnosApi>(
    `/espacios/${espacioId}/turnos?fecha=${encodeURIComponent(fecha)}`,
  );

  return respuesta.datos.map((turno) => ({
    id: turno.id,
    espacioId: turno.espacioId,
    fecha: turno.fecha,
    hora: turno.inicio,
    precio: turno.precio,
    estado: turno.estado,
    motivo: turno.motivoBloqueo ?? undefined,
  }));
}