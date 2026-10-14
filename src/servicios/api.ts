import type { RespuestaApi } from "@/tipos";

type ErrorApi = {
  codigo: string;
  mensaje: string;
};

export async function simularFetch<T>(
  datos: T[],
  error?: ErrorApi,
  delay = 500,
): Promise<RespuestaApi<T>> {
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (error) {
    return {
      error: {
        codigo: error.codigo,
        mensaje: error.mensaje,
      },
    };
  }

  return {
    datos,
    meta: {
      total: datos.length,
      pagina: 1,
      porPagina: 20,
    },
  };
}
