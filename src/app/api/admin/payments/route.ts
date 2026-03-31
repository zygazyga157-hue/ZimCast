import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const status = req.nextUrl.searchParams.get("status");
    const provider = req.nextUrl.searchParams.get("provider");

    const where: Record<string, unknown> = {};
    if (status && ["PENDING", "COMPLETED", "FAILED"].includes(status)) {
      where.status = status;
    }
    if (provider && ["ECOCASH", "PAYNOW"].includes(provider)) {
      where.provider = provider;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: { select: { email: true, name: true } },
        match: { select: { homeTeam: true, awayTeam: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        provider: p.provider,
        status: p.status,
        transactionRef: p.transactionRef,
        createdAt: p.createdAt.toISOString(),
        userEmail: p.user.email,
        userName: p.user.name,
        match: p.match
          ? `${p.match.homeTeam} vs ${p.match.awayTeam}`
          : "Unknown",
      })),
    });
  } catch (error) {
    return handleApiError(error, "Admin payments fetch error");
  }
}
