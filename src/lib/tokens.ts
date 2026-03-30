import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.STREAM_TOKEN_SECRET || "change-me";

interface TokenPayload {
  userId: string;
  matchId: string;
  exp: number;
}

export function generateStreamToken(
  userId: string,
  matchId: string,
  expiresInSeconds: number = 3 * 60 * 60 // 3 hours default
): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload: TokenPayload = { userId, matchId, exp };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyStreamToken(
  token: string
): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expectedSig = createHmac("sha256", SECRET).update(data).digest("base64url");

  const sigBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSig, "base64url");

  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payload: TokenPayload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8")
    );

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
