import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const SESSION_TOKEN_KEY = "app_session_token";
const SESSION_USER_KEY = "app_session_user";

type ErrorApi = {
  codigo?: string;
  mensaje?: string;
};

export class ApiError extends Error {
  readonly code?: string;

  constructor(
    message: string,
    readonly status: number,
    readonly codigo?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = codigo;
  }
}

export type RespuestaListaApi<T> = {
  datos: T[];
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
  };
};

const MAXIMO_POR_PAGINA = 100;

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();
let sessionExpiredNotified = false;
let sessionExpiredPending = false;

export function onSessionExpired(
  listener: SessionExpiredListener,
): () => void {
  sessionExpiredListeners.add(listener);

  if (sessionExpiredPending) {
    sessionExpiredPending = false;
    listener();
  }

  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

function notifySessionExpired(): void {
  if (sessionExpiredNotified) {
    return;
  }

  sessionExpiredNotified = true;
  if (sessionExpiredListeners.size === 0) {
    sessionExpiredPending = true;
    return;
  }

  sessionExpiredListeners.forEach((listener) => listener());
}

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

export async function apiGetAll<T>(endpoint: string): Promise<T[]> {
    const [ruta, query] = endpoint.split("?", 2);
    const resultados: T[] = [];
    let pagina = 1;

    while (true) {
      const parametros = new URLSearchParams(query ?? "");
      parametros.set("pagina", String(pagina));
      parametros.set("porPagina", String(MAXIMO_POR_PAGINA));

      const respuesta = await apiGet<RespuestaListaApi<T>>(
        `${ruta}?${parametros.toString()}`,
      );
      resultados.push(...respuesta.datos);

      const paginasTotales = Math.ceil(
        respuesta.meta.total / Math.max(respuesta.meta.porPagina, 1),
      );
      if (respuesta.datos.length === 0 || pagina >= paginasTotales) {
        return resultados;
      }

      pagina += 1;
    }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error("No está configurada la dirección del servidor.");
  }

  const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  const esRutaAutenticacion =
    endpoint === "/auth/ingreso" || endpoint === "/auth/registro";

  const headers = new Headers(options.headers);
  const esMultipart =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (esMultipart) {
    headers.delete("Content-Type");
  } else {
    headers.set("Content-Type", "application/json");
  }

  if (token && !esRutaAutenticacion) {
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
      "No se pudo conectar con el servidor. Verificá tu conexión a internet e intentá nuevamente.",
    );
  }

  const responseText = await response.text();
  const body = responseText ? JSON.parse(responseText) : null;
  const error = body?.error as ErrorApi | undefined;
  const codigo = typeof error?.codigo === "string" ? error.codigo : undefined;
  const mensaje = typeof error?.mensaje === "string" ? error.mensaje : undefined;

  if (!response.ok) {
    if (response.status === 401 && token && !esRutaAutenticacion) {
      const tokenActual = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
      if (tokenActual === token) {
        try {
          await Promise.all([
            SecureStore.deleteItemAsync(SESSION_TOKEN_KEY),
            SecureStore.deleteItemAsync(SESSION_USER_KEY),
          ]);
        } finally {
          notifySessionExpired();
        }
      }

      throw new ApiError(
        "Tu sesión venció o ya no es válida. Iniciá sesión nuevamente.",
        response.status,
        codigo,
      );
    }

    throw new ApiError(
      mensaje ?? `Error del servidor (${response.status}).`,
      response.status,
      codigo,
    );
  }

  if (esRutaAutenticacion) {
    sessionExpiredNotified = false;
    sessionExpiredPending = false;
  }

  // Algunos endpoints responden 204 y no devuelven contenido
  if (response.status === 204 || body === null) {
    return undefined as T;
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
  const esFormData =
    typeof FormData !== "undefined" && datos instanceof FormData;

  return request<T>(endpoint, {
    method: "POST",
    body:
      datos === undefined
        ? undefined
        : esFormData
          ? datos
          : JSON.stringify(datos),
  });
}

export function apiPut<T>(
  endpoint: string,
  datos?: unknown,
): Promise<T> {
  return request<T>(endpoint, {
    method: "PUT",
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