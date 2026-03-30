import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startDb, stopDb, clearDb } from "../helpers/containers";
import { startServer, stopServer } from "../helpers/server";
import { api, authenticate } from "../helpers/request";
import { createUser, createAdmin, createMatch, resetCounters } from "../helpers/factories";

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

describe("GET /api/matches", () => {
  it("returns an empty array when no matches exist", async () => {
    const res = await api("GET", "/api/matches");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns all matches", async () => {
    await createMatch({ homeTeam: "Dynamos", awayTeam: "CAPS United" });
    await createMatch({ homeTeam: "Highlanders", awayTeam: "Bulawayo Chiefs" });
    const res = await api("GET", "/api/matches");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ homeTeam: expect.any(String) });
  });

  it("filters by status=live when ?status=live", async () => {
    await createMatch({ isLive: false });
    await createMatch({ isLive: true });
    const res = await api("GET", "/api/matches?status=live");
    expect(res.status).toBe(200);
    expect(res.body.every((m: { isLive: boolean }) => m.isLive)).toBe(true);
  });
});

describe("GET /api/matches/:id", () => {
  it("returns 200 with match data for a valid id", async () => {
    const match = await createMatch();
    const res = await api("GET", `/api/matches/${match.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(match.id);
  });

  it("returns 404 for a non-existent match", async () => {
    const res = await api("GET", "/api/matches/non-existent-id");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/admin/matches (admin only)", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await api("POST", "/api/admin/matches", {
      homeTeam: "X",
      awayTeam: "Y",
      kickoff: new Date().toISOString(),
      price: 3,
      streamKey: "key1",
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    const user = await createUser();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "POST",
      "/api/admin/matches",
      {
        homeTeam: "X",
        awayTeam: "Y",
        kickoff: new Date().toISOString(),
        price: 3,
        streamKey: "key2",
      },
      cookie
    );
    expect(res.status).toBe(403);
  });

  it("creates a match for an admin user and returns 201", async () => {
    const admin = await createAdmin();
    const cookie = await authenticate(admin.email, "Password123");
    const payload = {
      homeTeam: "Dynamos",
      awayTeam: "CAPS",
      kickoff: new Date(Date.now() + 86400000).toISOString(),
      price: 2.99,
      streamKey: "match_dynamos_caps",
    };
    const res = await api("POST", "/api/admin/matches", payload, cookie);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ homeTeam: "Dynamos", awayTeam: "CAPS" });
  });
});

describe("PATCH /api/admin/matches/:id (admin only)", () => {
  it("updates isLive for admin user", async () => {
    const admin = await createAdmin();
    const match = await createMatch({ isLive: false });
    const cookie = await authenticate(admin.email, "Password123");

    const res = await api(
      "PATCH",
      `/api/admin/matches/${match.id}`,
      { isLive: true },
      cookie
    );
    expect(res.status).toBe(200);
    expect(res.body.isLive).toBe(true);
  });

  it("returns 404 when patching a non-existent match", async () => {
    const admin = await createAdmin();
    const cookie = await authenticate(admin.email, "Password123");
    const res = await api(
      "PATCH",
      "/api/admin/matches/does-not-exist",
      { isLive: true },
      cookie
    );
    expect(res.status).toBe(404);
  });
});
