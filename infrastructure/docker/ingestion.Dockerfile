FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @codaryn/ingestion-worker... build
RUN pnpm --filter @codaryn/ingestion-worker deploy --legacy --prod /runtime
FROM node:24-alpine
WORKDIR /app
COPY --from=build --chown=node:node /runtime .
USER node
CMD ["node", "dist/index.js"]
