# GetItDone

A pnpm/turbo monorepo: `apps/api` (Fastify + tRPC + Drizzle ORM), `apps/web`
(Vite + TanStack Router + Tailwind v4), `packages/db` (Drizzle schema),
`packages/shared` (zod schemas + types shared between api and web).

Architecture mirrors the sibling `gms` project for consistency — see
`DEPLOY.md` for the deployment pattern.
