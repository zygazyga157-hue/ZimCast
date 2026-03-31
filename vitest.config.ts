import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Generous timeout for container startup
    testTimeout: 60000,
    hookTimeout: 120000,
    // Separate configs per layer
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          name: "api",
          include: ["tests/api/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
