import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  allowedDevOrigins: ["10.236.179.*", "192.168.*.*", "172.16.*.*"],
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
