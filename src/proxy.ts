import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes — no auth required
  const publicPaths = [
    "/api/auth",
    "/api/health",
    "/api/matches",
    "/api/payments/webhook",
    "/api/streams/ztv/token",
    "/login",
    "/register",
    "/sports",
    "/live-tv",
    "/",
  ];

  const isPublic = publicPaths.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
  if (isPublic) return NextResponse.next();

  // Protected routes — require auth
  if (!req.auth?.user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes
  if (pathname.startsWith("/api/admin") && req.auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)"],
};
