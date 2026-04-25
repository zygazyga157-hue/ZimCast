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
    url: process.env.DATABASE_URL ?? "",
  },
});
