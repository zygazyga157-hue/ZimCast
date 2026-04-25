import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startDb, stopDb, clearDb } from "../helpers/containers";
import { startServer, stopServer } from "../helpers/server";
import { api, authenticate } from "../helpers/request";
import {
  createUser,
  createMatch,
  createMatchPass,
  resetCounters,
} from "../helpers/factories";
import { prisma } from "@/lib/prisma";
import { generateStreamToken } from "../../src/lib/tokens";

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

describe("POST /api/streams/token", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await api("POST", "/api/streams/token", { matchId: "abc" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when matchId is missing", async () => {
    const user = await createUser();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api("POST", "/api/streams/token", {}, cookie);
    expect(res.status).toBe(400);
  });

  it("returns 404 when the match does not exist", async () => {
    const user = await createUser();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/streams/token",
      { matchId: "no-such-match" },
      cookie
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when the user has no match pass", async () => {
    const user = await createUser();
    const match = await createMatch();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/streams/token",
      { matchId: match.id },
      cookie
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 for an expired match pass", async () => {
    const user = await createUser();
    const match = await createMatch();
    // create a pass that expired 1 hour ago
    await createMatchPass(user.id, match.id, new Date(Date.now() - 3600_000));
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/streams/token",
      { matchId: match.id },
      cookie
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with a token and streamUrl for a valid pass", async () => {
    const user = await createUser();
    const match = await createMatch({ streamKey: "match_dynamos_caps" });
    await createMatchPass(user.id, match.id);
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/streams/token",
      { matchId: match.id },
      cookie
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("streamUrl");
    expect(res.body.streamUrl).toContain("index.m3u8");
  });
});

describe("GET /api/streams/ztv/token", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await api("GET", "/api/streams/ztv/token");
    expect(res.status).toBe(401);
  });

  it("returns a ZTV token for any authenticated user", async () => {
    const user = await createUser();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api("GET", "/api/streams/ztv/token", undefined, cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    // Verify the token encodes path = 'ztv'
    const [data] = (res.body.token as string).split(".");
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    expect(payload.path).toBe("ztv");
  });
});

describe("GET /api/streams/ztv/status", () => {
  it("uses the blackout SPORTS program endTime as resumesAt (not the next program start)", async () => {
    const match = await createMatch({ kickoff: new Date() });

    const now = Date.now();
    const blackoutEnd = new Date(now + 2 * 60 * 60 * 1000);

    await prisma.program.create({
      data: {
        channel: "ZBCTV",
        title: `${match.homeTeam} vs ${match.awayTeam}`,
        category: "SPORTS",
        blackout: true,
        startTime: new Date(now - 10 * 60 * 1000),
        endTime: blackoutEnd,
        matchId: match.id,
      },
    });

    // Create a non-blackout program tomorrow to ensure it doesn't affect resumesAt.
    await prisma.program.create({
      data: {
        channel: "ZBCTV",
        title: "Morning News",
        category: "NEWS",
        blackout: false,
        startTime: new Date(now + 24 * 60 * 60 * 1000),
        endTime: new Date(now + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      },
    });

    const res = await api("GET", "/api/streams/ztv/status");
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(new Date(res.body.resumesAt).toISOString()).toBe(blackoutEnd.toISOString());
  });
});

describe("POST /api/streams/auth-hook", () => {
  it("allows publish actions without a token", async () => {
    const res = await api("POST", "/api/streams/auth-hook", {
      action: "publish",
      path: "match_dynamos_caps",
      query: "",
    });
    expect(res.status).toBe(200);
  });

  it("denies read action with no token", async () => {
    const res = await api("POST", "/api/streams/auth-hook", {
      action: "read",
      path: "match_dynamos_caps",
      query: "",
    });
    expect(res.status).toBe(401);
  });

  it("denies read action with an invalid token", async () => {
    const res = await api("POST", "/api/streams/auth-hook", {
      action: "read",
      path: "match_dynamos_caps",
      query: { token: "bad.token" },
    });
    expect(res.status).toBe(401);
  });

  it("allows read action for a match stream with a valid HMAC token", async () => {
    process.env.STREAM_TOKEN_SECRET = "test-secret-for-vitest";
    const token = generateStreamToken("user-x", "match_dynamos_caps", 3600);
    const res = await api("POST", "/api/streams/auth-hook", {
      action: "read",
      path: "match_dynamos_caps",
      query: { token },
    });
    expect(res.status).toBe(200);
  });

  it("allows read action for ZTV with a valid ztv token", async () => {
    process.env.STREAM_TOKEN_SECRET = "test-secret-for-vitest";
    const token = generateStreamToken("user-x", "ztv", 3600);
    const res = await api("POST", "/api/streams/auth-hook", {
      action: "read",
      path: "ztv",
      query: { token },
    });
    expect(res.status).toBe(200);
  });
});
