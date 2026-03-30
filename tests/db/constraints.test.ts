import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startDb, stopDb, clearDb } from "../helpers/containers";
import {
  createUser,
  createMatch,
  createMatchPass,
  resetCounters,
} from "../helpers/factories";
import { prisma } from "../../src/lib/prisma";

beforeAll(async () => {
  await startDb();
}, 120_000);

afterAll(async () => {
  await stopDb();
});

beforeEach(async () => {
  await clearDb();
  resetCounters();
});

describe("User constraints", () => {
  it("enforces unique email constraint", async () => {
    await createUser({ email: "unique@test.com" });
    await expect(createUser({ email: "unique@test.com" })).rejects.toThrow();
  });

  it("defaults role to USER", async () => {
    const user = await createUser();
    expect(user.role).toBe("USER");
  });
});

describe("Match constraints", () => {
  it("stores price as a Decimal", async () => {
    const match = await createMatch({ price: 4.99 });
    const found = await prisma.match.findUnique({ where: { id: match.id } });
    // Prisma returns Decimal; compare as string for precision safety
    expect(Number(found!.price)).toBeCloseTo(4.99);
  });

  it("defaults isLive to false", async () => {
    const match = await createMatch();
    expect(match.isLive).toBe(false);
  });
});

describe("MatchPass constraints", () => {
  it("enforces unique (userId, matchId) constraint", async () => {
    const user = await createUser();
    const match = await createMatch();
    await createMatchPass(user.id, match.id);
    await expect(createMatchPass(user.id, match.id)).rejects.toThrow();
  });

  it("allows the same user to have passes for different matches", async () => {
    const user = await createUser();
    const m1 = await createMatch();
    const m2 = await createMatch();
    await expect(createMatchPass(user.id, m1.id)).resolves.toBeDefined();
    await expect(createMatchPass(user.id, m2.id)).resolves.toBeDefined();
  });
});

describe("Cascade deletes", () => {
  it("deletes MatchPasses when their User is deleted", async () => {
    const user = await createUser();
    const match = await createMatch();
    const pass = await createMatchPass(user.id, match.id);

    await prisma.user.delete({ where: { id: user.id } });

    const found = await prisma.matchPass.findUnique({ where: { id: pass.id } });
    expect(found).toBeNull();
  });

  it("deletes MatchPasses when their Match is deleted", async () => {
    const user = await createUser();
    const match = await createMatch();
    const pass = await createMatchPass(user.id, match.id);

    await prisma.match.delete({ where: { id: match.id } });

    const found = await prisma.matchPass.findUnique({ where: { id: pass.id } });
    expect(found).toBeNull();
  });

  it("deletes Payments when their User is deleted", async () => {
    const user = await createUser();
    const match = await createMatch();
    const payment = await prisma.payment.create({
      data: { userId: user.id, matchId: match.id, amount: 2.99, provider: "PAYNOW" },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const found = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(found).toBeNull();
  });

  it("deletes Payments when their Match is deleted", async () => {
    const user = await createUser();
    const match = await createMatch();
    const payment = await prisma.payment.create({
      data: { userId: user.id, matchId: match.id, amount: 2.99, provider: "PAYNOW" },
    });

    await prisma.match.delete({ where: { id: match.id } });

    const found = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(found).toBeNull();
  });
});

describe("Payment enum defaults", () => {
  it("defaults payment status to PENDING", async () => {
    const user = await createUser();
    const match = await createMatch();
    const payment = await prisma.payment.create({
      data: { userId: user.id, matchId: match.id, amount: 2.99, provider: "ECOCASH" },
    });
    expect(payment.status).toBe("PENDING");
  });
});
