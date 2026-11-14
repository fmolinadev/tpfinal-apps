import { Directory, File, Paths } from "expo-file-system";
import type { ImagePickerAsset } from "expo-image-picker";

import { apiPost } from "@/servicios/api";

const DIRECTORIO_INSPECCIONES = new Directory(
  Paths.document,
  "inspection-reports",
);
const MAX_EVIDENCIAS = 5;
const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

const FORMATOS = {
  "image/jpeg": { extension: "jpg", tipo: "imagen", limite: MAX_IMAGEN_BYTES },
  "image/png": { extension: "png", tipo: "imagen", limite: MAX_IMAGEN_BYTES },
  "image/webp": { extension: "webp", tipo: "imagen", limite: MAX_IMAGEN_BYTES },
  "video/mp4": { extension: "mp4", tipo: "video", limite: MAX_VIDEO_BYTES },
} as const;

type MimeInspeccion = keyof typeof FORMATOS;

function esMimeInspeccion(mimeType: string): mimeType is MimeInspeccion {
  return Object.prototype.hasOwnProperty.call(FORMATOS, mimeType);
}

export type EvidenciaInspeccion = {
  uri: string;
  nombre: string;
  mimeType: MimeInspeccion;
  tipo: "imagen" | "video";
  bytes: number;
};

type ArchivoSubido = {
  url: string;
};

type RespuestaUno<T> = {
  datos: T;
  meta: null;
};

function mimeDeAsset(asset: ImagePickerAsset): MimeInspeccion {
  const mimeType = asset.mimeType?.toLowerCase();
  if (mimeType && esMimeInspeccion(mimeType)) {
    return mimeType;
  }

  const extension = asset.fileName?.split(".").pop()?.toLowerCase();
  const mimePorExtension: Record<string, MimeInspeccion> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    mp4: "video/mp4",
  };
  const mime = extension ? mimePorExtension[extension] : undefined;
  if (mime) {
    return mime;
  }

  throw new Error("Usá fotos JPG, PNG o WEBP, o videos MP4.");
}

export async function guardarEvidenciasInspeccion(
  assets: ImagePickerAsset[],
  existentes = 0,
): Promise<EvidenciaInspeccion[]> {
  if (assets.length === 0) {
    return [];
  }
  if (existentes + assets.length > MAX_EVIDENCIAS) {
    throw new Error("Podés adjuntar hasta cinco fotos o videos por reporte.");
  }

  const formatos = assets.map(mimeDeAsset);
  DIRECTORIO_INSPECCIONES.create({
    idempotent: true,
    intermediates: true,
  });

  const guardadas: EvidenciaInspeccion[] = [];
  for (const [indice, asset] of assets.entries()) {
    const mimeType = formatos[indice];
    const formato = FORMATOS[mimeType];
    const origen = new File(asset.uri);
    if (!origen.exists || origen.size === 0) {
      throw new Error("No se pudo leer uno de los archivos seleccionados.");
    }

    const nombre = `evidencia-${Date.now()}-${indice}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${formato.extension}`;
    const destino = new File(DIRECTORIO_INSPECCIONES, nombre);
    await origen.copy(destino);

    if (!destino.exists) {
      throw new Error("No se pudo guardar una copia local de la evidencia.");
    }
    if (destino.size > formato.limite) {
      destino.delete();
      const limiteMb = formato.limite / (1024 * 1024);
      throw new Error(`Cada archivo puede pesar hasta ${limiteMb} MB.`);
    }

    guardadas.push({
      uri: destino.uri,
      nombre,
      mimeType,
      tipo: formato.tipo,
      bytes: destino.size,
    });
  }

  return guardadas;
}

export async function eliminarEvidenciaInspeccion(
  evidencia: EvidenciaInspeccion,
): Promise<void> {
  const archivo = new File(evidencia.uri);
  if (archivo.exists) {
    archivo.delete();
  }
}

export async function subirEvidenciasInspeccion(
  evidencias: EvidenciaInspeccion[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const evidencia of evidencias) {
    const archivo = new File(evidencia.uri);
    const limite = FORMATOS[evidencia.mimeType].limite;
    if (!archivo.exists) {
      throw new Error("No se encontró una evidencia guardada en el dispositivo.");
    }
    if (archivo.size > limite) {
      throw new Error(
        `Cada archivo puede pesar hasta ${limite / (1024 * 1024)} MB.`,
      );
    }

    const formulario = new FormData();
    formulario.append("archivo", archivo, evidencia.nombre);
    const respuesta = await apiPost<RespuestaUno<ArchivoSubido>>(
      "/archivos",
      formulario,
    );
    urls.push(respuesta.datos.url);
  }
  return urls;
}
