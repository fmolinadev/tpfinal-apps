import assert from "node:assert/strict";
import test from "node:test";

import { reconciliarAvisosSuspension } from "../src/utilidades/avisos-suspension.ts";

test("avisa una sola vez por bloqueo, no por una cancelación común", async () => {
  let estado = { bloqueada: "activa", comun: "activa" };
  const actuales = [
    { id: "bloqueada", estado: "cancelada" },
    { id: "comun", estado: "cancelada" },
  ];
  const avisos = [];
  const motivos = async (ids) => {
    assert.deepEqual(ids, ["bloqueada", "comun"]);
    return [{ reservaId: "bloqueada", motivo: "Lluvia" }];
  };
  const avisar = async (id, motivo) => {
    avisos.push([id, motivo]);
    return true;
  };
  const guardar = async (valor) => { estado = { ...valor }; };

  await reconciliarAvisosSuspension(estado, actuales, motivos, avisar, guardar);
  await reconciliarAvisosSuspension(estado, actuales, motivos, avisar, guardar);

  assert.deepEqual(avisos, [["bloqueada", "Lluvia"]]);
  assert.deepEqual(estado, { bloqueada: "cancelada", comun: "cancelada" });
});

test("conserva la transición pendiente si falla la API o falta permiso", async () => {
  let estado = { reserva: "activa" };
  const actuales = [{ id: "reserva", estado: "cancelada" }];
  const guardar = async (valor) => { estado = { ...valor }; };
  const motivos = async () => [{ reservaId: "reserva", motivo: "Poda" }];

  await assert.rejects(reconciliarAvisosSuspension(
    estado, actuales, async () => { throw new Error("sin conexión"); },
    async () => true, guardar,
  ));
  assert.equal(estado.reserva, "activa");
  await reconciliarAvisosSuspension(estado, actuales, motivos, async () => false, guardar);
  assert.equal(estado.reserva, "activa");
  await reconciliarAvisosSuspension(estado, actuales, motivos, async () => true, guardar);
  assert.equal(estado.reserva, "cancelada");
});

test("si falla un aviso, no repite los anteriores y reintenta los pendientes", async () => {
  let estado = { primera: "activa", segunda: "confirmada" };
  const actuales = [
    { id: "primera", estado: "cancelada" },
    { id: "segunda", estado: "cancelada" },
  ];
  const motivos = async () => actuales.map(({ id }) => ({ reservaId: id, motivo: "Lluvia" }));
  const guardar = async (valor) => { estado = { ...valor }; };
  const avisos = [];
  await assert.rejects(reconciliarAvisosSuspension(
    estado, actuales, motivos,
    async (id) => {
      if (id === "segunda") throw new Error("falló");
      avisos.push(id);
      return true;
    }, guardar,
  ));
  assert.deepEqual(estado, { primera: "cancelada", segunda: "confirmada" });
  await reconciliarAvisosSuspension(
    estado, actuales, motivos, async (id) => { avisos.push(id); return true; }, guardar,
  );
  assert.deepEqual(avisos, ["primera", "segunda"]);
});

test("la primera sincronización no avisa cancelaciones anteriores sin una reserva activa en caché", async () => {
  let estado;
  await reconciliarAvisosSuspension(
    {}, [{ id: "anterior", estado: "cancelada" }],
    async () => { throw new Error("no debe consultar motivos"); },
    async () => { throw new Error("no debe notificar"); },
    async (valor) => { estado = { ...valor }; },
  );
  assert.deepEqual(estado, { anterior: "cancelada" });
});

test("mantiene el estado anterior si una reserva falta transitoriamente en la respuesta", async () => {
  let estado = { reserva: "activa" };
  const guardar = async (valor) => { estado = { ...valor }; };
  const avisos = [];
  await reconciliarAvisosSuspension(estado, [], async () => [], async () => true, guardar);
  await reconciliarAvisosSuspension(
    estado, [{ id: "reserva", estado: "cancelada" }],
    async () => [{ reservaId: "reserva", motivo: "Lluvia" }],
    async (id) => { avisos.push(id); return true; }, guardar,
  );
  assert.deepEqual(avisos, ["reserva"]);
});
