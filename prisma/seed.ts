import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

function createSeedPrisma() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DIRECT_URL/DATABASE_URL for seeding.");
  }

  // This repo uses Prisma Driver Adapters (@prisma/adapter-pg) at runtime.
  // When the client is generated for driver adapters, constructing PrismaClient()
  // without an adapter can throw an initialization error.
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = createSeedPrisma();

function envBool(name: string, fallback: boolean) {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === "true" || v === "1" || v.toLowerCase() === "yes";
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function atTime(date: Date, hour: number, minute: number) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

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

  // Demo user + content seeding (opt-in for production; default on for local dev)
  const seedDemoUser = envBool("SEED_DEMO_USER", !isProd);
  const seedMatches = envBool("SEED_SAMPLE_MATCHES", !isProd);
  const seedTemplates = envBool("SEED_SAMPLE_TEMPLATES", !isProd);
  const seedPrograms = envBool("SEED_SAMPLE_PROGRAMS", !isProd);
  const seedViewing = envBool("SEED_SAMPLE_VIEWING", !isProd);

  // Demo user
  const demoEmail = (process.env.SEED_DEMO_EMAIL ?? "demo@zimcast.tv").trim();
  const demoPasswordPlain = (process.env.SEED_DEMO_PASSWORD ?? (isProd ? "" : "demo12345")).trim();
  let demoUserId: string | null = null;
  if (!seedDemoUser) {
    console.log("[seed] Skipping demo user (set SEED_DEMO_USER=true to enable).");
  } else if (!demoPasswordPlain) {
    console.log("[seed] Skipping demo user: set SEED_DEMO_PASSWORD to create/update the demo account.");
  } else {
    const demoPassword = await hash(demoPasswordPlain, 12);
    const demo = await prisma.user.upsert({
      where: { email: demoEmail },
      update: {
        password: demoPassword,
        role: "USER",
        emailVerified: true,
        name: "Pitch Demo",
        country: "Zimbabwe",
      },
      create: {
        email: demoEmail,
        password: demoPassword,
        role: "USER",
        emailVerified: true,
        name: "Pitch Demo",
        country: "Zimbabwe",
      },
      select: { id: true, email: true },
    });
    demoUserId = demo.id;
    console.log("[seed] Demo user:", demo.email);
  }

  // Program templates (used by admin generator, and useful for demos)
  const templateDefs = [
    {
      name: "Morning News",
      channel: "ZBCTV",
      title: "Morning News",
      description: "Daily headlines and updates.",
      category: "NEWS" as const,
      blackout: false,
      startHour: 9,
      startMinute: 0,
      durationMin: 30,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      name: "Midday Update",
      channel: "ZBCTV",
      title: "Midday Update",
      description: "Midday news and weather.",
      category: "NEWS" as const,
      blackout: false,
      startHour: 13,
      startMinute: 0,
      durationMin: 30,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      name: "ZimCast Music Hour",
      channel: "ZBCTV",
      title: "ZimCast Music Hour",
      description: "Trending local and international music.",
      category: "MUSIC" as const,
      blackout: false,
      startHour: 14,
      startMinute: 0,
      durationMin: 60,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      name: "Evening News",
      channel: "ZBCTV",
      title: "Evening News",
      description: "Prime-time news roundup.",
      category: "NEWS" as const,
      blackout: false,
      startHour: 19,
      startMinute: 0,
      durationMin: 30,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      name: "ZimCast Feature",
      channel: "ZBCTV",
      title: "ZimCast Feature",
      description: "Documentaries and features.",
      category: "DOCUMENTARY" as const,
      blackout: false,
      startHour: 20,
      startMinute: 0,
      durationMin: 90,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    },
  ];

  if (!seedTemplates) {
    console.log("[seed] Skipping program templates (set SEED_SAMPLE_TEMPLATES=true to enable).");
  } else {
    let createdOrUpdated = 0;
    for (const t of templateDefs) {
      const existing = await prisma.programTemplate.findFirst({
        where: { channel: t.channel, name: t.name },
        select: { id: true },
      });
      if (existing) {
        await prisma.programTemplate.update({
          where: { id: existing.id },
          data: {
            title: t.title,
            description: t.description,
            category: t.category,
            blackout: t.blackout,
            startHour: t.startHour,
            startMinute: t.startMinute,
            durationMin: t.durationMin,
            daysOfWeek: t.daysOfWeek,
            isActive: true,
          },
        });
      } else {
        await prisma.programTemplate.create({ data: { ...t, isActive: true } });
      }
      createdOrUpdated++;
    }
    console.log(`[seed] Program templates upserted: ${createdOrUpdated}`);
  }

  // Generate simple non-overlapping programs for the next 7 days (idempotent per (title,startTime))
  if (!seedPrograms) {
    console.log("[seed] Skipping program generation (set SEED_SAMPLE_PROGRAMS=true to enable).");
  } else {
    const start = atTime(new Date(), 0, 0);
    const end = addDays(start, 7);
    const daysSetByName = new Map(templateDefs.map((t) => [t.name, new Set(t.daysOfWeek)]));

    let created = 0;
    const cursor = new Date(start);
    while (cursor < end) {
      const dow = cursor.getDay();
      for (const t of templateDefs) {
        if (!daysSetByName.get(t.name)!.has(dow)) continue;

        const progStart = atTime(cursor, t.startHour, t.startMinute);
        const progEnd = new Date(progStart.getTime() + t.durationMin * 60 * 1000);

        const exists = await prisma.program.findFirst({
          where: {
            channel: t.channel,
            title: t.title,
            startTime: progStart,
          },
          select: { id: true },
        });
        if (exists) continue;

        await prisma.program.create({
          data: {
            channel: t.channel,
            title: t.title,
            description: t.description,
            category: t.category,
            blackout: t.blackout,
            startTime: progStart,
            endTime: progEnd,
          },
        });
        created++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    console.log(`[seed] Programs created (next 7 days): ${created}`);
  }

  // Matches + linked blackout SPORTS programs
  let seededMatches: { id: string; streamKey: string }[] = [];
  if (!seedMatches) {
    console.log("[seed] Skipping sample matches (set SEED_SAMPLE_MATCHES=true to enable).");
  } else {
    // Keep match windows free of the template programs seeded above (afternoons are mostly open).
    const kickoff1 = atTime(addDays(new Date(), 1), 16, 0);
    const kickoff2 = atTime(addDays(new Date(), 4), 16, 0);
    const kickoff3 = atTime(addDays(new Date(), 6), 16, 0);

    const matchDefs = [
      {
        streamKey: "match_dynamos_caps",
        homeTeam: "Dynamos FC",
        awayTeam: "CAPS United",
        kickoff: kickoff1,
        price: "2.99",
      },
      {
        streamKey: "match_highlanders_bullets",
        homeTeam: "Highlanders FC",
        awayTeam: "Chicken Inn",
        kickoff: kickoff2,
        price: "2.99",
      },
      {
        streamKey: "match_demo_redbulltv",
        homeTeam: "Demo FC",
        awayTeam: "Public Stream XI",
        kickoff: kickoff3,
        price: "0.00",
      },
    ] as const;

    const matches = await Promise.all(
      matchDefs.map((m) =>
        prisma.match.upsert({
          where: { streamKey: m.streamKey },
          update: {
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            kickoff: m.kickoff,
            price: m.price,
          },
          create: {
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            kickoff: m.kickoff,
            price: m.price,
            streamKey: m.streamKey,
            isLive: false,
          },
          select: { id: true, streamKey: true, homeTeam: true, awayTeam: true, kickoff: true },
        }),
      ),
    );

    seededMatches = matches.map((m) => ({ id: m.id, streamKey: m.streamKey }));
    console.log("[seed] Matches upserted:", matches.length);

    // Create/update linked blackout SPORTS program per match: kickoff - 15m → kickoff + 210m.
    let sportsPrograms = 0;
    for (const m of matches) {
      const startTime = new Date(m.kickoff.getTime() - 15 * 60 * 1000);
      const endTime = new Date(m.kickoff.getTime() + 210 * 60 * 1000);

      const existing = await prisma.program.findFirst({
        where: { matchId: m.id, category: "SPORTS" },
        select: { id: true },
      });

      if (existing) {
        await prisma.program.update({
          where: { id: existing.id },
          data: {
            channel: "ZBCTV",
            title: `${m.homeTeam} vs ${m.awayTeam}`,
            blackout: true,
            startTime,
            endTime,
          },
        });
      } else {
        await prisma.program.create({
          data: {
            channel: "ZBCTV",
            title: `${m.homeTeam} vs ${m.awayTeam}`,
            category: "SPORTS",
            blackout: true,
            startTime,
            endTime,
            matchId: m.id,
          },
        });
      }
      sportsPrograms++;
    }
    console.log("[seed] Match-linked SPORTS programs upserted:", sportsPrograms);
  }

  // Demo passes + activity for analytics/insight
  if (!demoUserId) {
    console.log("[seed] Skipping passes + analytics seed (no demo user).");
    return;
  }

  if (seededMatches.length > 0) {
    const expiresAt = addDays(new Date(), 30);
    for (const m of seededMatches) {
      await prisma.matchPass.upsert({
        where: { userId_matchId: { userId: demoUserId, matchId: m.id } },
        update: { expiresAt },
        create: { userId: demoUserId, matchId: m.id, expiresAt },
      });
    }
    console.log("[seed] Demo passes upserted:", seededMatches.length);
  }

  if (!seedViewing) {
    console.log("[seed] Skipping viewing activity (set SEED_SAMPLE_VIEWING=true to enable).");
    return;
  }

  // Avoid duplicating activity on repeated seeds
  const existingActivity = await prisma.viewingActivity.count({
    where: { userId: demoUserId, sessionStart: { gte: addDays(new Date(), -30) } },
  });
  if (existingActivity > 0) {
    console.log(`[seed] Viewing activity already exists (${existingActivity} rows in last 30 days); skipping.`);
    return;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const matchForSports = seededMatches[0]?.id ?? null;

  const activities: Prisma.ViewingActivityCreateManyInput[] = [];

  // Strong “habit at this hour” for /api/user/insight
  for (let d = 1; d <= 20; d++) {
    const day = addDays(now, -d);
    const sessionStart = atTime(day, currentHour, 10);
    activities.push({
      userId: demoUserId,
      matchId: matchForSports,
      action: "WATCH",
      watchDuration: 1200, // 20 minutes
      sessionStart,
      sessionEnd: new Date(sessionStart.getTime() + 1200 * 1000),
    });
  }

  // Extra mixed activity for analytics (categories inferred from matchId vs programId)
  const samplePrograms = await prisma.program.findMany({
    where: { channel: "ZBCTV", blackout: false },
    select: { id: true },
    take: 5,
    orderBy: { startTime: "asc" },
  });
  for (let i = 0; i < 25; i++) {
    const day = addDays(now, -(i % 14));
    const sessionStart = atTime(day, 19, (i % 2) * 20); // evening
    const programId = samplePrograms[i % Math.max(samplePrograms.length, 1)]?.id ?? null;
    activities.push({
      userId: demoUserId,
      programId,
      action: "WATCH",
      watchDuration: 300 + (i % 4) * 120, // 5–11 minutes
      sessionStart,
      sessionEnd: new Date(sessionStart.getTime() + (300 + (i % 4) * 120) * 1000),
    });
  }

  await prisma.viewingActivity.createMany({ data: activities });
  console.log("[seed] Viewing activities created:", activities.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
