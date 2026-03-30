/**
 * tests/helpers/containers.ts
 *
 * Starts a real PostgreSQL container via testcontainers.
 * Call startDb() in beforeAll, stopDb() in afterAll.
 * The helper patches process.env.DATABASE_URL so Prisma picks it up.
 */
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "child_process";
import path from "path";

let pgContainer: StartedPostgreSqlContainer | null = null;

export async function startDb(): Promise<void> {
  pgContainer = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("zimcast_test")
    .withUsername("postgres")
    .withPassword("postgres")
    .start();

  process.env.DATABASE_URL = pgContainer.getConnectionUri();

  // Run migrations against the test database
  const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
  execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
    env: { ...process.env },
    stdio: "pipe",
  });
}

export async function stopDb(): Promise<void> {
  if (pgContainer) {
    await pgContainer.stop();
    pgContainer = null;
  }
}

/**
 * Truncate all data tables between tests (faster than restarting the container).
 * Preserves the schema. Call in beforeEach when you need a clean slate.
 */
export async function clearDb(): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.matchPass.deleteMany(),
    prisma.match.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
