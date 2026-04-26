import { spawnSync } from "node:child_process";

// Only run seed when explicitly forced. This avoids running seeds during Docker image builds
// where the database may be unreachable. Set `FORCE_DB_SEED=true` to enable seeding.
const force = process.env.FORCE_DB_SEED === "true";

console.log(`[run-seed-if-not-prod] FORCE_DB_SEED=${force}`);

if (!force) {
  console.log("[run-seed-if-not-prod] FORCE_DB_SEED not set; skipping seed.");
  process.exit(0);
}

console.log("[run-seed-if-not-prod] Running `npx prisma db seed`...");
const res = spawnSync("npx", ["prisma", "db", "seed"], {
  stdio: "inherit",
  shell: true,
});

if (res.error) {
  console.error("[run-seed-if-not-prod] spawn error:", res.error);
  process.exit(1);
}
if (res.status !== 0 && res.status !== null) {
  console.error("[run-seed-if-not-prod] seed command exited with code", res.status);
  process.exit(res.status);
}
console.log("[run-seed-if-not-prod] Seed completed successfully.");

