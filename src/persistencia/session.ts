import {
    authenticateWithBiometrics,
    clearSessionToken,
    clearSessionUser,
    getSessionToken,
    getSessionUser,
    isBiometricSupported,
    saveSessionToken,
    saveSessionUser,
} from "@/servicios/auth";

export async function restoreSession(): Promise<{
  hasSession: boolean;
  requiresBiometric: boolean;
}> {
  const token = await getSessionToken();

  if (!token) {
    return { hasSession: false, requiresBiometric: false };
  }

  const biometricAvailable = await isBiometricSupported();

  if (biometricAvailable) {
    return { hasSession: true, requiresBiometric: true };
  }

  return { hasSession: true, requiresBiometric: false };
}

export async function finishBiometricLogin(): Promise<boolean> {
  return authenticateWithBiometrics();
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
  await clearSessionToken();
  await clearSessionUser();
}
