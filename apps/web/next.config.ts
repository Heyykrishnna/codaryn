import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
