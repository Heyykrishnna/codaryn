import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { workbenchOrigins } from "./src/features/workbench/origins.mjs";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  headers() {
    const production = process.env.NODE_ENV === "production";
    const policy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      `connect-src 'self'${production ? "" : " ws: wss:"}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(production ? ["upgrade-insecure-requests"] : []),
    ];
    const targets = workbenchOrigins(
      process.env.NEXT_PUBLIC_WORKBENCH_ORIGINS,
      !production,
    );
    return Promise.resolve([
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: policy.join("; ") },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(production
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
        ],
      },
      {
        source: "/workbench",
        headers: [
          {
            key: "Content-Security-Policy",
            value: policy
              .map((directive) =>
                directive.startsWith("connect-src")
                  ? `connect-src 'self' ${targets.join(" ")}`
                  : directive,
              )
              .join("; "),
          },
        ],
      },
    ]);
  },
  rewrites() {
    const api = process.env.API_URL ?? "http://127.0.0.1:4000";
    return Promise.resolve([
      {
        source: "/api/v1/schema/:path*",
        destination: `${api}/api/v1/schema/:path*`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${api}/api/v1/:path*`,
      },
      { source: "/api/auth/:path*", destination: `${api}/api/auth/:path*` },
    ]);
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
