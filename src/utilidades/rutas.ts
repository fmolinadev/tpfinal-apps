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
