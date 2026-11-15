import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

import { apiDelete, apiPost } from "@/servicios/api";
import { solicitarPermisosNotificaciones } from "@/servicios/notificaciones";

const TOKEN_PUSH_KEY = "expo_push_token";
let registroEnCurso: Promise<void> | null = null;
let registroCompletado = false;

export type ResultadoRegistroPush =
  | "registrado"
  | "permiso-denegado"
  | "dispositivo-no-compatible";

export async function registrarDispositivoPush(): Promise<ResultadoRegistroPush> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return "dispositivo-no-compatible";
  }
  if (!Device.isDevice) return "dispositivo-no-compatible";
  if (!(await solicitarPermisosNotificaciones())) return "permiso-denegado";
  if (Platform.OS === "android" && isRunningInExpoGo()) {
    return "dispositivo-no-compatible";
  }

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    throw new Error("Falta configurar el projectId de Expo para notificaciones.");
  }

  const tokenExpo = (await Notifications.getExpoPushTokenAsync({ projectId }))
    .data;
  await Storage.setItem(TOKEN_PUSH_KEY, tokenExpo);
  await apiPost("/dispositivos", {
    tokenExpo,
    plataforma: Platform.OS,
  });
  registroCompletado = true;
  return "registrado";
}

export async function desregistrarDispositivoPush(): Promise<void> {
  await registroEnCurso;
  const tokenExpo = await Storage.getItem(TOKEN_PUSH_KEY);
  if (!tokenExpo) {
    registroCompletado = false;
    return;
  }

  try {
    await apiDelete(`/dispositivos/${encodeURIComponent(tokenExpo)}`);
  } finally {
    await Storage.removeItem(TOKEN_PUSH_KEY);
    registroCompletado = false;
  }
}

export function registrarDispositivoPushEnSegundoPlano(): void {
  if (registroEnCurso || registroCompletado) return;

  const registro = registrarDispositivoPush()
    .then(() => undefined)
    .catch((error: unknown) => {
      console.error(
        "No se pudo registrar el dispositivo para recibir avisos.",
        error,
      );
    })
    .finally(() => {
      if (registroEnCurso === registro) registroEnCurso = null;
    });
  registroEnCurso = registro;
}
