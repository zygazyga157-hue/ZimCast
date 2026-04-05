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
    const search = sp.get("search") ?? "";
    const city = sp.get("city");
    const gender = sp.get("gender");
    const role = sp.get("role");
    const isActiveParam = sp.get("isActive");
    const interest = sp.get("interest");
    const hasPayments = sp.get("hasPayments");
    const joinedAfter = sp.get("joinedAfter");
    const joinedBefore = sp.get("joinedBefore");
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "50", 10) || 50));

    // Build filter
    const conditions: Record<string, unknown>[] = [];

    if (search) {
      conditions.push({
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      });
    }
    if (city) conditions.push({ city: { equals: city, mode: "insensitive" as const } });
    if (gender) conditions.push({ gender: { equals: gender, mode: "insensitive" as const } });
    if (role && (role === "ADMIN" || role === "USER")) conditions.push({ role });
    if (isActiveParam !== null && isActiveParam !== "") {
      conditions.push({ isActive: isActiveParam === "true" });
    }
    if (interest) conditions.push({ interests: { has: interest } });
    if (hasPayments === "true") conditions.push({ payments: { some: {} } });
    if (hasPayments === "false") conditions.push({ payments: { none: {} } });
    if (joinedAfter) conditions.push({ createdAt: { gte: new Date(joinedAfter) } });
    if (joinedBefore) conditions.push({ createdAt: { lte: new Date(joinedBefore) } });

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [users, total, allUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          gender: true,
          city: true,
          interests: true,
          phone: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { passes: true, payments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
      // Summary stats across ALL users (unfiltered) for dashboard
      prisma.user.findMany({
        select: { city: true, gender: true, isActive: true },
      }),
    ]);

    // Build summary from all users
    const activeCount = allUsers.filter((u) => u.isActive).length;
    const byCity: Record<string, number> = {};
    const byGender: Record<string, number> = {};
    for (const u of allUsers) {
      if (u.city) byCity[u.city] = (byCity[u.city] ?? 0) + 1;
      if (u.gender) byGender[u.gender] = (byGender[u.gender] ?? 0) + 1;
    }

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        passCount: u._count.passes,
        paymentCount: u._count.payments,
        _count: undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        total: allUsers.length,
        activeCount,
        byCity,
        byGender,
      },
    });
  } catch (error) {
    return handleApiError(error, "Admin users fetch error");
  }
}
