# Flowcommerce Backend

Backend API for the Flowcommerce university project.

## Stack

- Node.js 24 LTS
- NestJS
- PostgreSQL 17 (Docker)
- Drizzle ORM
- pnpm workspaces

## Setup

```bash
pnpm install
cp .env.example .env
pnpm run docker:up
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

Swagger is available at `http://localhost:3000/docs`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run docker:up` | Start PostgreSQL container |
| `pnpm run docker:down` | Stop PostgreSQL container |
| `pnpm run db:generate` | Generate Drizzle migrations from schema |
| `pnpm run db:migrate` | Apply migrations |
| `pnpm run db:seed` | Run idempotent development seed |
| `pnpm run dev` | Start API in watch mode |
| `pnpm run test` | Unit tests |
| `pnpm run test:e2e` | E2E tests |

## API

Base path: `/api/v1`

- `POST /api/v1/auth/sign-up`
- `POST /api/v1/auth/login`
- `GET /api/v1/health`
