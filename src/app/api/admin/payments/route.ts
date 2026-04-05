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

    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const provider = sp.get("provider");
    const city = sp.get("city");
    const gender = sp.get("gender");
    const matchId = sp.get("matchId");
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 50)));

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const where: any = {};
    if (status && ["PENDING", "COMPLETED", "FAILED"].includes(status)) where.status = status;
    if (provider && ["ECOCASH", "PAYNOW"].includes(provider)) where.provider = provider;
    if (matchId) where.matchId = matchId;

    // Date range
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
    }

    // User-level filters
    if (city || gender) {
      where.user = {};
      if (city) where.user.city = { equals: city, mode: "insensitive" };
      if (gender) where.user.gender = gender;
    }

    const [payments, total, allCompleted] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { email: true, name: true, city: true, gender: true } },
          match: { select: { homeTeam: true, awayTeam: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
      // Summary from COMPLETED payments (same filters)
      prisma.payment.findMany({
        where: { ...where, status: "COMPLETED" },
        select: { amount: true, provider: true },
      }),
    ]);

    // Compute summary
    const totalRevenue = allCompleted.reduce((s, p) => s + Number(p.amount), 0);
    const avgPayment = allCompleted.length > 0 ? totalRevenue / allCompleted.length : 0;
    const providerSplit: Record<string, number> = {};
    allCompleted.forEach((p) => {
      providerSplit[p.provider] = (providerSplit[p.provider] || 0) + Number(p.amount);
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
        userCity: p.user.city,
        userGender: p.user.gender,
        match: p.match ? `${p.match.homeTeam} vs ${p.match.awayTeam}` : "Unknown",
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      summary: { totalRevenue, avgPayment, providerSplit, completedCount: allCompleted.length },
    });
  } catch (error) {
    return handleApiError(error, "Admin payments fetch error");
  }
}
