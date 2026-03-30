import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { startDb, stopDb, clearDb } from "../helpers/containers";
import { startServer, stopServer } from "../helpers/server";
import { api, authenticate } from "../helpers/request";
import {
  createUser,
  createMatch,
  createMatchPass,
  createPayment,
  resetCounters,
} from "../helpers/factories";
import { prisma } from "../../src/lib/prisma";

// ── Mock the Paynow service so tests never hit the live gateway ──────────────
vi.mock("../../src/lib/paynow", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/paynow")>(
    "../../src/lib/paynow"
  );
  return {
    ...actual,
    initiatePaynowPayment: vi.fn().mockResolvedValue({
      success: true,
      redirectUrl: "https://www.paynow.co.zw/payment/initiate/test123",
      pollUrl: "https://www.paynow.co.zw/interface/returntransaction/test123",
    }),
    initiatePaynowMobile: vi.fn().mockResolvedValue({
      success: true,
      pollUrl: "https://www.paynow.co.zw/interface/returntransaction/mobile123",
    }),
    parsePaynowWebhook: vi.fn((rawBody: string) => {
      // For tests we parse our own URL-encoded body without signature checking
      const params = new URLSearchParams(rawBody);
      return {
        reference: params.get("reference") ?? "",
        status: params.get("status") ?? "",
        amount: params.get("amount") ?? "0",
        paynowReference: params.get("paynowreference") ?? "",
        pollUrl: params.get("pollurl") ?? "",
      };
    }),
    pollPaynowTransaction: vi.fn().mockResolvedValue({
      success: false,
    }),
    isPaynowPaid: actual.isPaynowPaid,
  };
});

beforeAll(async () => {
  await startDb();
  await startServer();
}, 120_000);

afterAll(async () => {
  await stopServer();
  await stopDb();
});

beforeEach(async () => {
  await clearDb();
  resetCounters();
});

describe("POST /api/payments/initiate", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await api("POST", "/api/payments/initiate", {
      matchId: "x",
      provider: "PAYNOW",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when matchId is missing", async () => {
    const user = await createUser();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/payments/initiate",
      { provider: "PAYNOW" },
      cookie
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid provider", async () => {
    const user = await createUser();
    const match = await createMatch();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/payments/initiate",
      { matchId: match.id, provider: "BITCOIN" },
      cookie
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for EcoCash without a phone number", async () => {
    const user = await createUser();
    const match = await createMatch();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/payments/initiate",
      { matchId: match.id, provider: "ECOCASH" },
      cookie
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when match does not exist", async () => {
    const user = await createUser();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/payments/initiate",
      { matchId: "no-match", provider: "PAYNOW" },
      cookie
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when user already has a valid pass", async () => {
    const user = await createUser();
    const match = await createMatch();
    await createMatchPass(user.id, match.id);
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/payments/initiate",
      { matchId: match.id, provider: "PAYNOW" },
      cookie
    );
    expect(res.status).toBe(409);
  });

  it("initiates Paynow web payment and returns 200 with redirectUrl", async () => {
    const user = await createUser();
    const match = await createMatch({ price: 3.5 });
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/payments/initiate",
      { matchId: match.id, provider: "PAYNOW" },
      cookie
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "PENDING",
      provider: "PAYNOW",
      amount: 3.5,
    });
    expect(res.body).toHaveProperty("paymentId");
    expect(res.body.redirectUrl).toContain("paynow.co.zw");
    expect(res.body.pollUrl).toContain("paynow.co.zw");
  });

  it("initiates EcoCash mobile payment and returns pollUrl (no redirectUrl)", async () => {
    const user = await createUser();
    const match = await createMatch({ price: 2.0 });
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/payments/initiate",
      { matchId: match.id, provider: "ECOCASH", phone: "0771234567" },
      cookie
    );
    expect(res.status).toBe(200);
    expect(res.body.redirectUrl).toBeNull();
    expect(res.body.pollUrl).toContain("paynow.co.zw");
  });
});

describe("POST /api/payments/webhook", () => {
  it("returns 400 when body is empty/invalid", async () => {
    const res = await api("POST", "/api/payments/webhook", {});
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent payment reference", async () => {
    // Send our JSON fallback format
    const res = await api("POST", "/api/payments/webhook", {
      paymentId: "no-such-id",
      status: "paid",
    });
    expect(res.status).toBe(404);
  });

  it("creates a MatchPass on paid JSON webhook (test fallback format)", async () => {
    const user = await createUser();
    const match = await createMatch();
    const payment = await createPayment(user.id, match.id, { status: "PENDING" });

    const res = await api("POST", "/api/payments/webhook", {
      paymentId: payment.id,
      status: "paid",
    });
    expect(res.status).toBe(200);

    const pass = await prisma.matchPass.findUnique({
      where: { userId_matchId: { userId: user.id, matchId: match.id } },
    });
    expect(pass).not.toBeNull();

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(updatedPayment!.status).toBe("COMPLETED");
  });

  it("marks payment as FAILED on failed webhook", async () => {
    const user = await createUser();
    const match = await createMatch();
    const payment = await createPayment(user.id, match.id, { status: "PENDING" });

    const res = await api("POST", "/api/payments/webhook", {
      paymentId: payment.id,
      status: "failed",
    });
    expect(res.status).toBe(200);

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(updatedPayment!.status).toBe("FAILED");

    const pass = await prisma.matchPass.findUnique({
      where: { userId_matchId: { userId: user.id, matchId: match.id } },
    });
    expect(pass).toBeNull();
  });

  it("is idempotent — processing a completed payment again returns 200", async () => {
    const user = await createUser();
    const match = await createMatch();
    const payment = await createPayment(user.id, match.id, { status: "COMPLETED" });

    const res = await api("POST", "/api/payments/webhook", {
      paymentId: payment.id,
      status: "paid",
    });
    expect(res.status).toBe(200);
  });
});
