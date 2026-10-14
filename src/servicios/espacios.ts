import { espacios } from "@/mocks";
import type { Espacio, RespuestaApi } from "@/tipos";

import { simularFetch } from "./api";

export async function getEspacios(): Promise<RespuestaApi<Espacio>> {
  return simularFetch(espacios, undefined, 500);
}

export async function getEspacioById(
  id: string,
): Promise<RespuestaApi<Espacio>> {
  const espacio = espacios.find((item) => item.id === id);

  if (!espacio) {
    return simularFetch([], {
      codigo: "ESPACIO_NO_ENCONTRADO",
      mensaje: "No se encontró el espacio solicitado.",
    });
  }

  return simularFetch([espacio], undefined, 500);
}
