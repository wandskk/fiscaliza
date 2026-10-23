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
# Scripts off: the API postinstall runs "prisma generate", which needs the schema copied below
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "@fiscaliza/api..."

COPY packages/config packages/config
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @fiscaliza/api exec prisma generate --generator client \
  && pnpm --filter "@fiscaliza/api..." build \
  && pnpm --filter @fiscaliza/api deploy --legacy --prod --ignore-scripts /prod/api

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./
USER node
EXPOSE 3000
# Migrations first, so "docker compose up" leaves the schema ready; exec keeps node as PID 1 for SIGTERM
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node dist/main.js"]
