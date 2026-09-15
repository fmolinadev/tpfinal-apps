import {
    authenticateWithBiometrics,
    clearSessionToken,
    getSessionToken,
    isBiometricSupported,
    saveSessionToken,
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

export async function clearAppSession(): Promise<void> {
  await clearSessionToken();
}
