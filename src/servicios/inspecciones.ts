import { apiGetAll, apiPost } from "@/servicios/api";

export type Inspeccion = {
  id: string;
  espacioId: string;
  usuarioId: string;
  observacion: string;
  evidencias: string[];
  creadaEn: string;
};

type RespuestaUno<T> = {
  datos: T;
  meta: null;
};

export async function listarInspecciones(
  espacioId?: string,
): Promise<Inspeccion[]> {
  const filtro = espacioId
    ? `?espacioId=${encodeURIComponent(espacioId)}`
    : "";
  return apiGetAll<Inspeccion>(`/inspecciones${filtro}`);
}

export async function crearInspeccion(
  datos: Pick<Inspeccion, "espacioId" | "observacion" | "evidencias">,
): Promise<Inspeccion> {
  const respuesta = await apiPost<RespuestaUno<Inspeccion>>(
    "/inspecciones",
    datos,
  );
  return respuesta.datos;
}
