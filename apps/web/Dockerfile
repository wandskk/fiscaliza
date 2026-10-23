# Build context: repository root (docker compose sets it)

FROM node:22-slim AS build
RUN npm install --global pnpm@10.34.7
WORKDIR /repo

# Manifests first, so the dependency layer is cached while only the code changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY apps/mcp/package.json apps/mcp/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "@fiscaliza/web..."

COPY packages/config packages/config
COPY packages/shared packages/shared
COPY apps/web apps/web
# Vite inlines VITE_* into the bundle at build time: changing one means rebuilding the image
ARG VITE_API_URL=http://localhost:3000/api/v1
ARG VITE_AUTH_MODE=local
ARG VITE_COGNITO_USER_POOL_ID=
ARG VITE_COGNITO_CLIENT_ID=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_AUTH_MODE=$VITE_AUTH_MODE \
    VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID
RUN pnpm --filter @fiscaliza/web build

# Unprivileged variant: runs as a non-root user and listens on 8080
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
