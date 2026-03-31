import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInsights } from "@/lib/insights";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all viewing activities for this user
    const activities = await prisma.viewingActivity.findMany({
      where: { userId },
      include: {
        program: { select: { category: true, title: true } },
        match: { select: { homeTeam: true, awayTeam: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Total watch time (seconds)
    const totalWatchTime = activities.reduce((sum, a) => sum + a.watchDuration, 0);

    // Category breakdown (seconds)
    const categoryBreakdown: Record<string, number> = {};
    for (const a of activities) {
      const cat = a.program?.category ?? (a.matchId ? "SPORTS" : "OTHER");
      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + a.watchDuration;
    }

    // Favorite category
    let favoriteCategory: string | null = null;
    let maxCatTime = 0;
    for (const [cat, time] of Object.entries(categoryBreakdown)) {
      if (time > maxCatTime) {
        maxCatTime = time;
        favoriteCategory = cat;
      }
    }

    // Top 5 programs by watch time
    const programStats = new Map<string, { title: string; totalTime: number }>();
    for (const a of activities) {
      const key = a.programId ?? a.matchId ?? "unknown";
      const title = a.program?.title
        ?? (a.match ? `${a.match.homeTeam} vs ${a.match.awayTeam}` : "Unknown");
      const existing = programStats.get(key);
      if (existing) {
        existing.totalTime += a.watchDuration;
      } else {
        programStats.set(key, { title, totalTime: a.watchDuration });
      }
    }
    const topPrograms = Array.from(programStats.values())
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 5);

    // Engagement score (0-100)
    // Simple formula: min(totalWatchTime / target, 1) * 100
    // Target: 20 hours/month = 72000 seconds
    const engagementScore = Math.min(Math.round((totalWatchTime / 72000) * 100), 100);

    // Weekly heatmap: 7 days × 24 hours (in minutes)
    const weeklyHeatmap: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => 0)
    );
    for (const a of activities) {
      const date = new Date(a.sessionStart);
      const day = date.getDay(); // 0=Sun
      const hour = date.getHours();
      weeklyHeatmap[day][hour] += Math.round(a.watchDuration / 60);
    }

    // Peak time (hour with most viewing)
    let peakTime: number | null = null;
    let maxMinutes = 0;
    const hourTotals = Array.from({ length: 24 }, () => 0);
    for (const row of weeklyHeatmap) {
      for (let h = 0; h < 24; h++) {
        hourTotals[h] += row[h];
      }
    }
    for (let h = 0; h < 24; h++) {
      if (hourTotals[h] > maxMinutes) {
        maxMinutes = hourTotals[h];
        peakTime = h;
      }
    }

    // Total unique matches watched
    const totalMatches = new Set(
      activities.filter((a) => a.matchId && a.action === "WATCH").map((a) => a.matchId)
    ).size;

    // Recent activity (last 10)
    const recentActivity = activities.slice(0, 10).map((a) => ({
      id: a.id,
      action: a.action,
      watchDuration: a.watchDuration,
      title: a.program?.title
        ?? (a.match ? `${a.match.homeTeam} vs ${a.match.awayTeam}` : null),
      category: a.program?.category ?? (a.matchId ? "SPORTS" : null),
      createdAt: a.createdAt,
    }));

    // Generate text insights
    const insights = generateInsights({
      totalWatchTime,
      favoriteCategory,
      categoryBreakdown,
      peakTime,
      weeklyHeatmap,
      totalMatches,
    });

    return NextResponse.json({
      totalWatchTime,
      favoriteCategory,
      topPrograms,
      engagementScore,
      weeklyHeatmap,
      categoryBreakdown,
      recentActivity,
      insights,
      peakTime,
      totalMatches,
    });
  } catch (error) {
    return handleApiError(error, "Analytics fetch error");
  }
}
