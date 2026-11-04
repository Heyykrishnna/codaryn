import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requestLogger, rateLimiter } from "../middleware/logging.js";
import { validateBody } from "../middleware/validation.js";
import { z } from "zod";
import { OrderService } from "../services/OrderService.js";

const orderSchema = z.object({
  amount: z.number().positive(),
  item: z.string().min(1),
});

export function createOrderRouter(orderService: OrderService): Router {
  const router = Router();

  router.use(requestLogger);
  router.use(rateLimiter);

  router.get("/", authMiddleware, async (req, res) => {
    const orders = await orderService.listUserOrders(req.query.userId as string);
    res.json(orders);
  });

  router.get("/:orderId", authMiddleware, async (req, res) => {
    const order = await orderService.getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.json(order);
  });

  router.post("/", authMiddleware, validateBody(orderSchema), async (req, res) => {
    res.status(201).json({ created: true });
  });

  return router;
}
