import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  typescript: {
    // tsc --noEmit is used separately; SWC WASM fallback crashes during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
