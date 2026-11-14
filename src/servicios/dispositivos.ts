import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

import { apiDelete, apiPost } from "@/servicios/api";
import { solicitarPermisosNotificaciones } from "@/servicios/notificaciones";

const TOKEN_PUSH_KEY = "expo_push_token";
let registroEnCurso: Promise<void> | null = null;

export async function registrarDispositivoPush(): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  if (!Device.isDevice) return;
  if (!(await solicitarPermisosNotificaciones())) return;

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
}

export async function desregistrarDispositivoPush(): Promise<void> {
  await registroEnCurso;
  const tokenExpo = await Storage.getItem(TOKEN_PUSH_KEY);
  if (!tokenExpo) return;

  try {
    await apiDelete(`/dispositivos/${encodeURIComponent(tokenExpo)}`);
  } finally {
    await Storage.removeItem(TOKEN_PUSH_KEY);
  }
}

export function registrarDispositivoPushEnSegundoPlano(): void {
  if (registroEnCurso) return;

  const registro = registrarDispositivoPush()
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
