import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites() {
    const api = process.env.API_URL ?? "http://127.0.0.1:4000";
    return Promise.resolve([
      {
        source: "/api/v1/studio/:path*",
        destination: `${api}/api/v1/studio/:path*`,
      },
      {
        source: "/api/v1/github/:path*",
        destination: `${api}/api/v1/github/:path*`,
      },
      { source: "/api/auth/:path*", destination: `${api}/api/auth/:path*` },
      {
        source: "/api/v1/workspace/:path*",
        destination: `${api}/api/v1/workspace/:path*`,
      },
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
