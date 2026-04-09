import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Helpers – security headers                                        */
/* ------------------------------------------------------------------ */

const isDev = process.env.NODE_ENV === "development";

/** Origins derived once at cold-start from env vars. */
const streamOrigin = safeOrigin(
  process.env.NEXT_PUBLIC_STREAM_BASE_URL ?? process.env.STREAM_BASE_URL
);
const uploadOrigin = process.env.MEDIA_S3_ENDPOINT
  ? safeOrigin(process.env.MEDIA_S3_ENDPOINT)
  : process.env.MEDIA_S3_BUCKET && process.env.MEDIA_S3_REGION
    ? `https://${process.env.MEDIA_S3_BUCKET}.s3.${process.env.MEDIA_S3_REGION}.amazonaws.com`
    : "";
const publicMediaOrigin = safeOrigin(process.env.MEDIA_PUBLIC_BASE_URL);

function safeOrigin(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/** Build the CSP string for a given request + nonce. */
function buildCsp(nonce: string, reqHost: string, isHttps: boolean): string {
  const wsProto = isHttps ? "wss" : "ws";

  const connectSrc = [
    "'self'",
    `${wsProto}://${reqHost}`,
    streamOrigin,
    uploadOrigin,
  ].filter(Boolean);

  const imgSrc = ["'self'", "data:", "blob:", publicMediaOrigin, "https://cdn.live-score-api.com", "https://livescore-api.com"].filter(Boolean);
  const mediaSrc = ["'self'", "blob:", streamOrigin].filter(Boolean);

  const directives: string[] = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `script-src-attr 'none'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr 'unsafe-inline'`,
    `img-src ${imgSrc.join(" ")}`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc.join(" ")}`,
    `media-src ${mediaSrc.join(" ")}`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
  ];

  if (isHttps) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

/** Apply all security headers to a NextResponse. */
function applySecurityHeaders(
  res: NextResponse,
  nonce: string,
  reqHost: string,
  isHttps: boolean
): NextResponse {
  const csp = buildCsp(nonce, reqHost, isHttps);

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set(
    "Content-Security-Policy-Report-Only",
    "require-trusted-types-for 'script'"
  );
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  if (!isDev && isHttps) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return res;
}

/* ------------------------------------------------------------------ */
/*  Middleware                                                         */
/* ------------------------------------------------------------------ */

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // ── Per-request nonce ────────────────────────────────────────────
  const nonce =
    typeof btoa === "function"
      ? btoa(crypto.randomUUID())
      : Buffer.from(crypto.randomUUID()).toString("base64");

  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";
  const reqHost = req.headers.get("host") ?? req.nextUrl.host;

  // Pass nonce to Next.js server rendering via request header
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  // ── Public routes — no auth required ─────────────────────────────
  const publicPaths = [
    "/api/auth",
    "/api/health",
    "/api/matches",
    "/api/payments/webhook",
    "/api/streams/ztv/token",
    "/api/zpls",
    "/login",
    "/register",
    "/sports",
    "/live-tv",
    "/",
  ];

  const isPublic = publicPaths.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
  if (isPublic) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    return applySecurityHeaders(res, nonce, reqHost, isHttps);
  }

  // ── Protected routes — require auth ──────────────────────────────
  if (!req.auth?.user) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return applySecurityHeaders(res, nonce, reqHost, isHttps);
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(loginUrl);
    return applySecurityHeaders(res, nonce, reqHost, isHttps);
  }

  // ── Admin routes ─────────────────────────────────────────────────
  if (pathname.startsWith("/api/admin") && req.auth.user.role !== "ADMIN") {
    const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return applySecurityHeaders(res, nonce, reqHost, isHttps);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurityHeaders(res, nonce, reqHost, isHttps);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)"],
};
