import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      liveMatches,
      totalMatches,
      pendingPayments,
      revenueResult,
      recentPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { lastLoginAt: { gte: thirtyDaysAgo } },
      }),
      prisma.match.count({ where: { isLive: true } }),
      prisma.match.count(),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED" },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true, name: true } },
          match: { select: { homeTeam: true, awayTeam: true } },
        },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      liveMatches,
      totalMatches,
      pendingPayments,
      totalRevenue: revenueResult._sum.amount?.toString() ?? "0",
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        provider: p.provider,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        userEmail: p.user.email,
        userName: p.user.name,
        match: p.match
          ? `${p.match.homeTeam} vs ${p.match.awayTeam}`
          : "Unknown",
      })),
    });
  } catch (error) {
    return handleApiError(error, "Admin stats error");
  }
}
