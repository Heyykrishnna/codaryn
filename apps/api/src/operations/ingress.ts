import { createHmac } from "node:crypto";
import type { Pool } from "pg";
export class RequestBudget {
  private prunedAt = 0;
  constructor(
    readonly pool: Pool,
    readonly secret: string,
  ) {}
  async consume(ip: string, group: string, limit: number, now = Date.now()) {
    const window = Math.floor(now / 60000),
      key = createHmac("sha256", this.secret)
        .update(`${group}:${ip}`)
        .digest("hex");
    if (this.prunedAt < window) {
      await this.pool.query(
        "DELETE FROM api_request_budgets WHERE window_id<$1",
        [window - 1],
      );
      this.prunedAt = window;
    }
    const result = await this.pool.query<{ count: number }>(
      "INSERT INTO api_request_budgets(key,window_id,count) VALUES($1,$2,1) ON CONFLICT(key,window_id) DO UPDATE SET count=api_request_budgets.count+1 WHERE api_request_budgets.count<$3 RETURNING count",
      [key, window, limit],
    );
    return {
      allowed: !!result.rowCount,
      retryAfter: Math.max(1, Math.ceil(((window + 1) * 60000 - now) / 1000)),
    };
  }
}
export function requestGroup(url: string) {
  const path = url.split("?")[0];
  if (path.startsWith("/api/auth/")) return "identity";
  for (const group of [
    "graph",
    "frontend",
    "backend",
    "analysis",
    "schema",
    "execution",
    "quality",
    "comparison",
    "team",
    "repositories",
    "studio",
    "diagrams",
    "exports",
    "operations",
  ])
    if (path.startsWith(`/api/v1/${group}/`)) return group;
  return "other";
}
