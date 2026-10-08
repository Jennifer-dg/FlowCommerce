# Flowcommerce Backend

API REST de Flowcommerce: CRM multi-tenant por proyecto (leads, cotizaciones, mensajería por WhatsApp y dashboard comercial) con autenticación por sesión y control de acceso por roles.

## Tecnologías

- Node.js 24 LTS + TypeScript
- NestJS 11
- PostgreSQL 17 (Docker) + Drizzle ORM
- Better Auth (sesiones por cookie)
- pnpm workspaces
- Jest + Supertest

## Inicio rápido

Requisitos: Node.js 24, pnpm y Docker.

```bash
pnpm install
cp .env.example .env      # ajusta BETTER_AUTH_SECRET como mínimo
pnpm run docker:up        # levanta PostgreSQL en localhost:5432
pnpm run db:migrate       # aplica las migraciones
pnpm run db:seed          # crea el usuario de desarrollo (idempotente)
pnpm run dev              # API en http://localhost:3000
```

- Swagger: `http://localhost:3000/docs`
- Health check: `GET http://localhost:3000/api/v1/health`
- Usuario de seed: `seed@flowcommerce.local` / `SeedPassword123!`

> `dev`, `start` y `build` compilan antes los paquetes del workspace (`@flowcommerce/types` y `@flowcommerce/contracts`) automáticamente.

## Variables de entorno

Todas están documentadas en [.env.example](.env.example).

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `POSTGRES_PORT`, `POSTGRES_DB` | Puerto y nombre de la base de datos del contenedor Docker |
| `PORT` | Puerto HTTP de la API (por defecto `3000`) |
| `BETTER_AUTH_SECRET` | Secreto para firmar las sesiones. Usa una cadena larga y aleatoria |
| `BETTER_AUTH_URL` | URL pública de la API |
| `APP_URL` | URL del frontend que recibe el enlace `reset-password?token=...`. **Obligatoria en producción** |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envío de correos por Resend. Si faltan fuera de producción se usa `ConsoleEmailSender`, que imprime los correos en consola. **Obligatorias en producción** |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Credenciales de la WhatsApp Cloud API (Graph). Sin `WHATSAPP_PHONE_NUMBER_ID` el webhook no persiste nada, y un evento solo se acepta si trae ese `phone_number_id` |
| `WHATSAPP_GRAPH_API_VERSION` | Versión de Graph (por defecto `v21.0`) |
| `WHATSAPP_MAX_RETRIES`, `WHATSAPP_RETRY_BASE_MS`, `WHATSAPP_REQUEST_TIMEOUT_MS` | Reintentos y timeout de las llamadas a Graph |
| `WHATSAPP_APP_SECRET` | Secreto para verificar la firma `X-Hub-Signature-256` del webhook |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación del webhook (handshake `GET`) |
| `WHATSAPP_PROJECT_ID` | Proyecto (tenant) al que pertenece el número de WhatsApp |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm run dev` | Iniciar la API en modo watch |
| `pnpm run build` | Compilar a `dist/` |
| `pnpm run start:prod` | Ejecutar la build compilada |
| `pnpm run lint` | ESLint con autocorrección |
| `pnpm run format` | Formatear con Prettier |
| `pnpm run test` | Pruebas unitarias |
| `pnpm run test:cov` | Pruebas unitarias con cobertura |
| `pnpm run test:e2e` | Pruebas E2E (requieren la base de datos levantada y migrada) |
| `pnpm run docker:up` / `docker:down` | Iniciar o detener PostgreSQL |
| `pnpm run db:generate` | Generar una migración a partir de `src/db/schema.ts` |
| `pnpm run db:migrate` | Aplicar las migraciones pendientes |
| `pnpm run db:seed` | Cargar los datos de desarrollo |

## Estructura del proyecto

```
packages/
  types/          # Enums y tipos compartidos (roles, permisos, estados...)
  contracts/      # Contratos de la API compartidos con el frontend
src/
  auth/           # Registro, login, sesión, logout y recuperación de contraseña
  authorization/  # Matriz rol → permiso, guard y decoradores
  projects/       # Proyectos (tenants) y miembros
  access-requests/# Solicitudes de acceso a un proyecto
  leads/          # Leads del CRM
  quotes/         # Cotizaciones
  messages/       # Mensajes de WhatsApp (envío y webhook)
  dashboard/      # Métricas agregadas del proyecto
  users/          # Repositorio de usuarios
  health/         # Health check
  common/         # Excepciones de dominio, filtro global, DTOs y utilidades
  db/             # Esquema de Drizzle, migraciones y seed
test/             # Pruebas E2E
```

Cada módulo de negocio sigue una arquitectura por capas:

- `domain/`: entidades e interfaces de repositorio, sin dependencias de framework.
- `application/`: casos de uso (`*.use-case.ts`) y puertos.
- `infrastructure/`: implementaciones con Drizzle y adaptadores externos (Better Auth, Resend, WhatsApp).
- `presentation/`: controllers, DTOs, guards y decoradores.

Las excepciones de dominio (`src/common/exceptions`) se traducen a respuestas HTTP en `GlobalExceptionFilter`. La validación es global y estricta: si el cuerpo trae propiedades no declaradas en el DTO, la API responde 400.

## Autenticación y autorización

- La sesión viaja en la cookie `flowcommerce.session_token`, que se emite en `sign-up` y `login`.
- **Despliegue:** la cookie es `SameSite=Lax`, así que Frontend y API deben vivir en el **mismo sitio** (p. ej. `app.empresa.com` y `api.empresa.com`). En dominios distintos (`*.vercel.app` y `*.onrender.com`) el navegador no enviaría la cookie. `APP_URL` debe ser la URL del Frontend (recibe el enlace `reset-password?token=...`).
- **Solicitud de acceso pública:** responde siempre 202 con el mismo cuerpo exista o no una cuenta con ese correo o una solicitud pendiente, para no revelar qué correos están registrados.
- Las rutas `projects/:projectId/...` pasan por `AuthenticatedGuard` y `ProjectPermissionGuard`. Cada handler declara el permiso que exige con `@RequirePermission(...)`.
- Los recursos de otro proyecto responden **404**, no 403, para no revelar que existen.

Matriz de roles (fuente de verdad: [role-permissions.ts](src/authorization/domain/role-permissions.ts)):

| Permiso | OWNER | ADMIN | MEMBER | VIEWER |
|---------|:-----:|:-----:|:------:|:------:|
| Ver proyecto y miembros | ✓ | ✓ | ✓ | ✓ |
| Editar proyecto | ✓ | ✓ | | |
| Eliminar proyecto | ✓ | | | |
| Invitar, cambiar rol y quitar miembros | ✓ | ✓ | | |
| Ver leads y cotizaciones | ✓ | ✓ | ✓ | ✓ |
| Crear y editar leads | ✓ | ✓ | ✓ | |
| Eliminar leads (sin historial: ver reglas de negocio) | ✓ | ✓ | | |
| Crear, editar, borrar (borradores) y mover cotizaciones por su ciclo | ✓ | ✓ | ✓ | |
| Aprobar cotizaciones y marcarlas pagadas | ✓ | ✓ | | |
| Enviar mensajes por WhatsApp | ✓ | ✓ | ✓ | |

## API

Ruta base: `/api/v1`. La referencia completa con esquemas de request y response está en Swagger (`/docs`).

### Auth (públicas salvo `session` y `logout`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/sign-up` | Registro |
| POST | `/auth/login` | Inicio de sesión |
| GET | `/auth/session` | Sesión actual |
| POST | `/auth/logout` | Cierre de sesión |
| POST | `/auth/forgot-password` | Solicitar el correo de recuperación |
| GET | `/auth/reset-password/validate` | Validar un token de recuperación |
| POST | `/auth/reset-password` | Cambiar la contraseña con el token |
| POST | `/auth/access-requests` | Solicitar acceso a un proyecto (siempre 202 con el mismo cuerpo; 404 solo si el proyecto no existe) |

### Proyectos y miembros

| Método | Ruta | Permiso |
|--------|------|---------|
| POST | `/projects` | Autenticado |
| GET | `/projects/my` | Autenticado |
| GET | `/projects/:projectId` | `PROJECT_READ` (con perfil de facturación y ajustes de cotización) |
| PATCH | `/projects/:projectId` | `PROJECT_UPDATE` (OWNER y ADMIN; el slug no se edita) |
| GET | `/projects/:projectId/members` | `MEMBER_READ` |
| POST | `/projects/:projectId/members` | `MEMBER_INVITE` |
| PATCH | `/projects/:projectId/members/:membershipId` | `MEMBER_UPDATE_ROLE` |
| DELETE | `/projects/:projectId/members/:membershipId` | `MEMBER_REMOVE` |
| GET | `/projects/:projectId/access-requests` | `MEMBER_INVITE` |
| POST | `/projects/:projectId/access-requests/:requestId/approve` | `MEMBER_INVITE` |
| POST | `/projects/:projectId/access-requests/:requestId/reject` | `MEMBER_INVITE` |

### Usuario

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/users/me` | Autenticado |
| PATCH | `/users/me` | Autenticado (solo `phone` y `position` del propio usuario) |

### Catálogo y clientes

| Método | Ruta | Permiso |
|--------|------|---------|
| POST / GET | `/projects/:projectId/products` | `PRODUCT_MANAGE` / `PRODUCT_READ` |
| GET / PATCH | `/projects/:projectId/products/:productId` | `PRODUCT_READ` / `PRODUCT_MANAGE` (no se borran: `active=false`) |
| POST / GET | `/projects/:projectId/clients` | `CLIENT_CREATE` / `CLIENT_READ` |
| GET / PATCH / DELETE | `/projects/:projectId/clients/:clientId` | `CLIENT_READ` / `CLIENT_UPDATE` / `CLIENT_DELETE` |
| GET | `/projects/:projectId/clients/:clientId/stats` | `CLIENT_READ` |
| POST | `/projects/:projectId/leads/:leadId/convert` | `CLIENT_CREATE` + `LEAD_UPDATE` (lead → cliente, en una sola transacción) |

### CRM

| Método | Ruta | Permiso |
|--------|------|---------|
| POST | `/projects/:projectId/leads` | `LEAD_CREATE` |
| GET | `/projects/:projectId/leads` | `LEAD_READ` |
| GET | `/projects/:projectId/leads/:leadId` | `LEAD_READ` |
| PATCH | `/projects/:projectId/leads/:leadId` | `LEAD_UPDATE` |
| DELETE | `/projects/:projectId/leads/:leadId` | `LEAD_DELETE` |
| POST | `/projects/:projectId/quotes` | `QUOTE_CREATE` |
| GET | `/projects/:projectId/quotes` | `QUOTE_READ` |
| GET | `/projects/:projectId/quotes/:quoteId` | `QUOTE_READ` |
| PATCH | `/projects/:projectId/quotes/:quoteId` | `QUOTE_CREATE` (solo en `DRAFT`) |
| DELETE | `/projects/:projectId/quotes/:quoteId` | `QUOTE_CREATE` (solo en `DRAFT`) |
| PATCH | `/projects/:projectId/quotes/:quoteId/status` | `QUOTE_CREATE` (+ `QUOTE_APPROVE` para aprobar o marcar como pagada) |
| POST | `/projects/:projectId/leads/:leadId/messages` | `WHATSAPP_SEND_MESSAGE` |
| GET | `/projects/:projectId/dashboard` | `PROJECT_READ` |

### Otros

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET / POST | `/webhooks/whatsapp` | Webhook de Meta (no aparece en Swagger) |

## Reglas de negocio

**Etapas de un lead:** `NEW` (Nuevo) → `CONTACTED` (Contactado) → `QUALIFIED` (Seguimiento) → `PROPOSAL` (Cotización) → `NEGOTIATION` (Negociación) → `WON` (Ganado) / `LOST` (Perdido).

**Borrado de leads.** `DELETE /leads/:id` es atómico y se niega con 409 si el lead tiene cotizaciones fuera de `DRAFT` (en revisión, enviadas, aceptadas, pagadas o rechazadas) cualquier mensaje o un cliente originado por su conversión: son historial comercial y de auditoría. La base lo refuerza con FK `NO ACTION` en `messages` y `clients.source_lead_id`, así que ni siquiera un `DELETE` directo o una carrera lo puede saltar. Para retirarlo del embudo se pasa a `LOST`. Los borradores sí se borran con el lead.

**Estados de una cotización.** Solo se permiten estas transiciones (cualquier otra responde 409):

```
DRAFT ──► PENDING_APPROVAL ──► APPROVED ──► SENT ──► ACCEPTED ──► PAID
              │                              │
              └──► DRAFT (devolver)          └──► REJECTED (terminal)
```

- Pasar a `APPROVED` o a `PAID` exige `QUOTE_APPROVE`; el resto del ciclo, `QUOTE_CREATE`. Un MEMBER puede pedir la aprobación, enviar y registrar la respuesta del cliente, pero no aprobar ni cobrar.
- Cada transición rellena su fecha (`approvedAt`, `sentAt`, `acceptedAt`, `rejectedAt`, `paidAt`).
- Al pasar a `ACCEPTED` el lead de la cotización pasa a `WON` en la misma transacción, así el KPI `ganado` y la conversión del Dashboard no dependen de moverlo a mano.
- La transición es **atómica** (`UPDATE … WHERE status = <esperado>`): si dos peticiones compiten, solo una gana y la otra recibe 409.
- Una cotización sin partidas no puede pedir aprobación.
- Solo los borradores (`DRAFT`) se editan o se borran; en cualquier otro estado, 409.

**Partidas e importes.** El body solo lleva `productId`, `quantity` y, opcionalmente, `discountPercent` y `description`; el precio sale del catálogo y el servidor calcula todo (en céntimos enteros, sin coma flotante):

- línea: `quantity × unitPrice − descuento` (`lineTotal`).
- `subtotal` = suma bruta de las partidas, `discount` = suma de descuentos, `tax` = IVA sobre `subtotal − discount`, `total` = `subtotal − discount + tax`.
- Un descuento superior a `products.max_discount_percent` responde 400; un producto inactivo, 409; un producto, lead o cliente de otro proyecto, 404.
- `PATCH` con `items` reemplaza todas las partidas y recalcula.

**Folio.** Automático y correlativo por proyecto (`COT-000001`, `COT-000002`…; el prefijo es un ajuste del proyecto), generado con un contador atómico dentro de la misma transacción que crea la cotización; único por `(project_id, folio)`.

**Listado de cotizaciones.** `GET /quotes` devuelve el resumen `{id, name}` del lead y del cliente y admite `search` (folio), `status`, `clientId`, `leadId`, `createdFrom`/`createdTo`, `sortBy` (`createdAt`, `total`, `folio`), `order` (`asc`/`desc`), `page` y `limit`.

**Estadísticas de cliente.** `GET /clients/:clientId/stats` devuelve `quotesCount`, `paidQuotesCount` y `salesTotal` (suma de las cotizaciones `PAID`).

**Ajustes del proyecto** (`PATCH /projects/:projectId`, solo OWNER y ADMIN):

- `billing`: perfil de facturación (`legalName`, `taxId`, `address`, `phone`, `email`). Cambios parciales: lo que no se envía no se toca y `null` borra el dato.
- `quoteSettings`: `taxPercent` (IVA, 0–100; por defecto 12, el IVA de Guatemala), `folioPrefix` (A–Z, 0–9 y guion; por defecto `COT`), `validityDays` (1–3650; por defecto 30), `defaultTerms` y `currency` (ISO 4217; por defecto `GTQ`). Todo es editable por proyecto; los proyectos creados antes del cambio de defaults conservan sus valores.
- Al crear una cotización: el IVA sale de `taxPercent`; el folio usa `folioPrefix`; si el body no trae `validUntil` se usa hoy + `validityDays` (un `null` explícito significa sin vencimiento); si no trae `terms` se usa `defaultTerms`. Cambiar los ajustes no reescribe las cotizaciones ya guardadas.

**Dashboard.** Vista agregada e histórica (sin filtros de fecha) calculada con `GROUP BY` sobre `leads` y `quotes`, siempre filtrada por `projectId`; no hay tabla de métricas ni entidad de ventas (detalle en [dashboard.types.ts](src/dashboard/domain/dashboard.types.ts)).

- `summary.leadsActivos`: leads en `NEW` + `CONTACTED` + `QUALIFIED` + `PROPOSAL` + `NEGOTIATION` (todo menos `WON` y `LOST`).
- `summary.cotizacionesEnRevision`: cotizaciones en `PENDING_APPROVAL`.
- `summary.ganado`: cantidad de leads en `WON` (no es un monto).
- `summary.pipeline`: suma de `estimatedValue` de los leads activos (todo menos `WON` y `LOST`), antes de IVA; los leads sin valor suman 0.
- `leads.porEstado` y `quotes.porEstado` devuelven siempre todas las claves (7 etapas y 7 estados de cotización), con 0 si no hay registros.
- `sales.porEstado`: monto (`quotes.total`) por estado de cotización. `sales.porPeriodo`: **ventas** = cotizaciones `PAID` agrupadas por mes de pago (`paidAt`, `YYYY-MM`, UTC); cuadra con las ventas de `GET /clients/:id/stats`.
- `conversion.porPeriodo`: por mes de creación del lead, `ganados / creados` (0 si no hay creados).
- Un `projectId` que no es UUID responde 400; un proyecto ajeno o inexistente, 403.

**Recuperación de contraseña.**

- El token caduca a los 30 minutos y solo se puede usar una vez.
- Al cambiar la contraseña se cierran todas las sesiones activas del usuario.
- `forgot-password` responde siempre 200 con el mismo cuerpo, exista o no el usuario.
- No se reenvía el correo al mismo usuario antes de 60 segundos.

**WhatsApp.**

- La API necesita `rawBody` para verificar `X-Hub-Signature-256` sobre el cuerpo original de la petición.
- El tenant de los mensajes entrantes y salientes es siempre `WHATSAPP_PROJECT_ID`; nunca se toma de un parámetro de la petición.
- Si el lead pertenece a otro proyecto, la API responde 404 sin llegar a llamar a Graph.

## Base de datos y migraciones

El esquema vive en [src/db/schema.ts](src/db/schema.ts) y las migraciones en `src/db/migrations/`. Para cambiar el modelo:

1. Edita `schema.ts`.
2. Ejecuta `pnpm run db:generate` y revisa el SQL generado.
3. Ejecuta `pnpm run db:migrate`.
4. Versiona juntos el `.sql` y los cambios en `migrations/meta/`.

## Pruebas

- **Unitarias** (`src/**/*.spec.ts`): casos de uso, reglas de dominio y guards, con dependencias simuladas.
- **E2E** (`test/*.e2e-spec.ts`): levantan la aplicación Nest completa contra PostgreSQL. Antes de ejecutarlas haz `docker:up` y `db:migrate`. [test/setup-e2e.ts](test/setup-e2e.ts) define valores por defecto para `DATABASE_URL` y WhatsApp, y simula Better Auth, que solo se distribuye como ESM y Jest no puede cargar.

Secuencia completa antes de entregar un bloque (en PowerShell 5 no existe `&&`: un comando por línea):

```
pnpm run build:packages
pnpm run lint
pnpm run db:generate   # debe responder "No schema changes"
pnpm run db:migrate
pnpm test
pnpm run test:e2e
```

Los e2e usan un timeout de 30 s por test y por hook (`test/jest-e2e.json`): arrancar Nest y sembrar datos puede tardar más de los 5 s por defecto de Jest cuando corren muchas suites en paralelo.
