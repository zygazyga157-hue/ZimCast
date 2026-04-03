import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  typescript: {
    // tsc --noEmit is used separately; SWC WASM fallback crashes during build
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.live-score-api.com",
      },
      {
        protocol: "https",
        hostname: "livescore-api.com",
      },
    ],
  },
};

export default nextConfig;
