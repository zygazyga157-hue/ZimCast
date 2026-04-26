import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const isProd = process.env.NODE_ENV === "production";

  // Admin user (safe defaults: require explicit password in production)
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@zimcast.tv").trim();
  const adminPasswordPlain = (process.env.SEED_ADMIN_PASSWORD ?? (isProd ? "" : "admin12345")).trim();

  if (!adminPasswordPlain) {
    console.log("[seed] Skipping admin seed: set SEED_ADMIN_PASSWORD to create/update an admin user.");
  } else {
    const adminPassword = await hash(adminPasswordPlain, 12);
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: adminPassword,
        role: "ADMIN",
        emailVerified: true,
      },
      create: {
        email: adminEmail,
        password: adminPassword,
        name: "ZimCast Admin",
        role: "ADMIN",
        emailVerified: true,
        country: "Zimbabwe",
      },
    });
    console.log("[seed] Admin user:", admin.email);
  }

  // Sample matches (opt-in for production; default on for local dev)
  const seedSamples =
    process.env.SEED_SAMPLE_MATCHES === "true" || (!isProd && process.env.SEED_SAMPLE_MATCHES !== "false");

  if (!seedSamples) {
    console.log("[seed] Skipping sample matches (set SEED_SAMPLE_MATCHES=true to enable).");
    return;
  }

  const matches = await Promise.all([
    prisma.match.upsert({
      where: { streamKey: "match_dynamos_caps" },
      update: {},
      create: {
        homeTeam: "Dynamos FC",
        awayTeam: "CAPS United",
        kickoff: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        price: "2.99",
        streamKey: "match_dynamos_caps",
      },
    }),
    prisma.match.upsert({
      where: { streamKey: "match_highlanders_bullets" },
      update: {},
      create: {
        homeTeam: "Highlanders FC",
        awayTeam: "Chicken Inn",
        kickoff: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        price: "2.99",
        streamKey: "match_highlanders_bullets",
      },
    }),
  ]);
  console.log("[seed] Sample matches created:", matches.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
