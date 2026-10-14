import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

import { usuariosMock } from "@/mocks/usuarios";
import type { LoginInput, RegistroInput, Usuario } from "@/tipos/usuario";

export const SESSION_TOKEN_KEY = "app_session_token";
export const SESSION_USER_KEY = "app_session_user";

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

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export async function clearSessionUser(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_USER_KEY);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginUsuario({
  email,
  password,
}: LoginInput): Promise<{ token: string; usuario: Usuario }> {
  if (!email || !password) {
    throw new Error("Email y contraseña son obligatorios.");
  }

  await delay(400);

  const usuario = usuariosMock.find(
    (item) =>
      item.email.trim().toLowerCase() === email.trim().toLowerCase() &&
      item.password === password,
  );

  if (!usuario) {
    throw new Error(
      "Credenciales inválidas. Prueba con demo@tpfinal.com / 123456",
    );
  }

  const safeUser: Usuario = {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono,
    rol: usuario.rol,
  };

  const token = `mock_token_${usuario.id}_${Date.now()}`;
  await saveSessionToken(token);
  await saveSessionUser(safeUser);

  return { token, usuario: safeUser };
}

export async function registrarUsuario({
  nombre,
  email,
  telefono,
  password,
}: RegistroInput): Promise<{ token: string; usuario: Usuario }> {
  if (!nombre || !email || !telefono || !password) {
    throw new Error("Todos los campos son obligatorios.");
  }

  await delay(400);

  const usuarioExistente = usuariosMock.some(
    (item) => item.email.trim().toLowerCase() === email.trim().toLowerCase(),
  );

  if (usuarioExistente) {
    throw new Error("Ya existe un usuario con ese email.");
  }

  const nuevoUsuario: Usuario = {
    id: `user_${Date.now()}`,
    nombre: nombre.trim(),
    email: email.trim(),
    telefono: telefono.trim(),
    password,
    rol: "jugador",
  };

  usuariosMock.push(nuevoUsuario);

  const token = `mock_token_${nuevoUsuario.id}_${Date.now()}`;
  const usuarioPersistido: Usuario = {
    id: nuevoUsuario.id,
    nombre: nuevoUsuario.nombre,
    email: nuevoUsuario.email,
    telefono: nuevoUsuario.telefono,
    rol: nuevoUsuario.rol,
  };

  await saveSessionToken(token);
  await saveSessionUser(usuarioPersistido);

  return {
    token,
    usuario: usuarioPersistido,
  };
}

export async function isBiometricSupported(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const supported = await isBiometricSupported();

  if (!supported) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Autenticación biométrica requerida",
    fallbackLabel: "Usar contraseña",
    disableDeviceFallback: false,
  });

  return result.success;
}
