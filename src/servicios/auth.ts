import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

import { apiPost } from "@/servicios/api";
import type { LoginInput, RegistroInput, Usuario } from "@/tipos/usuario";

export const SESSION_TOKEN_KEY = "app_session_token";
export const SESSION_USER_KEY = "app_session_user";

type RespuestaSesion = {
  datos: {
    token: string;
    usuario: Usuario;
  };
  meta: null;
};

export async function saveSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export async function getSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export async function clearSessionToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}

export async function saveSessionUser(usuario: Usuario): Promise<void> {
  await SecureStore.setItemAsync(SESSION_USER_KEY, JSON.stringify(usuario));
}

export async function getSessionUser(): Promise<Usuario | null> {
  const raw = await SecureStore.getItemAsync(SESSION_USER_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export async function clearSessionUser(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_USER_KEY);
}

export async function loginUsuario({
  email,
  password,
}: LoginInput): Promise<{ token: string; usuario: Usuario }> {
  if (!email.trim() || !password) {
    throw new Error("Email y contraseña son obligatorios.");
  }

  const respuesta = await apiPost<RespuestaSesion>("/auth/ingreso", {
    email: email.trim(),
    contrasena: password,
  });

  const { token, usuario } = respuesta.datos;

  await saveSessionToken(token);
  await saveSessionUser(usuario);

  return { token, usuario };
}

export async function verificarContrasena(
  usuarioActual: Usuario,
  password: string,
): Promise<void> {
  if (!password) {
    throw new Error("Ingresá tu contraseña.");
  }

  const respuesta = await apiPost<RespuestaSesion>("/auth/ingreso", {
    email: usuarioActual.email,
    contrasena: password,
  });

  if (respuesta.datos.usuario.id !== usuarioActual.id) {
    throw new Error("La contraseña no corresponde a la cuenta actual.");
  }

  await saveSessionToken(respuesta.datos.token);
  await saveSessionUser(respuesta.datos.usuario);
}

export async function registrarUsuario({
  nombre,
  email,
  telefono,
  password,
}: RegistroInput): Promise<{ token: string; usuario: Usuario }> {
  if (!nombre.trim() || !email.trim() || !telefono.trim() || !password) {
    throw new Error("Todos los campos son obligatorios.");
  }

  const respuesta = await apiPost<RespuestaSesion>("/auth/registro", {
    nombre: nombre.trim(),
    email: email.trim(),
    telefono: telefono.trim(),
    contrasena: password,
  });

  const { token, usuario } = respuesta.datos;

  await saveSessionToken(token);
  await saveSessionUser(usuario);

  return { token, usuario };
}

export async function isBiometricSupported(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();

  return compatible && enrolled;
}

export async function authenticateWithBiometrics(
  options: { disableDeviceFallback?: boolean } = {},
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Desbloqueá tu sesión para continuar",
      fallbackLabel: "Usar código del dispositivo",
      disableDeviceFallback: options.disableDeviceFallback ?? false,
    });

    return result.success;
  } catch {
    return false;
  }
}