# TP Final Apps

Aplicación Expo/React Native para gestión de reservas y disponibilidad de espacios deportivos, con una base de autenticación, routing por perfiles y capa mock para reemplazo por API real.

## Estado actual del proyecto

Este repositorio ya tiene implementado lo siguiente:

- Splash inicial con texto Final Integrador
- Login y registro con flujo de autenticación
- Persistencia de sesión con expo-secure-store
- Guard de autenticación para rutas protegidas del perfil jugador
- Estructura de routes por roles: auth, jugador y staff
- Capa mock de usuarios, espacios y reservas
- Servicios asíncronos para desacoplar pantalla y datos
- Lógica de disponibilidad por turno con reservas, reservas fijas y mantenimientos
- Pantallas base de jugador para inicio, espacios, detalle, disponibilidad y reservas

La arquitectura está preparada para reemplazar los mocks por API real sin reescribir pantallas ni lógica de navegación.

## Stack

- Expo SDK 57
- Expo Router
- React Native
- TypeScript
- expo-secure-store
- expo-local-authentication

## Requisitos

- Node.js 20+
- npm
- Expo CLI
- Android Studio / emulador o dispositivo físico

## Instalación

```bash
npm install
```

## Ejecución

```bash
npx expo start
```

Opcionalmente:

```bash
npm run android
```

## Usuarios mock disponibles

Los mocks están definidos en src/mocks/usuarios.ts.

### Jugador
- Email: demo@tpfinal.com
- Contraseña: 123456

### Encargado
- Email: encargado@tpfinal.com
- Contraseña: admin123

### Administrador
- Email: admin@tpfinal.com
- Contraseña: admin123

## Flujo de autenticación actual

El flujo implementado es:

1. La app abre el splash en src/app/index.tsx
2. Luego redirige a login
3. El login valida credenciales contra mocks
4. Si es válido, genera un token mock y lo persiste en Secure Store
5. A partir de ahí, cualquier ruta dentro de jugador queda protegida por src/components/auth-guard.tsx
6. Si no hay token, vuelve a login
7. Si existe biometría compatible, existe la ruta de validación biométrica en src/app/(auth)/biometria.tsx

## Persistencia

La sesión se guarda usando expo-secure-store, no en almacenamiento genérico.

Archivos principales:
- src/servicios/auth.ts
- src/persistencia/session.ts

## Arquitectura por carpetas

```text
src/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── registro.tsx
│   │   └── biometria.tsx
│   ├── (jugador)/
│   │   ├── _layout.tsx
│   │   ├── inicio.tsx
│   │   ├── espacios.tsx
│   │   ├── espacio/
│   │   │   └── [id].tsx
│   │   ├── disponibilidad/
│   │   │   └── [id].tsx
│   │   ├── reservar.tsx
│   │   ├── reservas.tsx
│   │   ├── reserva/
│   │   │   └── [id].tsx
│   │   ├── mapa.tsx
│   │   └── perfil.tsx
│   └── (staff)/
│       ├── _layout.tsx
│       ├── agenda.tsx
│       ├── escanear.tsx
│       ├── mantenimiento.tsx
│       ├── reservas-fijas.tsx
│       └── precios.tsx
├── components/
│   ├── auth-guard.tsx
│   └── espacio-card.tsx
├── mocks/
│   ├── espacios.ts
│   ├── reservas.ts
│   ├── turnos.ts
│   └── usuarios.ts
├── persistencia/
│   └── session.ts
├── servicios/
│   ├── auth.ts
│   ├── espacios.ts
│   ├── reservas.ts
│   ├── turnos.ts
│   └── usuarios.ts
├── tipos/
│   ├── espacio.ts
│   ├── reserva.ts
│   ├── turno.ts
│   └── usuario.ts
├── utilidades/
│   └── disponibilidad.ts
└── global.css
```

## Tipos principales

- src/tipos/usuario.ts
- src/tipos/espacio.ts
- src/tipos/reserva.ts
- src/tipos/turno.ts

Estos tipos modelan usuarios, reservas, turnos y espacios con campos claros para migrar a API real sin romper la UI.

## Capa mock

La lógica mock está separada de la pantalla para cumplir con la finalidad del PRD: primero simular, luego conectar con backend real.

### Mocks implementados
- src/mocks/usuarios.ts
- src/mocks/espacios.ts
- src/mocks/reservas.ts
- src/mocks/turnos.ts

### Servicios mock
- src/servicios/auth.ts
- src/servicios/espacios.ts
- src/servicios/reservas.ts
- src/servicios/turnos.ts

## Cálculo de disponibilidad

La lógica central está en src/utilidades/disponibilidad.ts.

La prioridad del cálculo es:

1. turno pasado
2. mantenimiento activo
3. reserva fija vigente
4. reserva confirmada
5. turno libre

Esto permite que la disponibilidad real no se calcule solo mirando si existe o no una reserva individual, sino evaluando todos los factores del negocio.

## Rutas principales

### Autenticación
- /index -> splash
- /(auth)/login -> login
- /(auth)/registro -> registro
- /(auth)/biometria -> validación biométrica

### Jugador
- /(jugador)/inicio
- /(jugador)/espacios
- /(jugador)/espacio/[id]
- /(jugador)/disponibilidad/[id]
- /(jugador)/reservar
- /(jugador)/reservas
- /(jugador)/reserva/[id]
- /(jugador)/mapa
- /(jugador)/perfil

### Staff
- /(staff)/agenda
- /(staff)/escanear
- /(staff)/mantenimiento
- /(staff)/reservas-fijas
- /(staff)/precios

## Reglas de diseño de la arquitectura

- Las pantallas no consumen mocks directamente.
- Las pantallas consumen servicios.
- Los servicios obtienen datos de mocks por ahora.
- La interfaz no debe cambiar cuando se reemplaza mock por fetch/API.
- El token nunca debe quedar en kv-store; se guarda en Secure Store.

## Buenas prácticas actualmente aplicadas

- Separación de tipos, mocks y servicios.
- Protección de rutas por sesión.
- Login y registro con validación simple y mensajes claros.
- Manejo de errores en autenticación.
- Preparación para extensión con API real.

## Próximos pasos recomendados

1. Completar la pantalla de espacios con listado real y filtros.
2. Implementar detalle y reserva con flujo de confirmación.
3. Cargar reservas reales por usuario y estados.
4. Integrar QR, staff y mantenimiento base.
5. Reemplazar mocks por fetch con el contrato { datos, meta } / { error }.

## Notas

Este README describe el proyecto en su estado actual: la base de autenticación, navegación, tipos, mocks, servicios y disponibilidad ya está implementada, mientras que las pantallas más avanzadas del negocio siguen en etapa de desarrollo dentro del mismo esquema arquitectónico.
