# GetItDone

A mobile-first job checklist app: a manager creates a job with a checklist,
shares an unguessable link with a technician (no login required), the
technician works through the checklist with photo/video evidence, and both
sides sign off. Generates a PDF report on completion.

## Stack

pnpm/turbo monorepo, mirroring the sibling `gms` project:

- `apps/api` — Fastify + tRPC + Drizzle ORM (Postgres)
- `apps/web` — Vite + TanStack Router + Tailwind v4 + Radix UI
- `packages/db` — Drizzle schema, shared by the api
- `packages/shared` — zod schemas + types, shared by api and web

## Development

```bash
pnpm install
docker run -d -p 5433:5432 -e POSTGRES_USER=getitdone -e POSTGRES_PASSWORD=getitdone -e POSTGRES_DB=getitdone postgres:16-alpine
cp .env.example .env   # fill in JWT_SECRET, Google OAuth creds if needed
pnpm --filter @getitdone/api db:migrate
pnpm dev               # runs api (:3659) and web (:3658) together via turbo
```

Open http://localhost:3658.

## Deployment

See [DEPLOY.md](./DEPLOY.md).
