# Deployment

Self-hosted on the Mac Mini home server via [Dokploy](https://dokploy.com/), using
`docker-compose.yml` at the repo root: `postgres`, `api`, and `web`
services, auto-deploying on push to `main` — same pattern as the other apps
on the Mac Mini (`gms`, `plane.ranu.win`).

## One-time setup

1. In Google Cloud Console → APIs & Services → Credentials → OAuth client (Web),
   set the authorized redirect URI to `https://getitdone.ranu.win/api/auth/google/callback`
   (this replaced next-auth's fixed `/api/auth/callback/google` path).
2. In Dokploy, create a **Compose** application pointing at this repo, root `docker-compose.yml`.
3. Set the environment variables below in Dokploy's app settings (they map to
   `${GETITDONE_*}` placeholders in `docker-compose.yml`).
4. Point Dokploy's domain/proxy at the `web` service's port `3658`.

## Environment variables

| Variable | Value |
|---|---|
| `GETITDONE_PG_PASSWORD` | strong random string (used by both `postgres` and `api`) |
| `GETITDONE_JWT_SECRET` | strong random string |
| `GETITDONE_WEB_ORIGIN` | the public URL(s) of the `web` service, comma-separated |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://getitdone.ranu.win/api/auth/google/callback` |

`web`'s `VITE_API_URL` is baked in at build time as `/trpc` (nginx on the
container proxies `/trpc`, `/api`, `/uploads` to the `api` service on the same
Docker network — see `apps/web/nginx.conf`).

## Migrations

The `api` container runs `pnpm --filter @getitdone/api db:migrate` (Drizzle,
replacing the old `prisma migrate deploy`) before starting — see
`apps/api/Dockerfile`. Commit new migrations under `apps/api/drizzle/` when
the schema changes (`pnpm db:generate` from `apps/api` locally first).

## Persistent data

Two volumes: `getitdone-postgres-data` (database) and `getitdone-uploads`
(technician photos/videos and generated PDF reports). Both must survive
redeploys — without the uploads volume, technician photos are lost on every
redeploy.

They're declared `external: true` with fixed names
(`getitdone_getitdone-postgres-data`, `getitdone_getitdone-uploads`) rather
than plain named volumes, so the compose project's internal name (which
Dokploy generates per-app) can change across redeploys/recreations without
orphaning the data.

## Custom domains

If you point a different domain at the `web` service, add it to
`GETITDONE_WEB_ORIGIN` (comma-separated) and redeploy.
