import {
  ApiError,
  apiGet,
  apiGetAll,
} from "@/servicios/api";
import {
  guardarCatalogoEspaciosLocal,
  guardarEspacioLocal,
  obtenerCatalogoEspaciosLocal,
  obtenerEspacioLocal,
} from "@/persistencia/base-local";
import type { Espacio as EspacioApi } from "@/tipos/espacio";
import type { Deporte, Espacio, RespuestaApi, Superficie } from "@/tipos";

type RespuestaUnicaApi<T> = {
  datos: T;
  meta: null;
};

export type FiltrosEspacios = {
  deporte?: Deporte;
  complejo?: string;
};

const DEPORTE_ID_POR_TIPO: Partial<Record<Deporte, string>> = {
  futbol: "dep-futbol5",
  futbol11: "dep-futbol11",
  padel: "dep-padel",
  basket: "dep-basquet",
  voley: "dep-voley",
  tenis: "dep-tenis",
  gimnasio: "dep-gimnasio",
};

function convertirDeporte(deporteId: string): Deporte {
  const deportes: Record<string, Deporte> = {
    "dep-futbol5": "futbol",
    "dep-futbol11": "futbol11",
    "dep-padel": "padel",
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

function filtrarEspaciosLocales(
  espacios: Espacio[],
  filtros: FiltrosEspacios,
): Espacio[] {
  return espacios.filter(
    (espacio) =>
      (!filtros.deporte || espacio.deporte === filtros.deporte) &&
      (!filtros.complejo || espacio.complejo === filtros.complejo),
  );
}

function respuestaError(
  error: unknown,
  mensajePredeterminado: string,
): RespuestaApi<Espacio> {
  return {
    error: {
      codigo:
        error instanceof ApiError && error.codigo
          ? error.codigo
          : "ERROR_ESPACIOS",
      mensaje:
        error instanceof Error ? error.message : mensajePredeterminado,
    },
  };
}

export async function getEspacios(
  filtros: FiltrosEspacios = {},
): Promise<RespuestaApi<Espacio>> {
  const parametros = new URLSearchParams();
  if (filtros.deporte) {
    const deporteId = DEPORTE_ID_POR_TIPO[filtros.deporte];
    if (deporteId) parametros.set("deporteId", deporteId);
  }
  if (filtros.complejo) {
    parametros.set("complejo", filtros.complejo);
  }
  const query = parametros.toString();

  try {
    const espacios = await apiGetAll<EspacioApi>(
      query ? `/espacios?${query}` : "/espacios",
    );
    const espaciosAdaptados = espacios.map(adaptarEspacio);
    if (!query) {
      try {
        await guardarCatalogoEspaciosLocal(espaciosAdaptados);
      } catch (error) {
        console.warn(
          "No se pudo actualizar el catálogo local de espacios.",
          error,
        );
      }
    }

    return {
      datos: espaciosAdaptados,
      meta: {
        total: espacios.length,
        pagina: 1,
        porPagina: espacios.length,
      },
    };
  } catch (error) {
    try {
      const espaciosLocales = await obtenerCatalogoEspaciosLocal();
      if (espaciosLocales !== null) {
        const espaciosFiltrados = filtrarEspaciosLocales(
          espaciosLocales,
          filtros,
        );
        return {
          datos: espaciosFiltrados,
          meta: {
            total: espaciosFiltrados.length,
            pagina: 1,
            porPagina: espaciosFiltrados.length,
          },
        };
      }
    } catch (cacheError) {
      console.warn("No se pudo leer el catálogo local de espacios.", cacheError);
    }
    return respuestaError(
      error,
      "No se pudieron cargar los espacios.",
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
    const espacio = adaptarEspacio(respuesta.datos);
    try {
      await guardarEspacioLocal(espacio);
    } catch (error) {
      console.warn("No se pudo actualizar el espacio en la caché local.", error);
    }

    return {
      datos: [espacio],
      meta: {
        total: 1,
        pagina: 1,
        porPagina: 1,
      },
    };
  } catch (error) {
    try {
      const espacioLocal = await obtenerEspacioLocal(id);
      if (espacioLocal) {
        return {
          datos: [espacioLocal],
          meta: {
            total: 1,
            pagina: 1,
            porPagina: 1,
          },
        };
      }
    } catch (cacheError) {
      console.warn("No se pudo leer el espacio desde la caché local.", cacheError);
    }
    return respuestaError(
      error,
      "No se encontró el espacio solicitado.",
    );
  }
}