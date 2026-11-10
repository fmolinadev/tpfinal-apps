import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const SESSION_TOKEN_KEY = "app_session_token";

type ErrorApi = {
  codigo: string;
  mensaje: string;
};

export type RespuestaApi<T> =
  | {
      datos: T;
      meta: null;
    }
  | {
      datos: T[];
      meta: {
        total: number;
        pagina: number;
        porPagina: number;
      };
    };

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error("No está configurada la dirección de la API.");
  }

  const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Verificá que la API esté funcionando y que ambos dispositivos estén en la misma red Wi-Fi.",
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body?.error as ErrorApi | undefined;
    throw new Error(
      error?.mensaje ?? `Error del servidor (${response.status}).`,
    );
  }

  if (body === null) {
    throw new Error("El servidor devolvió una respuesta inválida.");
  }

  return body as T;
}

export function apiGet<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: "GET" });
}

export function apiPost<T>(
  endpoint: string,
  datos?: unknown,
): Promise<T> {
  return request<T>(endpoint, {
    method: "POST",
    body: datos === undefined ? undefined : JSON.stringify(datos),
  });
}

export function apiPatch<T>(
  endpoint: string,
  datos?: unknown,
): Promise<T> {
  return request<T>(endpoint, {
    method: "PATCH",
    body: datos === undefined ? undefined : JSON.stringify(datos),
  });
}

export function apiDelete<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: "DELETE" });
}