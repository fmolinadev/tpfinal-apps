import {
    authenticateWithBiometrics,
    actualizarUsuarioSesion,
    clearSessionToken,
    clearSessionUser,
    getSessionToken,
    getSessionUser,
    saveSessionToken,
    saveSessionUser,
} from "@/servicios/auth";
import { limpiarAvisosSuspension, limpiarCacheReservas } from "@/servicios/reservas";
import { limpiarRecordatoriosLocales } from "@/servicios/notificaciones";
import {
    desregistrarDispositivoPush,
    registrarDispositivoPushEnSegundoPlano,
} from "@/servicios/dispositivos";

export async function restoreSession(): Promise<{
  hasSession: boolean;
}> {
  const token = await getSessionToken();
  if (!token) {
    return { hasSession: false };
  }

  await actualizarUsuarioSesion();
  return { hasSession: true };
}

export async function finishBiometricLogin(): Promise<boolean> {
  const autenticado = await authenticateWithBiometrics();
  if (autenticado) registrarDispositivoPushEnSegundoPlano();
  return autenticado;
}

export async function persistSession(token: string): Promise<void> {
  await saveSessionToken(token);
}

export async function persistUserSession(usuario: Parameters<typeof saveSessionUser>[0]): Promise<void> {
  await saveSessionUser(usuario);
}

export async function getCurrentUserSession() {
  return getSessionUser();
}

export async function clearAppSession(): Promise<void> {
  try {
    try {
      await limpiarAvisosSuspension();
    } finally {
      await limpiarCacheReservas();
    }
  } finally {
    try {
      await desregistrarDispositivoPush();
    } catch (error) {
      console.error("No se pudo dar de baja el dispositivo de notificaciones.", error);
    }
    try {
      await limpiarRecordatoriosLocales();
    } catch (error) {
      console.error("No se pudieron cancelar los recordatorios locales.", error);
    }
    await Promise.all([clearSessionToken(), clearSessionUser()]);
  }
}
