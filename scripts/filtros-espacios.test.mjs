import assert from "node:assert/strict";
import test from "node:test";

import {
  SIN_COMPLEJO,
  complejosDelCatalogo,
  etiquetaComplejo,
  filtrarCatalogoLocal,
  filtrosParaConsulta,
  normalizarComplejo,
} from "../src/utilidades/filtros-espacios.ts";

const espacios = [
  { id: "poli", complejo: "Polideportivo", deporte: "futbol" },
  { id: "guion", complejo: "—", deporte: "futbol" },
  { id: "vacio", complejo: " ", deporte: "padel" },
  { id: "ausente", deporte: "futbol" },
  { id: "nulo", complejo: null, deporte: "futbol" },
];

test("ofrece solo complejos presentes y agrupa los espacios sin asignar", () => {
  assert.deepEqual(complejosDelCatalogo(espacios), ["Polideportivo", SIN_COMPLEJO]);
  assert.deepEqual(complejosDelCatalogo([espacios[0]]), ["Polideportivo"]);
  assert.deepEqual(complejosDelCatalogo([]), []);
});

test("Otros espacios agrupa espacios sin complejo y respeta el deporte", () => {
  assert.equal(etiquetaComplejo(normalizarComplejo("")), "Otros espacios");
  assert.deepEqual(
    filtrarCatalogoLocal(espacios, { complejo: SIN_COMPLEJO }).map((e) => e.id),
    ["guion", "vacio", "ausente", "nulo"],
  );
  assert.deepEqual(
    filtrarCatalogoLocal(espacios, { complejo: SIN_COMPLEJO, deporte: "futbol" }).map((e) => e.id),
    ["guion", "ausente", "nulo"],
  );
});

test("filtra complejos asignados sin incluir otros espacios", () => {
  assert.deepEqual(
    filtrarCatalogoLocal(espacios, { complejo: "Polideportivo" }).map((e) => e.id),
    ["poli"],
  );
  assert.equal(etiquetaComplejo("Polideportivo"), "Polideportivo");
  assert.equal(filtrarCatalogoLocal(espacios, {}).length, espacios.length);
});

test("consulta por deporte sin enviar el complejo especial al servidor", () => {
  assert.deepEqual(
    filtrosParaConsulta({ complejo: SIN_COMPLEJO, deporte: "futbol" }),
    { deporte: "futbol" },
  );
  assert.deepEqual(
    filtrosParaConsulta({ complejo: "Polideportivo" }),
    { complejo: "Polideportivo" },
  );
});
