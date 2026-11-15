# Villaguay Deportes — TP Final Apps | PRD 05 - Reservas Deportivas

Aplicación móvil para consultar espacios deportivos, revisar horarios, crear y gestionar reservas, y dar soporte a la operación del complejo desde perfiles de jugador, encargado y administrador.

El proyecto corresponde al trabajo final de la materia Desarrollo de Aplicaciones Móviles de la FCAd, UNER. Está desarrollado con Expo, React Native, TypeScript y Expo Router. Los servicios consultan la API de Reservas Deportivas; la persistencia local se usa para la sesión y las cachés offline.

La API configurada para el despliegue corre en **Render**, con **Supabase** para PostgreSQL y el almacenamiento de archivos. La aplicación consume la API por HTTPS; no se conecta directamente a Supabase. El estado de ese servicio se consulta en [su endpoint de salud](https://api-reservas-deportivas-m7az.onrender.com/salud).

## Índice

- [Qué permite hacer](#qué-permite-hacer)
- [Tecnologías](#tecnologías)
- [Requisitos e instalación](#requisitos-e-instalación)
- [Cómo ejecutar](#cómo-ejecutar)
- [Acceso y usuarios de demostración](#acceso-y-usuarios-de-demostración)
- [Recorrido de la aplicación](#recorrido-de-la-aplicación)
- [Arquitectura](#arquitectura)
- [Datos y persistencia](#datos-y-persistencia)
- [Reglas principales](#reglas-principales)
- [Rutas](#rutas)
- [Configuración de Expo](#configuración-de-expo)
- [Builds](#builds)
- [Estado actual y limitaciones conocidas](#estado-actual-y-limitaciones-conocidas)
- [Próximos pasos](#próximos-pasos)

## Qué permite hacer

### Jugador

- Iniciar sesión o crear una cuenta de jugador.
- Consultar el catálogo de espacios deportivos y sus características.
- Ver información de un espacio, su precio, reglas, imágenes, video y ubicación.
- Consultar horarios por espacio y fecha. Los horarios ya iniciados no se ofrecen como disponibles.
- Crear una reserva seleccionando un turno libre y una cantidad de jugadores.
- Ver próximas y pasadas reservas, abrir el detalle de una reserva y consultar su QR.
- Cancelar una reserva futura hasta el límite informado por la API. Para cancelaciones fuera de plazo, la interfaz indica que hay que comunicarse con el complejo.
- Escanear el QR fijo de un espacio para validar una reserva propia.
- Marcar espacios como favoritos y recibir avisos cuando se libera un turno.
- Recibir recordatorios locales dos horas antes y avisos push del complejo, si el dispositivo y la API tienen las notificaciones habilitadas.

### Encargado

- Consultar la agenda diaria por espacio.
- Escanear el QR de una reserva o ingresar su código manualmente para registrar el ingreso.
- Consultar la asistencia y registrar ausencias.
- Crear, consultar y eliminar bloqueos; cargar y consultar reportes de inspección con evidencias.

### Administrador

- Acceder al panel administrativo.
- Gestionar precios por espacio, bloqueos y reservas fijas.
- Acceder a la agenda, el control de ingreso, la asistencia y los reportes de inspección.

La disponibilidad y el alcance de cada acción dependen de la pantalla; las pantallas funcionales cargan sus datos desde la API.

## Tecnologías

- **Expo SDK 58** y **Expo Router** para la aplicación y navegación basada en archivos.
- **React 19**, **React Native 0.88** y **TypeScript 6**.
- **expo-secure-store** para guardar el token y el usuario de sesión.
- **expo-local-authentication** para consultar y ejecutar autenticación biométrica.
- **expo-sqlite** para las cachés locales de reservas y espacios; **expo-network** para el estado global de conectividad.
- **expo-notifications** para recordatorios locales y avisos push.
- **react-native-qrcode-svg** para mostrar códigos QR.
- **react-native-webview**, Leaflet, MapLibre y OpenFreeMap para mapas; **expo-location**, **expo-camera** y **expo-video** para ubicación, cámara y video.

Las dependencias y comandos del proyecto están declarados en [`package.json`](./package.json); la configuración nativa y los plugins están en [`app.json`](./app.json).

## Requisitos e instalación

1. Instalar una versión de **Node.js compatible con Expo SDK 58** y npm.
2. Clonar el repositorio y ubicarse en la carpeta del proyecto.
3. Instalar dependencias:

   ```bash
   npm install
   ```

Para ejecutar en un dispositivo físico, instalar **Expo Go** si la versión de la aplicación es compatible con los módulos utilizados. Los módulos nativos o cambios de configuración pueden requerir un development build. Para Android nativo se necesita Android Studio, Android SDK y un emulador o dispositivo configurado.

## Notificaciones locales y push

El proyecto ya tiene configurados el plugin `expo-notifications` y el `projectId` de EAS en [`app.json`](./app.json). El layout principal instala el manejador de notificaciones, solicita permisos y registra el teléfono al iniciar sesión o al restaurar una sesión activa; también permite volver a probarlo desde **Perfil > Activar y probar notificaciones**. Los recordatorios de reservas son locales; la app consulta la API al volver a primer plano para reconciliarlos y quitar los de reservas canceladas remotamente.

Al abrir la app o volver a primer plano, si una reserva que estaba activa pasó a cancelada por un bloqueo, se muestra una notificación local con el motivo. Se requiere conexión, permiso para notificar y una versión de la API con `GET /yo/reservas/cancelaciones-por-bloqueo`. Sin caché previa no se avisa sobre cancelaciones antiguas; el estado local se elimina al cerrar sesión. Si falta permiso o falla la consulta, se reintenta en la próxima sincronización. La app evita duplicar una push de suspensión que ya haya visto, pero no puede garantizarlo si la push llega después del aviso local o ya fue descartada.

Para recibir avisos push de bloqueos o de turnos liberados, además:

1. Configurar `NOTIFICACIONES=expo` en el entorno donde corre la API. El valor predeterminado `registro` sólo escribe el intento en los logs.
2. Configurar en EAS las credenciales de plataforma: FCM para Android y APNs para iOS.
3. Generar e instalar un build nativo en un teléfono físico. Expo Go no es adecuado para validar push remotas.
4. Iniciar sesión, aceptar el permiso del sistema y probar desde el perfil. Si la API indica cero dispositivos, volver a registrar el teléfono; si la prueba se solicita pero no llega, revisar la configuración de Expo y los logs de la API.

La app muestra avisos recibidos mientras está abierta y, al tocar uno, abre la reserva afectada o la disponibilidad del espacio. El backend no guarda un historial de notificaciones dentro de la app; el historial queda en el centro de notificaciones del sistema operativo. No se requiere guardar credenciales de Expo en la app.

## Cómo ejecutar

Iniciar Expo:

```bash
npx expo start
```

Para abrir el proyecto con Expo Go compatible con SDK 58, usar `npx expo start --go`.

El front lee la dirección de la API desde `EXPO_PUBLIC_API_URL`. Configurala en `.env.local` antes de iniciar Expo:

```env
EXPO_PUBLIC_API_URL=https://api-reservas-deportivas-m7az.onrender.com
```

El perfil `preview` de EAS también incluye esta URL y genera un APK instalable para Android en [`eas.json`](./eas.json). Si querés usar una API local, `localhost` sirve para la versión web en esta computadora; para un teléfono físico, usá la IP de la computadora en la misma red Wi-Fi (por ejemplo, `http://192.168.0.10:3000`). Si cambiás la variable con Expo abierto, reiniciá Expo para que tome el nuevo valor.

Desde el menú de Expo se puede abrir la aplicación en un dispositivo o emulador. También están definidos estos comandos:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

`android` y `ios` ejecutan builds nativos locales; `web` inicia la versión web.

Para publicar la versión web, el servidor debe enviar `Cross-Origin-Embedder-Policy: credentialless` y `Cross-Origin-Opener-Policy: same-origin`, necesarios para SQLite web. Metro los configura automáticamente durante el desarrollo.

Para comprobar los filtros, avisos de suspensión, mapas y persistencia de la guía con Node.js 24:

```bash
node --test scripts/avisos-suspension.test.mjs
node --test scripts/autenticacion-navegacion.test.mjs
node --test scripts/filtros-espacios.test.mjs
node --test scripts/mapa-leaflet.test.mjs
node --experimental-test-module-mocks --test scripts/onboarding.test.mjs
```

## Acceso y usuarios de demostración

La aplicación no incluye cuentas locales: las cuentas y contraseñas pertenecen a la API configurada. El registro desde la app crea un **jugador**; encargado y administrador deben existir previamente en la API.

La [documentación de la API](https://github.com/fmolinadev/api-reservas-deportivas#6-usuarios-de-demo) describe estas cuentas de ejemplo y su contraseña compartida para una base con datos de demostración:

| Usuario de ejemplo          | Rol           | Caso de prueba                                  |
| --------------------------- | ------------- | ----------------------------------------------- |
| `emiliano@mail.com`         | Jugador       | Reservas e historial con cancelación tardía.    |
| `lleno@demo.ar`             | Jugador       | Límite de tres reservas activas.                |
| `nuevo@demo.ar`             | Jugador       | Cuenta sin reservas previas.                    |
| `marcelo@villaguay.demo.ar` | Encargado     | Agenda, ingresos y bloqueos.                    |
| `nahuel@villaguay.demo.ar`  | Administrador | Gestión del complejo, precios y reservas fijas. |

Estos son datos de demostración de la API, **no una garantía de que existan en la base de Supabase publicada**. No usar credenciales de demostración para cuentas reales ni reiniciar la base publicada para probarlos.

## Recorrido de la aplicación

### 1. Inicio y autenticación

La ruta inicial `src/app/index.tsx` muestra una pantalla de presentación y revisa la sesión guardada: si no encuentra un token, navega al login; si existe, solicita autenticación biométrica o contraseña. El login y el registro llaman a los métodos de [`src/servicios/auth.ts`](./src/servicios/auth.ts), que envían las credenciales a la API configurada y guardan el token y el usuario recibidos con Secure Store.

Después de iniciar sesión, la navegación depende del rol:

- jugador → `/(jugador)/inicio`
- encargado → `/(staff)/agenda`
- administrador → `/(admin)/inicio`

Los grupos de navegación están definidos bajo `src/app/`. [`src/components/auth-guard.tsx`](./src/components/auth-guard.tsx) revisa la sesión y el rol permitido al entrar en las áreas protegidas. Si la sesión no está disponible, redirige al login.

Si hay un token guardado, el arranque consulta `GET /yo` para validarlo y actualizar el perfil antes de abrir `/(auth)/biometria`. La pantalla permite continuar con biometría cuando está disponible o validar la contraseña; luego redirige según el rol. También permite cerrar esa sesión y usar otra cuenta.

Al iniciar sesión con contraseña como encargado o administrador, la app también solicita biometría; si no está disponible o no se completa, se puede verificar la contraseña para continuar.

Al entrar por primera vez al inicio con un perfil de jugador, se muestra una guía breve para consultar disponibilidad y reservar. La finalización u omisión se guarda localmente por ID de usuario y no se vuelve a mostrar para ese perfil.

La aplicación usa el tema claro por defecto. En **Perfil > Apariencia** se puede elegir oscuro o seguir el tema del dispositivo; la preferencia se guarda en el dispositivo.

### 2. Buscar espacios y disponibilidad

El catálogo, la ficha de cada espacio y su disponibilidad se pueden consultar sin cuenta desde el enlace del login. Al tocar para reservar se solicita iniciar sesión o crear una cuenta; luego se vuelve al mismo turno para completar la reserva. Con sesión, también se puede entrar desde `/(jugador)/espacios` o `/(jugador)/disponibilidad`. La fecha se limita a hoy y los seis días siguientes.

El acceso **Disponibilidad** del inicio abre la misma búsqueda de horarios que **Ver por disponibilidad** en Espacios, con filtros por deporte, complejo y fecha.

En la barra del jugador se muestran **Inicio** y **Acceso QR**. Espacios y Mis reservas siguen disponibles desde Inicio.

La lista activa permite filtrar por deporte y complejo en las vistas de espacios y disponibilidad. El filtro de complejo ofrece **Todos**, los complejos presentes en el catálogo y **Otros espacios** cuando hay espacios sin complejo. Los filtros se consultan en `GET /espacios`; para **Otros espacios** se filtra la respuesta localmente, y si falla la conexión se usa el catálogo guardado. La ficha muestra techado y capacidad cuando esos datos están disponibles. El mapa general permite seleccionar un complejo y ver sus espacios; desde un marcador o la ficha se pueden abrir indicaciones en Google Maps.

En Android y iOS los mapas integrados usan Leaflet y MapLibre dentro de un WebView, con mapas de [OpenFreeMap](https://openfreemap.org/) y datos de OpenStreetMap. Necesitan conexión y WebGL: las bibliotecas se descargan desde un CDN y los mosaicos desde OpenFreeMap, que recibe las solicitudes de las áreas consultadas. La atribución aparece en el mapa. Si falla la carga, se puede reintentar sin impedir el acceso a la disponibilidad. Las indicaciones siguen abriéndose externamente en Google Maps. Para incorporar el cambio en un APK existente hay que generar una nueva build.

El detalle de un espacio reproduce enlaces de YouTube dentro de la app y mantiene el reproductor nativo para archivos de video. Requiere conexión, que el propietario permita insertar el video y un identificador de aplicación configurado para la plataforma.

Pruebas del puente y los marcadores: `node --test scripts/mapa-leaflet.test.mjs`.

La pantalla `src/app/(jugador)/espacio/[id]/disponibilidad.tsx` obtiene el espacio y los turnos para la fecha seleccionada y compone la grilla horaria mediante `getTurnos` en [`src/servicios/reservas.ts`](./src/servicios/reservas.ts). La ruta `src/app/(jugador)/disponibilidad/[id].tsx` reutiliza esa misma pantalla. La agenda operativa obtiene sus turnos mediante [`src/servicios/turnos.ts`](./src/servicios/turnos.ts).

### 3. Crear y consultar una reserva

Al elegir un turno libre, el jugador confirma la cantidad de personas. `crearReserva` envía la solicitud a la API, que valida el horario y el máximo de reservas activas y devuelve la reserva creada.

La pantalla de confirmación puede solicitar permisos y programar un recordatorio local. Si no puede programarlo, informa al jugador; las reservas se reconcilian al volver a abrir la app. Desde el detalle de un espacio se puede agregarlo o quitarlo de favoritos para recibir un aviso cuando se libera un turno. Las reservas se consultan desde la sección de reservas, con vistas de próximas y pasadas, y el detalle muestra información del turno y un QR.

### 4. Cancelar una reserva

La pantalla de detalle permite cancelar una reserva activa hasta el instante `cancelableHasta` devuelto por la API (incluido el límite exacto de cuatro horas). Luego indica que hay que comunicarse con el complejo. La API vuelve a validar el plazo antes de cancelar. El perfil del jugador muestra el contador de cancelaciones tardías y lo actualiza desde `GET /yo`.

### 5. Flujo del jugador

1. Ingresar con una cuenta de jugador o registrarse. También se puede consultar el catálogo y la disponibilidad sin iniciar sesión; para reservar se solicita autenticación.
2. Desde **Inicio**, abrir **Espacios** o **Disponibilidad**, elegir filtros y fecha, y seleccionar un turno libre. Confirmar la cantidad de personas para enviar la reserva a la API.
3. En **Mis reservas**, consultar próximas o pasadas y abrir el detalle para ver el QR y, cuando corresponda, cancelar. Desde la ficha también se pueden gestionar favoritos.
4. En **Acceso QR**, permitir el uso de cámara y escanear el QR fijo del espacio. La aplicación consulta las reservas propias y comprueba localmente el lugar y el horario; este flujo no registra el ingreso de asistencia.
5. Desde **Perfil**, gestionar apariencia, notificaciones y sesión. La app puede programar recordatorios locales y mostrar avisos de suspensión sujetos a conectividad y permisos.

### 6. Flujo del encargado

1. Ingresar con un usuario de rol `encargado`. La app abre la **Agenda**; desde la barra se puede ir a **Inicio** o **Asistencia**.
2. En la agenda se consultan los turnos por fecha y espacio y, cuando corresponda, se cancela una reserva a pedido del jugador.
3. Desde **Inicio > Escanear QR**, seleccionar el espacio y validar con biometría antes de usar la cámara o ingresar manualmente el código de la reserva. La API registra el ingreso y devuelve su hora. Si la biometría no está disponible, el escáner no se habilita.
4. En **Asistencia** se consulta el estado y se puede marcar una ausencia a partir de los 15 minutos posteriores al inicio, si no se registró ingreso.
5. En **Bloqueos** se seleccionan espacios, fecha, horario y motivo para crear o eliminar bloqueos. Las reservas afectadas pueden cancelarse; quitar un bloqueo no las restablece.
6. En **Mantenimiento** se verifica la identidad con biometría o contraseña. Para cargar o consultar inspecciones con fotos o videos, se elige la cancha en el selector; desde allí también se puede acceder a bloqueos.
   Al crear un bloqueo, primero se elige el complejo y luego una o varias canchas. Al cambiar de complejo se limpia la selección; los accesos para seleccionar todas o las descubiertas aplican al complejo elegido.

### 7. Flujo del administrador

1. Ingresar con un usuario de rol `administrador`. Tras verificar su identidad, la app abre **Inicio**, desde donde se accede a las herramientas administrativas.
2. Consultar la agenda y usar **Escáner QR** para registrar ingresos con la misma validación biométrica del encargado.
3. En **Asistencia**, consultar ingresos y registrar ausencias. En **Inspecciones**, confirmar la identidad con biometría o contraseña para cargar y consultar reportes con evidencias.
4. En **Precios**, seleccionar un espacio y guardar su nueva tarifa. En **Reservas fijas**, crear, editar o dar de baja horarios recurrentes.
5. En **Mantenimiento**, confirmar la contraseña y administrar bloqueos y sus espacios afectados. También se puede acceder desde Inspecciones.
6. Desde **Perfil**, consultar los datos y cerrar sesión.

El grupo `/(staff)` admite encargado y administrador; `/(admin)` está restringido al administrador. Las acciones se envían a la API, que aplica permisos y validaciones. La presencia de una pantalla o servicio no equivale a una prueba completa en un dispositivo.

## Arquitectura

La estructura principal del código es:

```text
src/
├── app/                # Rutas, pantallas y layouts de Expo Router
│   ├── (auth)/         # Login, registro y biometría
│   ├── (jugador)/      # Experiencia del jugador
│   ├── (staff)/        # Operación del encargado
│   ├── (admin)/        # Administración
│   └── (public)/       # Consulta sin iniciar sesión
├── components/         # Componentes compartidos y guard de sesión
├── constants/          # Tema y constantes visuales
├── hooks/              # Hooks de tema
├── persistencia/       # Coordinación de la sesión local
├── servicios/          # Acceso a datos y operaciones del negocio
├── tipos/              # Modelos TypeScript
└── utilidades/         # Funciones auxiliares
```

El flujo previsto para datos es:

```text
Pantalla → servicio → API
```

Las respuestas de la API se tipan en los servicios. Los datos de sesión y las cachés offline se administran localmente.

### Modelos

`src/tipos/espacio.ts`, `reserva.ts` y `turno.ts` representan las respuestas de la API. `src/tipos/index.ts` contiene los modelos adaptados que usan las pantallas y servicios de la aplicación.

## Datos y persistencia

- **Usuarios, espacios, turnos y reservas:** se consultan en la API configurada.
- **Sesión:** Secure Store mediante las funciones de `src/servicios/auth.ts` y `src/persistencia/session.ts`.
- **Caché offline:** SQLite versionado (`tpfinal-local.db`) guarda reservas separadas por usuario y el catálogo completo de espacios. Los datos KV anteriores de reservas por usuario se migran una vez; la antigua clave global sin propietario se descarta para evitar mezclar cuentas. Las consultas de espacios usan el último catálogo completo guardado como respaldo.
- **Conectividad:** `expo-network` alimenta el aviso global cuando el dispositivo no tiene conexión o internet alcanzable.
- **Notificaciones:** `src/servicios/notificaciones.ts` programa y reconcilia recordatorios, muestra avisos recibidos y gestiona la navegación al tocar push; `src/servicios/dispositivos.ts` registra el teléfono en la API.

## Reglas principales

- Los turnos comienzan a las 08:00 y la grilla mostrada llega hasta las 23:00 (turnos de una hora).
- No se debe mostrar como opción de reserva un turno que ya comenzó.
- No se puede crear una reserva con fecha/hora vencida.
- No se puede cancelar una reserva cuyo turno ya pasó.
- La interfaz habilita la cancelación ordinaria hasta `cancelableHasta`, incluido el límite exacto de cuatro horas; después informa que hay que contactar al complejo.
- Las reservas fijas y los mantenimientos pueden bloquear los turnos que se solapan.
- Los servicios administrativos validan, entre otras cosas, fechas, franjas horarias y solapamientos.
- El QR del espacio se compara en la app con las reservas propias consultadas a la API; el registro de ingreso mediante el QR de la reserva lo valida la API.

## Rutas

### Autenticación

| Ruta                                | Propósito                               |
| ----------------------------------- | --------------------------------------- |
| `/`                                 | Presentación inicial; redirige al login |
| `/(auth)/login`                     | Inicio de sesión                        |
| `/(auth)/registro`                  | Alta de jugador                         |
| `/(auth)/biometria`                 | Validación biométrica                   |
| `/(public)/consulta-disponibilidad` | Catálogo y horarios sin cuenta          |

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
| `/(jugador)/mapa`                | Mapa de espacios                                    |
| `/(jugador)/perfil`              | Perfil del jugador                                  |
| `/(jugador)/escanear`            | Validación mediante QR del espacio                  |

### Encargado

| Ruta                        | Propósito                      |
| --------------------------- | ------------------------------ |
| `/(staff)/inicio`           | Inicio operativo               |
| `/(staff)/agenda`           | Agenda diaria por espacio      |
| `/(staff)/escanear`         | Escáner e ingreso manual de QR |
| `/(staff)/presente-ausente` | Registro de asistencia         |
| `/(staff)/bloqueos`         | Pantalla de bloqueos           |
| `/(staff)/mantenimiento`    | Pantalla de mantenimiento      |
| `/(staff)/perfil`           | Perfil y cierre de sesión      |

### Administrador

| Ruta                      | Propósito                             |
| ------------------------- | ------------------------------------- |
| `/(admin)/inicio`         | Panel de accesos rápidos              |
| `/(admin)/agenda`         | Agenda                                |
| `/(admin)/escaner`        | Ruta administrativa de escáner        |
| `/(admin)/asistencia`     | Consulta de ingresos y ausencias       |
| `/(admin)/inspecciones`   | Reportes de inspección con evidencias |
| `/(admin)/precios`        | Ruta administrativa de precios        |
| `/(admin)/mantenimiento`  | Ruta administrativa de mantenimiento  |
| `/(admin)/reservas-fijas` | Ruta administrativa de reservas fijas |
| `/(admin)/perfil`         | Perfil                                |

## Configuración de Expo

`app.json` define el nombre/slug, orientación vertical, esquema `tpfinalapps`, identificador Android `com.molidev.tpfinalapps`, iconos y plugins de Expo. También activa rutas tipadas y React Compiler. Todavía no define `ios.bundleIdentifier`.

Los recursos visuales de la marca están en `assets/images/`. El splash configurado utiliza `icono-splash.png`.

## Builds

El proyecto está vinculado a EAS. Desde la raíz:

```bash
# APK Android instalable, con la URL de la API configurada en preview
eas build --platform android --profile preview

# Android para tienda: el perfil production genera un AAB por defecto
eas build --platform android --profile production
```

La URL de la API está definida en el perfil `preview` de [`eas.json`](./eas.json), pero **no en `production`**. Antes de generar un build de producción, configurar `EXPO_PUBLIC_API_URL` para ese entorno en EAS o en el perfil. El archivo `.env.local` es local y no debe considerarse disponible en la nube.

Para un build iOS instalable en un iPhone se necesita definir `ios.bundleIdentifier`, disponer de una membresía Apple Developer y configurar la firma. Para distribución interna, registrar el dispositivo con `eas device:create` y luego ejecutar `eas build --platform ios --profile preview`. TestFlight requiere un build de distribución para tienda y su envío a App Store Connect. EAS puede compilar en la nube desde Windows; ejecutar un build nativo iOS local requiere macOS y Xcode. Las notificaciones push iOS necesitan credenciales APNs.

## Estado actual y limitaciones conocidas

- **Escáner operativo:** encargado y administrador deben tener biometría configurada para habilitar tanto la cámara como la carga manual del QR.

- Los grupos de navegación por rol son los activos; `src/tipos/` separa DTOs de API de los modelos adaptados para la interfaz.
