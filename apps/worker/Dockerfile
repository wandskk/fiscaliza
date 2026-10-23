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
# Scripts off: the worker postinstall runs "prisma generate", which needs the schema copied below
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "@fiscaliza/worker..."

COPY packages/config packages/config
COPY packages/shared packages/shared
# Only the schema of the API: the worker generates its own client from it and owns no migrations
COPY apps/api/prisma/schema.prisma apps/api/prisma/
COPY apps/worker apps/worker
RUN pnpm --filter @fiscaliza/worker exec prisma generate --generator worker \
  && pnpm --filter "@fiscaliza/worker..." build \
  && pnpm --filter @fiscaliza/worker deploy --legacy --prod --ignore-scripts /prod/worker

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/worker ./
USER node
# The local poller stands in for the Lambda event source; the exec form keeps node as PID 1 for SIGTERM
CMD ["node", "dist/local-poller.js"]
