import * as SQLite from "expo-sqlite";
import Storage from "expo-sqlite/kv-store";

import type { Espacio, Reserva } from "@/tipos";

const DATABASE_NAME = "tpfinal-local.db";
const SCHEMA_VERSION = 1;
const RESERVAS_CACHE_PREFIX = "reservas-cache-v1:";
const RESERVAS_CACHE_KEY_ANTERIOR = "reservas-cache-v1";
const MIGRACION_RESERVAS_KV = "reservas-kv-v1";
const CATALOGO_ESPACIOS_CACHE = "catalogo-espacios-completo";
const ESTADOS_RESERVA = new Set([
  "activa",
  "confirmada",
  "cancelada",
  "completada",
  "cumplida",
  "ausente",
]);
const DEPORTES = new Set([
  "futbol",
  "futbol11",
  "padel",
  "tenis",
  "basket",
  "voley",
  "gimnasio",
]);
const SUPERFICIES = new Set([
  "cesped",
  "sintetico",
  "madera",
  "cemento",
  "arena",
  "parquet",
  "polvo-ladrillo",
  "piso-flotante",
  "cesped-natural",
  "cemento-alisado",
]);

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let databaseOperationQueue: Promise<void> = Promise.resolve();

function ejecutarOperacionLocal<T>(
  operacion: () => Promise<T>,
): Promise<T> {
  const resultado = databaseOperationQueue.then(operacion, operacion);
  databaseOperationQueue = resultado.then(
    () => undefined,
    () => undefined,
  );
  return resultado;
}

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function esReserva(value: unknown): value is Reserva {
  return (
    esObjeto(value) &&
    typeof value.id === "string" &&
    typeof value.usuarioId === "string" &&
    typeof value.espacioId === "string" &&
    typeof value.fechaHoraInicio === "string" &&
    typeof value.cantidadJugadores === "number" &&
    typeof value.estado === "string" &&
    ESTADOS_RESERVA.has(value.estado) &&
    typeof value.qrCode === "string"
  );
}

function esEspacio(value: unknown): value is Espacio {
  return (
    esObjeto(value) &&
    typeof value.id === "string" &&
    typeof value.nombre === "string" &&
    typeof value.deporte === "string" &&
    DEPORTES.has(value.deporte) &&
    typeof value.superficie === "string" &&
    SUPERFICIES.has(value.superficie) &&
    typeof value.luzNocturna === "boolean" &&
    typeof value.precioPorHora === "number" &&
    Array.isArray(value.reglas) &&
    value.reglas.every((regla) => typeof regla === "string") &&
    Array.isArray(value.fotosUrl) &&
    value.fotosUrl.every((foto) => typeof foto === "string") &&
    (typeof value.videoUrl === "string" || value.videoUrl === null) &&
    typeof value.latitud === "number" &&
    typeof value.longitud === "number"
  );
}

function parsearReserva(datos: string): Reserva {
  const reserva: unknown = JSON.parse(datos);
  if (!esReserva(reserva)) {
    throw new Error("La caché local contiene una reserva con formato inválido.");
  }
  return reserva;
}

function parsearEspacio(datos: string): Espacio {
  const espacio: unknown = JSON.parse(datos);
  if (!esEspacio(espacio)) {
    throw new Error("La caché local contiene un espacio con formato inválido.");
  }
  return espacio;
}

async function migrarReservasKv(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const migracion = await database.getFirstAsync<{ clave: string }>(
    "SELECT clave FROM cache_metadata WHERE clave = ?",
    MIGRACION_RESERVAS_KV,
  );
  if (migracion) return;

  const claves = await Storage.getAllKeys();
  const clavesAntiguas = claves.filter(
    (clave) =>
      clave === RESERVAS_CACHE_KEY_ANTERIOR ||
      clave.startsWith(RESERVAS_CACHE_PREFIX),
  );
  const clavesPorUsuario = clavesAntiguas.filter((clave) =>
    clave.startsWith(RESERVAS_CACHE_PREFIX),
  );
  const cachesUsuario: { usuarioId: string; reservas: Reserva[] }[] = [];

  for (const clave of clavesPorUsuario) {
    let usuarioId: string;
    try {
      usuarioId = decodeURIComponent(clave.slice(RESERVAS_CACHE_PREFIX.length));
    } catch (error) {
      console.warn("Se omitió una caché de reservas con usuario inválido.", error);
      continue;
    }

    const contenido = await Storage.getItem(clave);
    if (contenido === null) continue;

    try {
      const datos: unknown = JSON.parse(contenido);
      if (!Array.isArray(datos)) {
        console.warn(`Se omitió una caché inválida para el usuario ${usuarioId}.`);
        continue;
      }

      const reservas = datos.filter(esReserva);
      if (reservas.some((reserva) => reserva.usuarioId !== usuarioId)) {
        console.warn(
          `Se descartaron reservas de otro usuario en la caché local de ${usuarioId}.`,
        );
      }
      cachesUsuario.push({
        usuarioId,
        reservas: reservas.filter((reserva) => reserva.usuarioId === usuarioId),
      });
    } catch (error) {
      console.warn(`Se omitió una caché ilegible para el usuario ${usuarioId}.`, error);
    }
  }

  await database.withTransactionAsync(async () => {
    for (const { usuarioId, reservas } of cachesUsuario) {
      for (const reserva of reservas) {
        await database.runAsync(
          "INSERT OR REPLACE INTO reservas_cache (usuario_id, reserva_id, datos) VALUES (?, ?, ?)",
          usuarioId,
          reserva.id,
          JSON.stringify(reserva),
        );
      }
      await database.runAsync(
        "INSERT OR REPLACE INTO reservas_cache_estado (usuario_id, actualizado_en) VALUES (?, ?)",
        usuarioId,
        Date.now(),
      );
    }
    await database.runAsync(
      "INSERT OR REPLACE INTO cache_metadata (clave, valor) VALUES (?, ?)",
      MIGRACION_RESERVAS_KV,
      String(Date.now()),
    );
  });

  if (clavesAntiguas.length > 0) {
    try {
      await Storage.multiRemove(clavesAntiguas);
    } catch (error) {
      console.warn("No se pudieron eliminar las claves antiguas de reservas.", error);
    }
  }
}

async function abrirBaseLocal(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  try {
    await database.execAsync("PRAGMA journal_mode = WAL;");
    const version = await database.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version;",
    );
    if ((version?.user_version ?? 0) > SCHEMA_VERSION) {
      throw new Error("La base local fue creada por una versión más reciente.");
    }

    if ((version?.user_version ?? 0) < 1) {
      await database.withTransactionAsync(async () => {
        await database.execAsync(`
          CREATE TABLE reservas_cache (
            usuario_id TEXT NOT NULL,
            reserva_id TEXT NOT NULL,
            datos TEXT NOT NULL,
            PRIMARY KEY (usuario_id, reserva_id)
          );
          CREATE TABLE reservas_cache_estado (
            usuario_id TEXT PRIMARY KEY NOT NULL,
            actualizado_en INTEGER NOT NULL
          );
          CREATE TABLE espacios_cache (
            espacio_id TEXT PRIMARY KEY NOT NULL,
            datos TEXT NOT NULL,
            orden INTEGER NOT NULL,
            actualizado_en INTEGER NOT NULL
          );
          CREATE TABLE cache_metadata (
            clave TEXT PRIMARY KEY NOT NULL,
            valor TEXT NOT NULL
          );
        `);
        await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
      });
    }

    await migrarReservasKv(database);
    return database;
  } catch (error) {
    await database.closeAsync();
    throw error;
  }
}

export function obtenerBaseLocal(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = abrirBaseLocal().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function guardarReservasLocales(
  reservas: Reserva[],
  usuarioId: string,
): Promise<void> {
  if (reservas.some((reserva) => reserva.usuarioId !== usuarioId)) {
    throw new Error("No se pueden guardar reservas pertenecientes a otro usuario.");
  }

  const database = await obtenerBaseLocal();
  await ejecutarOperacionLocal(() =>
    database.withTransactionAsync(async () => {
      await database.runAsync(
        "DELETE FROM reservas_cache WHERE usuario_id = ?",
        usuarioId,
      );
      for (const reserva of reservas) {
        await database.runAsync(
          "INSERT INTO reservas_cache (usuario_id, reserva_id, datos) VALUES (?, ?, ?)",
          usuarioId,
          reserva.id,
          JSON.stringify(reserva),
        );
      }
      await database.runAsync(
        "INSERT OR REPLACE INTO reservas_cache_estado (usuario_id, actualizado_en) VALUES (?, ?)",
        usuarioId,
        Date.now(),
      );
    }),
  );
}

export async function obtenerReservasLocales(
  usuarioId: string,
): Promise<Reserva[] | null> {
  const database = await obtenerBaseLocal();
  return ejecutarOperacionLocal(async () => {
    const estado = await database.getFirstAsync<{ usuario_id: string }>(
      "SELECT usuario_id FROM reservas_cache_estado WHERE usuario_id = ?",
      usuarioId,
    );
    if (!estado) return null;

    const filas = await database.getAllAsync<{ datos: string }>(
      "SELECT datos FROM reservas_cache WHERE usuario_id = ? ORDER BY reserva_id",
      usuarioId,
    );
    return filas.map((fila) => {
      const reserva = parsearReserva(fila.datos);
      if (reserva.usuarioId !== usuarioId) {
        throw new Error("La caché local contiene datos de otro usuario.");
      }
      return reserva;
    });
  });
}

export async function limpiarReservasLocales(): Promise<void> {
  const database = await obtenerBaseLocal();
  await ejecutarOperacionLocal(() =>
    database.withTransactionAsync(async () => {
      await database.runAsync("DELETE FROM reservas_cache");
      await database.runAsync("DELETE FROM reservas_cache_estado");
    }),
  );
}

export async function guardarCatalogoEspaciosLocal(
  espacios: Espacio[],
): Promise<void> {
  const database = await obtenerBaseLocal();
  const ahora = Date.now();
  await ejecutarOperacionLocal(() =>
    database.withTransactionAsync(async () => {
      await database.runAsync("DELETE FROM espacios_cache");
      for (const [orden, espacio] of espacios.entries()) {
        await database.runAsync(
          "INSERT INTO espacios_cache (espacio_id, datos, orden, actualizado_en) VALUES (?, ?, ?, ?)",
          espacio.id,
          JSON.stringify(espacio),
          orden,
          ahora,
        );
      }
      await database.runAsync(
        "INSERT OR REPLACE INTO cache_metadata (clave, valor) VALUES (?, ?)",
        CATALOGO_ESPACIOS_CACHE,
        String(ahora),
      );
    }),
  );
}

export async function guardarEspacioLocal(espacio: Espacio): Promise<void> {
  const database = await obtenerBaseLocal();
  await ejecutarOperacionLocal(() =>
    database.withTransactionAsync(async () => {
      const existente = await database.getFirstAsync<{ orden: number }>(
        "SELECT orden FROM espacios_cache WHERE espacio_id = ?",
        espacio.id,
      );
      const maximo = await database.getFirstAsync<{ orden: number | null }>(
        "SELECT MAX(orden) AS orden FROM espacios_cache",
      );
      await database.runAsync(
        `INSERT OR REPLACE INTO espacios_cache (espacio_id, datos, orden, actualizado_en)
         VALUES (?, ?, ?, ?)`,
        espacio.id,
        JSON.stringify(espacio),
        existente?.orden ?? (maximo?.orden ?? -1) + 1,
        Date.now(),
      );
    }),
  );
}

export async function obtenerCatalogoEspaciosLocal(): Promise<Espacio[] | null> {
  const database = await obtenerBaseLocal();
  return ejecutarOperacionLocal(async () => {
    const catalogoCompleto = await database.getFirstAsync<{ valor: string }>(
      "SELECT valor FROM cache_metadata WHERE clave = ?",
      CATALOGO_ESPACIOS_CACHE,
    );
    if (!catalogoCompleto) return null;

    const filas = await database.getAllAsync<{ datos: string }>(
      "SELECT datos FROM espacios_cache ORDER BY orden, espacio_id",
    );
    return filas.map((fila) => parsearEspacio(fila.datos));
  });
}

export async function obtenerEspacioLocal(
  espacioId: string,
): Promise<Espacio | null> {
  const database = await obtenerBaseLocal();
  return ejecutarOperacionLocal(async () => {
    const fila = await database.getFirstAsync<{ datos: string }>(
      "SELECT datos FROM espacios_cache WHERE espacio_id = ?",
      espacioId,
    );
    return fila ? parsearEspacio(fila.datos) : null;
  });
}
