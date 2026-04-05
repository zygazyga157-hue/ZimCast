import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        city: true,
        country: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        emailVerified: true,
        interests: true,
        language: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        passes: {
          include: {
            match: { select: { id: true, homeTeam: true, awayTeam: true, kickoff: true, isLive: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        payments: {
          include: {
            match: { select: { homeTeam: true, awayTeam: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Watch stats
    const watchStats = await prisma.viewingActivity.aggregate({
      where: { userId: id, action: "WATCH", watchDuration: { gte: 1 } },
      _sum: { watchDuration: true },
      _count: true,
    });

    // Favorite category
    const categoryAgg = await prisma.viewingActivity.groupBy({
      by: ["programId"],
      where: { userId: id, action: "WATCH", watchDuration: { gte: 1 } },
      _sum: { watchDuration: true },
    });

    let favoriteCategory = "—";
    if (categoryAgg.length > 0) {
      const programIds = categoryAgg
        .filter((c) => c.programId)
        .map((c) => c.programId!);
      if (programIds.length > 0) {
        const programs = await prisma.program.findMany({
          where: { id: { in: programIds } },
          select: { id: true, category: true },
        });
        const catMap = new Map(programs.map((p) => [p.id, p.category]));
        const catTotals: Record<string, number> = {};
        for (const c of categoryAgg) {
          const cat = (c.programId && catMap.get(c.programId)) ?? "OTHER";
          catTotals[cat] = (catTotals[cat] ?? 0) + (c._sum.watchDuration ?? 0);
        }
        const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) favoriteCategory = sorted[0][0];
      }
    }

    return NextResponse.json({
      ...user,
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      passes: user.passes.map((p) => ({
        matchId: p.matchId,
        expiresAt: p.expiresAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        match: {
          ...p.match,
          kickoff: p.match.kickoff.toISOString(),
        },
      })),
      payments: user.payments.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        provider: p.provider,
        status: p.status,
        transactionRef: p.transactionRef,
        createdAt: p.createdAt.toISOString(),
        match: p.match
          ? `${p.match.homeTeam} vs ${p.match.awayTeam}`
          : "Unknown",
      })),
      watchStats: {
        totalWatchTime: watchStats._sum.watchDuration ?? 0,
        sessionCount: watchStats._count,
        favoriteCategory,
      },
    });
  } catch (error) {
    return handleApiError(error, "Admin user detail error");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from demoting themselves
    if (id === session.user.id && body.role === "USER") {
      return NextResponse.json(
        { error: "Cannot demote yourself" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body.role !== undefined && (body.role === "ADMIN" || body.role === "USER")) {
      data.role = body.role;
    }
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }
    // Profile fields
    if (typeof body.name === "string") data.name = body.name.trim() || null;
    if (typeof body.city === "string") data.city = body.city.trim() || null;
    if (typeof body.gender === "string") data.gender = body.gender.trim() || null;
    if (typeof body.phone === "string") data.phone = body.phone.trim() || null;
    if (Array.isArray(body.interests)) {
      data.interests = body.interests.filter((i: unknown) => typeof i === "string");
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        gender: true,
        city: true,
        phone: true,
        interests: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error, "Admin user update error");
  }
}
