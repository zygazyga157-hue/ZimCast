import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startDb, stopDb, clearDb } from "../helpers/containers";
import { startServer, stopServer } from "../helpers/server";
import { api } from "../helpers/request";

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
});

describe("POST /api/auth/register", () => {
  const valid = {
    email: "alice@example.com",
    password: "SecurePass1",
    name: "Alice",
  };

  it("creates a new user and returns 201 with no password field", async () => {
    const res = await api("POST", "/api/auth/register", valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: valid.email, name: valid.name });
    expect(res.body).not.toHaveProperty("password");
  });

  it("returns 409 when email is already registered", async () => {
    await api("POST", "/api/auth/register", valid);
    const res = await api("POST", "/api/auth/register", valid);
    expect(res.status).toBe(409);
  });

  it("returns 400 when email is missing", async () => {
    const res = await api("POST", "/api/auth/register", {
      password: "SecurePass1",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await api("POST", "/api/auth/register", {
      email: "bob@example.com",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid format", async () => {
    const res = await api("POST", "/api/auth/register", {
      email: "not-an-email",
      password: "SecurePass1",
    });
    expect(res.status).toBe(400);
  });

  it("assigns USER role by default", async () => {
    const res = await api("POST", "/api/auth/register", valid);
    expect(res.body.role).toBe("USER");
  });
});
