import type { Usuario } from "@/tipos/usuario";

import {
  authenticateWithBiometrics,
  clearSessionToken,
  clearSessionUser,
  getSessionToken,
  getSessionUser,
  saveSessionToken,
  saveSessionUser,
} from "@/servicios/auth";

export function getHomeRouteForUser(usuario: Usuario): string {
  switch (usuario.rol) {
    case "jugador":
      return "/(jugador)/inicio";

    case "administrador":
      return "/(admin)/agenda";

    case "encargado":
      return "/(staff)/agenda";

    default:
      return "/(auth)/login";
  }
}

export async function restoreSession(): Promise<{
  hasSession: boolean;
  requiresDeviceAuthentication: boolean;
  usuario: Usuario | null;
}> {
  const token = await getSessionToken();
  const usuario = await getSessionUser();

  // Si falta cualquiera de los dos datos, la sesión está incompleta.
  if (!token || !usuario?.id || !usuario?.email || !usuario?.rol) {
    await clearAppSession();

    return {
      hasSession: false,
      requiresDeviceAuthentication: false,
      usuario: null,
    };
  }

  return {
    hasSession: true,
    requiresDeviceAuthentication: true,
    usuario,
  };
}

export async function finishBiometricLogin(): Promise<boolean> {
  return authenticateWithBiometrics({
    disableDeviceFallback: false,
  });
}

export async function persistSession(token: string): Promise<void> {
  await saveSessionToken(token);
}

export async function persistUserSession(
  usuario: Usuario,
): Promise<void> {
  await saveSessionUser(usuario);
}

export async function getCurrentUserSession(): Promise<Usuario | null> {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  return getSessionUser();
}

export async function clearAppSession(): Promise<void> {
  await clearSessionToken();
  await clearSessionUser();
}