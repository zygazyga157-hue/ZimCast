/**
 * tests/helpers/factories.ts
 *
 * Creates test fixtures directly in the database.
 * Avoids going through the API for setup, so test failures
 * are isolated to the code under test.
 */
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

interface CreateUserOpts {
  email?: string;
  password?: string;
  role?: Role;
  name?: string;
}

let userCounter = 0;

export async function createUser(opts: CreateUserOpts = {}) {
  userCounter++;
  const email = opts.email ?? `user${userCounter}@test.com`;
  const password = opts.password ?? "Password123";
  const hashedPassword = await hash(password, 4); // low rounds for test speed

  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: opts.name ?? `Test User ${userCounter}`,
      role: opts.role ?? "USER",
    },
  });
}

export async function createAdmin(opts: CreateUserOpts = {}) {
  return createUser({ ...opts, role: "ADMIN" });
}

interface CreateMatchOpts {
  homeTeam?: string;
  awayTeam?: string;
  kickoff?: Date;
  price?: number;
  streamKey?: string;
  isLive?: boolean;
}

let matchCounter = 0;

export async function createMatch(opts: CreateMatchOpts = {}) {
  matchCounter++;
  return prisma.match.create({
    data: {
      homeTeam: opts.homeTeam ?? `Home FC ${matchCounter}`,
      awayTeam: opts.awayTeam ?? `Away FC ${matchCounter}`,
      kickoff: opts.kickoff ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      price: opts.price ?? 2.99,
      streamKey: opts.streamKey ?? `match_test_${matchCounter}`,
      isLive: opts.isLive ?? false,
    },
  });
}

export async function createMatchPass(
  userId: string,
  matchId: string,
  expiresAt?: Date
) {
  return prisma.matchPass.create({
    data: {
      userId,
      matchId,
      expiresAt: expiresAt ?? new Date(Date.now() + 4 * 60 * 60 * 1000),
    },
  });
}

export async function createPayment(
  userId: string,
  matchId: string,
  opts: { status?: "PENDING" | "COMPLETED" | "FAILED"; provider?: "PAYNOW" | "ECOCASH" | "PAYPAL"; amount?: number } = {}
) {
  return prisma.payment.create({
    data: {
      userId,
      matchId,
      amount: opts.amount ?? 2.99,
      provider: opts.provider ?? "PAYNOW",
      status: opts.status ?? "PENDING",
    },
  });
}

/** Reset counters between test files */
export function resetCounters() {
  userCounter = 0;
  matchCounter = 0;
}
