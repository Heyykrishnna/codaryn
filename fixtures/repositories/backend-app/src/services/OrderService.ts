import { OrderRepository } from "../repositories/OrderRepository.js";

export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async getOrder(id: string) {
    return this.orderRepository.findById(id);
  }

  async listUserOrders(userId: string) {
    return this.orderRepository.findByUser(userId);
  }
}
