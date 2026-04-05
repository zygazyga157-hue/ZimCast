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
    const category = sp.get("category");
    const interest = sp.get("interest");
    const city = sp.get("city");
    const gender = sp.get("gender");
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");

    // Build user filter for demographic scoping
    const userConditions: Record<string, unknown>[] = [];
    if (city) userConditions.push({ city: { equals: city, mode: "insensitive" as const } });
    if (gender) userConditions.push({ gender: { equals: gender, mode: "insensitive" as const } });
    if (interest) userConditions.push({ interests: { has: interest } });

    const userFilter = userConditions.length > 0 ? { AND: userConditions } : {};

    // Get matching user IDs if demographic filters are applied
    let userIds: string[] | null = null;
    if (userConditions.length > 0) {
      const users = await prisma.user.findMany({
        where: userFilter,
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    // Base activity filter
    const activityWhere: Record<string, unknown> = {
      action: "WATCH",
      watchDuration: { gte: 1 },
    };
    if (userIds !== null) activityWhere.userId = { in: userIds };
    if (dateFrom) activityWhere.sessionStart = { ...((activityWhere.sessionStart as object) ?? {}), gte: new Date(dateFrom) };
    if (dateTo) {
      const existing = (activityWhere.sessionStart as Record<string, unknown>) ?? {};
      activityWhere.sessionStart = { ...existing, lte: new Date(dateTo) };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Run queries in parallel
    const [
      activities,
      allUsers,
      recentRevenue,
      newUsersRaw,
      activeViewerCount,
    ] = await Promise.all([
      // All matching viewing activities
      prisma.viewingActivity.findMany({
        where: activityWhere,
        select: {
          watchDuration: true,
          sessionStart: true,
          programId: true,
          matchId: true,
          userId: true,
        },
      }),

      // All user demographics (for distribution)
      prisma.user.findMany({
        select: { city: true, gender: true, interests: true, createdAt: true },
      }),

      // Revenue timeline — last 30 days
      prisma.payment.findMany({
        where: { status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } },
        select: { amount: true, createdAt: true },
      }),

      // New users per day — last 30 days
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),

      // Active viewers in last 7 days
      prisma.viewingActivity.groupBy({
        by: ["userId"],
        where: { action: "WATCH", watchDuration: { gte: 1 }, sessionStart: { gte: sevenDaysAgo } },
      }),
    ]);

    // Total watch time
    let totalWatchTime = 0;
    for (const a of activities) totalWatchTime += a.watchDuration ?? 0;

    // Category breakdown — need to fetch programs for category mapping
    const programIds = [...new Set(activities.filter((a) => a.programId).map((a) => a.programId!))];
    const programs = programIds.length > 0
      ? await prisma.program.findMany({
          where: { id: { in: programIds } },
          select: { id: true, category: true, title: true },
        })
      : [];
    const programMap = new Map(programs.map((p) => [p.id, p]));

    const categoryBreakdown: Record<string, number> = {};
    const programWatchTime: Record<string, { title: string; seconds: number; category: string }> = {};

    for (const a of activities) {
      const prog = a.programId ? programMap.get(a.programId) : null;
      const cat = prog?.category ?? (a.matchId ? "SPORTS" : "OTHER");
      const dur = a.watchDuration ?? 0;

      // Filter by category if specified
      if (category && cat !== category) continue;

      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + dur;

      if (prog) {
        if (!programWatchTime[prog.id]) {
          programWatchTime[prog.id] = { title: prog.title, seconds: 0, category: prog.category };
        }
        programWatchTime[prog.id].seconds += dur;
      }
    }

    // Top 10 programs
    const topPrograms = Object.values(programWatchTime)
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 10);

    // Weekly heatmap (7 × 24)
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const a of activities) {
      if (!a.sessionStart) continue;
      const d = new Date(a.sessionStart);
      heatmap[d.getDay()][d.getHours()] += Math.round((a.watchDuration ?? 0) / 60);
    }

    // Peak hour
    let peakHour = 0;
    let peakMinutes = 0;
    for (let h = 0; h < 24; h++) {
      const total = heatmap.reduce((sum, day) => sum + day[h], 0);
      if (total > peakMinutes) { peakMinutes = total; peakHour = h; }
    }

    // Avg session duration
    const avgSession = activities.length > 0
      ? Math.round(totalWatchTime / activities.length)
      : 0;

    // User growth (daily for last 30 days)
    const userGrowth: Record<string, number> = {};
    for (const u of newUsersRaw) {
      const day = u.createdAt.toISOString().slice(0, 10);
      userGrowth[day] = (userGrowth[day] ?? 0) + 1;
    }

    // Revenue timeline (daily for last 30 days)
    const revenueTimeline: Record<string, number> = {};
    for (const p of recentRevenue) {
      const day = p.createdAt.toISOString().slice(0, 10);
      revenueTimeline[day] = (revenueTimeline[day] ?? 0) + parseFloat(p.amount.toString());
    }

    // Interest distribution
    const interestDistribution: Record<string, number> = {};
    for (const u of allUsers) {
      for (const i of u.interests) {
        interestDistribution[i] = (interestDistribution[i] ?? 0) + 1;
      }
    }

    // Demographic breakdown
    const byCity: Record<string, number> = {};
    const byGender: Record<string, number> = {};
    for (const u of allUsers) {
      if (u.city) byCity[u.city] = (byCity[u.city] ?? 0) + 1;
      if (u.gender) byGender[u.gender] = (byGender[u.gender] ?? 0) + 1;
    }

    return NextResponse.json({
      totalWatchTime,
      categoryBreakdown,
      weeklyHeatmap: heatmap,
      topPrograms,
      userGrowth,
      revenueTimeline,
      activeViewers: activeViewerCount.length,
      interestDistribution,
      demographicBreakdown: { byCity, byGender },
      peakHour,
      avgSession,
    });
  } catch (error) {
    return handleApiError(error, "Admin analytics error");
  }
}
