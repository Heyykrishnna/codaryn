import express from "express";
import { corsMiddleware, requestLogger } from "./middleware/logging.js";
import { createOrderRouter } from "./routes/express-routes.js";
import { OrderService } from "./services/OrderService.js";
import { OrderRepository } from "./repositories/OrderRepository.js";

export function createServer() {
  const app = express();
  app.use(corsMiddleware);
  app.use(requestLogger);
  app.use(express.json());

  const orderRepository = new OrderRepository({});
  const orderService = new OrderService(orderRepository);
  app.use("/api/v1/orders", createOrderRouter(orderService));

  return app;
}
