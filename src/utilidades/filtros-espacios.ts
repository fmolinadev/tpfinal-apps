import type { Deporte, Espacio } from "@/tipos";

export const SIN_COMPLEJO = "—";

export type FiltrosCatalogo = {
  deporte?: Deporte;
  complejo?: string;
};

export function normalizarComplejo(complejo: string | null | undefined): string {
  return complejo?.trim() || SIN_COMPLEJO;
}

export function etiquetaComplejo(complejo: string): string {
  return complejo === SIN_COMPLEJO ? "Otros espacios" : complejo;
}

export function complejosDelCatalogo(espacios: Espacio[]): string[] {
  return Array.from(
    new Set(espacios.map((espacio) => normalizarComplejo(espacio.complejo))),
  ).sort((a, b) =>
    a === SIN_COMPLEJO ? 1 : b === SIN_COMPLEJO ? -1 : a.localeCompare(b, "es"),
  );
}

export function filtrarCatalogoLocal(
  espacios: Espacio[],
  filtros: FiltrosCatalogo,
): Espacio[] {
  return espacios.filter(
    (espacio) =>
      (!filtros.deporte || espacio.deporte === filtros.deporte) &&
      (!filtros.complejo ||
        normalizarComplejo(espacio.complejo) === filtros.complejo),
  );
}

export function filtrosParaConsulta(filtros: FiltrosCatalogo): FiltrosCatalogo {
  if (filtros.complejo !== SIN_COMPLEJO) return filtros;
  return filtros.deporte ? { deporte: filtros.deporte } : {};
}
