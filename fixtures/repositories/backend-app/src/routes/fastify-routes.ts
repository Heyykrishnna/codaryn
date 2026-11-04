export async function healthRoutes(fastify: any) {
  fastify.get("/health", async () => {
    return { status: "ok" };
  });

  fastify.get("/metrics", async () => {
    return { uptime: process.uptime() };
  });
}
