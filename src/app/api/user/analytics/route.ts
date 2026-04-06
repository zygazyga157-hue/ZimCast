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

    // Filter out noise: only WATCH actions with meaningful duration
    const meaningful = activities.filter((a) => a.watchDuration >= 1);

    // Total watch time (seconds)
    const totalWatchTime = meaningful.reduce((sum, a) => sum + a.watchDuration, 0);

    // Category breakdown (seconds) — skip orphan records (no program, no match)
    const categoryBreakdown: Record<string, number> = {};
    for (const a of meaningful) {
      const cat = a.program?.category ?? (a.matchId ? "SPORTS" : null);
      if (!cat) continue; // skip unattributable records
      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + a.watchDuration;
    }

    let favoriteCategory: string | null = null;
    let maxCatTime = 0;
    for (const [cat, time] of Object.entries(categoryBreakdown)) {
      if (time > maxCatTime) {
        maxCatTime = time;
        favoriteCategory = cat;
      }
    }

    // Top 5 programs by watch time — skip orphan records
    const programStats = new Map<string, { title: string; totalTime: number }>();
    for (const a of meaningful) {
      const key = a.programId ?? a.matchId;
      if (!key) continue;
      const title = a.program?.title
        ?? (a.match ? `${a.match.homeTeam} vs ${a.match.awayTeam}` : "Untitled program");
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
    for (const a of meaningful) {
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
      meaningful.filter((a) => a.matchId && a.action === "WATCH").map((a) => a.matchId)
    ).size;

    // Recent activity — deduplicate by program/match, sum durations, keep latest timestamp
    const recentMap = new Map<
      string,
      { id: string; action: string; watchDuration: number; title: string | null; category: string | null; createdAt: Date }
    >();
    for (const a of meaningful) {
      const key = a.programId ?? a.matchId;
      if (!key) continue; // skip orphan records
      const title = a.program?.title
        ?? (a.match ? `${a.match.homeTeam} vs ${a.match.awayTeam}` : null);
      if (!title) continue; // skip untitled
      const category = a.program?.category ?? (a.matchId ? "SPORTS" : null);
      const existing = recentMap.get(key);
      if (existing) {
        existing.watchDuration += a.watchDuration;
        if (a.createdAt > existing.createdAt) existing.createdAt = a.createdAt;
      } else {
        recentMap.set(key, { id: a.id, action: a.action, watchDuration: a.watchDuration, title, category, createdAt: a.createdAt });
      }
    }
    const recentActivity = Array.from(recentMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

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
