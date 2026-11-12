import { apiDelete, apiGet, apiPost } from "@/servicios/api";

export type Bloqueo = {
  id: string;
  espacioId: string;
  fecha: string;
  inicio: string | null;
  fin: string | null;
  motivo: string;
};

type RespuestaLista<T> = {
  datos: T[];
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
  };
};

export type CrearBloqueoInput = {
  espacioIds: string[];
  fecha: string;
  inicio?: string;
  fin?: string;
  motivo: string;
};

export async function listarBloqueos(
  desde?: string,
  espacioId?: string,
): Promise<Bloqueo[]> {
  const parametros = new URLSearchParams();

  if (desde) parametros.set("desde", desde);
  if (espacioId) parametros.set("espacioId", espacioId);

  const query = parametros.toString();
  const respuesta = await apiGet<RespuestaLista<Bloqueo>>(
    `/bloqueos${query ? `?${query}` : ""}`,
  );

  return respuesta.datos;
}

export async function crearBloqueo(
  input: CrearBloqueoInput,
): Promise<void> {
  await apiPost("/bloqueos", input);
}

export async function eliminarBloqueo(id: string): Promise<void> {
  await apiDelete(`/bloqueos/${id}`);
}