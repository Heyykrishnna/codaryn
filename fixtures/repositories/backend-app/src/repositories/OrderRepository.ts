export class OrderRepository {
  constructor(private readonly prisma: any) {}

  async findById(id: string) {
    return this.prisma.order.findUnique({ where: { id } });
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({ where: { userId } });
  }

  async createOrder(data: any) {
    return this.prisma.order.create({ data });
  }
}
