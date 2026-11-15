import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { TabRouter } = require("expo-router/build/react-navigation/routers/TabRouter");
const { createInitialState } = require("expo-router/build/react-navigation/core/createInitialState");

function cargarRutas() {
  const source = readFileSync(join("src", "utilidades", "rutas.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports });
  return exports;
}

function crearEntorno(overrides) {
  const states = [];
  let cursor = 0;
  let focus;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
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
    useMemo: (callback) => callback(),
    useEffect: overrides.useEffect ?? (() => {}),
  };
  const native = {
    ActivityIndicator: "ActivityIndicator",
    Alert: overrides.alert,
    Image: "Image",
    Modal: "Modal",
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
      useSegments: () => [],
      useRouter: () => overrides.router,
      Link: "Link",
      Stack: { Screen: "StackScreen" },
      Tabs: { Screen: "TabScreen" },
    },
    "expo-image-picker": overrides.imagePicker ?? {},
    "expo-notifications": { setNotificationHandler() {} },
    "expo-splash-screen": { preventAutoHideAsync: async () => {} },
    "expo-status-bar": { StatusBar: "StatusBar" },
    "react-native-safe-area-context": {
      SafeAreaProvider: "SafeAreaProvider",
      SafeAreaView: "SafeAreaView",
    },
    "@/components/auth-guard": { AuthGuard: "AuthGuard" },
    "@/components/administrative-pickers": { DateSelector: "DateSelector", HourSelector: "HourSelector" },
    "@/components/space-select": { SpaceSelect: "SpaceSelect" },
    "@/components/network-status-banner": { NetworkStatusBanner: "NetworkStatusBanner" },
    "@/components/ui/role-tab-icon": { RoleTabIcon: "RoleTabIcon" },
    "@/components/ui/home-dashboard": { HomeDashboard: "HomeDashboard" },
    "@/constants/theme": { Colors: { dark: {} }, Fonts: { sans: "normal" } },
    "@/hooks/use-theme": {
      AppThemeProvider: "AppThemeProvider",
      useTheme: () => ({ backgroundElement: "#fff", backgroundSelected: "#000" }),
      useThemeStyles: () => ({}),
    },
    "@/servicios/auth": overrides.auth,
    "@/servicios/archivos": overrides.archivos ?? {},
    "@/servicios/espacios": { getEspacios: overrides.getEspacios ?? (async () => ({ datos: [] })) },
    "@/servicios/inspecciones": overrides.inspecciones ?? {},
    "@/servicios/admin-bloqueos": overrides.bloqueos ?? {},
    "@/servicios/api": {},
    "@/servicios/dispositivos": {},
    "@/servicios/notificaciones": {},
    "@/servicios/reservas": overrides.reservas ?? {},
    "@/servicios/turnos": overrides.turnos ?? {},
    "@/persistencia/session": {
      getCurrentUserSession: async () => overrides.usuario,
      ...overrides.session,
    },
    "@/utilidades/filtros-espacios": {
      normalizarComplejo: (nombre) => nombre?.trim() || "—",
      etiquetaComplejo: (nombre) => nombre === "—" ? "Otros espacios" : nombre,
      complejosDelCatalogo: (espacios) => [...new Set(espacios.map((espacio) => espacio.complejo?.trim() || "—"))].sort(),
    },
    "@/utilidades/rutas": cargarRutas(),
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
    return exports.default ?? exports.AuthGuard ?? exports.SpaceSelect ?? exports.GestionBloqueos;
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

function pantallasDe(elemento) {
  if (Array.isArray(elemento)) return elemento.flatMap(pantallasDe);
  if (!elemento || typeof elemento !== "object") return [];
  return [
    ...(elemento.type === "TabScreen" ? [elemento.props] : []),
    ...pantallasDe(elemento.props?.children),
  ];
}

function cargarModuloExpo(path, modules) {
  const exports = {};
  vm.runInNewContext(readFileSync(path, "utf8"), {
    exports,
    require(name) {
      if (!(name in modules)) throw new Error(`Módulo Expo no simulado: ${name}`);
      return modules[name];
    },
    __DEV__: false,
    console,
  });
  return exports;
}

function opcionesProcesadas(screens) {
  let procesar;
  cargarModuloExpo(join("node_modules", "expo-router", "build", "layouts", "TabsClient.js"), {
    "../link/Link": {},
    "../react-navigation/bottom-tabs/navigators/createBottomTabNavigator": {},
    "../react-navigation/native": {},
    "../react-navigation/bottom-tabs": {},
    "../standard-navigation/appendMissingPlaceholderTabRoutes": {},
    "./createBaseTabProps": {},
    "../standard-navigation": {
      integrateWithRouter(_navigator, _router, options) {
        procesar = options.processScreens;
        return {};
      },
    },
  });
  return procesar(screens);
}

function evaluarPestana(screens, activa) {
  const redirecciones = [];
  const { useVisibleTabsWithRedirect: evaluarVisibilidad } = cargarModuloExpo(
    join("node_modules", "expo-router", "build", "standard-navigation", "useVisibleTabsWithRedirect.js"),
    {
      react: { useMemo: (callback) => callback(), useEffect: (callback) => callback() },
      "../Route": { useRouteNode: () => ({}) },
      "../constants": { NOT_FOUND_ROUTE_NAME: "+not-found" },
      "../global-state/useRouterActions": {
        useRouterActions: () => ({ replace: (destino) => redirecciones.push(destino) }),
      },
      "../layouts/GuardContext": { useGuardRedirect: () => undefined },
      "../link/preview/PreviewRouteContext": { useIsPreview: () => false },
      "../react-navigation/native": { useIsFocused: () => true },
      "../routeNode": { getValidInitialRouteName: () => "inicio" },
      "../utils/orderRoutesByRouteNames": { orderRoutesByRouteNames: (routes) => routes },
      "./useBuildHref": { useBuildHref: () => (route) => route.name },
    },
  );
  const procesadas = opcionesProcesadas(screens);
  const routes = procesadas.map((screen) => ({ key: screen.name, name: screen.name }));
  const descriptors = Object.fromEntries(procesadas.map((screen) => [
    screen.name,
    { routeSource: "layout", options: screen.options },
  ]));
  const resultado = evaluarVisibilidad({
    routes,
    routeNames: routes.map((route) => route.name),
    focusedRouteKey: activa,
    descriptors,
  });
  return { resultado, redirecciones };
}

test("las vistas respetan el área segura inferior sin duplicarla en las pestañas", () => {
  const entorno = crearEntorno({ router: {}, auth: {} });
  const RootLayout = entorno.cargar(join("src", "app", "_layout.tsx"));
  const root = entorno.render(RootLayout);
  const rootStack = buscar(root, (elemento) => elemento.type?.name === "RootStack");
  assert.ok(rootStack);
  const areaSegura = entorno.render(rootStack.type);
  assert.equal(areaSegura.type, "SafeAreaView");
  assert.ok(areaSegura.props.edges.includes("top"));
  assert.ok(areaSegura.props.edges.includes("bottom"));
  assert.equal(areaSegura.props.style.paddingBottom, 8);
  assert.ok(buscar(areaSegura, (elemento) => elemento.type?.Screen === "StackScreen"));

  for (const rol of ["jugador", "staff", "admin"]) {
    const Layout = entorno.cargar(join("src", "app", `(${rol})`, "_layout.tsx"));
    const tabs = buscar(entorno.render(Layout), (elemento) => elemento.type?.Screen === "TabScreen");
    assert.equal(tabs.props.safeAreaInsets.bottom, 0, rol);
  }
});

for (const [rol, ocultas] of [
  ["jugador", ["espacios", "mapa", "reservas", "perfil", "disponibilidad/index", "disponibilidad/[id]", "espacio/[id]", "espacio/[id]/disponibilidad", "reserva/[id]"]],
  ["staff", ["perfil", "mantenimiento", "bloqueos", "escanear"]],
  ["admin", ["agenda", "asistencia", "inspecciones", "escaner", "precios", "mantenimiento", "reservas-fijas"]],
]) {
  test(`las rutas ocultas de ${rol} se abren sin redirección`, () => {
    const entorno = crearEntorno({ router: {}, auth: {} });
    const Layout = entorno.cargar(join("src", "app", `(${rol})`, "_layout.tsx"));
    const screens = pantallasDe(entorno.render(Layout));
    for (const nombre of ocultas) {
      const screen = screens.find((entry) => entry.name === nombre);
      assert.ok(screen, `Falta la ruta ${nombre}`);
      assert.equal(screen.options.tabBarItemStyle?.display, "none");
      const { resultado, redirecciones } = evaluarPestana(screens, nombre);
      assert.ok(resultado.focusedIndex >= 0, `${nombre} debe ser accesible`);
      assert.equal(redirecciones.length, 0, `${nombre} no debe redirigir`);
    }
  });
}

test("href null reproduce la redirección no deseada", () => {
  const screens = [
    { name: "inicio", options: {} },
    { name: "espacios", options: { href: null } },
  ];
  const { resultado, redirecciones } = evaluarPestana(screens, "espacios");
  assert.equal(resultado.focusedIndex, -1);
  assert.deepEqual(redirecciones, ["inicio"]);
});

for (const rol of ["jugador", "staff", "admin"]) {
  test(`las pestañas visibles de ${rol} muestran íconos`, () => {
    const entorno = crearEntorno({ router: {}, auth: {} });
    const Layout = entorno.cargar(join("src", "app", `(${rol})`, "_layout.tsx"));
    const screens = pantallasDe(entorno.render(Layout))
      .filter((screen) => screen.options.tabBarItemStyle?.display !== "none");
    for (const screen of screens) {
      assert.equal(typeof screen.options.tabBarIcon, "function", `${screen.name} no tiene ícono`);
      const icon = screen.options.tabBarIcon({ color: "#123456", size: 24, focused: true });
      assert.equal(icon.type, "RoleTabIcon");
      assert.ok(icon.props.name);
      assert.equal(icon.props.color, "#123456");
      assert.equal(icon.props.size, 24);
      assert.equal(icon.props.focused, true);
    }
  });
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

test("el selector de inspecciones cambia la cancha y guarda el reporte en ella", async () => {
  const espacios = [{ id: "cancha-1", nombre: "Cancha 1" }, { id: "cancha-2", nombre: "Cancha 2" }];
  const consultas = [];
  const reportes = [];
  let terminarSubida;
  const entorno = crearEntorno({
    router: {},
    usuario: { id: "1", email: "usuario@ejemplo.test", rol: "encargado" },
    auth: {
      isBiometricSupported: async () => true,
      authenticateWithBiometrics: async () => true,
    },
    getEspacios: async () => ({ datos: espacios }),
    inspecciones: {
      listarInspecciones: async (id) => { consultas.push(id); return []; },
      crearInspeccion: async (reporte) => { reportes.push(reporte); },
    },
    archivos: {
      guardarEvidenciasInspeccion: async () => [{ uri: "foto-local", nombre: "foto.jpg", tipo: "foto" }],
      subirEvidenciasInspeccion: () => new Promise((resolve) => { terminarSubida = resolve; }),
    },
    imagePicker: {
      VideoExportPreset: { H264_1280x720: 1 },
      UIImagePickerPreferredAssetRepresentationMode: { Compatible: 1 },
      launchImageLibraryAsync: async () => ({ canceled: false, assets: [{}] }),
    },
  });
  const Pantalla = entorno.cargar("src/app/(staff)/mantenimiento.tsx");
  entorno.render(Pantalla);
  entorno.focus();
  await new Promise(setImmediate);
  let arbol = entorno.render(Pantalla);
  let selector = buscar(arbol, (elemento) => elemento.type === "SpaceSelect");
  assert.equal(selector.props.selectedId, "cancha-1");
  assert.equal(selector.props.spaces.length, 2);
  selector.props.onSelect("cancha-2");
  await new Promise(setImmediate);
  arbol = entorno.render(Pantalla);
  selector = buscar(arbol, (elemento) => elemento.type === "SpaceSelect");
  assert.equal(selector.props.selectedId, "cancha-2");
  assert.equal(consultas.at(-1), "cancha-2");

  const observacion = buscar(arbol, (elemento) =>
    elemento.type === "TextInput" && elemento.props.placeholder === "Describí el estado de la cancha",
  );
  observacion.props.onChangeText("Revisar el piso");
  const adjuntar = buscar(arbol, (elemento) =>
    elemento.type === "Pressable" && buscar(elemento, (hijo) =>
      hijo.type === "Text" && hijo.props.children === "Elegir fotos o videos"),
  );
  adjuntar.props.onPress();
  await new Promise(setImmediate);
  arbol = entorno.render(Pantalla);
  const guardar = buscar(arbol, (elemento) =>
    elemento.type === "Pressable" && buscar(elemento, (hijo) =>
      hijo.type === "Text" && hijo.props.children === "Guardar reporte"),
  );
  guardar.props.onPress();
  arbol = entorno.render(Pantalla);
  assert.equal(buscar(arbol, (elemento) => elemento.type === "SpaceSelect").props.disabled, true);
  terminarSubida(["foto-remota"]);
  await new Promise(setImmediate);
  assert.equal(reportes.length, 1);
  assert.equal(reportes[0].espacioId, "cancha-2");
  assert.equal(reportes[0].observacion, "Revisar el piso");
  assert.equal(consultas.at(-1), "cancha-2");
});

test("si falla la carga de canchas, muestra el error y permite reintentar", async () => {
  let intento = 0;
  const entorno = crearEntorno({
    router: {},
    usuario: { id: "1", email: "usuario@ejemplo.test", rol: "encargado" },
    auth: {
      isBiometricSupported: async () => true,
      authenticateWithBiometrics: async () => true,
    },
    getEspacios: async () => ++intento === 1
      ? { error: { mensaje: "No se pudieron cargar las canchas." } }
      : { datos: [{ id: "cancha-1", nombre: "Cancha 1" }] },
    inspecciones: { listarInspecciones: async () => [] },
  });
  const Pantalla = entorno.cargar("src/app/(staff)/mantenimiento.tsx");
  entorno.render(Pantalla);
  entorno.focus();
  await new Promise(setImmediate);
  let arbol = entorno.render(Pantalla);
  assert.equal(buscar(arbol, (elemento) => elemento.type === "SpaceSelect").props.disabled, true);
  assert.ok(buscar(arbol, (elemento) => elemento.type === "Text" &&
    elemento.props.children === "No se pudieron cargar las canchas."));
  const reintentar = buscar(arbol, (elemento) =>
    elemento.type === "Pressable" && buscar(elemento, (hijo) =>
      hijo.type === "Text" && hijo.props.children === "Reintentar"),
  );
  reintentar.props.onPress();
  await new Promise(setImmediate);
  arbol = entorno.render(Pantalla);
  const selector = buscar(arbol, (elemento) => elemento.type === "SpaceSelect");
  assert.equal(selector.props.disabled, false);
  assert.equal(selector.props.selectedId, "cancha-1");
});

test("el selector múltiple permite elegir varias canchas y conserva la selección simple", () => {
  const entorno = crearEntorno({ router: {}, auth: {} });
  const Selector = entorno.cargar("src/components/space-select.tsx");
  const spaces = [{ id: "1", nombre: "Cancha 1" }, { id: "2", nombre: "Cancha 2" }];
  let seleccionados = [];
  const props = () => ({
    spaces,
    multiple: true,
    selectedIds: seleccionados,
    onSelect: (id) => {
      seleccionados = seleccionados.includes(id)
        ? seleccionados.filter((actual) => actual !== id)
        : [...seleccionados, id];
    },
  });
  let arbol = entorno.render(Selector, props());
  buscar(arbol, (elemento) => elemento.type === "Pressable" && elemento.props.accessibilityState?.expanded === false).props.onPress();
  for (const nombre of ["Cancha 1", "Cancha 2"]) {
    arbol = entorno.render(Selector, props());
    const opcion = buscar(arbol, (elemento) =>
      elemento.type === "Pressable" && elemento.props.accessibilityRole === "checkbox" &&
      buscar(elemento, (hijo) => hijo.type === "Text" && hijo.props.children === nombre),
    );
    opcion.props.onPress();
  }
  arbol = entorno.render(Selector, props());
  assert.equal(buscar(arbol, (elemento) => elemento.type === "Modal").props.visible, true);
  assert.equal(buscar(arbol, (elemento) => elemento.type === "Pressable" && elemento.props.accessibilityState?.expanded === true).props.accessibilityLabel, "2 espacios seleccionados");
  const primeraOpcion = buscar(arbol, (elemento) =>
    elemento.type === "Pressable" && elemento.props.accessibilityRole === "checkbox" &&
    buscar(elemento, (hijo) => hijo.type === "Text" && hijo.props.children === "Cancha 1"),
  );
  assert.equal(primeraOpcion.props.accessibilityState.checked, true);
  primeraOpcion.props.onPress();
  assert.deepEqual(seleccionados, ["2"]);
  const listo = buscar(arbol, (elemento) =>
    elemento.type === "Pressable" && buscar(elemento, (hijo) =>
      hijo.type === "Text" && hijo.props.children === "Listo"),
  );
  listo.props.onPress();
  assert.equal(buscar(entorno.render(Selector, props()), (elemento) => elemento.type === "Modal").props.visible, false);

  let elegido = "";
  const singleProps = { spaces, selectedId: elegido, onSelect: (id) => { elegido = id; } };
  arbol = entorno.render(Selector, singleProps);
  buscar(arbol, (elemento) => elemento.type === "Pressable" && elemento.props.accessibilityState?.expanded === false).props.onPress();
  arbol = entorno.render(Selector, singleProps);
  buscar(arbol, (elemento) => elemento.type === "Pressable" && elemento.props.accessibilityState?.selected === false &&
    buscar(elemento, (hijo) => hijo.type === "Text" && hijo.props.children === "Cancha 1")).props.onPress();
  assert.equal(elegido, "1");
  assert.equal(buscar(entorno.render(Selector, { ...singleProps, selectedId: elegido }), (elemento) => elemento.type === "Modal").props.visible, false);
});

test("el bloqueo conserva varias canchas elegidas al enviar", async () => {
  const efectos = [];
  const creados = [];
  let confirmar;
  const entorno = crearEntorno({
    router: {},
    auth: {},
    useEffect: (callback) => efectos.push(callback),
    alert: { alert: (_titulo, _mensaje, acciones) => { confirmar = acciones.find((accion) => accion.text === "Confirmar bloqueo").onPress; } },
    getEspacios: async () => ({ datos: [
      { id: "1", nombre: "Cancha 1", complejo: "Polideportivo", techado: false },
      { id: "2", nombre: "Cancha 2", complejo: "Polideportivo", techado: true },
      { id: "3", nombre: "Cancha 3", complejo: "Otro", techado: false },
    ] }),
    bloqueos: {
      listarBloqueos: async () => [],
      crearBloqueo: async (input) => { creados.push(input); return []; },
    },
    turnos: { obtenerAgenda: async () => [] },
    reservas: { listarEstadosReservasPorFecha: async () => [] },
  });
  const Gestion = entorno.cargar("src/components/gestion-bloqueos.tsx");
  entorno.render(Gestion);
  for (const efecto of efectos.splice(0)) efecto();
  await new Promise(setImmediate);
  let arbol = entorno.render(Gestion);
  let complejo = buscar(arbol, (elemento) => elemento.type === "SpaceSelect" && !elemento.props.multiple);
  let selector = buscar(arbol, (elemento) => elemento.type === "SpaceSelect" && elemento.props.multiple);
  assert.equal(selector.props.disabled, true);
  assert.deepEqual(Array.from(complejo.props.spaces, (espacio) => espacio.id), ["Otro", "Polideportivo"]);
  complejo.props.onSelect("Polideportivo");
  arbol = entorno.render(Gestion);
  selector = buscar(arbol, (elemento) => elemento.type === "SpaceSelect" && elemento.props.multiple);
  assert.equal(selector.props.disabled, false);
  assert.deepEqual(Array.from(selector.props.spaces, (espacio) => espacio.id), ["1", "2"]);
  const todos = buscar(arbol, (elemento) =>
    elemento.type === "Pressable" && buscar(elemento, (hijo) =>
      hijo.type === "Text" && hijo.props.children === "Seleccionar todos los espacios"),
  );
  todos.props.onPress();
  arbol = entorno.render(Gestion);
  selector = buscar(arbol, (elemento) => elemento.type === "SpaceSelect" && elemento.props.multiple);
  assert.deepEqual(Array.from(selector.props.selectedIds), ["1", "2"]);
  todos.props.onPress();
  arbol = entorno.render(Gestion);
  const descubiertos = buscar(arbol, (elemento) =>
    elemento.type === "Pressable" && buscar(elemento, (hijo) =>
      hijo.type === "Text" && hijo.props.children === "Seleccionar espacios descubiertos"),
  );
  descubiertos.props.onPress();
  arbol = entorno.render(Gestion);
  selector = buscar(arbol, (elemento) => elemento.type === "SpaceSelect" && elemento.props.multiple);
  assert.deepEqual(Array.from(selector.props.selectedIds), ["1"]);
  complejo = buscar(arbol, (elemento) => elemento.type === "SpaceSelect" && !elemento.props.multiple);
  complejo.props.onSelect("Otro");
  arbol = entorno.render(Gestion);
  selector = buscar(arbol, (elemento) => elemento.type === "SpaceSelect" && elemento.props.multiple);
  assert.deepEqual(Array.from(selector.props.selectedIds), []);
  assert.deepEqual(Array.from(selector.props.spaces, (espacio) => espacio.id), ["3"]);
  complejo = buscar(arbol, (elemento) => elemento.type === "SpaceSelect" && !elemento.props.multiple);
  complejo.props.onSelect("Polideportivo");
  arbol = entorno.render(Gestion);
  selector = buscar(arbol, (elemento) => elemento.type === "SpaceSelect" && elemento.props.multiple);
  selector.props.onSelect("1");
  selector.props.onSelect("2");
  arbol = entorno.render(Gestion);
  selector = buscar(arbol, (elemento) => elemento.type === "SpaceSelect" && elemento.props.multiple);
  assert.deepEqual(Array.from(selector.props.selectedIds), ["1", "2"]);
  buscar(arbol, (elemento) => elemento.type === "TextInput").props.onChangeText("Mantenimiento");
  arbol = entorno.render(Gestion);
  const previsualizar = buscar(arbol, (elemento) =>
    elemento.type === "Pressable" && buscar(elemento, (hijo) =>
      hijo.type === "Text" && hijo.props.children === "Previsualizar y bloquear"),
  );
  previsualizar.props.onPress();
  await new Promise(setImmediate);
  assert.equal(typeof confirmar, "function");
  confirmar();
  await new Promise(setImmediate);
  assert.equal(creados.length, 1);
  assert.deepEqual(Array.from(creados[0].espacioIds), ["1", "2"]);
  assert.equal(creados[0].motivo, "Mantenimiento");
});

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
    assert.equal(destinos[0], rol === "jugador" ? "/(jugador)/inicio" : "/(auth)/biometria");
  });
}

for (const [rol, destino] of [
  ["administrador", "/(admin)/inicio"],
  ["encargado", "/(staff)/agenda"],
  ["jugador", "/(jugador)/inicio"],
]) {
  test(`la verificación biométrica de ${rol} abre su destino`, async () => {
    const destinos = [];
    const entorno = crearEntorno({
      router: { replace: (ruta) => destinos.push(ruta) },
      usuario: { rol, email: "usuario@ejemplo.test" },
      useEffect: (efecto) => efecto(),
      auth: { isBiometricSupported: async () => true },
      session: { finishBiometricLogin: async () => true },
    });
    const Biometria = entorno.cargar("src/app/(auth)/biometria.tsx");
    entorno.render(Biometria);
    await new Promise(setImmediate);
    assert.equal(destinos[0], destino);
  });
}

test("el administrador que verifica con contraseña abre Inicio", async () => {
  const destinos = [];
  const entorno = crearEntorno({
    router: { replace: (ruta) => destinos.push(ruta) },
    usuario: { rol: "administrador", email: "admin@ejemplo.test" },
    useEffect: (efecto) => efecto(),
    auth: {
      isBiometricSupported: async () => false,
      verificarContrasena: async () => {},
    },
  });
  const Biometria = entorno.cargar("src/app/(auth)/biometria.tsx");
  entorno.render(Biometria);
  await new Promise(setImmediate);
  let arbol = entorno.render(Biometria);
  buscar(arbol, (elemento) => elemento.type === "TextInput").props.onChangeText("contrasena");
  arbol = entorno.render(Biometria);
  buscar(arbol, (elemento) =>
    elemento.type === "Pressable" && buscar(elemento, (hijo) =>
      hijo.type === "Text" && hijo.props.children === "Continuar con contraseña"),
  ).props.onPress();
  await new Promise(setImmediate);
  assert.equal(destinos[0], "/(admin)/inicio");
});
