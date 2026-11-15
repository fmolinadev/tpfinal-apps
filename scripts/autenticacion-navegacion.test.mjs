import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { TabRouter } = require("expo-router/build/react-navigation/routers/TabRouter");
const { createInitialState } = require("expo-router/build/react-navigation/core/createInitialState");

function crearEntorno(overrides) {
  const states = [];
  let cursor = 0;
  let focus;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [
        states[index],
        (value) => {
          states[index] = typeof value === "function" ? value(states[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = { current: initial };
      return states[index];
    },
    useCallback: (callback) => callback,
  };
  const native = {
    ActivityIndicator: "ActivityIndicator",
    Image: "Image",
    Pressable: "Pressable",
    Text: "Text",
    TextInput: "TextInput",
    View: "View",
    ScrollView: "ScrollView",
    StyleSheet: { create: (styles) => styles },
  };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": native,
    "expo-router": {
      useFocusEffect: (callback) => { focus = callback; },
      useLocalSearchParams: () => ({}),
      useRouter: () => overrides.router,
      Link: "Link",
      Tabs: { Screen: "TabScreen" },
    },
    "expo-image-picker": {},
    "@/components/auth-guard": { AuthGuard: "AuthGuard" },
    "@/components/ui/role-tab-icon": { RoleTabIcon: "RoleTabIcon" },
    "@/components/ui/home-dashboard": { HomeDashboard: "HomeDashboard" },
    "@/constants/theme": { Fonts: { sans: "normal" } },
    "@/hooks/use-theme": {
      useTheme: () => ({ backgroundSelected: "#000" }),
      useThemeStyles: () => ({}),
    },
    "@/servicios/auth": overrides.auth,
    "@/servicios/archivos": {},
    "@/servicios/espacios": { getEspacios: async () => ({ datos: [] }) },
    "@/servicios/inspecciones": {},
    "@/persistencia/session": { getCurrentUserSession: async () => overrides.usuario },
    "@/utilidades/rutas": {
      rutaInicioPorRol: (rol) => `inicio:${rol}`,
      rutaReservaPendiente: () => null,
    },
  };

  function cargar(path) {
    const source = readFileSync(path, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
      exports,
      require(name) {
        if (name.startsWith("@/assets/")) return name;
        if (!(name in modules)) throw new Error(`Módulo no simulado: ${name}`);
        return modules[name];
      },
      console,
    });
    return exports.default ?? exports.AuthGuard;
  }

  return {
    cargar,
    render(Component, props = {}) {
      cursor = 0;
      return Component(props);
    },
    focus() { return focus(); },
  };
}

function buscar(elemento, predicado) {
  if (!elemento || typeof elemento !== "object") return null;
  if (predicado(elemento)) return elemento;
  const children = elemento.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const encontrado = buscar(child, predicado);
    if (encontrado) return encontrado;
  }
  return null;
}

for (const [rol, visitas] of [
  ["jugador", ["espacios", "espacio/[id]", "espacio/[id]/disponibilidad"]],
  ["staff", ["agenda", "mantenimiento", "bloqueos"]],
  ["admin", ["agenda", "inspecciones", "mantenimiento"]],
]) {
  test(`Atrás recupera las vistas previas de ${rol}`, () => {
    const entorno = crearEntorno({ router: {}, auth: {} });
    const Layout = entorno.cargar(`src/app/(${rol})/_layout.tsx`);
    const tabs = buscar(entorno.render(Layout), (elemento) => elemento.type?.Screen === "TabScreen");
    const router = TabRouter({ backBehavior: tabs.props.backBehavior });
    const options = {
      routeNames: ["inicio", ...visitas],
      routeParamList: {},
      routeGetIdList: {},
    };
    let state = createInitialState({ routeNames: options.routeNames, parentChain: "root" });
    for (const name of visitas) {
      state = router.getStateForAction(state, { type: "PUSH", payload: { name } }, options).state;
    }
    for (const name of ["inicio", ...visitas.slice(0, -1)].reverse()) {
      state = router.getStateForAction(state, { type: "GO_BACK" }, options).state;
      assert.equal(state.routes[state.index].name, name);
    }
  });
}

test("los accesos administrativos abren las pantallas compartidas", async () => {
  const entorno = crearEntorno({ router: {}, auth: {} });
  const Inicio = entorno.cargar("src/app/(admin)/inicio.tsx");
  const dashboard = entorno.render(Inicio);
  const Layout = entorno.cargar("src/app/(admin)/_layout.tsx");
  const layout = entorno.render(Layout);
  for (const [title, name, shared] of [
    ["Asistencia", "asistencia", "presente-ausente"],
    ["Inspecciones", "inspecciones", "mantenimiento"],
  ]) {
    const item = dashboard.props.items.find((entry) => entry.title === title);
    assert.equal(item.href, `/(admin)/${name}`);
    assert.ok(buscar(layout, (elemento) => elemento.type === "TabScreen" && elemento.props.name === name));
    assert.match(readFileSync(`src/app/(admin)/${name}.tsx`, "utf8"), new RegExp(`\\.\\./\\(staff\\)/${shared}`));
  }
});

for (const rol of ["encargado", "administrador"]) {
  test(`inspecciones admite a ${rol} y abre sus bloqueos`, async () => {
    const destinos = [];
    const entorno = crearEntorno({
      router: { push: (destino) => destinos.push(destino) },
      usuario: { id: "1", email: "usuario@ejemplo.test", rol },
      auth: {
        isBiometricSupported: async () => true,
        authenticateWithBiometrics: async () => true,
      },
    });
    const Pantalla = entorno.cargar("src/app/(staff)/mantenimiento.tsx");
    entorno.render(Pantalla);
    entorno.focus();
    await new Promise(setImmediate);
    const arbol = entorno.render(Pantalla);
    assert.ok(arbol.props.allowedRoles.includes(rol));
    const boton = buscar(arbol, (elemento) =>
      elemento.type === "Pressable" && buscar(elemento, (hijo) =>
        hijo.type === "Text" && hijo.props.children === "Administrar bloqueos"),
    );
    assert.ok(boton);
    boton.props.onPress();
    assert.equal(destinos[0], rol === "administrador" ? "/(admin)/mantenimiento" : "/(staff)/bloqueos");
  });
}

test("mantiene la navegación montada y bloqueada mientras revalida la sesión", async () => {
  let resolverToken;
  let lectura = 0;
  const entorno = crearEntorno({
    router: { replace() { assert.fail("No debe redirigir una sesión válida"); } },
    auth: {
      getSessionToken: () => {
        lectura++;
        return lectura === 1 ? Promise.resolve("token") : new Promise((resolve) => { resolverToken = resolve; });
      },
      getSessionUser: async () => ({ rol: "jugador" }),
    },
  });
  const Guard = entorno.cargar("src/components/auth-guard.tsx");
  const navegacion = { type: "Tabs", props: {} };
  const props = { allowedRoles: ["jugador"], children: navegacion };

  entorno.render(Guard, props);
  entorno.focus();
  await new Promise(setImmediate);
  let arbol = entorno.render(Guard, props);
  assert.ok(buscar(arbol, (elemento) => elemento === navegacion));

  entorno.focus();
  arbol = entorno.render(Guard, props);
  const contenedor = buscar(arbol, (elemento) => elemento.props?.children === navegacion);
  assert.equal(contenedor.props.pointerEvents, "none");
  assert.equal(contenedor.props.accessibilityElementsHidden, true);

  resolverToken("token");
  await new Promise(setImmediate);
  arbol = entorno.render(Guard, props);
  assert.equal(buscar(arbol, (elemento) => elemento.props?.children === navegacion).props.pointerEvents, "auto");
});

test("una sesión que deja de existir permanece bloqueada y vuelve al login", async () => {
  let token = "token";
  const destinos = [];
  const entorno = crearEntorno({
    router: { replace: (destino) => destinos.push(destino) },
    auth: {
      getSessionToken: async () => token,
      getSessionUser: async () => ({ rol: "jugador" }),
    },
  });
  const Guard = entorno.cargar("src/components/auth-guard.tsx");
  const navegacion = { type: "Tabs", props: {} };
  const props = { allowedRoles: ["jugador"], children: navegacion };
  entorno.render(Guard, props);
  entorno.focus();
  await new Promise(setImmediate);
  entorno.render(Guard, props);

  token = null;
  entorno.focus();
  await new Promise(setImmediate);
  const arbol = entorno.render(Guard, props);
  assert.equal(destinos[0], "/(auth)/login");
  assert.equal(buscar(arbol, (elemento) => elemento.props?.children === navegacion).props.pointerEvents, "none");
});

for (const rol of ["encargado", "administrador", "jugador"]) {
  test(`el ingreso de ${rol} abre el destino esperado`, async () => {
    const destinos = [];
    const entorno = crearEntorno({
      router: { replace: (destino) => destinos.push(destino) },
      auth: { loginUsuario: async () => ({ token: "token", usuario: { rol } }) },
    });
    const Login = entorno.cargar("src/app/(auth)/login.tsx");
    let arbol = entorno.render(Login);
    const inputs = [];
    buscar(arbol, (elemento) => {
      if (elemento.type === "TextInput") inputs.push(elemento);
      return false;
    });
    inputs[0].props.onChangeText("usuario@ejemplo.test");
    inputs[1].props.onChangeText("contrasena");
    arbol = entorno.render(Login);
    const boton = buscar(arbol, (elemento) =>
      elemento.type === "Pressable" && elemento.props.onPress?.name === "handleLogin",
    );
    assert.ok(boton);
    await boton.props.onPress();
    assert.equal(destinos[0], rol === "jugador" ? "inicio:jugador" : "/(auth)/biometria");
  });
}
