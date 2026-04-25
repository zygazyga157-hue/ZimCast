import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await hash("admin12345", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@zimcast.tv" },
    update: {},
    create: {
      email: "admin@zimcast.tv",
      password: adminPassword,
      name: "ZimCast Admin",
      role: "ADMIN",
      country: "Zimbabwe",
    },
  });
  console.log("Admin user:", admin.email);

  // Create sample matches
  const matches = await Promise.all([
    prisma.match.upsert({
      where: { streamKey: "match_dynamos_caps" },
      update: {},
      create: {
        homeTeam: "Dynamos FC",
        awayTeam: "CAPS United",
        kickoff: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        price: 2.99,
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
        price: 2.99,
        streamKey: "match_highlanders_bullets",
      },
    }),
  ]);
  console.log("Sample matches created:", matches.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
