import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { getPublicOrigin } from "@/lib/public-origin";

export async function GET(req: NextRequest) {
  try {
    const baseOrigin = getPublicOrigin(req);
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      const url = new URL("/login?error=invalid-token", baseOrigin);
      return NextResponse.redirect(url);
    }

    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      const url = new URL("/login?error=invalid-token", baseOrigin);
      return NextResponse.redirect(url);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyTokenExpiry: null,
      },
    });

    const url = new URL("/profile?verified=true", baseOrigin);
    return NextResponse.redirect(url);
  } catch (error) {
    return handleApiError(error, "Email verification error");
  }
}
