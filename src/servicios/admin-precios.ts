import { apiPatch } from "@/servicios/api";

export type ResultadoPrecio = {
  ok: boolean;
  mensaje: string;
};

export async function actualizarPrecio(
  espacioId: string,
  nuevoPrecio: number,
): Promise<ResultadoPrecio> {
  if (!Number.isInteger(nuevoPrecio) || nuevoPrecio < 1) {
    return {
      ok: false,
      mensaje: "El precio debe ser un número entero mayor que cero.",
    };
  }

  try {
    await apiPatch(`/espacios/${espacioId}`, {
      precioPorHora: nuevoPrecio,
    });

    return {
      ok: true,
      mensaje: "Precio actualizado correctamente.",
    };
  } catch (error) {
    return {
      ok: false,
      mensaje:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el precio.",
    };
  }
}