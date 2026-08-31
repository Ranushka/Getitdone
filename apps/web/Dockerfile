FROM node:20-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
ARG VITE_API_URL=/trpc
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @getitdone/web... build

FROM nginx:1.27-alpine
COPY --from=build /repo/apps/web/dist /repo/apps/web/dist
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3658
