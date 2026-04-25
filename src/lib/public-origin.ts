import type { NextRequest } from "next/server";

function parseAllowedOrigins(raw: string | undefined): Set<string> {
  const items =
    raw
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  return new Set(items);
}

function isInvalidHost(hostname: string) {
  return hostname === "0.0.0.0" || hostname === "::" || hostname === "[::]";
}

function safeFallbackOrigin() {
  const fallback =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  try {
    const url = new URL(fallback);
    if (isInvalidHost(url.hostname)) return "http://localhost:3000";
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function choosePublicOrigin(candidateOrigin?: string | null): string {
  const allowed = parseAllowedOrigins(process.env.PUBLIC_APP_ORIGINS);
  if (!candidateOrigin) return safeFallbackOrigin();

  try {
    const url = new URL(candidateOrigin);
    if (isInvalidHost(url.hostname)) return safeFallbackOrigin();
    if (allowed.size > 0 && allowed.has(url.origin)) return url.origin;
    return safeFallbackOrigin();
  } catch {
    return safeFallbackOrigin();
  }
}

export function getPublicOrigin(req: NextRequest): string {
  return choosePublicOrigin(req.nextUrl.origin);
}

