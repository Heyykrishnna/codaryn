import Fastify from "fastify";
import { healthResponseSchema } from "@codaryn/contracts";
export function buildApp() {
  const app = Fastify({ logger: true });
  app.get("/api/v1/health", async () =>
    healthResponseSchema.parse({ status: "ok" }),
  );
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    void reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  });
  return app;
}
