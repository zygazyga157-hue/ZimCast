import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.STREAM_TOKEN_SECRET = "test-secret-for-vitest";
});

// Dynamic import so the module picks up the env var set above
async function getTokenFns() {
  const mod = await import("../../src/lib/tokens");
  return { generate: mod.generateStreamToken, verify: mod.verifyStreamToken };
}

describe("generateStreamToken", () => {
  it("returns a two-part base64url string", async () => {
    const { generate } = await getTokenFns();
    const token = generate("user1", "match1");
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    // Each part should be non-empty base64url (no +, /, =)
    expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("encodes userId and matchId in the payload", async () => {
    const { generate } = await getTokenFns();
    const token = generate("user42", "match99");
    const [data] = token.split(".");
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    expect(payload.userId).toBe("user42");
    expect(payload.matchId).toBe("match99");
  });

  it("sets expiry approximately equal to requested seconds from now", async () => {
    const { generate } = await getTokenFns();
    const before = Math.floor(Date.now() / 1000);
    const token = generate("u", "m", 3600);
    const after = Math.floor(Date.now() / 1000);
    const [data] = token.split(".");
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    expect(payload.exp).toBeGreaterThanOrEqual(before + 3600);
    expect(payload.exp).toBeLessThanOrEqual(after + 3600);
  });

  it("handles ZTV special matchId 'ztv'", async () => {
    const { generate } = await getTokenFns();
    const token = generate("user1", "ztv", 4 * 60 * 60);
    const [data] = token.split(".");
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    expect(payload.matchId).toBe("ztv");
  });
});

describe("verifyStreamToken", () => {
  it("returns the correct payload for a valid token", async () => {
    const { generate, verify } = await getTokenFns();
    const token = generate("user1", "match1", 3600);
    const result = verify(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user1");
    expect(result!.matchId).toBe("match1");
  });

  it("returns null for a tampered signature", async () => {
    const { generate, verify } = await getTokenFns();
    const token = generate("user1", "match1", 3600);
    const [data, sig] = token.split(".");
    // Flip a char in the signature
    const tampered = sig.startsWith("A") ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
    expect(verify(`${data}.${tampered}`)).toBeNull();
  });

  it("returns null for a tampered payload", async () => {
    const { generate, verify } = await getTokenFns();
    const token = generate("user1", "match1", 3600);
    const [, sig] = token.split(".");
    // Forge a different payload with original sig
    const badPayload = Buffer.from(
      JSON.stringify({ userId: "hacker", matchId: "match1", exp: 9999999999 })
    ).toString("base64url");
    expect(verify(`${badPayload}.${sig}`)).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const { generate, verify } = await getTokenFns();
    // expiresInSeconds = -1 means already expired
    const token = generate("user1", "match1", -1);
    expect(verify(token)).toBeNull();
  });

  it("returns null for a malformed token (no dot)", async () => {
    const { verify } = await getTokenFns();
    expect(verify("nodottoken")).toBeNull();
  });

  it("returns null for a token with garbage data", async () => {
    const { verify } = await getTokenFns();
    expect(verify("!!!.???")).toBeNull();
  });

  it("returns null when signature lengths differ", async () => {
    const { generate, verify } = await getTokenFns();
    const token = generate("user1", "match1", 3600);
    const [data] = token.split(".");
    expect(verify(`${data}.short`)).toBeNull();
  });
});
