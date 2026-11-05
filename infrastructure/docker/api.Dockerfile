FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @codaryn/api... build
RUN pnpm --filter @codaryn/api deploy --legacy --prod /runtime
FROM node:22-alpine
WORKDIR /app
COPY --from=build --chown=node:node /runtime .
ENV NODE_ENV=production
ENV HOST=0.0.0.0
USER node
CMD ["node", "--max-old-space-size=384", "dist/server.js"]
