import assert from "node:assert/strict";
import { mock, test } from "node:test";

const items = new Map();
let writeError = null;

function assertValidKey(key) {
  assert.match(key, /^[A-Za-z0-9._-]+$/);
}

mock.module("expo-secure-store", {
  exports: {
    getItemAsync: async (key) => {
      assertValidKey(key);
      return items.get(key) ?? null;
    },
    setItemAsync: async (key, value) => {
      assertValidKey(key);
      if (writeError) throw writeError;
      items.set(key, value);
    },
  },
});

const { hasSeenPlayerOnboarding, markPlayerOnboardingSeen } =
  await import("../src/persistencia/onboarding.ts");

test("guarda la guía vista por usuario y conserva estados independientes", async () => {
  items.clear();
  assert.equal(await hasSeenPlayerOnboarding("jugador-1"), false);
  await markPlayerOnboardingSeen("jugador-1");
  assert.equal(await hasSeenPlayerOnboarding("jugador-1"), true);
  assert.equal(await hasSeenPlayerOnboarding("jugador-2"), false);
});

test("admite identificadores especiales sin confundir usuarios", async () => {
  items.clear();
  const usuarios = ["a/b", "a_2Fb", "á", "a\u0301", "\ud800"];
  for (const usuario of usuarios) {
    assert.equal(await hasSeenPlayerOnboarding(usuario), false);
    await markPlayerOnboardingSeen(usuario);
  }
  for (const usuario of usuarios) {
    assert.equal(await hasSeenPlayerOnboarding(usuario), true);
  }
  assert.equal(items.size, usuarios.length);
});

test("propaga los errores de almacenamiento", async () => {
  writeError = new Error("almacenamiento no disponible");
  try {
    await assert.rejects(markPlayerOnboardingSeen("jugador-1"), writeError);
  } finally {
    writeError = null;
  }
});
