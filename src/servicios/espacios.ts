import { apiGet } from "@/servicios/api";
import type { Deporte, Espacio, RespuestaApi, Superficie } from "@/tipos";

type EspacioApi = {
  id: string;
  nombre: string;
  deporteId: string;
  complejo: string;
  superficie: string;
  techado: boolean;
  iluminacion: boolean;
  capacidad: number;
  precioPorHora: number;
  coordenadas: {
    latitud: number;
    longitud: number;
  };
  imagenes: string[];
  videoUrl: string | null;
  reglas: string;
  activo: boolean;
};

type RespuestaListaApi<T> = {
  datos: T[];
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
  };
};

type RespuestaUnicaApi<T> = {
  datos: T;
  meta: null;
};

function convertirDeporte(deporteId: string): Deporte {
  const deportes: Record<string, Deporte> = {
    "dep-futbol5": "futbol",
    "dep-futbol11": "futbol11",
    "dep-basquet": "basket",
    "dep-voley": "voley",
    "dep-tenis": "tenis",
    "dep-gimnasio": "gimnasio",
  };

  return deportes[deporteId] ?? "futbol";
}

function convertirSuperficie(superficie: string): Superficie {
  const normalizada = superficie
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const superficies: Record<string, Superficie> = {
    "cesped sintetico": "sintetico",
    "cesped natural": "cesped-natural",
    "cemento alisado": "cemento-alisado",
    "polvo de ladrillo": "polvo-ladrillo",
    "piso flotante": "piso-flotante",
    parquet: "parquet",
    arena: "arena",
  };

  return superficies[normalizada] ?? "cemento";
}

function adaptarEspacio(espacio: EspacioApi): Espacio {
  return {
    id: espacio.id,
    nombre: espacio.nombre,
    deporte: convertirDeporte(espacio.deporteId),
    superficie: convertirSuperficie(espacio.superficie),
    luzNocturna: espacio.iluminacion,
    precioPorHora: espacio.precioPorHora,
    reglas: espacio.reglas
      ? espacio.reglas.split("\n").filter(Boolean)
      : [],
    fotosUrl: espacio.imagenes,
    videoUrl: espacio.videoUrl,
    latitud: espacio.coordenadas.latitud,
    longitud: espacio.coordenadas.longitud,
    complejo: espacio.complejo,
    techado: espacio.techado,
    capacidad: espacio.capacidad,
  };
}

function respuestaError(mensaje: string): RespuestaApi<Espacio> {
  return {
    error: {
      codigo: "ERROR_ESPACIOS",
      mensaje,
    },
  };
}

export async function getEspacios(): Promise<RespuestaApi<Espacio>> {
  try {
    const respuesta = await apiGet<RespuestaListaApi<EspacioApi>>(
      "/espacios",
    );

    return {
      datos: respuesta.datos.map(adaptarEspacio),
      meta: respuesta.meta,
    };
  } catch (error) {
    return respuestaError(
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los espacios.",
    );
  }
}

export async function getEspacioById(
  id: string,
): Promise<RespuestaApi<Espacio>> {
  try {
    const respuesta = await apiGet<RespuestaUnicaApi<EspacioApi>>(
      `/espacios/${id}`,
    );

    return {
      datos: [adaptarEspacio(respuesta.datos)],
      meta: {
        total: 1,
        pagina: 1,
        porPagina: 1,
      },
    };
  } catch (error) {
    return respuestaError(
      error instanceof Error
        ? error.message
        : "No se encontró el espacio solicitado.",
    );
  }
}