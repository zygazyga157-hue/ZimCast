import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Always return 200 to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Rate limit: reject if a reset was requested within the last 2 minutes
      if (user.resetTokenExpiry) {
        const tokenAge =
          Date.now() - (user.resetTokenExpiry.getTime() - 60 * 60 * 1000);
        if (tokenAge < 2 * 60 * 1000) {
          return NextResponse.json(
            { error: "Please wait before requesting another reset email" },
            { status: 429 }
          );
        }
      }

      const resetToken = randomUUID();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      sendPasswordResetEmail(email, resetToken).catch((err) =>
        console.error("Failed to send password reset email:", err)
      );
    }

    return NextResponse.json({
      message: "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error) {
    return handleApiError(error, "Forgot password error");
  }
}
