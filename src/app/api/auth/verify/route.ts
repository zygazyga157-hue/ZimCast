import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      const url = new URL("/login?error=invalid-token", req.nextUrl.origin);
      return NextResponse.redirect(url);
    }

    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      const url = new URL("/login?error=invalid-token", req.nextUrl.origin);
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

    const url = new URL("/profile?verified=true", req.nextUrl.origin);
    return NextResponse.redirect(url);
  } catch (error) {
    return handleApiError(error, "Email verification error");
  }
}
