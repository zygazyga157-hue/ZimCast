/**
 * tests/helpers/request.ts
 *
 * Thin wrapper around supertest to make authenticated requests easy.
 *
 * Usage:
 *   const res = await api("POST", "/api/auth/register", { email, password });
 *   const { agent, cookie } = await loginAs(email, password);
 *   const res = await agent.get("/api/user/profile");
 */
import supertest from "supertest";
import { serverUrl } from "./server";

/** Plain unauthenticated request */
export function api(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: object,
  cookie?: string
): supertest.Test {
  let req = supertest(serverUrl)[method.toLowerCase() as "get"](path)
    .set("Content-Type", "application/json") as supertest.Test;

  if (cookie) req = req.set("Cookie", cookie);
  if (body) req = req.send(body as object);
  return req;
}

/** Login and return a cookie string for subsequent requests */
export async function loginAs(
  email: string,
  password: string
): Promise<string> {
  // NextAuth v5 credentials sign-in via the JSON endpoint
  const res = await supertest(serverUrl)
    .post("/api/auth/callback/credentials")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .send(`email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&csrfToken=&json=true`);

  const cookies: string | string[] | undefined = res.headers["set-cookie"] as string | string[] | undefined;
  if (!Array.isArray(cookies)) return cookies ?? "";
  return cookies.join("; ");
}

/** Get a CSRF token required by NextAuth for credential sign-in */
export async function getCsrfToken(): Promise<string> {
  const res = await supertest(serverUrl)
    .get("/api/auth/csrf")
    .set("Content-Type", "application/json");
  return (res.body as { csrfToken: string }).csrfToken ?? "";
}

/** Full login flow: fetch CSRF then sign in, return session cookie */
export async function authenticate(
  email: string,
  password: string
): Promise<string> {
  const csrf = await getCsrfToken();

  const res = await supertest(serverUrl)
    .post("/api/auth/callback/credentials")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .send(
      `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&csrfToken=${encodeURIComponent(csrf)}&json=true`
    );

  const raw: string | string[] | undefined = res.headers["set-cookie"] as string | string[] | undefined;
  if (!raw) throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return Array.isArray(raw) ? raw.join("; ") : (raw as string);
}
