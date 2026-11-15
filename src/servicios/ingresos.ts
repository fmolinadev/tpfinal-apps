import { apiPost } from "@/servicios/api";
import { obtenerUsuario } from "@/servicios/usuarios";

type RespuestaIngresoApi = {
  datos: {
    id: string;
    turnoId: string;
    usuarioId: string;
    ingresoEn: string | null;
  };
  meta: null;
};

export type IngresoRegistrado = {
  reservaId: string;
  turnoId: string;
  usuarioId: string;
  nombreJugador: string | null;
  ingresoEn: string;
  errorNombreJugador: string | null;
};

export async function registrarIngreso(
  codigoQr: string,
  espacioId: string,
): Promise<IngresoRegistrado> {
  const respuesta = await apiPost<RespuestaIngresoApi>("/ingresos", {
    codigoQr,
    espacioId,
  });
  if (!respuesta.datos.ingresoEn) {
    throw new Error("La API no devolvió la hora de ingreso registrada.");
  }

  let nombreJugador: string | null = null;
  let errorNombreJugador: string | null = null;
  try {
    const usuario = await obtenerUsuario(respuesta.datos.usuarioId);
    nombreJugador = usuario.nombre;
  } catch (error) {
    errorNombreJugador =
      error instanceof Error
        ? error.message
        : "No se pudo consultar el nombre del jugador.";
  }

  return {
    reservaId: respuesta.datos.id,
    turnoId: respuesta.datos.turnoId,
    usuarioId: respuesta.datos.usuarioId,
    nombreJugador,
    ingresoEn: respuesta.datos.ingresoEn,
    errorNombreJugador,
  };
}
