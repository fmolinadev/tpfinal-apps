# Villaguay Deportes — TP Final Apps | PRD 05 - Reservas Deportivas

Aplicación móvil para consultar espacios deportivos, revisar horarios, crear y gestionar reservas, y dar soporte a la operación del complejo desde perfiles de jugador, encargado y administrador.

El proyecto corresponde al trabajo final de la materia Desarrollo de Aplicaciones Móviles de la FCAd, UNER. Está desarrollado con Expo, React Native, TypeScript y Expo Router. En el estado actual, los datos y las operaciones principales se simulan localmente: no hay una API ni una base de datos remota conectadas.

## Índice

- [Qué permite hacer](#qué-permite-hacer)
- [Tecnologías](#tecnologías)
- [Requisitos e instalación](#requisitos-e-instalación)
- [Cómo ejecutar](#cómo-ejecutar)
- [Acceso de demostración](#acceso-de-demostración)
- [Recorrido de la aplicación](#recorrido-de-la-aplicación)
- [Arquitectura](#arquitectura)
- [Datos, persistencia y mocks](#datos-persistencia-y-mocks)
- [Reglas principales](#reglas-principales)
- [Rutas](#rutas)
- [Configuración de Expo](#configuración-de-expo)
- [Estado actual y limitaciones conocidas](#estado-actual-y-limitaciones-conocidas)
- [Próximos pasos](#próximos-pasos)

## Qué permite hacer

### Jugador

- Iniciar sesión o crear una cuenta de demostración.
- Consultar el catálogo de espacios deportivos y sus características.
- Ver información de un espacio, su precio, reglas, imágenes, video y ubicación.
- Consultar horarios por espacio y fecha. Los horarios ya iniciados no se ofrecen como disponibles.
- Crear una reserva seleccionando un turno libre y una cantidad de jugadores.
- Ver próximas y pasadas reservas, abrir el detalle de una reserva y consultar su QR.
- Cancelar una reserva futura si faltan más de cuatro horas para el inicio. Para cancelaciones más cercanas, la interfaz indica que hay que comunicarse con el complejo. Una reserva cuyo turno ya pasó no se puede cancelar.
- Recibir un recordatorio local programado para dos horas antes del turno, si el dispositivo permite notificaciones y todavía hay tiempo para programarlo.

### Encargado

- Consultar la agenda diaria por espacio.
- Validar un código QR ingresado manualmente.
- Registrar la asistencia como presente o ausente.
- Consultar pantallas de bloqueos/mantenimiento y perfil operativo.

### Administrador

- Acceder al panel administrativo.
- Administrar precios por espacio, mantenimientos y reservas fijas desde las operaciones disponibles en los servicios administrativos.
- Acceder a la agenda y al control de ingreso.

La disponibilidad y el alcance de cada acción dependen de la pantalla: algunas vistas son funcionales con mocks y otras son pantallas base todavía en desarrollo. Ver [Estado actual y limitaciones conocidas](#estado-actual-y-limitaciones-conocidas).

## Tecnologías

- **Expo SDK 57** y **Expo Router** para la aplicación y navegación basada en archivos.
- **React 19**, **React Native 0.86** y **TypeScript 6**.
- **expo-secure-store** para guardar el token y el usuario de sesión.
- **expo-local-authentication** para consultar y ejecutar autenticación biométrica.
- **expo-sqlite/kv-store** para la caché local de reservas.
- **expo-notifications** para recordatorios locales.
- **react-native-qrcode-svg** para mostrar códigos QR.
- **react-native-maps**, **expo-location**, **expo-camera**, **expo-video** y otros módulos Expo para capacidades nativas previstas o utilizadas por distintas pantallas.

Las dependencias y comandos del proyecto están declarados en [`package.json`](./package.json); la configuración nativa y los plugins están en [`app.json`](./app.json).

## Requisitos e instalación

1. Instalar una versión de **Node.js compatible con Expo SDK 57** y npm.
2. Clonar el repositorio y ubicarse en la carpeta del proyecto.
3. Instalar dependencias:

   ```bash
   npm install
   ```

Para ejecutar en un dispositivo físico, instalar **Expo Go** si la versión de la aplicación es compatible con los módulos utilizados. Los módulos nativos o cambios de configuración pueden requerir un development build. Para Android nativo se necesita Android Studio, Android SDK y un emulador o dispositivo configurado.

## Cómo ejecutar

Iniciar Expo:

```bash
npx expo start
```

Desde el menú de Expo se puede abrir la aplicación en un dispositivo o emulador. También están definidos estos comandos:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

`android` y `ios` ejecutan builds nativos locales; `web` inicia la versión web. `lint` invoca `expo lint` y necesita que el proyecto tenga ESLint configurado. No hay un comando de pruebas automatizadas declarado actualmente.

## Acceso de demostración

Las cuentas están definidas en [`src/mocks/usuarios.ts`](./src/mocks/usuarios.ts):

| Perfil        | Email                   | Contraseña |
| ------------- | ----------------------- | ---------- |
| Jugador       | `demo@tpfinal.com`      | `123456`   |
| Encargado     | `encargado@tpfinal.com` | `admin123` |
| Administrador | `admin@tpfinal.com`     | `admin123` |

El registro agrega un usuario jugador al arreglo mock durante la ejecución actual. Al reiniciar la aplicación, ese usuario registrado no se conserva en un backend.

## Recorrido de la aplicación

### 1. Inicio y autenticación

La ruta inicial `src/app/index.tsx` muestra una pantalla de presentación y luego navega al login. El login y el registro llaman a los métodos de [`src/servicios/auth.ts`](./src/servicios/auth.ts). Estos buscan o agregan usuarios en mocks, generan un token simulado y guardan token y usuario con Secure Store.

Después de iniciar sesión, la navegación depende del rol:

- jugador → `/(jugador)/inicio`
- encargado → `/(staff)/agenda`
- administrador → `/(admin)/agenda`

Los grupos de navegación están definidos bajo `src/app/`. [`src/components/auth-guard.tsx`](./src/components/auth-guard.tsx) revisa la sesión y el rol permitido al entrar en las áreas protegidas. Si la sesión no está disponible, redirige al login.

La ruta `/(auth)/biometria` y las funciones biométricas existen; la restauración de sesión puede solicitar biometría cuando el dispositivo la soporta. El splash actual, sin embargo, dirige directamente al login.

### 2. Buscar espacios y disponibilidad

El jugador puede abrir el catálogo desde `/(jugador)/espacios` o la pantalla de disponibilidad desde `/(jugador)/disponibilidad`. El catálogo se carga a través de [`src/servicios/espacios.ts`](./src/servicios/espacios.ts), que actualmente lee `src/mocks/index.ts`.

La pantalla principal `src/app/espacio/[id]/disponibilidad.tsx` obtiene el espacio y los turnos para la fecha seleccionada, compone la grilla horaria y permite elegir solo turnos libres que todavía no comenzaron. La consulta se realiza mediante `getTurnos` en [`src/servicios/reservas.ts`](./src/servicios/reservas.ts). También existe una ruta anidada de disponibilidad del jugador en `src/app/(jugador)/disponibilidad/[id].tsx` y un servicio anterior, `src/servicios/turnos.ts`, que utiliza un modelo de turno diferente.

La lógica de evaluación de reservas, reservas fijas y mantenimiento está en [`src/utilidades/disponibilidad.ts`](./src/utilidades/disponibilidad.ts). Separa el cálculo del estado de un turno de la interfaz.

### 3. Crear y consultar una reserva

Al elegir un turno libre, el jugador confirma la cantidad de personas. `crearReserva` valida que la fecha/hora no haya pasado y que no se exceda el máximo de tres reservas activas configurado en el mock. Luego agrega la reserva a memoria y devuelve una respuesta simulada.

La pantalla de confirmación puede solicitar permisos y programar un recordatorio local. Las reservas se consultan desde la sección de reservas, con vistas de próximas y pasadas, y el detalle muestra información del turno y un QR.

### 4. Cancelar una reserva

La pantalla de detalle permite cancelar si la reserva sigue activa y faltan más de cuatro horas para su inicio. La función `cancelarReserva` también comprueba que el turno aún no haya comenzado antes de cambiar su estado. Si el turno ya pasó, la acción no se permite.

### 5. Operación del complejo

El grupo `/(staff)` está protegido para encargado y administrador. Incluye agenda, validación de ingreso, asistencia, bloqueos y perfil. El grupo `/(admin)` está restringido al rol administrador e incluye panel, perfil y rutas administrativas de agenda, precios, mantenimiento, reservas fijas y escáner.

Las operaciones de QR, asistencia, bloqueos, precios, mantenimientos y reservas recurrentes están centralizadas en [`src/servicios/admin.ts`](./src/servicios/admin.ts). La validación QR se realiza comparando el código con las reservas mock y verifica que esté activa, corresponda al día actual, al espacio esperado cuando se informa y que no haya pasado.

## Arquitectura

La estructura principal del código es:

```text
src/
├── app/                # Rutas, pantallas y layouts de Expo Router
│   ├── (auth)/         # Login, registro y biometría
│   ├── (jugador)/      # Experiencia del jugador
│   ├── (staff)/        # Operación del encargado
│   ├── (admin)/        # Administración
│   ├── (tabs)/         # Navegación alternativa/legada
│   ├── espacio/        # Detalle y disponibilidad
│   └── reserva/        # Detalle de reserva
├── components/         # Componentes compartidos y guard de sesión
├── constants/          # Tema y constantes visuales
├── hooks/              # Hooks de tema
├── mocks/              # Datos locales de demostración
├── persistencia/       # Coordinación de la sesión local
├── servicios/          # Acceso a datos y operaciones del negocio
├── tipos/              # Modelos TypeScript
└── utilidades/         # Lógica de disponibilidad
```

El flujo previsto para datos es:

```text
Pantalla → servicio → fuente de datos (mock actualmente; API a futuro)
```

Los servicios devuelven respuestas tipadas con `datos` y metadatos, o un objeto `error`. [`src/servicios/api.ts`](./src/servicios/api.ts) implementa `simularFetch`, que agrega una demora para representar una petición remota.

### Modelos

Los tipos compartidos más nuevos están en `src/tipos/index.ts`: `Espacio`, `Turno`, `Reserva`, roles y respuesta API. También existen modelos previos separados en `src/tipos/espacio.ts`, `reserva.ts`, `turno.ts` y `usuario.ts`, usados por ciertos servicios y pantallas antiguas.

## Datos, persistencia y mocks

- **Usuarios, espacios y reservas:** `src/mocks/usuarios.ts`, `src/mocks/index.ts`, además de `src/mocks/espacios.ts` y `src/mocks/reservas.ts`.
- **Turnos y mantenimiento:** `src/mocks/turnos.ts` y los arreglos de `src/mocks/index.ts`.
- **Sesión:** Secure Store mediante las funciones de `src/servicios/auth.ts` y `src/persistencia/session.ts`.
- **Caché de reservas:** `expo-sqlite/kv-store` desde `src/servicios/reservas.ts`. Sirve como respaldo de lectura para la interfaz; las operaciones simuladas no constituyen sincronización real.
- **Notificaciones:** `src/servicios/notificaciones.ts` solicita permisos antes de programar recordatorios locales.

Los mocks viven en memoria mientras la aplicación está abierta, salvo los datos explícitamente escritos en almacenamiento local. No representan persistencia multiusuario ni sincronización entre dispositivos.

## Reglas principales

- Los turnos comienzan a las 08:00 y la grilla mostrada llega hasta las 23:00 (turnos de una hora).
- No se debe mostrar como opción de reserva un turno que ya comenzó.
- No se puede crear una reserva con fecha/hora vencida.
- No se puede cancelar una reserva cuyo turno ya pasó.
- La interfaz habilita la cancelación ordinaria solo con más de cuatro horas de anticipación; si queda menos, informa que hay que contactar al complejo.
- Las reservas fijas y los mantenimientos pueden bloquear los turnos que se solapan.
- Los servicios administrativos validan, entre otras cosas, fechas, franjas horarias y solapamientos.
- Los QR solo habilitan el acceso cuando la reserva mock pasa las validaciones de estado, fecha y espacio.

## Rutas

### Autenticación

| Ruta                | Propósito                               |
| ------------------- | --------------------------------------- |
| `/`                 | Presentación inicial; redirige al login |
| `/(auth)/login`     | Inicio de sesión                        |
| `/(auth)/registro`  | Alta mock de jugador                    |
| `/(auth)/biometria` | Validación biométrica                   |

### Jugador

| Ruta                             | Propósito                                           |
| -------------------------------- | --------------------------------------------------- |
| `/(jugador)/inicio`              | Inicio del jugador                                  |
| `/(jugador)/espacios`            | Catálogo y búsqueda de horarios                     |
| `/(jugador)/espacio/[id]`        | Detalle de un espacio                               |
| `/(jugador)/disponibilidad`      | Acceso a disponibilidad                             |
| `/(jugador)/disponibilidad/[id]` | Disponibilidad de un espacio                        |
| `/espacio/[id]/disponibilidad`   | Grilla principal, selección y confirmación de turno |
| `/(jugador)/reservas`            | Reservas próximas y pasadas                         |
| `/reserva/[id]`                  | Detalle, QR y cancelación                           |
| `/(jugador)/mapa`                | Pantalla base de mapa                               |
| `/(jugador)/perfil`              | Perfil del jugador                                  |

### Encargado

| Ruta                        | Propósito                        |
| --------------------------- | -------------------------------- |
| `/(staff)/inicio`           | Inicio operativo                 |
| `/(staff)/agenda`           | Agenda diaria por espacio        |
| `/(staff)/escanear`         | Ingreso manual de código QR      |
| `/(staff)/presente-ausente` | Registro de asistencia           |
| `/(staff)/bloqueos`         | Pantalla de bloqueos             |
| `/(staff)/mantenimiento`    | Pantalla de mantenimiento        |
| `/(staff)/reservas-fijas`   | Pantalla de reservas recurrentes |
| `/(staff)/precios`          | Pantalla de precios              |
| `/(staff)/perfil`           | Perfil y cierre de sesión        |

### Administrador

| Ruta                      | Propósito                             |
| ------------------------- | ------------------------------------- |
| `/(admin)/inicio`         | Panel de accesos rápidos              |
| `/(admin)/agenda`         | Agenda                                |
| `/(admin)/escaner`        | Ruta administrativa de escáner        |
| `/(admin)/precios`        | Ruta administrativa de precios        |
| `/(admin)/mantenimiento`  | Ruta administrativa de mantenimiento  |
| `/(admin)/reservas-fijas` | Ruta administrativa de reservas fijas |
| `/(admin)/perfil`         | Perfil                                |

El grupo `/(tabs)` contiene otra navegación con inicio, reservas y perfil. Es una estructura alternativa que coexiste con los grupos por rol.

## Configuración de Expo

`app.json` define el nombre/slug, orientación vertical, esquema `tpfinalapps`, identificador Android `com.molidev.tpfinalapps`, iconos y plugins de Expo. También activa rutas tipadas y React Compiler.

Los recursos visuales de la marca están en `assets/images/`. El splash configurado utiliza `villaguay_splash_icon.png`.

## Estado actual y limitaciones conocidas

- **No hay backend real:** autenticación, reservas, turnos y operaciones administrativas usan datos mock locales.
- **Los datos no están centralizados:** existen dos conjuntos/modelos de mocks y dos servicios de turnos de distintas etapas. Algunas pantallas consultan `src/mocks/index.ts`; otras usan `src/mocks/turnos.ts`, `src/mocks/reservas.ts` y `src/utilidades/disponibilidad.ts`.
- **Los mocks contienen fechas de ejemplo fijas** (incluido septiembre de 2026). La grilla principal genera horarios del día seleccionado y filtra los vencidos, pero los ejemplos de reservas/turnos no deben interpretarse como datos reales.
- **Hay una discrepancia de identificadores en la demo de reservas:** el usuario jugador de `usuariosMock` tiene id `user_jugador_1`, mientras que la creación mock fija el propietario como `usuario-100`; `getMisReservas` filtra por el id de sesión. Por eso las reservas demo/creadas pueden no coincidir con el usuario que inició sesión. Antes de integrar o evaluar el flujo completo, conviene pasar el `usuarioId` autenticado al servicio y unificar los datos de muestra.
- **La cámara no está integrada al escáner actual:** la pantalla de acceso permite ingresar el contenido del QR manualmente; el proyecto incluye `expo-camera`, pero no se está usando en esa pantalla.
- **Algunas rutas administrativas y del encargado son pantallas base** aunque existan operaciones correspondientes en los servicios. Revisar cada pantalla antes de considerar completa una tarea de gestión.
- `src/app/(tabs)/` y modelos separados en `src/tipos/` forman parte de una estructura anterior que todavía coexiste con la navegación por roles y los tipos consolidados.
- El script `npm run lint` está declarado, pero requiere una configuración y dependencias de ESLint que no están incluidas actualmente en `package.json`.

## Próximos pasos

1. Unificar modelos, identificadores y conjuntos de mocks; corregir el flujo de reservas para usar el usuario de la sesión.
2. Definir e integrar el backend/API y una persistencia real compartida.
3. Completar las pantallas de administración y encargado, conectándolas de extremo a extremo con los servicios.
4. Integrar lectura de QR con cámara y validar permisos/plataformas.
5. Alinear el flujo de restauración de sesión y biometría con la pantalla inicial.
6. Incorporar pruebas para disponibilidad, solapamientos, reservas, límites de cancelación y roles.
7. Configurar ESLint y automatizaciones de validación.
