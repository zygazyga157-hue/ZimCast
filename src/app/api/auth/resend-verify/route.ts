import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mail";
import { handleApiError } from "@/lib/errors";
import { randomUUID } from "crypto";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true, verifyTokenExpiry: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    // Rate-limit: reject if last token was sent less than 2 minutes ago
    if (user.verifyTokenExpiry) {
      const lastSent = new Date(user.verifyTokenExpiry.getTime() - 24 * 60 * 60 * 1000);
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
      if (lastSent > twoMinAgo) {
        return NextResponse.json(
          { error: "Please wait before requesting another email" },
          { status: 429 }
        );
      }
    }

    const token = randomUUID();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { verifyToken: token, verifyTokenExpiry: expiry },
    });

    await sendVerificationEmail(user.email, token);

    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    return handleApiError(error, "Resend verification error");
  }
}
