# Deploying GetItDone via Dokploy

Same pattern as the other apps on the Mac Mini (see `gms`, `plane.ranu.win`).

## 1. Database
Create a Postgres resource in Dokploy (or reuse an existing Postgres instance)
and create a `getitdone` database. Grab the internal connection string.

## 2. Google OAuth
In Google Cloud Console → APIs & Services → Credentials → OAuth client (Web):
- Authorized redirect URI: `https://getitdone.ranu.win/api/auth/callback/google`

## 3. Create the app in Dokploy
- Source: this Git repo, branch `main`
- Build type: **Dockerfile** (uses the `Dockerfile` in repo root)
- Domain: `getitdone.ranu.win`, port `3000`, HTTPS via Dokploy's Traefik/Cloudflare route (same wildcard setup as other `*.ranu.win` apps)

## 4. Environment variables
```
DATABASE_URL=postgresql://<user>:<pass>@<postgres-host>:5432/getitdone?schema=public
NEXTAUTH_URL=https://getitdone.ranu.win
NEXTAUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
UPLOAD_DIR=/app/uploads
```

## 5. Volume
Mount a persistent volume at `/app/uploads` in Dokploy's volume settings —
this is where technician photos live. Without it, photos are lost on every
redeploy.

## 6. Deploy
Push to `main` (or trigger a manual deploy). The container runs
`prisma migrate deploy` automatically on start before serving the app, so
schema migrations apply on every deploy — just commit new migrations under
`prisma/migrations/` when the schema changes (`npx prisma migrate dev` locally
first to generate them).
