# --- deps + build ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

# --- runtime ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# Standalone output only bundles traced runtime deps; the `prisma` CLI itself
# isn't traced (only @prisma/client is), so copy full node_modules to get
# `prisma migrate deploy` working at container start.
COPY --from=builder /app/node_modules ./node_modules

# Persistent volume for technician-uploaded photos — mount this in Dokploy.
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
VOLUME /app/uploads
ENV UPLOAD_DIR=/app/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000

# Apply pending migrations, then start the server.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node server.js"]
