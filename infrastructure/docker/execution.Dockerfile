FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @codaryn/execution-worker... build
RUN pnpm --filter @codaryn/execution-worker deploy --legacy --prod /runtime
FROM node:22-alpine
WORKDIR /app
COPY --from=build --chown=node:node /runtime .
USER node
CMD ["node", "dist/index.js"]
