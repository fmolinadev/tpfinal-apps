import { getSessionUser, saveSessionUser } from "@/servicios/auth";
import { apiDelete, apiPut } from "@/servicios/api";
import type { Usuario } from "@/tipos/usuario";

type RespuestaUsuario = {
  datos: Usuario;
  meta: null;
};

export async function establecerFavoritoEspacio(
  espacioId: string,
  esFavorito: boolean,
): Promise<Usuario> {
  const clave = `/yo/espacios-favoritos/${encodeURIComponent(espacioId)}`;

  if (!esFavorito) {
    const respuesta = await apiPut<RespuestaUsuario>(clave);
    await saveSessionUser(respuesta.datos);
    return respuesta.datos;
  }

  const usuarioActual = await getSessionUser();
  if (!usuarioActual) {
    throw new Error("No hay una sesión activa.");
  }

  await apiDelete(clave);
  const usuarioActualizado = {
    ...usuarioActual,
    espaciosFavoritos: (usuarioActual.espaciosFavoritos ?? []).filter(
      (id) => id !== espacioId,
    ),
  };
  await saveSessionUser(usuarioActualizado);
  return usuarioActualizado;
}
