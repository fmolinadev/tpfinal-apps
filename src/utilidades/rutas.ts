import type { RolUsuario } from "@/tipos/usuario";

export type RutaInicio =
  | "/(jugador)/inicio"
  | "/(staff)/agenda"
  | "/(admin)/agenda"
  | "/(auth)/login";

export function rutaInicioPorRol(rol: RolUsuario | undefined): RutaInicio {
  switch (rol) {
    case "jugador":
      return "/(jugador)/inicio";
    case "encargado":
      return "/(staff)/agenda";
    case "administrador":
      return "/(admin)/agenda";
    default:
      return "/(auth)/login";
  }
}

export function rutaReservaPendiente(
  rol: RolUsuario | undefined,
  espacioId: string | undefined,
  turnoId: string | undefined,
) {
  if (rol !== "jugador" || !espacioId || !turnoId) return null;

  const coincidencia =
    /^tur-(esp-[A-Za-z0-9_-]{1,36})-(\d{8})-(\d{2})$/.exec(turnoId);
  if (!coincidencia || coincidencia[1] !== espacioId) return null;

  return {
    pathname: "/(jugador)/espacio/[id]/disponibilidad" as const,
    params: { id: espacioId, turnoId },
  };
}
