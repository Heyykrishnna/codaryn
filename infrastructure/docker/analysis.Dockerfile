FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @codaryn/analysis-worker... build
RUN pnpm --filter @codaryn/analysis-worker deploy --legacy --prod /runtime
FROM node:22-alpine
WORKDIR /app
COPY --from=build --chown=node:node /runtime .
USER node
CMD ["node", "--max-old-space-size=384", "dist/index.js"]
