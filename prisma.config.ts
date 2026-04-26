import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // Use tsx to execute the TypeScript seed script directly during `prisma db seed`.
    // Previously pointed to the compiled `prisma/seed.cjs`, which caused Vercel builds
    // to attempt running `node prisma/seed.cjs`. Using `npx tsx` is cross-platform.
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Prefer a direct (non-pooled) connection for Prisma CLI operations on Vercel Postgres.
    // Runtime code uses `DATABASE_URL` (often pooled) via the Prisma driver adapter.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
