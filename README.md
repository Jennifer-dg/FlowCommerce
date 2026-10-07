# Flowcommerce Backend

API backend para el proyecto de Flowcommerce.

## Tecnologías

- Node.js 24 LTS
- NestJS
- PostgreSQL 17 (Docker)
- Drizzle ORM
- pnpm workspaces

## Configuración

```bash
pnpm install
cp .env.example .env
pnpm run docker:up
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

Swagger está disponible en `http://localhost:3000/docs`.

WhatsApp Cloud API usa las variables `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` y `WHATSAPP_PROJECT_ID` definidas en `.env.example`. El webhook de Meta es `GET/POST /api/v1/webhooks/whatsapp`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm run docker:up` | Iniciar el contenedor de PostgreSQL |
| `pnpm run docker:down` | Detener el contenedor de PostgreSQL |
| `pnpm run db:generate` | Generar migraciones de Drizzle a partir del esquema |
| `pnpm run db:migrate` | Aplicar migraciones |
| `pnpm run db:seed` | Ejecutar la carga de datos de desarrollo idempotente |
| `pnpm run dev` | Iniciar la API en modo watch |
| `pnpm run test` | Pruebas unitarias |
| `pnpm run test:e2e` | Pruebas E2E |

## API

Ruta base: `/api/v1`

- `POST /api/v1/auth/sign-up`
- `POST /api/v1/auth/login`
- `GET /api/v1/health`
