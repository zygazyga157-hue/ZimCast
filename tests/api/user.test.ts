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

describe("GET /api/user/profile", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await api("GET", "/api/user/profile");
    expect(res.status).toBe(401);
  });

  it("returns profile without password field", async () => {
    const user = await createUser({ name: "Zimbabwe Fan" });
    const cookie = await authenticate(user.email, "Password123");
    const res = await api("GET", "/api/user/profile", undefined, cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: user.email, name: "Zimbabwe Fan" });
    expect(res.body).not.toHaveProperty("password");
  });
});

describe("PATCH /api/user/profile", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await api("PATCH", "/api/user/profile", { name: "Hacker" });
    expect(res.status).toBe(401);
  });

  it("updates allowlisted fields only", async () => {
    const user = await createUser();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "PATCH",
      "/api/user/profile",
      { name: "Updated Name", city: "Harare", country: "Zimbabwe", role: "ADMIN" },
      cookie
    );
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.city).toBe("Harare");
    // role is not an allowlisted field — should not change
    expect(res.body.role).toBeUndefined(); // not even returned in select
  });

  it("updates numeric age correctly", async () => {
    const user = await createUser();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api(
      "PATCH",
      "/api/user/profile",
      { age: "25" }, // sent as string, should be parsed to int
      cookie
    );
    expect(res.status).toBe(200);
    expect(res.body.age).toBe(25);
  });
});

describe("GET /api/user/passes", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await api("GET", "/api/user/passes");
    expect(res.status).toBe(401);
  });

  it("returns empty array when user has no passes", async () => {
    const user = await createUser();
    const cookie = await authenticate(user.email, "Password123");
    const res = await api("GET", "/api/user/passes", undefined, cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns passes with nested match details", async () => {
    const user = await createUser();
    const match = await createMatch({ homeTeam: "Dynamos", awayTeam: "CAPS" });
    await createMatchPass(user.id, match.id);
    const cookie = await authenticate(user.email, "Password123");
    const res = await api("GET", "/api/user/passes", undefined, cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].match).toMatchObject({
      homeTeam: "Dynamos",
      awayTeam: "CAPS",
    });
  });

  it("does not return passes belonging to other users", async () => {
    const user1 = await createUser();
    const user2 = await createUser();
    const match = await createMatch();
    await createMatchPass(user1.id, match.id);
    const cookie = await authenticate(user2.email, "Password123");
    const res = await api("GET", "/api/user/passes", undefined, cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
