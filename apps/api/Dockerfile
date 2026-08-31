FROM node:20-bookworm-slim
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /repo
EXPOSE 3659
CMD ["sh", "-c", "pnpm --filter @getitdone/api db:migrate && pnpm --filter @getitdone/api exec tsx src/index.ts"]
