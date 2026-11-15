import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { MAPA_LEAFLET_HTML } from "../src/components/mapa-leaflet-html.ts";

function cargarMapa() {
  const mensajes = [];
  const vistas = [];
  let marcadores = [];
  const mapa = {
    setView(centro, zoom) {
      vistas.push({ centro, zoom });
      return this;
    },
    attributionControl: { addAttribution() {} },
  };
  const capa = {
    addTo() { return this; },
    getMaplibreMap() { return { on() {} }; },
  };
  const grupo = {
    addTo() { return this; },
    clearLayers() { marcadores = []; },
  };
  const L = {
    map() { return mapa; },
    maplibreGL() { return capa; },
    layerGroup() { return grupo; },
    circleMarker(coordenadas) {
      const marcador = {
        coordenadas,
        addTo() { marcadores.push(this); return this; },
        bindTooltip(etiqueta) { this.etiqueta = etiqueta; return this; },
        on(evento, accion) { this[evento] = accion; return this; },
      };
      return marcador;
    },
  };
  const window = {
    L,
    maplibregl: {},
    ReactNativeWebView: { postMessage: (mensaje) => mensajes.push(JSON.parse(mensaje)) },
  };
  const script = MAPA_LEAFLET_HTML.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  vm.runInNewContext(script, {
    window,
    L,
    document: { createElement: () => ({ textContent: "" }) },
    console,
  });
  return { window, mensajes, vistas, get marcadores() { return marcadores; } };
}

test("actualiza marcadores sin recentrar salvo que cambie el centro", () => {
  const mapa = cargarMapa();
  const centro = { latitude: -31, longitude: -59, zoom: 15 };
  mapa.window.actualizarMapa({
    centro,
    marcadores: [{ id: "uno", latitude: -31, longitude: -59, titulo: "<b>Cancha</b>" }],
  });
  assert.equal(mapa.marcadores[0].etiqueta.textContent, "<b>Cancha</b>");
  mapa.marcadores[0].click();
  assert.deepEqual(mapa.mensajes, [{ tipo: "listo" }, { tipo: "marcador", id: "uno" }]);

  mapa.window.actualizarMapa({
    centro,
    marcadores: [{ id: "usuario", latitude: -31, longitude: -59, titulo: "Tu ubicación", esUsuario: true }],
  });
  assert.equal(mapa.vistas.length, 1);
  assert.equal(mapa.marcadores.length, 1);
  assert.equal(mapa.marcadores[0].click, undefined);
  mapa.window.actualizarMapa({ centro: { ...centro, secuencia: 1 }, marcadores: [] });
  assert.equal(mapa.vistas.length, 2);
});

test("informa si las bibliotecas no se cargan", () => {
  const mensajes = [];
  const script = MAPA_LEAFLET_HTML.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  vm.runInNewContext(script, {
    window: { ReactNativeWebView: { postMessage: (mensaje) => mensajes.push(JSON.parse(mensaje)) } },
  });
  assert.equal(mensajes[0].tipo, "error");
});
