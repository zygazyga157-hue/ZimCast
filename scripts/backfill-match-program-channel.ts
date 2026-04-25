import { prisma } from "../src/lib/prisma";

async function main() {
  const res = await prisma.program.updateMany({
    where: {
      matchId: { not: null },
      category: "SPORTS",
      channel: { not: "ZBCTV" },
    },
    data: {
      channel: "ZBCTV",
    },
  });

  console.log(`Updated ${res.count} program(s) → channel=ZBCTV`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
