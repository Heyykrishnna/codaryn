import { z } from "zod";
import { buildApp } from "./app.js";
const environment = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    HOST: z.string().default("127.0.0.1"),
  })
  .parse(process.env);
const app = buildApp();
try {
  await app.listen({ port: environment.PORT, host: environment.HOST });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
