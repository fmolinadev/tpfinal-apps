import { apiGet } from "@/servicios/api";
import type { Usuario } from "@/tipos/usuario";

type RespuestaUsuario = {
  datos: Usuario;
  meta: null;
};

export async function obtenerUsuario(usuarioId: string): Promise<Usuario> {
  const respuesta = await apiGet<RespuestaUsuario>(
    `/usuarios/${encodeURIComponent(usuarioId)}`,
  );
  return respuesta.datos;
}
