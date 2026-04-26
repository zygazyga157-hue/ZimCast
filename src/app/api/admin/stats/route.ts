import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { catDateKeyFromNow, catDayBounds } from "@/lib/cat-time";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const now = new Date();
    const { start: dayStart, end: dayEnd } = catDayBounds(catDateKeyFromNow(now));

    const [
      totalUsers,
      activeUsers,
      liveMatches,
      totalMatches,
      pendingPayments,
      revenueResult,
      recentPayments,
      totalPrograms,
      todayPrograms,
      blackoutPrograms,
      categoryBreakdown,
      activeTemplates,
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
      prisma.program.count(),
      prisma.program.count({
        where: {
          startTime: { gte: dayStart },
          endTime: { lte: dayEnd },
        },
      }),
      prisma.program.count({ where: { blackout: true, endTime: { gte: now } } }),
      prisma.program.groupBy({
        by: ["category"],
        _count: { id: true },
      }),
      prisma.programTemplate.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      liveMatches,
      totalMatches,
      pendingPayments,
      totalRevenue: revenueResult._sum.amount?.toString() ?? "0",
      totalPrograms,
      todayPrograms,
      blackoutPrograms,
      activeTemplates,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
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
