import Fastify, { LogController } from "fastify";
import {
  analysisConfigurationSchema,
  configurationResponseSchema,
  healthResponseSchema,
} from "@codaryn/contracts";
export function buildApp() {
  const app = Fastify({
    logger: true,
    logController: new LogController({ disableRequestLogging: true }),
  });
  app.get("/api/v1/health", (_request, reply) =>
    reply.send(healthResponseSchema.parse({ status: "ok" })),
  );
  app.post("/api/v1/analysis-configurations/validate", (request, reply) => {
    const result = analysisConfigurationSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_CONFIGURATION",
          message: "The analysis configuration is invalid",
        },
      });
    }
    return reply.send(
      configurationResponseSchema.parse({ configuration: result.data }),
    );
  });
  app.setErrorHandler((error, _request, reply) => {
    app.log.error({ code: "REQUEST_FAILED" }, "Request failed");
    void reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  });
  return app;
}
